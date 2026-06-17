import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { getPatientById, getBill } from "@/lib/queries/patients";
import { getOrdersWithResults, getReportComment, approvePatient, getReportOverride, saveReportOverride, clearReportOverride } from "@/lib/queries/results";
import { listPanels } from "@/lib/queries/tests";
import { getAllSettings } from "@/lib/queries/settings";
import { logDelivery, hasDelivered } from "@/lib/queries/delivery";
import { computeCalculated, resolveCalculated, safeDecimals } from "@/lib/calc";
import { computeFlag, patientAgeDays, findRange, displayRange, rangesWithOverride } from "@/lib/flags";
import { generateReportQR } from "@/lib/qr";
import { revealInFolder } from "@/lib/printing";
import { saveReportPdf, printReportPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";
import { buildWhatsAppMessage, sendWhatsAppSemi } from "@/lib/whatsapp";
import { formatDate } from "@/lib/format";
import { getHistograms } from "@/lib/queries/analyzer";
import { CbcSectionHistogram } from "@/components/report/Histogram";
import { OrderWithResult, Panel } from "@/types";
import { ChevronLeft, Printer, FileDown, MessageCircle, Mail, Check, ZoomIn, ZoomOut, Smartphone, ShieldCheck, Loader2, Pencil, Save, X, RotateCcw, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, IndentIncrease, IndentDecrease, Undo, Redo, RemoveFormatting, Baseline, Highlighter, ArrowUp, ArrowDown, FileType2 } from "lucide-react";
import { exportReportDocx, type ReportDocxModel, type DocxPanel, type DocxRow, type DocxSubSection } from "@/lib/docx";
import { rasterizeHistograms } from "@/lib/docxHistograms";
import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { SCLLogo } from "@/components/common/SCLLogo";

const NORMAL_QUALITATIVE = new Set(['NEGATIVE', 'NIL', 'NOT SEEN', 'ABSENT', 'NORMAL', 'CLEAR', 'PALE YELLOW']);

/** Escape user text before putting it into the email HTML body (patient name etc.). */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  ));
}

/**
 * Which discipline each panel prints under. On the printed report the discipline
 * (e.g. BIOCHEMISTRY) is a single centred heading, and the individual profiles within
 * it (e.g. LIVER FUNCTION TEST (LFT)) appear as left-aligned underlined sub-headings —
 * exactly as on the lab's existing letterhead reports. Unmapped panels stand alone.
 */
const DEPARTMENT: Record<string, string> = {
  HEM: 'HAEMATOLOGY', CBC: 'HAEMATOLOGY', DLCP: 'HAEMATOLOGY', COAG: 'HAEMATOLOGY',
  BIO: 'BIOCHEMISTRY', LFT: 'BIOCHEMISTRY', KFT: 'BIOCHEMISTRY',
  LIPID: 'BIOCHEMISTRY', ELEC: 'BIOCHEMISTRY', DIAB: 'BIOCHEMISTRY',
  THY: 'BIOCHEMISTRY', HORM: 'BIOCHEMISTRY',
  SERO: 'SEROLOGY',
  URINE: 'CLINICAL PATHOLOGY', STOOL: 'CLINICAL PATHOLOGY', FLUID: 'CLINICAL PATHOLOGY',
  MICRO: 'MICROBIOLOGY',
  MISC: 'MISCELLANEOUS',
};
const deptOf = (p: Panel): string => DEPARTMENT[p.code] ?? p.report_heading;

/** Urine test-code → section header. */
const URINE_SECTION: Record<string, string> = {
  U_QTY:     'PHYSICAL EXAMINATION',
  U_COLOUR:  'PHYSICAL EXAMINATION',
  U_APP:     'PHYSICAL EXAMINATION',
  U_REACT:   'PHYSICAL EXAMINATION',
  U_SG:      'PHYSICAL EXAMINATION',
  U_PROTEIN: 'CHEMICAL EXAMINATION',
  U_GLUCOSE: 'CHEMICAL EXAMINATION',
  U_KETONE:  'CHEMICAL EXAMINATION',
  U_BLOOD:   'CHEMICAL EXAMINATION',
  U_BILE_S:  'CHEMICAL EXAMINATION',
  U_BILE_P:  'CHEMICAL EXAMINATION',
  U_URO:     'CHEMICAL EXAMINATION',
  U_NITRITE: 'CHEMICAL EXAMINATION',
  U_PUS:     'MICROSCOPIC EXAMINATION',
  U_RBC:     'MICROSCOPIC EXAMINATION',
  U_EPIT:    'MICROSCOPIC EXAMINATION',
  U_CAST:    'MICROSCOPIC EXAMINATION',
  U_CRYSTAL: 'MICROSCOPIC EXAMINATION',
  U_BACTERIA:'MICROSCOPIC EXAMINATION',
};

/** CBC test-code → section header (LEUKOCYTES / ERYTHROCYTES / THROMBOCYTES). */
const CBC_SECTION: Record<string, string> = {
  WBC: 'LEUKOCYTES', LYM_PCT: 'LEUKOCYTES', MID_PCT: 'LEUKOCYTES', GRAN_PCT: 'LEUKOCYTES',
  LYM_NUM: 'LEUKOCYTES', MID_NUM: 'LEUKOCYTES', GRAN_NUM: 'LEUKOCYTES',
  RBC_CNT: 'ERYTHROCYTES', HGB: 'ERYTHROCYTES', HCT: 'ERYTHROCYTES', MCV: 'ERYTHROCYTES',
  MCH: 'ERYTHROCYTES', MCHC: 'ERYTHROCYTES', RDW_SD: 'ERYTHROCYTES', RDW_CV: 'ERYTHROCYTES',
  PLT_CBC: 'THROMBOCYTES', MPV: 'THROMBOCYTES', PCT_CBC: 'THROMBOCYTES',
  PDW_SD: 'THROMBOCYTES', PDW_CV: 'THROMBOCYTES', PLCR: 'THROMBOCYTES', PLCC: 'THROMBOCYTES',
};

// Bump this to force every layout setting back to the known-good defaults (clears any
// accumulated experimental/buggy values from older builds).
const LAYOUT_VERSION = '4';
const layoutFresh = (): boolean => localStorage.getItem('scl_layout_v') === LAYOUT_VERSION;

