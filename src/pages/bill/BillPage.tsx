import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Printer, FileDown, MessageCircle, Mail } from "lucide-react";
import { getPatientById, getBill } from "@/lib/queries/patients";
import { getOrdersWithResults } from "@/lib/queries/results";
import { getAllSettings } from "@/lib/queries/settings";
import { saveBillPdf, printBillPdf } from "@/lib/pdf";
import { revealInFolder } from "@/lib/printing";
import { buildBillWhatsAppMessage, sendWhatsAppDocument, sendWhatsAppSemi, copyPdfToClipboard } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";
import { formatCurrency, formatDateTime, genderLabel } from "@/lib/format";
import { amountInWords } from "@/lib/numberToWords";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const RECEIPT_FONT = '"Times New Roman", Georgia, serif';
const INK = "#111";
const RULE = "#999";
const RULE_SOFT = "#dcdde3";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}
const money = (n: number) => `₹${n.toFixed(2)}`;

export function BillPage() {
  const { patientId } = useParams();
  const pid = Number(patientId);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: patient } = useQuery({ queryKey: ["patient", pid], queryFn: () => getPatientById(pid) });
  const { data: bill } = useQuery({ queryKey: ["bill", pid], queryFn: () => getBill(pid) });
  const { data: orders = [] } = useQuery({ queryKey: ["orders", pid], queryFn: () => getOrdersWithResults(pid) });
  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: getAllSettings });

  // Billed line items = orders that actually carry a charge (one row per test / profile; the ₹0
  // expanded bundle members stay hidden). These sum to bill.total.
  const lineItems = orders.filter(o => o.order.price_charged > 0);
  const computedTotal = lineItems.reduce((s, o) => s + o.order.price_charged, 0);
  const total = bill?.total ?? computedTotal;
  const concession = bill?.concession ?? 0;
  const payable = bill?.net ?? Math.max(0, total - concession);

  const labName = settings.lab_name || "Laboratory";
  const phones = (settings.phones || "").replace(/^\s*mob\s*:?\s*/i, "");

  function billEl(): HTMLElement {
    const el = document.getElementById("report-print-area");
    if (!el) throw new Error("Bill not ready.");
    return el;
  }

  async function run(key: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(null);
    }
  }

  async function makeBillPdf(): Promise<string> {
    const el = billEl();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    await Promise.all(Array.from(el.querySelectorAll("img")).map(img => img.decode().catch(() => undefined)));
    return saveBillPdf({ element: el, testNo: patient!.test_no, name: patient!.name, date: patient!.registered_at });
  }

  function handlePrint() {
    if (/win/i.test(navigator.userAgent)) {
      window.print();
      return;
    }
    run("print", () => printBillPdf({ element: billEl(), testNo: patient!.test_no, name: patient!.name }));
  }

  function handleSavePdf() {
    run("pdf", async () => {
      const path = await makeBillPdf();
      if (path) {
        await revealInFolder(path);
        toast.success("Bill PDF saved to your SCL Bills folder.");
      }
    });
  }

  function handleWhatsApp() {
    if (!patient?.phone) { toast.error("This patient has no mobile number on file."); return; }
    const msg = buildBillWhatsAppMessage({
      title: patient.title, name: patient.name, receiptNo: patient.test_no,
      amount: formatCurrency(payable), labName: settings.lab_name || "the laboratory",
    });
    const apiReady = settings.whatsapp_mode === "api" && settings.bsp_api_key && settings.wa_phone_id;
    if (apiReady) {
      run("whatsapp", async () => {
        const pdfPath = await makeBillPdf();
        if (!pdfPath) throw new Error("Could not generate the bill PDF.");
        await sendWhatsAppDocument({
          token: settings.bsp_api_key!, phoneNumberId: settings.wa_phone_id!,
          apiVersion: settings.wa_api_version || "v21.0", to: patient.phone,
          pdfPath, filename: `Bill-${patient.test_no}.pdf`, caption: msg,
        });
        toast.success("Bill sent on WhatsApp.");
      });
      return;
    }
    run("whatsapp", async () => {
      const pdfPath = (await makeBillPdf()) || undefined;
      if (pdfPath) await copyPdfToClipboard(pdfPath);
      await sendWhatsAppSemi(patient.phone, msg, pdfPath);
      if (pdfPath) {
        alert(
          "WhatsApp chat opened and the bill PDF is on the clipboard.\n\n" +
          "1. Click into the chat\n" +
          "2. Press Ctrl + V  (⌘ + V on Mac) to paste the PDF\n" +
          "3. Press Enter to send."
        );
      }
    });
  }

  function handleEmail() {
    if (!patient?.email) { toast.error("This patient has no email address on file."); return; }
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
      toast.error("Email is not set up yet. Go to Settings → Email to configure it.");
      return;
    }
    run("email", async () => {
      const pdfPath = await makeBillPdf();
      if (!pdfPath) throw new Error("Could not generate the bill PDF — email not sent.");
      const lab = settings.lab_name || "the laboratory";
      const bodyHtml = `<div style="font-family:Inter,Arial,sans-serif;color:#14151c">
        <p>Dear ${esc(patient!.title)} ${esc(patient!.name)},</p>
        <p>Please find attached your bill (Receipt #${patient!.test_no}, ${esc(formatCurrency(payable))}) from
        <b>${esc(lab)}</b>${settings.address_line ? `, ${esc(settings.address_line)}` : ""}.</p>
        <p style="color:#6b7280;font-size:13px">This is a computer-generated bill.</p>
      </div>`;
      await sendEmail({
        host: settings.smtp_host!, port: parseInt(settings.smtp_port || "587", 10) || 587,
        username: settings.smtp_user!, password: settings.smtp_pass!,
        to: patient!.email!, subject: `Bill — ${patient!.title} ${patient!.name} (#${patient!.test_no})`,
        bodyHtml, pdfPath,
      });
      toast.success("Email sent.");
    });
  }

  if (!patient) {
    return <div className="p-10 text-center text-[14px] text-[#565869]">Loading bill…</div>;
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ── Receipt preview ──────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-[#eceef6] p-6 flex justify-center items-start">
        <div id="report-print-area" className="report-sheet">
          <div
            data-report-page
            className="report-page bg-white shadow-sm"
            style={{ width: "210mm", minHeight: "297mm", padding: "16mm 16mm 14mm", boxSizing: "border-box", color: INK, fontFamily: RECEIPT_FONT }}
          >
            {/* Header — lab logo (if uploaded) + identity, all from Settings */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: settings.logo_data ? "flex-start" : "center", textAlign: settings.logo_data ? "left" : "center" }}>
              {settings.logo_data && (
                <img src={settings.logo_data} alt={`${labName} logo`} style={{ height: "52px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: "25px", fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1.15 }}>{labName}</h1>
                {settings.tagline && (
                  <div style={{ display: "inline-block", border: `1px solid ${INK}`, borderRadius: "4px", padding: "0 8px", marginTop: "4px", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {settings.tagline}
                  </div>
                )}
                {settings.address_line && <p style={{ fontSize: "12px", marginTop: "4px" }}>{settings.address_line}</p>}
                {phones && <p style={{ fontSize: "12px", marginTop: "1px" }}>Phone: {phones}</p>}
                {settings.timings && <p style={{ fontSize: "11px", marginTop: "1px", color: "#444" }}>{settings.timings}</p>}
              </div>
            </div>
            <div style={{ borderBottom: `2px solid ${INK}`, marginTop: "10px" }} />

            {/* Title band */}
            <div style={{ textAlign: "center", fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.22em", margin: "10px 0", color: "#333" }}>
              BILL&nbsp;/&nbsp;RECEIPT
            </div>

            {/* Patient / receipt meta box */}
            <div style={{ border: `1px solid ${RULE}`, borderRadius: "4px", padding: "9px 12px", display: "grid", gridTemplateColumns: "1fr auto", gap: "3px 16px", fontSize: "13px" }}>
              <div style={{ lineHeight: 1.85 }}>
                <div>Receipt No.&nbsp;&nbsp;&nbsp;: <strong>{patient.test_no}</strong></div>
                <div>Patient Name&nbsp;: <strong>{patient.title} {patient.name}</strong></div>
                <div>Age / Sex&nbsp;&nbsp;&nbsp;&nbsp;: <strong>{patient.age} {patient.age_unit} / {genderLabel(patient.sex, patient.baby)}</strong></div>
                <div>Ref By&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>{patient.doctor_name ?? "SELF"}</strong></div>
                {patient.phone && <div>Mobile&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>{patient.phone}</strong></div>}
              </div>
              <div style={{ textAlign: "right" }}>Date : <strong>{formatDateTime(patient.registered_at)}</strong></div>
            </div>

            {/* Itemised tests */}
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", marginTop: "14px" }}>
              <thead>
                <tr style={{ background: "#f1f2f5" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: "36px", borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>TEST</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", width: "110px", borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: "10px 8px", color: "#666" }}>No charges on this bill.</td></tr>
                ) : lineItems.map((o, i) => (
                  <tr key={o.order.id}>
                    <td style={{ padding: "5px 8px", borderBottom: `1px solid ${RULE_SOFT}` }}>{i + 1}</td>
                    <td style={{ padding: "5px 8px", borderBottom: `1px solid ${RULE_SOFT}`, textTransform: "uppercase" }}>{o.test.name}</td>
                    <td style={{ padding: "5px 8px", borderBottom: `1px solid ${RULE_SOFT}`, textAlign: "right" }} className="tabular-nums">{o.order.price_charged.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals (right-aligned) */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <div style={{ width: "260px", fontSize: "13px" }}>
                {concession > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span>Total</span><span className="tabular-nums">{money(total)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span>Concession</span><span className="tabular-nums">− {money(concession)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0 2px", marginTop: "2px", borderTop: `1.5px solid ${INK}`, fontSize: "15px", fontWeight: 700 }}>
                  <span>PAYABLE AMOUNT</span><span className="tabular-nums">{money(payable)}</span>
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <div style={{ fontSize: "12.5px", fontStyle: "italic", marginTop: "8px" }}>
              ({amountInWords(payable)})
            </div>

            {/* Payment mode + signature */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "26px" }}>
              <div style={{ fontSize: "13px" }}>Payment Mode : <strong>{bill?.mode ?? "CASH"}</strong></div>
              <div style={{ textAlign: "center", minWidth: "150px" }}>
                {settings.signature_data
                  ? <img src={settings.signature_data} alt="signature" style={{ height: "18mm", width: "auto", objectFit: "contain", margin: "0 auto" }} />
                  : <div style={{ height: "18mm", borderBottom: `1px solid ${INK}`, width: "150px", margin: "0 auto" }} />}
                <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "3px", borderTop: settings.signature_data ? `1px solid ${INK}` : "none", paddingTop: "2px" }}>
                  {settings.signatory_label || "Lab Technician"}
                </div>
              </div>
            </div>

            {/* Thank-you footer */}
            <div style={{ borderTop: `1px solid ${RULE_SOFT}`, marginTop: "22px", paddingTop: "6px", textAlign: "center", fontSize: "11px", color: "#555" }}>
              Thank you for choosing {labName}. This is a computer-generated bill.
            </div>
          </div>
        </div>
      </div>

      {/* ── Action sidebar ───────────────────────────────────── */}
      <aside className="w-[280px] shrink-0 border-l border-[#e6e7ee] bg-white p-4 flex flex-col gap-2 overflow-auto">
        <button onClick={() => navigate(-1)} className="btn btn-ghost justify-start px-2 py-1.5 text-[13px] mb-1">
          <ChevronLeft size={16} /> Back
        </button>

        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#565869] mt-1">Bill / Receipt</p>

        <BillBtn onClick={handlePrint} busy={busy === "print"} disabled={!!busy} icon={<Printer size={16} />} label="Print" primary />
        <BillBtn onClick={handleSavePdf} busy={busy === "pdf"} disabled={!!busy} icon={<FileDown size={16} />} label="Save PDF" />
        <BillBtn onClick={handleWhatsApp} busy={busy === "whatsapp"} disabled={!!busy || !patient.phone} icon={<MessageCircle size={16} />} label="Send on WhatsApp" />
        <BillBtn onClick={handleEmail} busy={busy === "email"} disabled={!!busy || !patient.email} icon={<Mail size={16} />} label="Send by Email" />

        <div className="card p-3 mt-2 space-y-1 text-[13px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#565869] mb-1">Summary</p>
          <SummaryRow k="Receipt No." v={String(patient.test_no)} />
          <SummaryRow k="Items" v={String(lineItems.length)} />
          {concession > 0 && <SummaryRow k="Total" v={formatCurrency(total)} />}
          {concession > 0 && <SummaryRow k="Concession" v={`− ${formatCurrency(concession)}`} />}
          <SummaryRow k="Payable" v={formatCurrency(payable)} bold />
          {bill?.mode && <SummaryRow k="Mode" v={bill.mode} />}
        </div>
        {(!patient.phone || !patient.email) && (
          <p className="text-[11px] text-[#6e7081] leading-snug mt-1">
            {!patient.phone && "No mobile number on file — WhatsApp disabled. "}
            {!patient.email && "No email on file — Email disabled."}
          </p>
        )}
        {!settings.signature_data && (
          <p className="text-[11px] text-[#6e7081] leading-snug mt-1">
            Tip: upload a signature in Settings → Branding to print it on the bill.
          </p>
        )}
      </aside>
    </div>
  );
}

function BillBtn({ onClick, busy, disabled, icon, label, primary }: {
  onClick: () => void; busy: boolean; disabled: boolean; icon: React.ReactNode; label: string; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
        primary ? "btn-primary text-white" : "btn btn-secondary"
      )}
    >
      {icon} {busy ? "Working…" : label}
    </button>
  );
}

function SummaryRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[#44454e]">{k}</span>
      <span className={cn("tabular-nums text-[#14151c]", bold && "font-bold")}>{v}</span>
    </div>
  );
}
