import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Loader2, ShieldCheck, KeyRound, Sparkles } from "lucide-react";
import { NamAstaWordmark } from "@/components/common/NamAstaLogo";
import { activateLicense, type LicenseStatus } from "@/lib/license";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ── Vendor payment details (edit here to rebill) ──
const UPI_ID = "namsh70747@oksbi";
const PAYEE = "Naman Sharma";
const VENDOR_CONTACT = "the NamAsta team";   // e.g. a WhatsApp number you share with labs

interface Plan { id: string; label: string; price: number; per: string; note?: string; best?: boolean; }
const PLANS: Plan[] = [
  { id: "monthly", label: "Monthly", price: 500, per: "/ month" },
  { id: "yearly", label: "Yearly", price: 3000, per: "/ year", note: "Save ₹3,000 vs monthly", best: true },
  { id: "triennial", label: "3 Years", price: 8000, per: "/ 3 years", note: "Best value" },
];

export function ActivationPage({ status, onActivated }: { status: LicenseStatus; onActivated: () => void }) {
  const [plan, setPlan] = useState<Plan>(PLANS[1]);
  const [qr, setQr] = useState("");
  const [key, setKey] = useState("");
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    const upi = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${plan.price}&cu=INR&tn=${encodeURIComponent("NamAsta " + plan.label)}`;
    QRCode.toDataURL(upi, { errorCorrectionLevel: "M", margin: 1, width: 240, color: { dark: "#14151c", light: "#ffffff" } })
      .then(setQr).catch(() => setQr(""));
  }, [plan]);

  async function activate() {
    if (!key.trim() || activating) return;
    setActivating(true);
    try {
      const info = await activateLicense(key);
      toast.success(`Activated for ${info.lab} — valid till ${new Date(info.exp * 1000).toLocaleDateString("en-IN")}.`);
      onActivated();
    } catch (e) {
      toast.error(e);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-y-auto text-white"
         style={{ background: "linear-gradient(150deg, #14161f 0%, #0e0f16 55%, #0a0b10 100%)" }}>
      {/* aurora */}
      <div className="pointer-events-none fixed -top-32 -left-24 w-[34rem] h-[34rem] rounded-full bg-[#6366f1]/25 blur-3xl animate-float" />
      <div className="pointer-events-none fixed top-1/3 right-[-10rem] w-[30rem] h-[30rem] rounded-full bg-[#7c3aed]/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-[#22d3ee]/12 blur-3xl" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06]"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "30px 30px" }} />

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        <NamAstaWordmark size={44} light />

        <div className="mt-8 grid lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: plan + value */}
          <div className="rounded-3xl border border-white/10 glass-dark p-7">
            <div className="flex items-center gap-2 text-[#c7cbff] text-[12px] font-semibold uppercase tracking-[0.15em]">
              <Sparkles size={14} /> Activate your laboratory
            </div>
            <h1 className="mt-3 text-[1.9rem] font-extrabold leading-tight">
              The complete lab, <span style={{ background: "linear-gradient(120deg,#818cf8,#c7cbff 50%,#67e8f9)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>fully computerised.</span>
            </h1>
            <p className="mt-3 text-white/55 text-[14px] leading-relaxed">
              Registration, result entry, auto-calculated reports, WhatsApp &amp; email delivery,
              analyzer import, billing and backups — offline and error-proof.
            </p>

            {status.expired && (
              <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
                Your {status.plan} licence for <b>{status.lab}</b> has expired. Renew below to continue.
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              {PLANS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all",
                    plan.id === p.id ? "border-[#818cf8] bg-[#6366f1]/15 shadow-[0_8px_30px_-10px_rgba(99,102,241,0.6)]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", plan.id === p.id ? "border-[#818cf8] bg-[#6366f1]" : "border-white/25")}>
                      {plan.id === p.id && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold">{p.label}</span>
                      {p.note && <span className="block text-[11.5px] text-white/45">{p.note}</span>}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="text-[18px] font-extrabold tabular-nums">₹{p.price.toLocaleString("en-IN")}</span>
                    <span className="block text-[11px] text-white/45">{p.per}</span>
                  </span>
                  {p.best && <span className="absolute -mt-9 ml-[6.5rem] chip chip-blue !text-[10px]">Popular</span>}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: pay + activate */}
          <div className="rounded-3xl border border-white/10 glass-dark p-7">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">Step 1 — Pay ₹{plan.price.toLocaleString("en-IN")}</div>
            <div className="mt-4 flex items-center gap-5">
              <div className="rounded-2xl bg-white p-2.5 shrink-0">
                {qr ? <img src={qr} alt="UPI QR" width={132} height={132} /> : <div className="w-[132px] h-[132px] skeleton" />}
              </div>
              <div className="min-w-0 text-[13px] text-white/70 leading-relaxed">
                <p>Scan with any UPI app (GPay, PhonePe, Paytm).</p>
                <p className="mt-1.5 text-white/45">Paying</p>
                <p className="font-semibold text-white">{PAYEE}</p>
                <p className="font-mono text-[12.5px] text-[#c7cbff] break-all">{UPI_ID}</p>
              </div>
            </div>

            <div className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">Step 2 — Get your key</div>
            <p className="mt-2 text-[13px] text-white/55 leading-relaxed">
              After paying, send the screenshot to {VENDOR_CONTACT}. You'll receive an
              <b className="text-white/80"> activation key</b> — paste it below.
            </p>

            <div className="mt-3 relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") activate(); }}
                placeholder="Paste activation key"
                spellCheck={false}
                className="login-input !pl-9 font-mono text-[12.5px]"
              />
            </div>
            <button onClick={activate} disabled={activating || !key.trim()} className="login-btn mt-3">
              {activating ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={17} /> Activate</>}
            </button>
            <p className="mt-3 text-center text-[11px] text-white/35">
              Your licence is stored on this PC and works fully offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