export function ReportPreviewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const pid = parseInt(patientId ?? '0');
  // Once per build version: discard old layout settings so the clean default layout shows.
  useEffect(() => { localStorage.setItem('scl_layout_v', LAYOUT_VERSION); }, []);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const sessionUser = useSession(s => s.user);
  const [approving, setApproving] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(100);
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // In-app report editing: when `editing`, only the [data-editable-body] regions become
  // editable (chrome stays locked). Saving stores the edited HTML so the report screen
  // (and every print/send) shows the edited version until "Revert to original".
  const [editing, setEditing] = useState(false);
  // While editing we edit a STATIC HTML snapshot (not the live React tree), set up
  // IMPERATIVELY via this ref — React must never manage the editable DOM (contentEditable +
  // dangerouslySetInnerHTML together is broken in WebViews; even Ctrl+A fails).
  const [editHtml, setEditHtml] = useState<string | null>(null);
  const editHostRef = useRef<HTMLDivElement>(null);
  // Pre-printed letterhead paper: when OFF, the physical print drops the header/footer
  // and shifts the body down so the data lands inside the paper's printed frame. Digital
  // copies (PDF, WhatsApp, email) always include the full letterhead.
  // Default OFF — the lab prints on pre-printed letterhead paper, so the digital header is
  // hidden and the body is positioned to land inside the paper's frame. Toggle ON for plain paper.
  const [printLetterhead, setPrintLetterhead] = useState(() => localStorage.getItem('scl_print_letterhead') === '1');
  // Robust numeric read: a missing OR empty/garbage stored value falls back to the default
  // (plain Number('') would silently become 0 and break the layout).
  const numLS = (key: string, def: number) => { const n = parseFloat(localStorage.getItem(key) ?? ''); return Number.isFinite(n) ? n : def; };
  const [preTop, setPreTop] = useState(() => numLS('scl_pre_top', 60));
  const [preBottom, setPreBottom] = useState(() => numLS('scl_pre_bottom', 24));
  const [sigHeightMm, setSigHeightMm] = useState(() => numLS('scl_sig_height', 14));
  // Blank space reserved at the bottom of every compact page (mm). The user wants a gap
  // below the data so it never runs to the very edge.
  const [bottomGapMm, setBottomGapMm] = useState(() => { const v = Number(localStorage.getItem('scl_bottom_gap')); return (layoutFresh() && v >= 0 && v <= 60) ? v : 12; });
  // Compact = pack panels across A4 pages (no panel split). Per-page = one A4 per panel.
  const [compactReport, setCompactReport] = useState(() => localStorage.getItem('scl_compact_report') !== '0');
  // Manual page placement: per-panel overrides on the auto-pagination. 'pull' = drag this
  // panel UP onto the previous page; 'before' = push it DOWN to start a fresh page.
  const [pageBreaks, setPageBreaks] = useState<Record<string, 'pull' | 'before'>>(() => {
    try { return JSON.parse(localStorage.getItem(`scl_breaks_${pid}`) || '{}'); } catch { return {}; }
  });
  function moveBlock(key: string, dir: 'up' | 'down') {
    setPageBreaks(prev => {
      const out = { ...prev };
      if (dir === 'up') { if (out[key] === 'pull') delete out[key]; else out[key] = 'pull'; }
      else { if (out[key] === 'before') delete out[key]; else out[key] = 'before'; }
      localStorage.setItem(`scl_breaks_${pid}`, JSON.stringify(out));
      return out;
    });
  }
  // Excel-style column widths for the standard 4-column tables (Test Name / Results / Units /
  // Normal Ranges), as percentages summing to 100. Drag a column border to resize; saved as a
  // lab-wide template so every report uses the chosen layout.
  const [colWidths, setColWidths] = useState<number[]>(() => {
    try { if (layoutFresh()) { const v = JSON.parse(localStorage.getItem('scl_colw') || ''); if (Array.isArray(v) && v.length === 4) return v; } } catch { /* ignore */ }
    return [24, 18, 12, 46];
  });
  function startColResize(idx: number, e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    const table = (e.currentTarget as HTMLElement).closest('table');
    const tableW = table?.getBoundingClientRect().width || 1;
    const startX = e.clientX;
    const startWidths = [...colWidths];
    let last = startWidths;
    const onMove = (ev: PointerEvent) => {
      const deltaPct = ((ev.clientX - startX) / tableW) * 100;
      const left = startWidths[idx] + deltaPct;
      const right = startWidths[idx + 1] - deltaPct;
      if (left < 6 || right < 6) return;   // keep both columns usable
      last = [...startWidths]; last[idx] = left; last[idx + 1] = right;
      setColWidths(last);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      localStorage.setItem('scl_colw', JSON.stringify(last));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  // Nudge the boundary between column `idx` and the next, by a fixed step (header button).
  function nudgeCol(idx: number, dir: 'left' | 'right') {
    setColWidths(prev => {
      const step = dir === 'left' ? -3 : 3;
      const left = prev[idx] + step;
      const right = prev[idx + 1] - step;
      if (left < 6 || right < 6) return prev;
      const out = [...prev]; out[idx] = left; out[idx + 1] = right;
      localStorage.setItem('scl_colw', JSON.stringify(out));
      return out;
    });
  }
  // INDEPENDENT per-column horizontal position: the left padding (px) of each column's cells.
  // Moving a column left/right only affects THAT column — nothing is shared with neighbours.
  // Defaults mirror the original paddings (Test Name 0, Results 8, Units 8, Normal Ranges 56).
  const [colOffset, setColOffset] = useState<number[]>(() => {
    try { if (layoutFresh()) { const v = JSON.parse(localStorage.getItem('scl_coloff') || ''); if (Array.isArray(v) && v.length === 4) return v; } } catch { /* ignore */ }
    return [0, 8, 8, 56];
  });
  function moveColumn(i: number, dir: 'left' | 'right') {
    setColOffset(prev => {
      const out = [...prev];
      out[i] = Math.max(0, Math.min(280, out[i] + (dir === 'left' ? -8 : 8)));
      localStorage.setItem('scl_coloff', JSON.stringify(out));
      return out;
    });
  }
  // Widen/narrow ONE column by `delta` %, taking the difference from the OTHER THREE columns
  // PROPORTIONALLY so the row always sums to 100% and stays balanced (you can't accidentally
  // blow one column up to 32% while another collapses).
  function adjustColWidth(i: number, delta: number) {
    setColWidths(prev => {
      const me = prev[i] + delta;
      if (me < 6 || me > 70) return prev;
      const otherTotal = prev.reduce((s, w, j) => s + (j === i ? 0 : w), 0);
      if (otherTotal <= 0) return prev;
      const out = prev.map((w, j) => j === i ? me : w - delta * (w / otherTotal));
      if (out.some((w, j) => j !== i && w < 6)) return prev;   // keep every column usable
      localStorage.setItem('scl_colw', JSON.stringify(out));
      return out;
    });
  }
  // Overall content scale (0.6–1.15): shrinks/grows ALL report content so it fits the page —
  // pagination accounts for it, so scaling down packs more onto each sheet.
  const [contentScale, setContentScale] = useState(() => { const v = Number(localStorage.getItem('scl_content_scale')); return (layoutFresh() && v >= 0.6 && v <= 1.15) ? v : 1; });
  const setScale = (v: number) => { const s = Math.min(1.15, Math.max(0.6, +v.toFixed(2))); setContentScale(s); localStorage.setItem('scl_content_scale', String(s)); };
  // Per-column horizontal alignment for the 4 standard columns.
  const [colAlign, setColAlign] = useState<('left' | 'center' | 'right')[]>(() => {
    try { if (layoutFresh()) { const v = JSON.parse(localStorage.getItem('scl_colalign') || ''); if (Array.isArray(v) && v.length === 4) return v; } } catch { /* ignore */ }
    return ['left', 'left', 'left', 'left'];
  });
  const cycleAlign = (i: number) => setColAlign(prev => {
    const order: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    const out = [...prev]; out[i] = order[(order.indexOf(prev[i]) + 1) % 3];
    localStorage.setItem('scl_colalign', JSON.stringify(out));
    return out;
  });
  // Row vertical padding (line spacing / density) in px.
  const [rowPad, setRowPad] = useState(() => { const v = Number(localStorage.getItem('scl_rowpad')); return (layoutFresh() && v >= 0 && v <= 10) ? v : 3; });
  const setRowPadding = (v: number) => { const p = Math.min(10, Math.max(0, Math.round(v))); setRowPad(p); localStorage.setItem('scl_rowpad', String(p)); };
  const autoDeliverTried = useRef(false);
  const autoSendTried = useRef(false);
  const [searchParams] = useSearchParams();

  const { data: patient } = useQuery({ queryKey: ['patient', pid], queryFn: () => getPatientById(pid) });
  const { data: orders = [] } = useQuery({ queryKey: ['orders', pid], queryFn: () => getOrdersWithResults(pid) });
  const { data: panels = [] } = useQuery({ queryKey: ['panels'], queryFn: listPanels });
  const { data: settings = {} } = useQuery({ queryKey: ['settings'], queryFn: getAllSettings });
  const { data: bill } = useQuery({ queryKey: ['bill', pid], queryFn: () => getBill(pid) });
  const { data: comment = '' } = useQuery({ queryKey: ['comment', pid], queryFn: () => getReportComment(pid) });
  const { data: histograms } = useQuery({ queryKey: ['histograms', pid], queryFn: () => getHistograms(pid) });
  const { data: rawOverride } = useQuery({ queryKey: ['report-override', pid], queryFn: () => getReportOverride(pid) });
  // Older builds (the TipTap experiment) could save a flattened/garbled override with no real
  // table. Treat such an override as invalid → fall back to the clean auto-generated report.
  const overrideValid = !!rawOverride && /<table/i.test(rawOverride);
  const reportOverride = overrideValid ? rawOverride : null;
  const { data: qr = '' } = useQuery({
    queryKey: ['qr', pid, patient?.test_no, patient?.report_time],
    queryFn: () => generateReportQR(patient!.test_no, patient!.name, patient!.report_time),
    enabled: !!patient,
  });

  const activeOrders = orders.filter(o => !o.order.not_done);
  // Calculated rows (e.g. A/G Ratio) are derived and may be blank when their inputs don't
  // allow a value — they must NOT gate approval. Only entered (non-calculated) tests do.
  const gatingOrders = activeOrders.filter(o => o.test.result_type !== 'calculated');
  // report_time is the authoritative approval flag (set atomically by approvePatient, cleared
  // by unlock). Keying off it — instead of re-deriving from every row's approved_at — keeps the
  // report page consistent with result-entry and stays correct even for all-not-done patients
  // (where there are no gating rows to inspect). handleApprove still guards the zero-result case.
  const isApproved = !!patient?.report_time;

  // Auto-deliver the report ONCE, right after it is approved — emailed to every patient who
  // has an email + SMTP set up, and (when the WhatsApp Cloud API is configured) sent on
  // WhatsApp to every patient with a phone. Runs the two sequentially so they never rasterise
  // the report at the same time, and dedupes via the delivery log so it never re-sends.
  useEffect(() => {
    if (autoDeliverTried.current) return;
    if (!isApproved || !patient || !orders.length) return;
    if (searchParams.get('send')) return;   // opened from the tray for a manual send — handled below
    const emailReady = !!patient.email && !!settings.smtp_host && !!settings.smtp_user && !!settings.smtp_pass;
    const waApiReady = !!patient.phone && settings.whatsapp_mode === 'api' && !!settings.bsp_api_key && !!settings.wa_phone_id;
    if (!emailReady && !waApiReady) return;
    autoDeliverTried.current = true;
    (async () => {
      await new Promise(r => setTimeout(r, 900));   // let the report DOM + QR settle before rasterising
      if (emailReady && !(await hasDelivered(pid, 'email'))) {
        setBusy('email');
        try {
          await emailCore();
          await logDelivery(pid, 'email', patient.email!, 'sent');
          setSent(s => ({ ...s, email: true }));
          toast.success('Report emailed to the patient.');
        } catch (e) {
          await logDelivery(pid, 'email', patient.email!, 'failed', String(e));
          toast.error(`Auto-email failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (waApiReady && !(await hasDelivered(pid, 'whatsapp_api'))) {
        setBusy('whatsapp');
        try {
          const pdfPath = await makePdf();
          if (!pdfPath) throw new Error('Could not generate the report PDF.');
          const { sendWhatsAppDocument } = await import('@/lib/whatsapp');
          await sendWhatsAppDocument({
            token: settings.bsp_api_key!, phoneNumberId: settings.wa_phone_id!,
            apiVersion: settings.wa_api_version || 'v21.0', to: patient.phone!,
            pdfPath, filename: `SCL-Report-${patient.test_no}.pdf`,
            caption: buildWhatsAppMessage({
              title: patient.title, name: patient.name, tests: panelSummary(),
              technicianName: settings.technician_name || settings.lab_name || 'the laboratory',
              technicianQual: settings.technician_qual ?? '', labName: settings.lab_name || 'the laboratory',
            }),
          });
          await logDelivery(pid, 'whatsapp_api', `91${patient.phone}`, 'sent');
          setSent(s => ({ ...s, whatsapp: true }));
          toast.success('Report sent on WhatsApp.');
        } catch (e) {
          await logDelivery(pid, 'whatsapp_api', `91${patient.phone}`, 'failed', String(e));
          toast.error(`Auto WhatsApp failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      setBusy(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproved, patient?.email, patient?.phone, orders.length, settings.smtp_host, settings.smtp_user, settings.smtp_pass, settings.whatsapp_mode, settings.bsp_api_key, settings.wa_phone_id]);

  // Opened from the dashboard "Waiting to Send" tray with ?send=whatsapp|print — run it
  // here, where the report is rendered and the PDF can actually be produced.
  useEffect(() => {
    const action = searchParams.get('send');
    if (!action || autoSendTried.current) return;
    if (!isApproved || !patient || !orders.length) return;
    autoSendTried.current = true;
    const t = setTimeout(async () => {
      if (action === 'whatsapp') {
        // Don't auto-resend if this report was already delivered on WhatsApp.
        if (await hasDelivered(pid, 'whatsapp_api') || await hasDelivered(pid, 'whatsapp_semi')) return;
        handleWhatsApp();
      } else if (action === 'print') handlePrint();
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isApproved, patient, orders.length]);

  // Build the numeric values map (by test code) for calculated rows.
  const enteredMap: Record<string, number | null> = {};
  for (const o of orders) {
    if (o.result?.value) {
      const n = parseFloat(o.result.value.replace(/,/g, ''));
      if (!isNaN(n)) enteredMap[o.test.code] = n;
    }
  }
  // Fold calculated values back in so ratios that depend on other derived values
  // (A/G ratio via GLO, LDL/HDL ratio via LDL) resolve instead of printing blank.
  const calcTests = orders
    .filter(o => o.test.result_type === 'calculated' && o.test.formula)
    .map(o => ({ code: o.test.code, formula: o.test.formula }));
  const calcCtx = patient
    ? { ageYears: patientAgeDays(patient.age, patient.age_unit) / 365.25, sex: patient.sex }
    : undefined;
  const valuesMap = resolveCalculated(enteredMap, calcTests, calcCtx);

  // Group active orders by panel, preserving panel sort order. Only tests that actually have a
  // value are printed — un-entered / blank rows (e.g. a calculated row whose inputs are missing,
  // or a sub-test the lab chose to leave empty) are left off the report entirely. A panel whose
  // every test is blank therefore drops off too.
  const panelMap = new Map<string, { panel: Panel; orders: OrderWithResult[] }>();
  for (const o of activeOrders) {
    if (!resultValue(o).trim()) continue;
    const code = o.test.panel_code ?? 'MISC';
    if (!panelMap.has(code)) {
      const p = panels.find(pp => pp.code === code)
        ?? { id: 0, code, name: code, report_heading: code, sort_order: 99, page_break_after: 0 };
      panelMap.set(code, { panel: p, orders: [] });
    }
    panelMap.get(code)!.orders.push(o);
  }
  const sortedPanels = [...panelMap.values()].sort((a, b) => a.panel.sort_order - b.panel.sort_order);

  function resultValue(o: OrderWithResult): string {
    if (o.test.result_type === 'calculated' && o.test.formula) {
      const c = computeCalculated(o.test.code, o.test.formula, valuesMap, calcCtx);
      if (c == null) return '';
      if (typeof c === 'string') return c;
      return c.toFixed(safeDecimals(o.test.decimals));
    }
    return o.result?.value ?? '';
  }

  function rangeText(o: OrderWithResult): string {
    if (!patient) return '';
    if (o.order.range_override) return o.order.range_override;
    return displayRange(findRange(o.ranges, patient.sex, patientAgeDays(patient.age, patient.age_unit)));
  }

  // Shared report-table fragments (used by both grouped and one-per-page layouts).
  const HEAD_LABELS = ['Test Name', 'Results', 'Units', 'Normal Ranges'];
  // RIGHT padding only — the LEFT padding is the adjustable per-column position (colOffset).
  const HEAD_PAD = ['pr-4', 'pr-5', 'pr-2', 'pr-2'];
  // One header cell with: ←/→ buttons to shift the column boundary (like the test up/down
  // buttons) AND a drag handle for fine Excel-style resizing. data-report-control → stripped
  // from PDF/print/edit.
  const colHeaderCell = (label: string, i: number, extraClass = '') => (
    <th key={i} className={cn("pb-1 font-bold text-black text-[14.5px] relative group/col whitespace-nowrap", HEAD_PAD[i], extraClass)} style={{ textAlign: colAlign[i], paddingLeft: colOffset[i] }}>
      {label}
      {i < 3 && (
        <>
          {/* ←/→ shift buttons (appear on hover over the column header) */}
          <span data-report-control contentEditable={false}
            className="report-control absolute -top-2 right-1 z-30 flex gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity print:hidden">
            <button type="button" title="Shift boundary left (narrower)" onClick={() => nudgeCol(i, 'left')}
              className="h-5 w-5 inline-flex items-center justify-center rounded border border-[#e6e7ee] bg-white text-[#54555f] shadow-sm hover:border-[#c7c9ff] hover:text-[#4f46e5]">‹</button>
            <button type="button" title="Shift boundary right (wider)" onClick={() => nudgeCol(i, 'right')}
              className="h-5 w-5 inline-flex items-center justify-center rounded border border-[#e6e7ee] bg-white text-[#54555f] shadow-sm hover:border-[#c7c9ff] hover:text-[#4f46e5]">›</button>
          </span>
          {/* drag handle on the boundary */}
          <span data-report-control contentEditable={false} onPointerDown={e => startColResize(i, e)}
            title="Drag to resize this column" style={{ touchAction: 'none' }}
            className="report-control absolute top-0 right-0 z-20 h-full w-3 translate-x-1/2 cursor-col-resize print:hidden">
            <span className="block mx-auto h-full w-[2px] bg-[#c7c9ff] opacity-0 group-hover/col:opacity-100 transition-opacity" />
          </span>
        </>
      )}
    </th>
  );
  const renderHead = () => (
    <>
      <colgroup>
        {colWidths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
      </colgroup>
      <thead>
        <tr className="border-b border-gray-400">
          {HEAD_LABELS.map((label, i) => colHeaderCell(label, i))}
        </tr>
      </thead>
    </>
  );
  // A test's interpretation box, rendered as a full-width row DIRECTLY BELOW that test.
  const noteRow = (o: OrderWithResult) => o.test.interpretation_note ? (
    <tr key={`note-${o.order.id}`} data-note-row>
      <td colSpan={4} className="pt-1 pb-2">
        <div className="border border-gray-700 px-3 py-2 text-[12px] text-gray-900 leading-[1.65] whitespace-pre-line">
          {o.test.interpretation_note}
        </div>
      </td>
    </tr>
  ) : null;
  const renderRows = (rows: OrderWithResult[]) => rows.flatMap(o => {
    const value = resultValue(o);
    const ageDays = patient ? patientAgeDays(patient.age, patient.age_unit) : 0;
    const range = rangeText(o);
    const matchedRange = patient ? findRange(o.ranges, patient.sex, ageDays) : null;
    const unit = o.order.unit_override || matchedRange?.unit || o.test.unit;
    const cells = [o.test.name, value || '—', (unit && unit !== '—' ? unit : ''), range.replace(/ \/ /g, "\n")];
    const tr = (
      <tr key={o.order.id}>
        {cells.map((c, i) => (
          <td
            key={i}
            className={cn("align-top", HEAD_PAD[i], i === 1 && "tabular-nums", i < 2 ? "text-gray-950" : "text-gray-800", i === 2 && "whitespace-nowrap", i === 3 && "whitespace-pre-line")}
            style={{ paddingTop: rowPad, paddingBottom: rowPad, paddingLeft: colOffset[i], textAlign: colAlign[i] }}
          >
            {c}
          </td>
        ))}
      </tr>
    );
    const nr = noteRow(o);
    return nr ? [tr, nr] : [tr];
  });

  /** Column header row for CBC tables — 5 columns (4 data + 1 histogram). The 4 data columns
   *  share the adjustable colWidths (so the ←/→ buttons & drag work here too, fixing the
   *  too-narrow "Results" column); the histogram column is a fixed 62 mm. */
  const CBC_HISTO_MM = 62;
  const CBC_DATA_MM = 124;   // 186mm body − 62mm histogram
  const renderCbcHead = () => (
    <>
      <colgroup>
        {colWidths.map((w, i) => <col key={i} style={{ width: `${(w / 100 * CBC_DATA_MM).toFixed(1)}mm` }} />)}
        <col style={{ width: `${CBC_HISTO_MM}mm` }} />
      </colgroup>
      <thead>
        <tr>
          {HEAD_LABELS.map((label, i) => colHeaderCell(label, i))}
          <th style={{ width: `${CBC_HISTO_MM}mm` }}></th>
        </tr>
      </thead>
    </>
  );

  /** CBC renderer: each section's histogram sits in a rowspan cell next to its rows,
   *  so WBC/RBC/PLT charts align exactly with LEUKOCYTES/ERYTHROCYTES/THROMBOCYTES. */
  const renderCbcWithHistograms = (allRows: OrderWithResult[]) => {
    if (!patient) return renderRows(allRows);
    const ageDays = patientAgeDays(patient.age, patient.age_unit);

    type SGroup = { section: string; rows: OrderWithResult[] };
    const groups: SGroup[] = [];
    for (const o of allRows) {
      const sec = CBC_SECTION[o.test.code] ?? '';
      const last = groups[groups.length - 1];
      if (!last || last.section !== sec) groups.push({ section: sec, rows: [o] });
      else last.rows.push(o);
    }

    return groups.flatMap(({ section, rows: sRows }) => {
      const hasChart = section === 'LEUKOCYTES' || section === 'ERYTHROCYTES' || section === 'THROMBOCYTES';
      const spanCount = sRows.length + 1; // section header + its data rows
      const headerRow = section ? (
        <tr key={`hdr-${section}`}>
          <td colSpan={4} className="pt-2 pb-[2px] text-[11px] font-bold text-black uppercase tracking-wide border-b border-gray-500">
            {section}
          </td>
          {hasChart && (
            <td rowSpan={spanCount} style={{ verticalAlign: 'middle', paddingLeft: '4mm' }}>
              <CbcSectionHistogram section={section} orders={allRows} histos={histograms} />
            </td>
          )}
        </tr>
      ) : null;
      const dataRows = sRows.map(o => {
        const value = resultValue(o);
        const flag = computeFlag(o.test.result_type, value, rangesWithOverride(o.ranges, o.order.range_override), patient.sex, ageDays);
        const isAbnormal = flag === 'H' || flag === 'L';
        const range = rangeText(o);
        const matchedRange = findRange(o.ranges, patient.sex, ageDays);
        const unit = o.order.unit_override || matchedRange?.unit || o.test.unit;
        return (
          <tr key={o.order.id}>
            <td className={cn("align-top", HEAD_PAD[0], isAbnormal ? "font-bold text-black" : "text-gray-950")}
              style={{ paddingTop: rowPad, paddingBottom: rowPad, paddingLeft: colOffset[0], textAlign: colAlign[0] }}>
              {o.test.name}
            </td>
            <td className={cn("align-top tabular-nums", HEAD_PAD[1], isAbnormal ? "font-bold text-black" : "text-gray-950")}
              style={{ paddingTop: rowPad, paddingBottom: rowPad, paddingLeft: colOffset[1], textAlign: colAlign[1] }}>
              {value || '—'}
            </td>
            <td className={cn("align-top text-gray-800 whitespace-nowrap", HEAD_PAD[2])}
              style={{ paddingTop: rowPad, paddingBottom: rowPad, paddingLeft: colOffset[2], textAlign: colAlign[2] }}>
              {unit && unit !== '—' ? unit : ''}
            </td>
            <td className={cn("align-top text-gray-800 whitespace-pre-line", HEAD_PAD[3])}
              style={{ paddingTop: rowPad, paddingBottom: rowPad, paddingLeft: colOffset[3], textAlign: colAlign[3] }}>
              {range.replace(/ \/ /g, "\n")}
            </td>
          </tr>
        );
      });
      return headerRow ? [headerRow, ...dataRows] : dataRows;
    });
  };

  /** Urine renderer: inserts PHYSICAL / CHEMICAL / MICROSCOPIC EXAMINATION section headers. */
  const renderUrineRows = (rows: OrderWithResult[]) => {
    const out: React.ReactNode[] = [];
    let currentSection = '';
    for (const o of rows) {
      const section = URINE_SECTION[o.test.code] ?? '';
      if (section && section !== currentSection) {
        currentSection = section;
        out.push(
          <tr key={`usec-${section}`}>
            <td colSpan={4} className="pt-2 pb-[2px] text-[11px] font-bold text-black uppercase tracking-wide border-b border-gray-500">
              {section}
            </td>
          </tr>
        );
      }
      const value = resultValue(o);
      const ageDays = patient ? patientAgeDays(patient.age, patient.age_unit) : 0;
      const range = rangeText(o);
      const matchedRange = patient ? findRange(o.ranges, patient.sex, ageDays) : null;
      const unit = o.order.unit_override || matchedRange?.unit || o.test.unit;
      const cells = [o.test.name, value || '—', (unit && unit !== '—' ? unit : ''), range.replace(/ \/ /g, "\n")];
      out.push(
        <tr key={o.order.id}>
          {cells.map((c, i) => (
            <td
              key={i}
              className={cn("align-top", HEAD_PAD[i], i === 1 && "tabular-nums", i < 2 ? "text-gray-950" : "text-gray-800", i === 2 && "whitespace-nowrap", i === 3 && "whitespace-pre-line")}
              style={{ paddingTop: rowPad, paddingBottom: rowPad, paddingLeft: colOffset[i], textAlign: colAlign[i] }}
            >
              {c}
            </td>
          ))}
        </tr>
      );
      const nr = noteRow(o);
      if (nr) out.push(nr);
    }
    return out;
  };

  // skipPerTest: per-test interpretation boxes are now rendered INLINE (right under each test),
  // so the standard/urine tables pass true and this only emits the panel-wide band text.
  const renderNotes = (rows: OrderWithResult[], skipPerTest = false) => {
    // Interpretation boxes print AFTER the whole test table (never between rows) — one box per
    // test that carries an interpretation, in order. Plus the patient-matched band text.
    const ageDays = patient ? patientAgeDays(patient.age, patient.age_unit) : 0;
    const band = patient
      ? rows.map(r => findRange(r.ranges, patient.sex, ageDays)?.band_text).find(Boolean)
      : undefined;
    const notes = skipPerTest ? [] : rows.filter(r => r.test.interpretation_note);
    if (!band && notes.length === 0) return null;
    return (
      <>
        {band && <div className="mt-1 text-[12px] text-gray-800 whitespace-pre-line">{band}</div>}
        {notes.map(r => (
          <div key={r.order.id} className="mt-2 border border-gray-700 px-3 py-2 text-[12px] text-gray-900 leading-[1.65] whitespace-pre-line">
            {r.test.interpretation_note}
          </div>
        ))}
      </>
    );
  };

  /** The body of one panel (table + interpretation notes), shared by every layout mode. */
  const renderPanelBody = (pg: { panel: Panel; orders: OrderWithResult[] }) =>
    pg.panel.code === 'CBC' ? (
      <>
        <table className="w-full text-[14px] border-collapse" style={{ tableLayout: 'fixed' }}>
          {renderCbcHead()}
          <tbody>{renderCbcWithHistograms(pg.orders)}</tbody>
        </table>
        {renderNotes(pg.orders)}
      </>
    ) : pg.panel.code === 'URINE' ? (
      <>
        <table className="w-full table-fixed text-[14px] border-collapse">
          {renderHead()}
          <tbody>{renderUrineRows(pg.orders)}</tbody>
        </table>
        {renderNotes(pg.orders, true)}
      </>
    ) : (
      <>
        <table className="w-full table-fixed text-[14px] border-collapse">
          {renderHead()}
          <tbody>{renderRows(pg.orders)}</tbody>
        </table>
        {renderNotes(pg.orders, true)}
      </>
    );

  async function withLog(channel: 'print' | 'pdf' | 'whatsapp_semi' | 'whatsapp_api' | 'email' | 'sms', target: string, key: string, fn: () => Promise<void> | void) {
    setBusy(key);
    try {
      await fn();
      await logDelivery(pid, channel, target, 'sent');
      setSent(s => ({ ...s, [key]: true }));
    } catch (err) {
      await logDelivery(pid, channel, target, 'failed', String(err));
      toast.error(err);
    } finally {
      setBusy(null);
    }
  }

  function reportEl(): HTMLElement {
    const el = document.getElementById('report-print-area');
    if (!el) throw new Error('Report not ready.');
    return el;
  }

  async function makePdf(): Promise<string> {
    const el = reportEl();
    // Digital copies (PDF / WhatsApp / Email) ALWAYS include the full letterhead, even
    // when the on-screen preview is in "no letterhead" mode for pre-printed paper.
    const hadNoLetterhead = el.classList.contains('no-letterhead');
    if (hadNoLetterhead) el.classList.remove('no-letterhead');
    // Hide the on-screen move controls during rasterisation (they're screen-only, but
    // html2canvas captures the screen DOM, so print:hidden alone won't drop them).
    const controls = Array.from(el.querySelectorAll<HTMLElement>('[data-report-control]'));
    controls.forEach(c => { c.style.display = 'none'; });
    try {
      // wait two frames so the full-letterhead layout actually paints before rasterising
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      // and wait for every image (logo, signature, QR) to finish decoding, so they are
      // never missing from a manually-saved / WhatsApp / Email PDF (a refetch-timing race).
      await Promise.all(
        Array.from(el.querySelectorAll('img')).map(img =>
          img.decode().catch(() => undefined)
        )
      );
      return await saveReportPdf({
        element: el,
        testNo: patient!.test_no,
        name: patient!.name,
        reportDate: patient!.report_time,
      });
    } finally {
      if (hadNoLetterhead) el.classList.add('no-letterhead');
      controls.forEach(c => { c.style.display = ''; });
    }
  }

  const panelSummary = () => sortedPanels.map(p => p.panel.report_heading).join(', ') || 'Lab Report';

  function handlePrint() {
    const isWindows = /win/i.test(navigator.userAgent);
    if (isWindows) {
      // Windows WebView2 shows the native print dialog directly (like Ctrl+P in Word).
      window.print();
      logDelivery(pid, 'print', settings.printer_name ?? 'Default printer', 'sent').catch(() => {});
      setSent(s => ({ ...s, print: true }));
      return;
    }
    // macOS WKWebView ignores window.print(), so render the report to a PDF and open it in
    // Preview — pressing ⌘P there shows the print dialog and lets you pick the printer.
    withLog('print', settings.printer_name ?? 'Default printer', 'print', async () => {
      await printReportPdf({ element: reportEl(), testNo: patient!.test_no, name: patient!.name });
    });
  }

  function handlePdf() {
    withLog('pdf', 'Documents/SCL Reports', 'pdf', async () => {
      const path = await makePdf();
      if (path) {
        await revealInFolder(path);
        toast.success('PDF saved to your reports folder.');
      }
    });
  }

  // Build the serializable model the .docx generator consumes, reusing the SAME value/range/
  // flag/unit logic as the on-screen report so the Word file matches the preview exactly.
  function buildDocxModel(): ReportDocxModel {
    const ageDays = patient ? patientAgeDays(patient.age, patient.age_unit) : 0;
    const toRow = (o: OrderWithResult): DocxRow => {
      const value = resultValue(o);
      const matched = patient ? findRange(o.ranges, patient.sex, ageDays) : null;
      const unit = o.order.unit_override || matched?.unit || o.test.unit || '';
      const flag = patient ? computeFlag(o.test.result_type, value, rangesWithOverride(o.ranges, o.order.range_override), patient.sex, ageDays) : '';
      return {
        name: o.test.name,
        value: value || '—',
        unit: unit && unit !== '—' ? unit : '',
        range: rangeText(o).replace(/ \/ /g, '\n'),
        abnormal: flag === 'H' || flag === 'L',
        note: o.test.interpretation_note || null,
      };
    };
    const bandFor = (orders: OrderWithResult[]) =>
      patient ? orders.map(r => findRange(r.ranges, patient.sex, ageDays)?.band_text).find(Boolean) ?? null : null;
    const groupSections = (orders: OrderWithResult[], map: Record<string, string>): DocxSubSection[] => {
      const out: DocxSubSection[] = [];
      for (const o of orders) {
        const label = map[o.test.code] ?? '';
        let sec = out[out.length - 1];
        if (!sec || sec.label !== label) { sec = { label, rows: [] }; out.push(sec); }
        sec.rows.push(toRow(o));
      }
      return out;
    };

    let prevDept = '';
    const panels: DocxPanel[] = sortedPanels.map(({ panel, orders }) => {
      const dept = deptOf(panel);
      const showDept = dept !== prevDept; prevDept = dept;
      const heading = panel.report_heading !== dept ? panel.report_heading : undefined;
      const bandText = bandFor(orders);
      if (panel.code === 'CBC') return { code: panel.code, dept, showDept, heading, layout: 'cbc', sections: groupSections(orders, CBC_SECTION), bandText };
      if (panel.code === 'URINE') return { code: panel.code, dept, showDept, heading, layout: 'urine', sections: groupSections(orders, URINE_SECTION), bandText };
      return { code: panel.code, dept, showDept, heading, layout: 'standard', rows: orders.map(toRow), bandText };
    });

    const g = patient!.sex === 'MALE' ? 'Male' : patient!.sex === 'FEMALE' ? 'Female' : 'Other';
    const patientPairs: [string, string][] = [
      ['Name', `${patient!.title} ${patient!.name}`],
      ['Test Request ID', String(patient!.test_no)],
      ['Age/Gender', `${patient!.age} ${patient!.age_unit} / ${g}`],
      ['Sample Collected ON', formatDate(patient!.sample_time)],
      ['Collected AT', patient!.collected_at ?? ''],
      ['Sample Received ON', formatDate(patient!.sample_time)],
      ['Referred By', patient!.doctor_name ?? 'SELF'],
      ['Report DATE', formatDate(patient!.report_time)],
    ];
    return { patientPairs, panels, comment: comment || undefined };
  }

  function handleDocx() {
    withLog('pdf', 'Documents/SCL Reports', 'docx', async () => {
      const model = buildDocxModel();
      const histogramPngs = await rasterizeHistograms(sortedPanels, histograms);
      const path = await exportReportDocx({
        model, settings, histogramPngs, qr,
        testNo: patient!.test_no, name: patient!.name, reportDate: patient!.report_time,
      });
      if (path) { await revealInFolder(path); toast.success('Word document saved & opened.'); }
    });
  }

  function handleWhatsApp() {
    if (!patient?.phone) return;
    const msg = buildWhatsAppMessage({
      title: patient.title, name: patient.name, tests: panelSummary(),
      // Sign with the lab's own signatory, falling back to the lab name — NEVER a hardcoded
      // person (that leaked one tenant's signatory onto every other lab's messages).
      technicianName: settings.technician_name || settings.lab_name || 'the laboratory',
      technicianQual: settings.technician_qual ?? '', labName: settings.lab_name || 'the laboratory',
    });
    // Fully-automatic Cloud API path (sends the actual PDF) when configured.
    const apiReady = settings.whatsapp_mode === 'api' && settings.bsp_api_key && settings.wa_phone_id;
    if (apiReady) {
      withLog('whatsapp_api', `91${patient.phone}`, 'whatsapp', async () => {
        const pdfPath = await makePdf();
        if (!pdfPath) throw new Error('Could not generate the report PDF.');
        const { sendWhatsAppDocument } = await import('@/lib/whatsapp');
        await sendWhatsAppDocument({
          token: settings.bsp_api_key!,
          phoneNumberId: settings.wa_phone_id!,
          apiVersion: settings.wa_api_version || 'v21.0',
          to: patient.phone,
          pdfPath,
          filename: `SCL-Report-${patient.test_no}.pdf`,
          caption: msg,
        });
        toast.success('Report sent on WhatsApp.');
      });
      return;
    }
    // Semi-automatic fallback (free, dad's number): copy the PDF to the clipboard and open
    // the chat with the text ready — the user just pastes (Ctrl/⌘+V) and presses Enter.
    withLog('whatsapp_semi', `91${patient.phone}`, 'whatsapp', async () => {
      const pdfPath = (await makePdf()) || undefined;
      const { copyPdfToClipboard } = await import('@/lib/whatsapp');
      if (pdfPath) await copyPdfToClipboard(pdfPath);
      await sendWhatsAppSemi(patient.phone, msg, pdfPath);
      if (pdfPath) {
        alert(
          'WhatsApp chat opened and the report PDF is on the clipboard.\n\n' +
          '1. Click into the chat\n' +
          '2. Press Ctrl + V  (⌘ + V on Mac) to paste the PDF\n' +
          '3. Press Enter to send.\n\n' +
          '(If paste doesn’t attach it, use the “+” button → Document → the highlighted file.)'
        );
      }
    });
  }

  function handleSms() {
    if (!patient?.phone) { toast.error('This patient has no mobile number on file.'); return; }
    if (!settings.sms_api_key || !settings.sms_sender_id) {
      toast.error('SMS is not set up yet. Go to Settings → SMS to configure it.');
      return;
    }
    withLog('sms', `91${patient.phone}`, 'sms', async () => {
      const { sendSms, buildSmsMessage } = await import('@/lib/sms');
      const patientName = `${patient.title} ${patient.name}`.trim();
      await sendSms({
        provider: settings.sms_provider ?? 'fast2sms',
        apiKey: settings.sms_api_key!,
        senderId: settings.sms_sender_id!,
        dltTemplateId: settings.sms_dlt_template_id ?? '',
        phone: patient.phone,
        message: buildSmsMessage({ name: patientName, testNo: patient.test_no, labName: settings.lab_name }),
        vars: [patientName, String(patient.test_no)],
      });
      toast.success('SMS sent.');
    });
  }

  // Core email send (no UI side-effects) — shared by the manual button and auto-on-approve.
  async function emailCore(): Promise<void> {
    const host = settings.smtp_host, port = settings.smtp_port, user = settings.smtp_user, pass = settings.smtp_pass;
    const pdfPath = await makePdf();
    // The whole point of the email is the attached report — never send "please find attached"
    // with nothing attached.
    if (!pdfPath) throw new Error('Could not generate the report PDF — email not sent.');
    const labName = settings.lab_name || 'the laboratory';
    const tech = settings.technician_name || labName;   // sign with the lab name if no signatory set — never Sharma
    const bodyHtml = `<div style="font-family:Inter,Arial,sans-serif;color:#14151c">
      <p>Dear ${esc(patient!.title)} ${esc(patient!.name)},</p>
      <p>Please find attached your laboratory report (${esc(panelSummary())}) from
      <b style="color:#7b1b1b">${esc(labName)}</b>${settings.address_line ? `, ${esc(settings.address_line)}` : ''}.</p>
      <p style="color:#6b7280;font-size:13px">This is a computer-generated report. For queries, contact the laboratory.</p>
      <p style="margin-top:18px">— ${esc(tech)}<br/>${esc(settings.technician_qual ?? '')}</p>
    </div>`;
    await sendEmail({
      host, port: parseInt(port, 10) || 587, username: user, password: pass,
      to: patient!.email!, subject: `Lab Report — ${patient!.title} ${patient!.name} (#${patient!.test_no})`,
      bodyHtml, pdfPath,
    });
  }

  function handleEmail() {
    if (!patient?.email) { toast.error('This patient has no email address on file.'); return; }
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
      toast.error('Email is not set up yet. Go to Settings → Email to configure it.');
      return;
    }
    withLog('email', patient.email, 'email', async () => {
      await emailCore();
      toast.success('Email sent.');
    });
  }

  async function handleApprove() {
    if (!sessionUser || approving) return;
    if (gatingOrders.length === 0) {
      toast.error('There are no results to approve. Enter at least one test result first.');
      return;
    }
    setApproving(true);
    try {
      await approvePatient(pid, sessionUser.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['orders', pid] }),
        qc.invalidateQueries({ queryKey: ['patient', pid] }),
        qc.invalidateQueries({ queryKey: ['today-patients'] }),
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        qc.invalidateQueries({ queryKey: ['patients-search'] }),
        qc.invalidateQueries({ queryKey: ['pending-deliveries'] }),
      ]);
      toast.success('Report approved — you can now print or send it.');
    } catch (e) {
      toast.error(e);
    } finally {
      setApproving(false);
    }
  }

  // ── In-app report editing (in-place) ──
  // We edit the ACTUAL rendered report (so the editable preview looks EXACTLY like the print/PDF:
  // paginated, with the letterhead, name box & footer on every page). The chrome carries
  // contenteditable="false" so it stays locked; everything else is editable. The host is filled
  // and made editable IMPERATIVELY via a ref (React must not manage the editable DOM).
  function startEdit() {
    // Freeze the current rendered report (all pages, chrome) into a snapshot, minus the
    // on-screen move/resize controls, then edit that snapshot. Strip the per-page auto-fit
    // `zoom` so the editor (and the saved override) aren't permanently shrunk by a one-off fit.
    const el = document.getElementById('report-print-area');
    const clone = el?.cloneNode(true) as HTMLElement | null;
    clone?.querySelectorAll('[data-report-control]').forEach(n => n.remove());
    clone?.querySelectorAll<HTMLElement>('[data-editable-body]').forEach(s => { s.style.zoom = ''; });
    setEditHtml(reportOverride ?? clone?.innerHTML ?? '');
    setEditing(true);
  }
  function cancelEdit() { setEditing(false); setEditHtml(null); }
  // Auto-heal: silently discard a leftover broken override so the patient shows the clean report.
  useEffect(() => {
    if (rawOverride && !overrideValid) {
      clearReportOverride(pid).then(() => qc.invalidateQueries({ queryKey: ['report-override', pid] })).catch(() => {});
    }
  }, [rawOverride, overrideValid, pid, qc]);
  // Fill the editable host imperatively, lock the chrome, make the rest editable, focus it.
  useEffect(() => {
    if (!editing || editHtml == null) return;
    const host = editHostRef.current;
    if (!host) return;
    host.innerHTML = editHtml;
    host.contentEditable = 'true';
    // Re-assert locked chrome (in case a snapshot lost the attribute).
    host.querySelectorAll<HTMLElement>('.report-letterhead, .report-letterfoot').forEach(el => { el.contentEditable = 'false'; });
    host.querySelectorAll<HTMLElement>('section[contenteditable], [data-name-box]').forEach(el => { el.contentEditable = 'false'; });
    host.focus({ preventScroll: true });
  }, [editing, editHtml]);

  async function saveEditedBody(html: string) {
    try {
      await saveReportOverride(pid, html);
      await qc.invalidateQueries({ queryKey: ['report-override', pid] });
      setEditing(false);
      setEditHtml(null);
      toast.success("Saved. This edited report is what prints & sends.");
    } catch (e) { toast.error(e); }
  }
  function saveEdit() {
    const host = editHostRef.current;
    if (!host) { setEditing(false); return; }
    saveEditedBody(host.innerHTML);
  }
  // Ctrl/Cmd + and − zoom the preview (and Ctrl/Cmd 0 resets) — like a browser/Word, so the
  // whole report can be scaled to fit the screen. Intercepts the WebView's own zoom.
  useEffect(() => {
    function onZoomKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(z => Math.min(200, z + 10)); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(z => Math.max(25, z - 10)); }
      else if (e.key === '0') { e.preventDefault(); setZoom(100); }
    }
    window.addEventListener('keydown', onZoomKey);
    return () => window.removeEventListener('keydown', onZoomKey);
  }, []);

  async function revertEdit() {
    try {
      await clearReportOverride(pid);
      await qc.invalidateQueries({ queryKey: ['report-override', pid] });
      setEditing(false);
      setEditHtml(null);
      toast.success("Reverted to the original report.");
    } catch (e) { toast.error(e); }
  }

  // NOTE: all hooks (incl. the useCallback chrome components below) MUST run before any early
  // return, or React throws "rendered more hooks than previous render" when patient loads.
  const genderLabel = patient?.sex === 'MALE' ? 'Male' : patient?.sex === 'FEMALE' ? 'Female' : 'Other';
  const labName = settings.lab_name || 'YOUR LABORATORY';

  // These chrome components are wrapped in useCallback so their function identity stays STABLE
  // across the frequent layout-state changes (zoom, column sliders, row spacing). Without this
  // they'd be recreated every render, forcing React to remount them — which reloads the logo /
  // QR / signature images and races the pagination measurement. Deps = only what they render.
  const Watermark = useCallback(() => showWatermark ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
      <span style={{ transform: 'rotate(-35deg)', fontSize: '46px', color: 'rgba(123,27,27,0.05)', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {labName}
      </span>
    </div>
  ) : null, [showWatermark, labName]);

  const Letterhead = useCallback(() => (
    <header contentEditable={false} suppressContentEditableWarning className="report-letterhead relative">
      <div className="flex items-start gap-3">
        {settings.logo_data
          ? <img src={settings.logo_data} alt="SCL" className="h-[58px] w-auto object-contain shrink-0" />
          : <SCLLogo height={44} className="shrink-0 mt-1" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="report-title text-[#7b1b1b]">{labName}</h1>
            {settings.address_line && (
              <p className="text-right text-[10.5px] font-bold uppercase text-gray-900 leading-tight pt-1 max-w-[210px]">
                {settings.address_line}
              </p>
            )}
          </div>
          <div className="inline-block border-[1.5px] border-gray-900 rounded-md px-2.5 py-[1px] mt-1 text-[10.5px] font-extrabold tracking-wide text-gray-900">
            FULLY COMPUTERISED HI-TECH LAB.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 items-start mt-1.5 text-[10.5px] text-gray-900">
        <p className="font-bold text-[#7b1b1b] leading-snug whitespace-pre-line">
          {settings.phones ? `Mob : ${settings.phones.replace(/^\s*mob\s*:?\s*/i, '').replace(/\s*\/\s*/, '\n')}` : ''}
        </p>
        {settings.timings && (
          <p className="text-center leading-snug whitespace-pre-line">
            {"Timing : " + settings.timings.replace(/\s*\|\s*/, "\n")}
          </p>
        )}
        <div className="text-right leading-tight">
          <p className="report-script text-[#7b1b1b] text-[16px]">{settings.technician_name ?? ''}</p>
          <p className="text-[10px]">{settings.technician_qual ?? ''}</p>
        </div>
      </div>
      {settings.equipment_line && (
        <div className="mt-1.5 text-[9.5px] font-bold text-gray-900 text-center leading-snug">
          Equipped With {settings.equipment_line.replace(/^\s*equipped with\s*/i, '')}
        </div>
      )}
      {/* navy rule separating the letterhead from the report body (matches the printed pad) */}
      <div className="mt-1.5 border-b-[2.5px] border-[#1a3a8f]" />
    </header>
  ), [settings, labName]);

  const PatientStrip = useCallback(() => patient ? (
    <section contentEditable={false} suppressContentEditableWarning className="relative grid grid-cols-2 gap-x-8 gap-y-1 border border-gray-400 mt-3 p-3 text-[14px]">
      <p><strong>Name :</strong> {patient.title} {patient.name}</p>
      <p><strong>Test Request ID :</strong> {patient.test_no}</p>
      <p><strong>Age/Gender :</strong> {patient.age} {patient.age_unit} / {genderLabel}</p>
      <p><strong>Sample Collected ON :</strong> {formatDate(patient.sample_time)}</p>
      <p><strong>Collected AT :</strong> {patient.collected_at}</p>
      <p><strong>Sample Received ON :</strong> {formatDate(patient.sample_time)}</p>
      <p><strong>Referred By :</strong> {patient.doctor_name ?? 'SELF'}</p>
      <p><strong>Report DATE :</strong> {formatDate(patient.report_time)}</p>
    </section>
  ) : null, [patient, genderLabel]);

  const PageFooter = useCallback(({ pageIndex, total, isLast }: { pageIndex: number; total: number; isLast: boolean }) => (
    <footer contentEditable={false} suppressContentEditableWarning className="report-letterfoot relative mt-auto pt-2 border-t border-gray-400">
      <div className="flex justify-between items-end">
        {qr ? <img src={qr} alt="QR" width={66} height={66} className="opacity-90" /> : <span />}
        {showSignature && (
          <div className="text-center">
            {settings.signature_data
              ? <img src={settings.signature_data} alt="signature" style={{ height: `${sigHeightMm}mm` }} className="mx-auto object-contain" />
              : <div style={{ height: `${sigHeightMm}mm` }} className="w-32 flex items-end justify-center text-gray-300 text-[10px] italic">[ upload signature in Settings ]</div>}
            <p className="text-[11px] font-bold text-[#7b1b1b] underline underline-offset-2 mt-0.5">Lab Technician</p>
          </div>
        )}
      </div>
      {/* "End Of Report" prints on the LAST page only. */}
      {isLast && (
        <div className="text-center text-[14px] font-bold text-gray-900 mt-2 mb-1.5">*** End Of Report ***</div>
      )}
      {/* Navy rule + standard footer lines repeat on EVERY page (matches the printed letterhead). */}
      <div className={cn("border-t-[2.5px] border-[#1a3a8f] pt-1.5 flex justify-between items-baseline text-[11px] font-semibold text-gray-900", !isLast && "mt-2")}>
        <span>{settings.footer_left_text || 'NOT FOR MEDICO LEGAL PURPOSE'}</span>
        <span>{settings.footer_right_text || 'ALL TEST ARE AVAILABLE HERE'}</span>
      </div>
      {settings.footer_tests_line && (
        <div className="text-center text-[9.5px] font-bold text-gray-900 mt-1 leading-snug">
          {settings.footer_tests_line}
        </div>
      )}
      {total > 1 && <div className="text-right text-[9px] text-gray-400 mt-1">Page {pageIndex + 1} of {total}</div>}
    </footer>
  ), [qr, showSignature, settings, sigHeightMm]);

  // All hooks are above this line — safe to early-return now.
  if (!patient) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  // One A4 page per test profile (panel). The letterhead + patient strip repeat on every
  // page and a signed footer closes each — the "End of report" block lands on the last page.
  const pageList = sortedPanels.length ? sortedPanels : [null];

  return (
    <div className="flex gap-6">
      {/* ── Preview pane ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
            <ChevronLeft size={16} /> Back to Results
          </button>
          <div className="flex items-center gap-2 text-gray-500">
            <button onClick={() => setZoom(z => Math.max(25, z - 10))} className="p-1.5 rounded hover:bg-gray-100" title="Zoom out (Ctrl/Cmd −)"><ZoomOut size={15} /></button>
            <span className="text-xs w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded hover:bg-gray-100" title="Zoom in (Ctrl/Cmd +)"><ZoomIn size={15} /></button>
            <button onClick={() => setZoom(100)} className="px-2 py-1 rounded hover:bg-gray-100 text-[11px] font-medium" title="Reset zoom (Ctrl/Cmd 0)">Reset</button>
          </div>
        </div>

        {editing && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#eef0fe] border border-[#c7c9ff] px-3 py-1.5 text-[12.5px] text-[#4f46e5] print:hidden">
            <Pencil size={13} strokeWidth={2} />
            <span><strong>Editing</strong> — click any value to change it; select text and use the toolbar to format. Header, name box &amp; footer are locked. Then <strong>Save</strong>.</span>
          </div>
        )}
        {editing && <RichTextToolbar />}
        <div className="overflow-auto pb-8">
          <div style={{ width: `${zoom}%`, transformOrigin: 'top left' }} className="mx-auto">
            {(editing && editHtml != null) ? (
              // EDIT MODE: edit the REAL paginated report in place (looks exactly like the PDF).
              // Filled & made editable imperatively; the chrome stays contenteditable=false.
              <div
                key="edit"
                id="report-print-area"
                ref={editHostRef}
                className={cn("report-sheet relative", !printLetterhead && "no-letterhead")}
                style={{ ['--pre-top' as string]: `${preTop}mm`, ['--pre-bottom' as string]: `${preBottom}mm`, outline: '2px solid #6366f1' }}
              />
            ) : reportOverride ? (
              // Saved manual edit: render the stored full paginated report HTML statically.
              <div
                key="ov"
                id="report-print-area"
                className={cn("report-sheet relative", !printLetterhead && "no-letterhead")}
                style={{ ['--pre-top' as string]: `${preTop}mm`, ['--pre-bottom' as string]: `${preBottom}mm` }}
                dangerouslySetInnerHTML={{ __html: reportOverride }}
              />
            ) : (
            <div
              id="report-print-area"
              className={cn("report-sheet relative", !printLetterhead && "no-letterhead")}
              style={{ ['--pre-top' as string]: `${preTop}mm`, ['--pre-bottom' as string]: `${preBottom}mm` }}
            >
              {compactReport ? (
                <CompactPaginatedReport
                  sortedPanels={sortedPanels}
                  deptOf={deptOf}
                  renderPanelBody={renderPanelBody}
                  comment={comment}
                  bottomGapMm={bottomGapMm}
                  contentScale={contentScale}
                  measureKey={JSON.stringify([rowPad, colWidths, colOffset, colAlign])}
                  breaks={pageBreaks}
                  onMove={moveBlock}
                  Watermark={Watermark}
                  Letterhead={Letterhead}
                  PatientStrip={PatientStrip}
                  PageFooter={PageFooter}
                />
              ) : pageList.map((pg, idx) => {
                // Per-page mode: one A4 sheet per panel.
                const dept = pg ? deptOf(pg.panel) : '';
                const isLast = idx === pageList.length - 1;
                return (
                  <div
                    key={pg ? pg.panel.code : 'empty'}
                    data-report-page
                    className="report-page bg-white shadow-sm relative mx-auto flex flex-col"
                    style={{
                      width: '210mm',
                      height: '297mm',
                      overflow: 'hidden',
                      padding: '12mm',
                      boxSizing: 'border-box',
                      marginBottom: isLast ? 0 : '18px',
                      fontFamily: '"Helvetica Neue", Arial, "Liberation Sans", system-ui, sans-serif',
                      color: '#111', WebkitFontSmoothing: 'antialiased',
                    }}
                  >
                    <Watermark />
                    <Letterhead />
                    <div className="report-body relative flex-1">
                      <PatientStrip />
                      <section data-editable-body suppressContentEditableWarning className="relative mt-3" style={{ zoom: contentScale }}>
                        {pg ? (
                          <div>
                            <div className="text-center font-bold text-[14.5px] tracking-wide text-black underline underline-offset-2 mb-1">{dept}</div>
                            {pg.panel.report_heading !== dept && (
                              <div className="text-center font-semibold text-[14px] text-black underline underline-offset-2 mb-1.5">{pg.panel.report_heading}</div>
                            )}
                            {pg.panel.code === 'CBC' ? (
                              <>
                                <table className="w-full text-[14px] border-collapse" style={{ tableLayout: 'fixed' }}>
                                  {renderCbcHead()}
                                  <tbody>{renderCbcWithHistograms(pg.orders)}</tbody>
                                </table>
                                {renderNotes(pg.orders)}
                              </>
                            ) : (
                              <>
                                <table className="w-full table-fixed text-[14px] border-collapse">
                                  {renderHead()}
                                  <tbody>{renderRows(pg.orders)}</tbody>
                                </table>
                                {renderNotes(pg.orders)}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 py-10 text-[14px]">No results entered yet.</div>
                        )}
                        {isLast && comment && (
                          <div className="mt-3 text-[11px]"><strong>Comments :</strong> {comment}</div>
                        )}
                      </section>
                    </div>
                    <PageFooter pageIndex={idx} total={pageList.length} isLast={isLast} />
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action panel ── */}
      <aside className="w-[252px] shrink-0 space-y-4 pt-4 print:hidden">
        <div className="card p-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97] mb-1">Deliver</p>
          {!isApproved && (
            <>
              <p className="text-[14px] text-[#92600a] bg-[#fdf0d7] rounded-lg px-3 py-2 leading-snug">
                Approve to lock the report and unlock printing &amp; sending.
              </p>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white btn-success disabled:opacity-50"
              >
                {approving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {approving ? 'Approving…' : 'Approve report'}
              </button>
              <div className="h-px bg-[#eef0f4] my-1" />
            </>
          )}
          <OutputBtn icon={Printer} label="Print" onClick={handlePrint} done={sent.print} disabled={!isApproved || editing} busy={busy === 'print'} primary />
          <OutputBtn icon={FileDown} label="Save PDF" onClick={handlePdf} done={sent.pdf} disabled={!isApproved || editing} busy={busy === 'pdf'} />
          <OutputBtn icon={FileType2} label="Export to Word (full editing)" onClick={handleDocx} done={sent.docx} disabled={!isApproved || editing} busy={busy === 'docx'} />
          {reportOverride && (
            <p className="text-[11px] text-[#8a8b97] leading-snug px-1">
              Word export uses the original report data — it won't include the in-app manual edits.
            </p>
          )}
          <OutputBtn icon={MessageCircle} label="WhatsApp" onClick={handleWhatsApp} done={sent.whatsapp} disabled={!isApproved || editing || !patient?.phone} busy={busy === 'whatsapp'} green />
          <OutputBtn icon={Mail} label="Email" onClick={handleEmail} done={sent.email} disabled={!isApproved || editing || !patient?.email} busy={busy === 'email'} />
          <OutputBtn icon={Smartphone} label="SMS" onClick={handleSms} done={sent.sms} disabled={!isApproved || editing || !patient?.phone} busy={busy === 'sms'} />
        </div>

        {isApproved && (
          <div className="card p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">Edit report</p>
            {editing ? (
              <>
                <p className="text-[14px] text-[#54555f] leading-snug">
                  Click into any value/text and edit it directly — the layout stays exactly as it prints.
                  Use the toolbar above for bold, font, size, colour &amp; alignment. Header, name box &amp;
                  footer are locked. Then Save.
                </p>
                <button onClick={saveEdit} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white btn-success">
                  <Save size={16} strokeWidth={1.8} /> Save edits
                </button>
                <button onClick={cancelEdit} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#54555f] border border-[#e6e7ee] hover:bg-[#fafafe]">
                  <X size={15} strokeWidth={1.8} /> Cancel
                </button>
              </>
            ) : (
              <>
                {reportOverride && (
                  <p className="text-[14px] text-[#92600a] bg-[#fdf0d7] rounded-lg px-3 py-2 leading-snug">
                    This report has manual edits — they're what print &amp; send.
                  </p>
                )}
                <button onClick={startEdit} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#4f46e5" }}>
                  <Pencil size={15} strokeWidth={1.8} /> Edit here (quick)
                </button>
                <p className="text-[11px] text-[#8a8b97] leading-snug px-1">
                  For full Word-style editing, use <strong>Export to Word</strong> above and edit in Microsoft Word.
                </p>
                {reportOverride && (
                  <button onClick={revertEdit} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#b91c1c] border border-[#f0d3d3] hover:bg-[#fdf6f6]">
                    <RotateCcw size={15} strokeWidth={1.8} /> Revert to original
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="card p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">Adjust content</p>
          {reportOverride && (
            <p className="text-[12px] text-[#92600a] bg-[#fdf0d7] rounded-lg px-3 py-2 leading-snug">
              This report has manual edits, so these layout controls don't apply.{' '}
              <button onClick={revertEdit} className="font-semibold underline">Revert to original</button> to use them.
            </p>
          )}
          <div className={cn("space-y-3", reportOverride && "opacity-40 pointer-events-none")}>

          {/* Overall content size — shrink to fit more per page, or enlarge */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12.5px] text-[#54555f]">Content size</span>
              <span className="text-[12px] tabular-nums text-[#8a8b97]">{Math.round(contentScale * 100)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setScale(contentScale - 0.05)} className="h-7 w-7 rounded-md border border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]">−</button>
              <input type="range" min={0.6} max={1.15} step={0.01} value={contentScale}
                onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 accent-[#6366f1]" />
              <button onClick={() => setScale(contentScale + 0.05)} className="h-7 w-7 rounded-md border border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]">+</button>
            </div>
            <button onClick={() => setScale(1)} className="mt-1 text-[11px] text-[#4f46e5] hover:underline">Reset to 100%</button>
          </div>

          {/* Per-column WIDTH — always-visible − / + buttons that widen/narrow each column.
              These directly resize the report columns (no hovering needed). */}
          <div>
            <span className="text-[12.5px] text-[#54555f]">Column widths</span>
            <div className="mt-1 space-y-1">
              {['Test Name', 'Results', 'Units', 'Normal Ranges'].map((lbl, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="flex-1 text-[12px] text-[#34353f] truncate">{lbl}</span>
                  <span className="w-9 text-right text-[11px] tabular-nums text-[#8a8b97]">{Math.round(colWidths[i])}%</span>
                  <button onClick={() => adjustColWidth(i, -3)} title="Narrower"
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]">−</button>
                  <button onClick={() => adjustColWidth(i, 3)} title="Wider"
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]">+</button>
                </div>
              ))}
            </div>
            <button onClick={() => { setColWidths([24, 18, 12, 46]); localStorage.setItem('scl_colw', JSON.stringify([24, 18, 12, 46])); }}
              className="mt-1 text-[11px] text-[#4f46e5] hover:underline">Reset widths</button>
          </div>

          {/* Move each column LEFT/RIGHT independently (shifts only that column's content). */}
          <div>
            <span className="text-[12.5px] text-[#54555f]">Move column ← →</span>
            <div className="mt-1 space-y-1">
              {['Test Name', 'Results', 'Units', 'Normal Ranges'].map((lbl, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="flex-1 text-[12px] text-[#34353f] truncate">{lbl}</span>
                  <button onClick={() => moveColumn(i, 'left')} title="Move left"
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]">‹</button>
                  <button onClick={() => moveColumn(i, 'right')} title="Move right"
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]">›</button>
                </div>
              ))}
            </div>
            <button onClick={() => { setColOffset([0, 8, 8, 56]); localStorage.setItem('scl_coloff', JSON.stringify([0, 8, 8, 56])); }}
              className="mt-1 text-[11px] text-[#4f46e5] hover:underline">Reset positions</button>
          </div>

          {/* Per-column alignment — click each to cycle Left → Centre → Right */}
          <div>
            <span className="text-[12.5px] text-[#54555f]">Column alignment</span>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {['Name', 'Result', 'Unit', 'Range'].map((lbl, i) => (
                <button key={i} onClick={() => cycleAlign(i)} title={`${lbl}: ${colAlign[i]}`}
                  className="flex flex-col items-center gap-0.5 rounded-md border border-[#e6e7ee] py-1 hover:border-[#c7c9ff]">
                  {colAlign[i] === 'left' ? <AlignLeft size={13} /> : colAlign[i] === 'center' ? <AlignCenter size={13} /> : <AlignRight size={13} />}
                  <span className="text-[9px] text-[#8a8b97]">{lbl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row spacing / density */}
          <GapInput label="Row spacing" value={rowPad} onChange={setRowPadding} max={10} unit="px" />
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">Layout</p>
          <Toggle label="Pack panels (multi-page)" checked={compactReport} onChange={(v) => { setCompactReport(v); localStorage.setItem('scl_compact_report', v ? '1' : '0'); }} />
          {compactReport && (
            <div className="rounded-lg bg-[#eef0f4] px-3 py-2.5 space-y-2">
              <p className="text-[10.5px] text-[#54555f] leading-snug">
                Panels are packed onto pages without splitting any test; a test that doesn't fit moves
                whole to the next page. Header, name box &amp; footer repeat on every page.
              </p>
              <GapInput label="Bottom gap" value={bottomGapMm} onChange={(v) => { setBottomGapMm(v); localStorage.setItem('scl_bottom_gap', String(v)); }} />
            </div>
          )}
          <Toggle label="Print lab letterhead" checked={printLetterhead} onChange={(v) => { setPrintLetterhead(v); localStorage.setItem('scl_print_letterhead', v ? '1' : '0'); }} />
          {!printLetterhead && (
            <div className="rounded-lg bg-[#eef0f4] px-3 py-2.5 space-y-2">
              <p className="text-[10.5px] text-[#54555f] leading-snug">
                Letterhead hidden for printing on your pre-printed paper. Adjust the gaps so the data lands inside the printed frame.
              </p>
              <GapInput label="Top gap" value={preTop} onChange={(v) => { setPreTop(v); localStorage.setItem('scl_pre_top', String(v)); }} />
              <GapInput label="Bottom gap" value={preBottom} onChange={(v) => { setPreBottom(v); localStorage.setItem('scl_pre_bottom', String(v)); }} />
            </div>
          )}
          <Toggle label="Signature" checked={showSignature} onChange={setShowSignature} />
          {showSignature && (
            <GapInput label="Signature height" value={sigHeightMm} onChange={(v) => { setSigHeightMm(v); localStorage.setItem('scl_sig_height', String(v)); }} />
          )}
          <Toggle label="Watermark" checked={showWatermark} onChange={setShowWatermark} />
        </div>

        {bill && (
          <div className="card p-4 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97] mb-1">Billing</p>
            <Row k="Total" v={`₹${bill.total}`} />
            {bill.concession > 0 && <Row k="Concession" v={`− ₹${bill.concession}`} />}
            {bill.concession > 0 && <Row k="Amount" v={`₹${bill.net}`} />}
          </div>
        )}
      </aside>
    </div>
  );
}

const FONT_FAMILIES = ['Helvetica Neue', 'Arial', 'Times New Roman', 'Georgia', 'Calibri', 'Courier New', 'Verdana', 'Tahoma'];
const FONT_SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const editorHost = () => document.getElementById('report-print-area');

/** Word/Excel-style rich-text toolbar — built WITHOUT document.execCommand (which is a
 *  no-op in some WebViews). Every action manipulates the DOM directly through the standard
 *  Selection/Range API: character formatting wraps the selected text in a styled <span>,
 *  block formatting sets styles on the enclosing cell/paragraph, and undo/redo restore
 *  innerHTML snapshots. This works in every engine because it's plain DOM manipulation. */
function RichTextToolbar() {
  const savedRange = useRef<Range | null>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  // Continuously remember the last selection that was inside the editable host, so a command
  // still has a target even after a dropdown/colour-picker briefly stole focus.
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const host = editorHost();
      if (!sel || sel.rangeCount === 0 || !host || !host.isContentEditable) return;
      const range = sel.getRangeAt(0);
      if (host.contains(range.commonAncestorContainer)) savedRange.current = range.cloneRange();
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  /** The range to operate on: prefer a live selection inside the host, else the last saved
   *  range. If it's just a cursor (collapsed), EXPAND to the enclosing cell/paragraph — so,
   *  Excel-style, clicking in a cell and hitting Bold formats the whole cell with no drag. */
  const workingRange = (): Range | null => {
    const host = editorHost();
    if (!host) return null;
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount && host.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else if (savedRange.current) {
      try { host.focus({ preventScroll: true }); sel?.removeAllRanges(); sel?.addRange(savedRange.current); } catch { /* ignore */ }
      range = savedRange.current;
    }
    if (!range) return null;
    if (range.collapsed) {
      let node: Node | null = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const block = (node as Element | null)?.closest('td,th,li,p,div');
      if (block && host.contains(block) && block !== host) {
        const r = document.createRange();
        r.selectNodeContents(block);
        savedRange.current = r.cloneRange();   // keep styleAt/undo in sync with what we'll edit
        return r;
      }
      return null;
    }
    savedRange.current = range.cloneRange();
    return range;
  };

  const pushUndo = () => {
    const host = editorHost();
    if (host) { undoStack.current.push(host.innerHTML); redoStack.current = []; }
  };

  /** Wrap the current selection in a <span> styled by `apply`. The core of all character
   *  formatting — no execCommand involved. */
  const wrapInline = (apply: (s: HTMLElement) => void) => {
    const range = workingRange();
    if (!range || range.collapsed) return;
    pushUndo();
    const span = document.createElement('span');
    apply(span);
    try {
      range.surroundContents(span);
    } catch {
      // Selection crosses element boundaries — extract, wrap, re-insert.
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    // Re-select the wrapped content so the user can chain formats.
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(span);
    sel?.removeAllRanges();
    sel?.addRange(r);
    savedRange.current = r.cloneRange();
  };

  /** Read a computed style on the actual content being formatted (used to TOGGLE bold/italic).
   *  Descends into the first real child when the range starts on a cell/element so toggling
   *  an already-formatted cell correctly turns the format OFF. */
  const styleAt = (prop: string): string => {
    const range = savedRange.current ?? (window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null);
    if (!range) return '';
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      node = el.childNodes[range.startOffset] ?? el.firstChild ?? el;
    }
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    return node && node instanceof Element ? getComputedStyle(node as Element).getPropertyValue(prop) : '';
  };

  /** Set a CSS property on the block element(s) enclosing the selection (alignment, indent). */
  const styleBlock = (apply: (el: HTMLElement) => void) => {
    const range = workingRange();
    if (!range) return;
    pushUndo();
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const block = (node as Element | null)?.closest('td,th,p,div,li,section') as HTMLElement | null;
    if (block) apply(block);
  };

  const bold        = () => wrapInline(s => s.style.fontWeight = /^(bold|[6-9]00)/.test(styleAt('font-weight')) ? 'normal' : 'bold');
  const italic      = () => wrapInline(s => s.style.fontStyle = styleAt('font-style') === 'italic' ? 'normal' : 'italic');
  const underline   = () => wrapInline(s => s.style.textDecoration = styleAt('text-decoration-line').includes('underline') ? 'none' : 'underline');
  const strike      = () => wrapInline(s => s.style.textDecoration = styleAt('text-decoration-line').includes('line-through') ? 'none' : 'line-through');
  const fontFamily  = (f: string) => wrapInline(s => s.style.fontFamily = f);
  const fontSize    = (px: string) => wrapInline(s => s.style.fontSize = `${px}px`);
  const foreColor   = (c: string) => wrapInline(s => s.style.color = c);
  const highlight   = (c: string) => wrapInline(s => s.style.backgroundColor = c);
  const align       = (v: string) => styleBlock(el => el.style.textAlign = v);
  const indent      = (delta: number) => styleBlock(el => {
    const cur = parseFloat(el.style.marginLeft || '0') || 0;
    el.style.marginLeft = `${Math.max(0, cur + delta)}px`;
  });

  /** Turn the selection into a bullet/numbered list. */
  const makeList = (ordered: boolean) => {
    const range = workingRange();
    if (!range) return;
    pushUndo();
    const list = document.createElement(ordered ? 'ol' : 'ul');
    list.style.paddingLeft = '22px';
    list.style.listStyleType = ordered ? 'decimal' : 'disc';
    const li = document.createElement('li');
    try { li.appendChild(range.extractContents()); } catch { li.textContent = range.toString(); }
    if (!li.textContent && !li.childNodes.length) li.appendChild(document.createElement('br'));
    list.appendChild(li);
    range.insertNode(list);
    savedRange.current = null;   // content moved — old range is stale
  };

  const clearFormat = () => {
    const range = workingRange();
    if (!range || range.collapsed) return;
    pushUndo();
    const text = range.toString();
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    savedRange.current = null;
  };

  // After an innerHTML swap every node is detached, so the saved range must be discarded or
  // the next command would act on stale/detached nodes (corruption).
  const undo = () => { const h = editorHost(); if (h && undoStack.current.length) { redoStack.current.push(h.innerHTML); h.innerHTML = undoStack.current.pop()!; savedRange.current = null; } };
  const redo = () => { const h = editorHost(); if (h && redoStack.current.length) { undoStack.current.push(h.innerHTML); h.innerHTML = redoStack.current.pop()!; savedRange.current = null; } };

  const keep = (e: React.MouseEvent) => e.preventDefault();
  const Sep = () => <span className="mx-1 h-5 w-px bg-[#e6e7ee]" />;
  const Btn = ({ onAction, title, children }: { onAction: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onAction(); }}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[#34353f] hover:bg-[#eef0fe] hover:text-[#4f46e5] transition-colors select-none"
    >
      {children}
    </button>
  );

  return (
    <div
      onMouseDown={keep}
      className="sticky top-0 z-30 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-[#e6e7ee] bg-white px-2 py-1.5 shadow-sm print:hidden"
    >
      <Btn title="Undo" onAction={undo}><Undo size={15} /></Btn>
      <Btn title="Redo" onAction={redo}><Redo size={15} /></Btn>
      <Sep />

      <select
        title="Font family" defaultValue="" onMouseDown={e => e.stopPropagation()}
        onChange={e => { fontFamily(e.target.value); e.currentTarget.value = ''; }}
        className="h-7 rounded-md border border-[#e6e7ee] bg-white px-1.5 text-[12px] text-[#34353f] hover:border-[#c7c9ff] focus:outline-none cursor-pointer"
      >
        <option value="" disabled>Font</option>
        {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
      <select
        title="Font size" defaultValue="" onMouseDown={e => e.stopPropagation()}
        onChange={e => { fontSize(e.target.value); e.currentTarget.value = ''; }}
        className="h-7 w-14 rounded-md border border-[#e6e7ee] bg-white px-1 text-[12px] text-[#34353f] hover:border-[#c7c9ff] focus:outline-none cursor-pointer"
      >
        <option value="" disabled>Size</option>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <Sep />

      <Btn title="Bold"          onAction={bold}><Bold size={15} /></Btn>
      <Btn title="Italic"        onAction={italic}><Italic size={15} /></Btn>
      <Btn title="Underline"     onAction={underline}><Underline size={15} /></Btn>
      <Btn title="Strikethrough" onAction={strike}><Strikethrough size={15} /></Btn>
      <Sep />

      <label title="Text colour" onMouseDown={keep}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-[#eef0fe] cursor-pointer relative select-none">
        <Baseline size={15} />
        <input type="color" defaultValue="#b91c1c" onMouseDown={e => e.stopPropagation()}
          onInput={e => foreColor((e.target as HTMLInputElement).value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </label>
      <label title="Highlight" onMouseDown={keep}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-[#eef0fe] cursor-pointer relative select-none">
        <Highlighter size={15} />
        <input type="color" defaultValue="#fde047" onMouseDown={e => e.stopPropagation()}
          onInput={e => highlight((e.target as HTMLInputElement).value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </label>
      <Sep />

      <Btn title="Align left"   onAction={() => align('left')}><AlignLeft size={15} /></Btn>
      <Btn title="Align centre" onAction={() => align('center')}><AlignCenter size={15} /></Btn>
      <Btn title="Align right"  onAction={() => align('right')}><AlignRight size={15} /></Btn>
      <Btn title="Justify"      onAction={() => align('justify')}><AlignJustify size={15} /></Btn>
      <Sep />

      <Btn title="Bullet list"   onAction={() => makeList(false)}><List size={15} /></Btn>
      <Btn title="Numbered list" onAction={() => makeList(true)}><ListOrdered size={15} /></Btn>
      <Btn title="Indent"        onAction={() => indent(24)}><IndentIncrease size={15} /></Btn>
      <Btn title="Outdent"       onAction={() => indent(-24)}><IndentDecrease size={15} /></Btn>
      <Sep />

      <Btn title="Clear formatting" onAction={clearFormat}><RemoveFormatting size={15} /></Btn>
    </div>
  );
}

/** Compact report, paginated across A4 sheets by MEASURING each panel. Rules the user asked for:
 *  • every page carries the letterhead + patient name box + footer (proper discipline)
 *  • a panel is never split across a page — if it doesn't fully fit, the whole panel moves
 *    to the next page (wastes space, but keeps each test's values together)
 *  • a configurable blank gap is reserved at the bottom of every page. */
const PX_PER_MM = 96 / 25.4;

type PanelGroup = { panel: Panel; orders: OrderWithResult[] };
type CompactBlock = { key: string; dept: string; showDept: boolean; showSub: boolean; kind: 'panel' | 'comment'; pg?: PanelGroup; comment?: string };

function CompactPaginatedReport({
  sortedPanels, deptOf, renderPanelBody, comment, bottomGapMm, contentScale, measureKey, breaks, onMove,
  Watermark, Letterhead, PatientStrip, PageFooter,
}: {
  sortedPanels: PanelGroup[];
  deptOf: (p: Panel) => string;
  renderPanelBody: (pg: PanelGroup) => React.ReactNode;
  comment: string;
  bottomGapMm: number;
  contentScale: number;
  measureKey: string;
  breaks: Record<string, 'pull' | 'before'>;
  onMove: (key: string, dir: 'up' | 'down') => void;
  Watermark: React.ComponentType;
  Letterhead: React.ComponentType;
  PatientStrip: React.ComponentType;
  PageFooter: React.ComponentType<{ pageIndex: number; total: number; isLast: boolean }>;
}) {
  // Ordered list of atomic blocks (one per panel, plus an optional comment block).
  const blocks = useMemo<CompactBlock[]>(() => {
    const out: CompactBlock[] = [];
    let prevDept = '';
    sortedPanels.forEach((pg, i) => {
      const dept = deptOf(pg.panel);
      out.push({
        key: `${pg.panel.code}-${i}`,
        dept,
        showDept: dept !== prevDept,
        showSub: pg.panel.report_heading !== dept,
        kind: 'panel',
        pg,
      });
      prevDept = dept;
    });
    if (comment.trim()) out.push({ key: '__comment', dept: '', showDept: false, showSub: false, kind: 'comment', comment });
    return out;
  }, [sortedPanels, comment, deptOf]);

  const measureRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [capacity, setCapacity] = useState(0);

  // Re-measure whenever the block set or the bottom gap changes.
  const sig = blocks.map(b => b.key).join('|') + `#${bottomGapMm}#${measureKey}`;
  useLayoutEffect(() => {
    const measure = () => {
      const probe = probeRef.current;
      const cap = probe ? probe.clientHeight - bottomGapMm * PX_PER_MM : 0;
      setCapacity(cap > 0 ? cap : 0);
      const root = measureRef.current;
      if (root) {
        const h: Record<string, number> = {};
        root.querySelectorAll<HTMLElement>('[data-block-key]').forEach(el => {
          h[el.dataset.blockKey!] = el.offsetHeight;
        });
        setHeights(h);
      }
    };
    measure();
    // Re-measure once the letterhead/signature images have decoded (their height affects
    // how much room is left for panels — a stale measure would break pages in the wrong place).
    const imgs = Array.from(measureRef.current?.closest('[aria-hidden]')?.querySelectorAll('img') ?? []);
    const pending = imgs.filter(im => !im.complete);
    pending.forEach(im => { im.addEventListener('load', measure, { once: true }); im.addEventListener('error', measure, { once: true }); });
    const t = setTimeout(measure, 300);
    return () => { clearTimeout(t); pending.forEach(im => { im.removeEventListener('load', measure); im.removeEventListener('error', measure); }); };
  }, [sig]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Greedily pack whole blocks into pages, honouring manual overrides:
  //   'before' → always start a fresh page (push this panel DOWN)
  //   'pull'   → never break before (drag this panel UP onto the previous page)
  // Each page also gets an auto-fit `scale`: if its blocks are still taller than the A4 body
  // (e.g. one long panel that can't be split), that page shrinks just enough to fit — so a
  // panel is NEVER clipped and every page fills exactly one A4 sheet.
  const pages = useMemo<{ blocks: CompactBlock[]; scale: number }[]>(() => {
    if (!blocks.length) return [];
    // Fallback before the first measure resolves: an approximate A4 content height (px), so a
    // tall report still paginates instead of dumping everything on one clipped page.
    const cap = capacity > 0 ? capacity : 165 * PX_PER_MM;
    const groups: CompactBlock[][] = [];
    let cur: CompactBlock[] = [];
    let curH = 0;
    for (const b of blocks) {
      const h = (heights[b.key] ?? 0) * contentScale;   // scaled content takes scaled space
      const br = breaks[b.key];
      const overflow = curH + h > cap;
      if (cur.length && (br === 'before' || (br !== 'pull' && overflow))) {
        groups.push(cur); cur = []; curH = 0;
      }
      cur.push(b);
      curH += h;
    }
    if (cur.length) groups.push(cur);
    // Per-page auto-fit scale (never enlarge beyond the user's contentScale).
    return groups.map(g => {
      const rawH = g.reduce((s, b) => s + (heights[b.key] ?? 0), 0);   // unscaled px
      const wanted = rawH * contentScale;
      const scale = wanted > cap && rawH > 0 ? cap / rawH : contentScale;
      return { blocks: g, scale };
    });
  }, [blocks, heights, capacity, breaks, contentScale]);

  const BlockView = ({ b, first, controls }: { b: CompactBlock; first: boolean; controls?: boolean }) => {
    // paddingTop (not margin) so measurement never disagrees with layout via margin-collapse.
    const padTop = first ? 0 : b.showDept ? 18 : 8;
    // Move-between-pages controls (screen only): ↑ pulls this panel onto the previous page,
    // ↓ pushes it to start a fresh page. data-report-control → stripped from PDF/print/edit.
    const moveControls = controls && b.kind === 'panel' ? (
      <div
        data-report-control
        contentEditable={false}
        className="report-control absolute -top-1 right-0 z-10 flex gap-1 opacity-0 group-hover/blk:opacity-100 transition-opacity print:hidden"
      >
        <button
          type="button" title="Move this test UP to the previous page"
          onClick={() => onMove(b.key, 'up')}
          className={cn("h-6 w-6 inline-flex items-center justify-center rounded-md border bg-white shadow-sm",
            breaks[b.key] === 'pull' ? "border-[#4f46e5] text-[#4f46e5]" : "border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]")}
        ><ArrowUp size={13} /></button>
        <button
          type="button" title="Move this test DOWN to a new page"
          onClick={() => onMove(b.key, 'down')}
          className={cn("h-6 w-6 inline-flex items-center justify-center rounded-md border bg-white shadow-sm",
            breaks[b.key] === 'before' ? "border-[#4f46e5] text-[#4f46e5]" : "border-[#e6e7ee] text-[#54555f] hover:border-[#c7c9ff] hover:text-[#4f46e5]")}
        ><ArrowDown size={13} /></button>
      </div>
    ) : null;

    if (b.kind === 'comment') {
      return <div data-block-key={b.key} style={{ paddingTop: padTop }} className="text-[11px]"><strong>Comments :</strong> {b.comment}</div>;
    }
    return (
      <div data-block-key={b.key} style={{ paddingTop: padTop }} className="group/blk relative">
        {moveControls}
        {b.showDept && (
          <div className="text-center font-bold text-[14.5px] tracking-wide text-black underline underline-offset-2 mb-1">{b.dept}</div>
        )}
        {b.showSub && (
          <div className="font-bold text-[14px] text-black underline underline-offset-2 mt-2 mb-1">{b.pg!.panel.report_heading}</div>
        )}
        {renderPanelBody(b.pg!)}
      </div>
    );
  };

  const pageStyle: React.CSSProperties = {
    width: '210mm', height: '297mm', overflow: 'hidden', padding: '12mm', boxSizing: 'border-box',
    fontFamily: '"Helvetica Neue", Arial, "Liberation Sans", system-ui, sans-serif',
    color: '#111', WebkitFontSmoothing: 'antialiased',
  };

  if (!blocks.length) {
    return (
      <div data-report-page className="report-page bg-white shadow-sm relative mx-auto flex flex-col" style={pageStyle}>
        <Watermark /><Letterhead />
        <div className="report-body relative flex-1">
          <PatientStrip />
          <div className="text-center text-gray-400 py-10 text-[14px]">No results entered yet.</div>
        </div>
        <PageFooter pageIndex={0} total={1} isLast={true} />
      </div>
    );
  }

  return (
    <>
      {/* Visible, paginated pages */}
      {pages.map((page, idx) => (
        <div
          key={idx}
          data-report-page
          className="report-page bg-white shadow-sm relative mx-auto flex flex-col"
          style={{ ...pageStyle, marginBottom: idx === pages.length - 1 ? 0 : '18px' }}
        >
          <Watermark />
          <Letterhead />
          <div className="report-body relative flex-1">
            <PatientStrip />
            <section data-editable-body suppressContentEditableWarning className="relative mt-3" style={{ zoom: page.scale }}>
              {page.blocks.map((b, i) => <BlockView key={b.key} b={b} first={i === 0} controls />)}
            </section>
          </div>
          <PageFooter pageIndex={idx} total={pages.length} isLast={idx === pages.length - 1} />
        </div>
      ))}

      {/* Hidden measurers — PORTALED to <body> so they're never inside #report-print-area
          (which would double content in the PDF capture and the "Edit report" HTML seed).
          Off-screen and not [data-report-page], so print/PDF/edit all ignore them. */}
      {createPortal(
        <div aria-hidden style={{ position: 'absolute', left: '-10000px', top: 0, pointerEvents: 'none' }}>
          {/* Capacity probe: a real page whose flex-1 body region reveals the usable content height. */}
          <div className="flex flex-col" style={pageStyle}>
            <Letterhead />
            <div className="report-body flex flex-col flex-1">
              <PatientStrip />
              <div ref={probeRef} className="mt-3" style={{ flex: 1 }} />
            </div>
            <PageFooter pageIndex={0} total={2} isLast={true} />
          </div>
          {/* Per-block height measurer at the true body content width (210mm − 24mm padding). */}
          <div ref={measureRef} style={{ width: '186mm' }}>
            {blocks.map(b => <BlockView key={b.key} b={b} first={false} />)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function OutputBtn({ icon: Icon, label, onClick, done, disabled, busy, primary, green }: {
  icon: typeof Printer; label: string; onClick: () => void; done?: boolean; disabled?: boolean; busy?: boolean; primary?: boolean; green?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled || busy} title={disabled ? 'Approve the report first' : undefined}
      className={cn("w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
        green ? "text-white bg-gradient-to-b from-[#16a34a] to-[#15803d] hover:brightness-110 shadow-[0_2px_8px_-2px_rgba(21,128,61,0.5)]"
          : primary ? "text-white btn-accent"
            : "border border-[#e6e7ee] text-[#34353f] hover:bg-[#fafafe] hover:border-[#c7c9ff]")}>
      <Icon size={16} /> {busy ? '…' : label} {done && <Check size={13} className={green || primary ? 'text-white' : 'text-[#16a34a]'} />}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-gray-600">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={cn("w-9 h-5 rounded-full transition-colors relative", checked ? "bg-[#6366f1]" : "bg-gray-300")}>
        <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", checked ? "left-4" : "left-0.5")} />
      </button>
    </label>
  );
}

function GapInput({ label, value, onChange, max = 120, unit = 'mm' }: { label: string; value: number; onChange: (v: number) => void; max?: number; unit?: string }) {
  return (
    <label className="flex items-center justify-between text-[11.5px] text-[#54555f]">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number" min={0} max={max} value={value}
          // Empty/partial input is left as-is (don't snap to 0 mid-typing); only commit a finite number.
          onChange={(e) => { const v = e.target.value; if (v === '') return; const n = Number(v); if (Number.isFinite(n)) onChange(Math.max(0, Math.min(max, n))); }}
          className="w-14 rounded border border-[#d8d3cc] bg-white px-2 py-1 text-right tabular-nums"
        />
        <span className="text-[#a3a5b3]">{unit}</span>
      </span>
    </label>
  );
}

function Row({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}</span>
      <span className={cn("tabular-nums font-medium", danger ? "text-red-600" : "text-gray-900")}>{v}</span>
    </div>
  );
}
