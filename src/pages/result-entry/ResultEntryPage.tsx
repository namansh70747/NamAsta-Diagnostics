import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatientById, addTestsToPatient, updatePatient } from "@/lib/queries/patients";
import { getOrdersWithResults, saveResult, approvePatient, markNotDone, unlockResult, getReportComment, saveReportComment, setUnitOverride, setRangeOverride } from "@/lib/queries/results";
import { listPanels, searchTests, reorderPanelTests, createPanelTest, getTestsByCodes } from "@/lib/queries/tests";
import { listDoctors } from "@/lib/queries/doctors";
import { matchTestGroups, TestGroup } from "@/lib/testGroups";
import { useSession } from "@/lib/session";
import { genderLabel } from "@/lib/format";
import { OrderWithResult, Panel, Test, AgeUnit, Sex } from "@/types";
import { computeCalculated, resolveCalculated, safeDecimals } from "@/lib/calc";
import { computeFlag, patientAgeDays, findRange, displayRange, rangesWithOverride } from "@/lib/flags";
import { getAllSettings } from "@/lib/queries/settings";
import { readAnalyzerConfigured } from "@/lib/serial";
import { matchToOrders, type AnalyzerMatch, type AnalyzerReading } from "@/lib/astm";
import { saveHistograms } from "@/lib/queries/analyzer";
import { promptDialog } from "@/lib/dialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Check, CheckCircle, ChevronLeft, FileText, Unlock, X, Cable, Plus, GripVertical, Pencil } from "lucide-react";

/** Parse a test's `choices` JSON without ever throwing — malformed/legacy data
 *  ('' instead of '[]', bad JSON) must not crash the whole result-entry page. */
function safeChoices(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function ResultEntryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const pid = parseInt(patientId ?? '0');
  const navigate = useNavigate();
  const user = useSession(s => s.user);
  const can = useSession(s => s.can);
  const qc = useQueryClient();
  const [showApprove, setShowApprove] = useState(false);
  const [comment, setComment] = useState('');
  const [localValues, setLocalValues] = useState<Record<number, string>>({});
  // Per-order unit/range edits (in-flight on this screen); committed to the DB on blur.
  const [localUnits, setLocalUnits] = useState<Record<number, string>>({});
  const [localRanges, setLocalRanges] = useState<Record<number, string>>({});
  // "Add row" modal — adds a NEW persistent test to a panel (affects future patients).
  const [addRowPanel, setAddRowPanel] = useState<Panel | null>(null);
  const [newRow, setNewRow] = useState({ name: '', unit: '', low: '', high: '' });
  const [addingRow, setAddingRow] = useState(false);
  const [reading, setReading] = useState(false);
  const [analyzer, setAnalyzer] = useState<{ matches: AnalyzerMatch[]; reading: AnalyzerReading } | null>(null);
  // Editable WBC/RBC/PLT → captured-graph mapping (technician confirms before Apply).
  const [imgAssign, setImgAssign] = useState<{ wbcImg?: string; rbcImg?: string; pltImg?: string }>({});
  const [rawCapture, setRawCapture] = useState<{ text: string; valueCount: number } | null>(null);
  const [rawCopied, setRawCopied] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<Test[]>([]);
  // Edit-patient-details dialog: fix a wrong name/age/sex/etc. without leaving result entry.
  type EditDraft = { title: string; name: string; age: string; age_unit: AgeUnit; sex: Sex; baby: number; phone: string; email: string; address: string; doctor_id: number | null };
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  // Drag-to-reorder (pointer-based — HTML5 drag is unreliable in the macOS WebView).
  // Refs hold the live values for the window listeners; state drives the visual highlight.
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragIdRef = useRef<number | null>(null);
  const dragOverIdRef = useRef<number | null>(null);

  const { data: patient } = useQuery({ queryKey: ['patient', pid], queryFn: () => getPatientById(pid) });
  const { data: orders = [] } = useQuery({ queryKey: ['orders', pid], queryFn: () => getOrdersWithResults(pid) });
  const { data: panels = [] } = useQuery({ queryKey: ['panels'], queryFn: listPanels });
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors', 'active'], queryFn: () => listDoctors() });
  const { data: savedComment } = useQuery({ queryKey: ['comment', pid], queryFn: () => getReportComment(pid) });
  const { data: settings = {} } = useQuery({ queryKey: ['settings'], queryFn: getAllSettings });

  // Init local values from saved results
  useEffect(() => {
    // Seed from saved results/defaults, but PRESERVE any field the user has already
    // touched this session. A background refetch (triggered by save/add-test/etc.)
    // must not clobber values the user is mid-typing into other fields.
    setLocalValues(prev => {
      const next: Record<number, string> = {};
      for (const o of orders) {
        if (o.order.id in prev) next[o.order.id] = prev[o.order.id];   // keep in-progress edit
        else if (o.result?.value) next[o.order.id] = o.result.value;
        else if (o.test.default_value) next[o.order.id] = o.test.default_value;
      }
      return next;
    });
  }, [orders]);

  useEffect(() => { if (savedComment != null) setComment(savedComment); }, [savedComment]);

  // A patient is approved iff the DB has set report_time (done by approvePatient atomically).
  // The old every(not_done || is_panel || ...) check incorrectly returned true when ALL tests
  // were marked not-done before formal approval, permanently hiding the Approve button.
  const isApproved = !!patient?.report_time;

  // Group orders by panel (bundle rows are billing artifacts — never shown here)
  const visibleOrders = orders.filter(o => !o.test.is_panel);
  const panelMap: Record<string, { panel: Panel; orders: OrderWithResult[] }> = {};
  for (const o of visibleOrders) {
    const panelCode = o.test.panel_code ?? 'MISC';
    if (!panelMap[panelCode]) {
      const p = panels.find(p => p.code === panelCode);
      panelMap[panelCode] = { panel: p ?? { id: 0, code: panelCode, name: panelCode, report_heading: panelCode, sort_order: 99, page_break_after: 0 }, orders: [] };
    }
    panelMap[panelCode].orders.push(o);
  }
  const sortedPanels = Object.values(panelMap).sort((a, b) => a.panel.sort_order - b.panel.sort_order);

  // Compute values map for calculated fields
  const enteredMap: Record<string, number | null> = {};
  for (const o of orders) {
    const v = localValues[o.order.id] ?? '';
    const n = parseFloat(v.replace(/,/g, ''));   // strip thousands separators like calc.ts/flags.ts
    if (!isNaN(n)) enteredMap[o.test.code] = n;
  }
  // Resolve calc-on-calc chains (A/G ratio via GLO, LDL/HDL ratio via LDL) so the
  // live preview matches what the report will print.
  const calcTests = orders
    .filter(o => o.test.result_type === 'calculated' && o.test.formula)
    .map(o => ({ code: o.test.code, formula: o.test.formula }));
  const calcCtx = patient
    ? { ageYears: patientAgeDays(patient.age, patient.age_unit) / 365.25, sex: patient.sex }
    : undefined;
  const valuesMap = resolveCalculated(enteredMap, calcTests, calcCtx);

  const getDisplayValue = (o: OrderWithResult): string => {
    if (o.test.result_type === 'calculated' && o.test.formula) {
      const calc = computeCalculated(o.test.code, o.test.formula, valuesMap, calcCtx);
      if (calc == null) return '';
      if (typeof calc === 'string') return calc;
      return calc.toFixed(safeDecimals(o.test.decimals));
    }
    return localValues[o.order.id] ?? '';
  };

  const getFlag = (o: OrderWithResult): string => {
    if (!patient) return '';
    const value = getDisplayValue(o);
    if (!value) return '';
    const ageDays = patientAgeDays(patient.age, patient.age_unit);
    // Flag against the overridden range (live edit → saved override) when present.
    const override = localRanges[o.order.id] ?? o.order.range_override ?? null;
    return computeFlag(o.test.result_type, value, rangesWithOverride(o.ranges, override), patient.sex, ageDays);
  };

  const [savedTick, setSavedTick] = useState(0);
  // Jump straight to the first empty result field on load so staff can start typing.
  const focusedOnce = useRef(false);
  useEffect(() => {
    if (focusedOnce.current || !orders.length) return;
    focusedOnce.current = true;
    setTimeout(() => {
      const fields = Array.from(document.querySelectorAll<HTMLInputElement>('[data-rinput]:not([disabled])'));
      (fields.find(f => !f.value) ?? fields[0])?.focus();
    }, 80);
  }, [orders.length]);
  const saveMut = useMutation({
    mutationFn: ({ orderId, value, flag }: { orderId: number; value: string; flag: string }) =>
      saveResult(orderId, value, flag, user!.id),
    onSuccess: () => { setSavedTick(t => t + 1); qc.invalidateQueries({ queryKey: ['orders', pid] }); },
    onError: (e) => toast.error(e),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      // Flush EVERY value first — including pre-filled defaults the user never
      // touched and a snapshot of calculated values — so approval locks exactly
      // what is on screen (patient-safety: report can never differ from entry).
      for (const o of orders) {
        if (o.order.not_done || o.test.is_panel) continue;
        const value = getDisplayValue(o);
        if (!value.trim()) continue;
        if (o.result?.value === value && o.result?.approved_at) continue;
        if (o.result?.value !== value || !o.result) {
          await saveResult(o.order.id, value, getFlag(o), user!.id);
        }
      }
      await saveReportComment(pid, comment);
      await approvePatient(pid, user!.id);
    },
    onSuccess: () => {
      // Refresh this patient AND every list that shows the status (dashboard, patients).
      qc.invalidateQueries({ queryKey: ['orders', pid] });
      qc.invalidateQueries({ queryKey: ['patient', pid] });
      qc.invalidateQueries({ queryKey: ['comment', pid] });
      qc.invalidateQueries({ queryKey: ['today-patients'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['patients-search'] });
      qc.invalidateQueries({ queryKey: ['pending-deliveries'] });
      setShowApprove(false);
      navigate(`/report/${pid}`);
    },
    onError: (e) => toast.error(e),
  });

  const unlockMut = useMutation({
    mutationFn: async () => {
      const reason = await promptDialog({ title: 'Unlock report', message: 'Reason for unlocking this approved report (audit-logged):', confirmText: 'Unlock' });
      if (!reason) throw new Error('cancelled');
      for (const o of orders) {
        if (o.result?.approved_at) await unlockResult(o.order.id, reason, user!.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', pid] });
      qc.invalidateQueries({ queryKey: ['patient', pid] });
      qc.invalidateQueries({ queryKey: ['today-patients'] });
      qc.invalidateQueries({ queryKey: ['patients-search'] });
    },
    onError: (e) => { if (String(e).includes('cancelled')) return; toast.error(e); },
  });

  function openEdit() {
    if (!patient) return;
    setEditDraft({
      title: patient.title ?? '', name: patient.name ?? '', age: String(patient.age ?? ''),
      age_unit: patient.age_unit, sex: patient.sex, baby: patient.baby ?? 0,
      phone: patient.phone ?? '', email: patient.email ?? '', address: patient.address ?? '',
      doctor_id: patient.doctor_id ?? null,
    });
  }
  const editMut = useMutation({
    mutationFn: (d: EditDraft) => updatePatient(pid, {
      title: d.title, name: d.name.trim().toUpperCase(), age: parseFloat(d.age) || 0,
      age_unit: d.age_unit, sex: d.sex, baby: d.baby, phone: d.phone.trim(),
      email: d.email.trim() || null, address: d.address.trim(), doctor_id: d.doctor_id,
    }, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', pid] });
      qc.invalidateQueries({ queryKey: ['today-patients'] });
      qc.invalidateQueries({ queryKey: ['patients-search'] });
      setEditDraft(null);
      toast.success('Patient details updated.');
    },
    onError: (e) => toast.error(e),
  });

  // F9 = approve. Keep a ref so the single global listener always reads latest state without
  // re-registering on every render (re-registering every render adds/removes a listener on
  // every keystroke, every saved value, every order refetch — hundreds of times per session).
  // allHaveValues is declared below (after orders/localValues), so initialise the ref safe
  // and update it synchronously after every render via a separate effect.
  const f9StateRef = useRef({ isApproved, showAddTest, analyzer, showApprove, editing: false, allHaveValues: false });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const s = f9StateRef.current;
      if (e.key === 'F9' && !s.isApproved && !s.showAddTest && !s.analyzer && !s.showApprove && !s.editing) {
        e.preventDefault(); setShowApprove(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Esc closes the approve dialog (per DESIGN.md dialog spec)
  useEffect(() => {
    if (!showApprove) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowApprove(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showApprove]);

  // Keyboard-first entry: Enter / ↓ jump to the next editable result field, ↑ to the previous
  // one — so staff can run up and down the column without touching the mouse. The arrows are
  // intentionally hijacked from the number-spinner / select-option default; values are typed,
  // not nudged, in this workflow.
  function focusNextField(e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    // Skip disabled (approved) fields so focus never lands on a non-editable input.
    const fields = Array.from(document.querySelectorAll<HTMLElement>('[data-rinput]:not([disabled])'));
    const i = fields.indexOf(e.currentTarget);
    if (i === -1) return;
    const target = e.key === 'ArrowUp' ? fields[i - 1] : fields[i + 1];
    if (target) { e.preventDefault(); target.focus(); }
    else if (e.key !== 'ArrowUp') { e.preventDefault(); e.currentTarget.blur(); }
  }

  async function commitRowReorder(panelOrders: OrderWithResult[], fromOrderId: number, toOrderId: number) {
    if (fromOrderId === toOrderId) return;
    const from = panelOrders.findIndex(o => o.order.id === fromOrderId);
    const to   = panelOrders.findIndex(o => o.order.id === toOrderId);
    if (from === -1 || to === -1) return;
    const reordered = [...panelOrders];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    await reorderPanelTests(reordered.map(o => o.test.id));
    qc.invalidateQueries({ queryKey: ['orders', pid] });
  }

  // Pointer-based row drag: grip handle starts it, window listeners track the row under
  // the cursor via elementFromPoint, release commits the new order to the DB.
  function startRowDrag(panelOrders: OrderWithResult[], orderId: number, e: React.PointerEvent) {
    e.preventDefault();
    dragIdRef.current = orderId;
    dragOverIdRef.current = orderId;
    setDragId(orderId);
    setDragOverId(orderId);

    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const row = el?.closest('[data-order-row]') as HTMLElement | null;
      const id = row ? parseInt(row.dataset.orderId || '') : NaN;
      if (!isNaN(id) && id !== dragOverIdRef.current) {
        dragOverIdRef.current = id;
        setDragOverId(id);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const from = dragIdRef.current;
      const to = dragOverIdRef.current;
      dragIdRef.current = null;
      dragOverIdRef.current = null;
      setDragId(null);
      setDragOverId(null);
      if (from != null && to != null) commitRowReorder(panelOrders, from, to);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // The effective unit shown for an order: live edit → saved override → age-range unit → test default.
  const unitOf = (o: OrderWithResult): string =>
    localUnits[o.order.id] ?? o.order.unit_override ??
    (patient ? findRange(o.ranges, patient.sex, patientAgeDays(patient.age, patient.age_unit))?.unit : null) ??
    o.test.unit ?? '';

  const handleUnitBlur = async (o: OrderWithResult) => {
    const edited = localUnits[o.order.id];
    if (edited === undefined) return;                       // never touched
    const current = o.order.unit_override ?? '';
    if (edited.trim() === current.trim()) return;           // unchanged
    await setUnitOverride(o.order.id, edited);
    setLocalUnits(prev => { const n = { ...prev }; delete n[o.order.id]; return n; });
    qc.invalidateQueries({ queryKey: ['orders', pid] });
  };

  // The effective normal range shown for an order: live edit → saved override → age-range → ''.
  const rangeOf = (o: OrderWithResult): string => {
    if (localRanges[o.order.id] !== undefined) return localRanges[o.order.id];
    if (o.order.range_override != null) return o.order.range_override;
    const r = patient ? findRange(o.ranges, patient.sex, patientAgeDays(patient.age, patient.age_unit)) : o.ranges[0];
    return displayRange(r) || (r?.band_text ? r.band_text.split(' / ')[0] : '');
  };

  const handleRangeBlur = async (o: OrderWithResult) => {
    const edited = localRanges[o.order.id];
    if (edited === undefined) return;                       // never touched
    const current = o.order.range_override ?? '';
    if (edited.trim() === current.trim()) return;           // unchanged
    await setRangeOverride(o.order.id, edited);
    setLocalRanges(prev => { const n = { ...prev }; delete n[o.order.id]; return n; });
    qc.invalidateQueries({ queryKey: ['orders', pid] });
  };

  async function submitAddRow() {
    if (!addRowPanel || !newRow.name.trim()) return;
    setAddingRow(true);
    try {
      const testId = await createPanelTest({
        panelId: addRowPanel.id,
        name: newRow.name,
        unit: newRow.unit,
        low: newRow.low.trim() === '' ? null : parseFloat(newRow.low),
        high: newRow.high.trim() === '' ? null : parseFloat(newRow.high),
      });
      await addTestsToPatient(pid, [testId], { [testId]: 0 });
      await qc.invalidateQueries({ queryKey: ['orders', pid] });
      setAddRowPanel(null);
      setNewRow({ name: '', unit: '', low: '', high: '' });
      toast.success('Row added — it will appear for future patients with this panel too.');
    } catch (e) {
      toast.error(e);
    } finally {
      setAddingRow(false);
    }
  }

  const handleBlur = (o: OrderWithResult) => {
    if (o.test.result_type === 'calculated') return;
    const value = localValues[o.order.id] ?? '';
    if (!value) {
      // Clearing a previously-saved value must persist the clear (otherwise the old
      // value silently reappears on the next refetch). Don't create empty rows for
      // fields that were never saved.
      if (o.result?.value) saveMut.mutate({ orderId: o.order.id, value: '', flag: '' });
      return;
    }
    const flag = getFlag(o);
    saveMut.mutate({ orderId: o.order.id, value, flag });
  };

  async function readFromAnalyzer() {
    const conn = settings.analyzer_conn ?? 'network';
    if (conn === 'network' && settings.analyzer_tcp_mode === 'connect' && !settings.analyzer_host) {
      toast.error('No analyzer IP is configured. Set it in Settings → Analyzer.');
      return;
    }
    if (conn === 'serial' && !settings.analyzer_port) {
      toast.error('No analyzer port is configured. Set it in Settings → Analyzer.');
      return;
    }
    setReading(true);
    try {
      const r = await readAnalyzerConfigured(settings);
      const matches = matchToOrders(r, orders, localValues);
      if (!matches.length) {
        // No match — show the exact raw text the analyzer sent so the format can be
        // diagnosed right here, instead of sending the user off to a timed re-capture.
        setRawCopied(false);
        setRawCapture({ text: r.raw ?? '', valueCount: Object.keys(r.values).length });
        return;
      }
      setImgAssign({ wbcImg: r.histograms.wbcImg, rbcImg: r.histograms.rbcImg, pltImg: r.histograms.pltImg });
      setAnalyzer({ matches, reading: r });
    } catch (e) {
      toast.error(e);
    } finally {
      setReading(false);
    }
  }

  async function runAddSearch(q: string) {
    setAddQuery(q);
    if (q.trim().length < 1) { setAddResults([]); return; }
    try { setAddResults((await searchTests(q.trim())).slice(0, 12)); }
    catch { setAddResults([]); }
  }

  async function addTestsByIds(ids: number[], prices: Record<number, number>, doneMsg: string) {
    try {
      await addTestsToPatient(pid, ids, prices);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['orders', pid] }),
        qc.invalidateQueries({ queryKey: ['bill', pid] }),
        qc.invalidateQueries({ queryKey: ['today-patients'] }),
        qc.invalidateQueries({ queryKey: ['patients-search'] }),
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        qc.invalidateQueries({ queryKey: ['pending-deliveries'] }),
      ]);
      setShowAddTest(false); setAddQuery(''); setAddResults([]);
      toast.success(doneMsg);
    } catch (e) {
      toast.error(e);
    }
  }

  function addTest(t: Test) {
    return addTestsByIds([t.id], { [t.id]: t.price }, 'Test added.');
  }

  // Add every member of a search group at once (e.g. "BIL" → Bilirubin Total/Direct/Indirect).
  async function addGroup(group: TestGroup) {
    const tests = await getTestsByCodes(group.codes);
    if (!tests.length) return;
    const prices = Object.fromEntries(tests.map(t => [t.id, t.price]));
    return addTestsByIds(tests.map(t => t.id), prices, 'Tests added.');
  }

  // Search groups that match what's typed — shown above individual results in the dialog.
  const addGroupResults = matchTestGroups(addQuery);

  async function applyAnalyzer() {
    if (!analyzer) return;
    const next = { ...localValues };
    for (const m of analyzer.matches) next[m.orderId] = m.incoming;
    setLocalValues(next);
    // Save EVERY matched value independently — one failure must not drop the others, and the
    // histograms must still be saved. Collect failures and report them precisely.
    const failed: string[] = [];
    for (const m of analyzer.matches) {
      const o = orders.find(x => x.order.id === m.orderId);
      if (!o) continue;
      try {
        const ageDays = patient ? patientAgeDays(patient.age, patient.age_unit) : 0;
        const flag = patient ? computeFlag(o.test.result_type, m.incoming, o.ranges, patient.sex, ageDays) : '';
        await saveResult(m.orderId, m.incoming, flag, user!.id);
      } catch {
        failed.push(o.test.name);
      }
    }
    // Save the histograms with the technician-confirmed graph→channel mapping (overrides the
    // auto-detected one). Numeric curves (if any) are kept; image fields come from imgAssign.
    try { await saveHistograms(pid, { ...analyzer.reading.histograms, ...imgAssign }); } catch { /* histograms are non-critical */ }
    qc.invalidateQueries({ queryKey: ['orders', pid] });
    setAnalyzer(null);
    if (failed.length) {
      toast.error(`Could not save — please re-enter:\n• ${failed.join('\n• ')}`);
    } else {
      toast.success(`Imported ${analyzer.matches.length} value${analyzer.matches.length === 1 ? '' : 's'} from the analyzer.`);
    }
  }

  const activeOrders = visibleOrders.filter(o => !o.order.not_done);
  const allHaveValues = activeOrders.every(o => {
    if (o.test.result_type === 'calculated') return true;
    return (localValues[o.order.id] ?? '').trim() !== '';
  });

  // Keep the F9 ref in sync — runs after every render so the listener always reads fresh values.
  f9StateRef.current = { isApproved, showAddTest, analyzer, showApprove, editing: !!editDraft, allHaveValues };

  const progress = activeOrders.filter(o => localValues[o.order.id] || o.test.result_type === 'calculated').length;
  const total = activeOrders.length;
  const notDoneOrders = orders.filter(o => o.order.not_done && !o.test.is_panel);

  return (
    <div className="space-y-4">
      {/* Sticky header strip */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[#edeef4]/95 backdrop-blur border-b border-[#e6e7ee]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} className="btn btn-ghost !px-1.5 shrink-0" title="Back">
              <ChevronLeft size={17} strokeWidth={1.8} />
            </button>
            {patient && (
              <div className="min-w-0">
                <div className="flex items-baseline gap-2.5 min-w-0">
                  <span className="font-mono text-[12.5px] text-[#4c4e5d] shrink-0">#{patient.test_no}</span>
                  <span className="font-semibold text-[15px] text-[#14151c] truncate">{patient.title} {patient.name}</span>
                  <span className="text-[12.5px] text-[#3a3b45] shrink-0">
                    {patient.age} {patient.age_unit} / {genderLabel(patient.sex, patient.baby)}
                  </span>
                  {patient.doctor_name && (
                    <span className="text-[12.5px] text-[#4c4e5d] truncate">Ref: {patient.doctor_name}</span>
                  )}
                  {can('enter_results') && (
                    <button
                      onClick={openEdit}
                      title="Edit patient details (fix a wrong name, age, sex, doctor…)"
                      className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-[#4c4e5d] hover:bg-[#e6e7ee] hover:text-[#14151c] transition-colors"
                    >
                      <Pencil size={13} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="w-36 h-[2px] rounded-full bg-[#e6e7ee] overflow-hidden">
                    <div
                      className="h-full bg-maroon-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#4c4e5d] tabular-nums">{progress}/{total} entered</span>
                  {saveMut.isPending
                    ? <span className="text-[11px] text-[#4c4e5d]">Saving…</span>
                    : savedTick > 0 && <span className="flex items-center gap-1 text-[11px] text-[#16a34a]"><Check size={11} strokeWidth={2.4} /> All saved</span>}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={() => setShowAddTest(true)} className="btn btn-secondary" title="Add another test to this patient">
              <Plus size={15} strokeWidth={1.8} /> Add test
            </button>
            {isApproved ? (
              <>
                {can('unlock_results') && (
                  <button
                    onClick={() => unlockMut.mutate()}
                    disabled={unlockMut.isPending}
                    className="btn btn-secondary !text-[#92600a] !border-[#eedcb3] hover:!bg-[#fdf6e3]"
                  >
                    <Unlock size={15} strokeWidth={1.8} /> Unlock
                  </button>
                )}
                <button onClick={() => navigate(`/report/${pid}`)} className="btn btn-primary">
                  <FileText size={15} strokeWidth={1.8} /> View Report
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={readFromAnalyzer}
                  disabled={reading}
                  title="Read CBC results from the ERBA H360 analyzer"
                  className="btn btn-secondary"
                >
                  <Cable size={15} strokeWidth={1.8} /> {reading ? 'Reading…' : 'Read from analyzer'}
                </button>
                <button
                  onClick={() => setShowApprove(true)}
                  title="Approve — blank tests are simply left off the report"
                  className="btn btn-success"
                >
                  <CheckCircle size={15} strokeWidth={1.8} /> Approve
                  <kbd className="text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5">F9</kbd>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Panel sections */}
      {sortedPanels.map(({ panel, orders: panelOrders }) => (
        <div key={panel.code} className="card overflow-hidden animate-fade-up">
          <div className="px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4c4e5d] bg-[#fafafe] border-b border-[#eef0f4]">
            {panel.report_heading}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eef0f4]">
                <th className="pl-2 pr-1 py-3 w-6" />
                <th className="px-5 py-3 text-left table-head">Test Name</th>
                <th className="px-5 py-3 text-left table-head w-44">Result</th>
                <th className="px-5 py-3 text-left table-head w-24">Unit</th>
                <th className="px-5 py-3 text-left table-head">Normal Range</th>
                <th className="px-5 py-3 text-left table-head w-20">Flag</th>
                <th className="px-5 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {panelOrders.map(o => {
                const flag = getFlag(o);
                const isCalc = o.test.result_type === 'calculated';
                const displayVal = getDisplayValue(o);
                const approved = !!o.result?.approved_at;
                const range = patient ? findRange(o.ranges, patient.sex, patientAgeDays(patient.age, patient.age_unit)) : o.ranges[0];
                const isDragOver = dragOverId === o.order.id && dragId !== o.order.id;
                const isDragging = dragId === o.order.id;

                return (
                  <tr
                    key={o.order.id}
                    data-order-row
                    data-order-id={o.order.id}
                    className={cn(
                      "group border-b border-[#e9ebf2] last:border-0 transition-colors",
                      o.order.not_done ? "opacity-40" : "hover:bg-[#fafafe]",
                      flag && !o.order.not_done && "bg-[#fdf6f6]",
                      isDragging && "opacity-50",
                      isDragOver && "border-t-2 border-t-indigo-400 bg-[#eef0fe]"
                    )}
                  >
                    <td className="pl-2 pr-1 py-2.5">
                      <div
                        onPointerDown={e => startRowDrag(panelOrders, o.order.id, e)}
                        className="cursor-grab active:cursor-grabbing touch-none select-none opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Drag to reorder"
                      >
                        <GripVertical size={14} className="text-[#4c4e5d]" />
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-[15px] text-[#14151c]">{o.test.name}</td>
                    <td className="px-5 py-2.5">
                      {o.order.not_done ? (
                        <span className="text-[11px] text-[#5e6072]">Not done</span>
                      ) : isCalc ? (
                        <span className="inline-flex w-32 items-center justify-end gap-1.5">
                          <span className={cn(
                            "text-[14px] tabular-nums text-right",
                            flag === 'H' && "text-[#b91c1c] font-semibold",
                            flag === 'L' && "text-[#1d4ed8] font-semibold",
                            !flag && "text-[#14151c]"
                          )}>
                            {displayVal || '—'}
                          </span>
                          <span className="chip chip-gray !px-1.5 !py-0 !text-[10px]">auto</span>
                        </span>
                      ) : o.test.result_type === 'choice' ? (
                        <select
                          data-rinput
                          value={localValues[o.order.id] ?? o.test.default_value ?? ''}
                          onChange={e => setLocalValues(prev => ({ ...prev, [o.order.id]: e.target.value }))}
                          onBlur={() => handleBlur(o)}
                          onKeyDown={focusNextField}
                          disabled={approved}
                          className={cn(
                            "field !w-36 !py-1.5 text-[13.5px]",
                            flag && "!border-[#fca5a5] !text-[#b91c1c] font-semibold"
                          )}
                        >
                          <option value="">—</option>
                          {safeChoices(o.test.choices).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          data-rinput
                          // Always a text field so staff can type notes/qualifiers ("Trace",
                          // "<5", "1.2 (repeat)") alongside numbers. Numeric tests still get a
                          // number-friendly keyboard; H/L flags read the numeric part as before.
                          type="text"
                          inputMode={o.test.result_type === 'numeric' ? 'decimal' : 'text'}
                          value={localValues[o.order.id] ?? ''}
                          onChange={e => setLocalValues(prev => ({ ...prev, [o.order.id]: e.target.value }))}
                          onBlur={() => handleBlur(o)}
                          onKeyDown={focusNextField}
                          disabled={approved}
                          className={cn(
                            "field !w-32 !py-1.5 text-right tabular-nums text-[14px]",
                            flag === 'H' && "!border-[#fca5a5] !text-[#b91c1c] font-semibold",
                            flag === 'L' && "!border-[#93c5fd] !text-[#1d4ed8] font-semibold"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {o.order.not_done ? (
                        <span className="text-[12.5px] text-[#4c4e5d]">{unitOf(o)}</span>
                      ) : (
                        <input
                          type="text"
                          value={unitOf(o)}
                          onChange={e => setLocalUnits(prev => ({ ...prev, [o.order.id]: e.target.value }))}
                          onBlur={() => handleUnitBlur(o)}
                          disabled={approved}
                          title="Edit unit for this patient only (does not change the test default)"
                          className={cn(
                            "w-20 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] text-[#4c4e5d]",
                            "hover:border-[#e6e7ee] focus:border-[#c7c9ff] focus:bg-white focus:text-[#14151c] focus:outline-none transition-colors",
                            o.order.unit_override && "text-[#4f46e5] font-medium",
                            approved && "cursor-not-allowed"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {o.order.not_done ? (
                        <span className="text-[12.5px] text-[#4c4e5d] tabular-nums">{rangeOf(o)}</span>
                      ) : (
                        <input
                          type="text"
                          value={rangeOf(o)}
                          onChange={e => setLocalRanges(prev => ({ ...prev, [o.order.id]: e.target.value }))}
                          onBlur={() => handleRangeBlur(o)}
                          disabled={approved}
                          title="Edit normal range for this patient only (does not change the test default)"
                          className={cn(
                            "w-28 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] text-[#4c4e5d] tabular-nums",
                            "hover:border-[#e6e7ee] focus:border-[#c7c9ff] focus:bg-white focus:text-[#14151c] focus:outline-none transition-colors",
                            o.order.range_override && "text-[#4f46e5] font-medium",
                            approved && "cursor-not-allowed"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {flag && (
                          <span className={cn(
                            "chip",
                            flag === 'H' && "chip-red",
                            flag === 'L' && "chip-blue",
                            flag === 'A' && "chip-amber"
                          )}>{flag}</span>
                        )}
                        {approved && <Check size={14} strokeWidth={2.2} className="text-[#14743a]" aria-label="Approved" />}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {o.order.not_done ? (
                        <button
                          onClick={() => markNotDone(o.order.id, 0).then(() => qc.invalidateQueries({ queryKey: ['orders', pid] }))}
                          className="text-[12px] font-medium text-[#4f46e5] hover:underline"
                          title="Undo — include this test again"
                        >
                          Mark done
                        </button>
                      ) : (
                        <button
                          onClick={() => markNotDone(o.order.id).then(() => qc.invalidateQueries({ queryKey: ['orders', pid] }))}
                          className="text-[#5e6072] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#b91c1c]"
                          title="Mark not done"
                        >
                          <X size={14} strokeWidth={1.8} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isApproved && (
            <div className="px-5 py-2 border-t border-[#e9ebf2]">
              <button
                onClick={() => { setAddRowPanel(panel); setNewRow({ name: '', unit: '', low: '', high: '' }); }}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#4f46e5] hover:underline"
                title="Add a new test row to this panel (stays for future patients too)"
              >
                <Plus size={13} strokeWidth={2} /> Add row
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Comments */}
      <div className="card p-5">
        <label className="block text-[13px] font-medium text-[#3a3b45] mb-1.5">Comments (printed on report)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onBlur={() => saveReportComment(pid, comment)
            .then(() => qc.invalidateQueries({ queryKey: ['comment', pid] }))
            .catch(e => toast.error(e))}
          rows={3}
          placeholder="Optional comments for the report…"
          className="field resize-y"
        />
      </div>

      {/* Add-row dialog — create a NEW persistent test in a panel (shows for future patients too) */}
      {addRowPanel && (
        <div
          className="fixed inset-0 z-50 bg-[#0e0f16]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4"
          onClick={() => setAddRowPanel(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in shadow-[var(--shadow-pop)]"
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <h3 className="text-[16px] font-semibold text-[#14151c] mb-1">Add row to {addRowPanel.report_heading}</h3>
            <p className="text-[13px] text-[#3a3b45] mb-4">
              This adds a new permanent test to the panel — it will appear for this patient and
              <span className="font-medium text-[#14151c]"> every future patient</span> who gets this panel.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Test name *</label>
                <input
                  autoFocus
                  value={newRow.name}
                  onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && newRow.name.trim()) submitAddRow(); }}
                  placeholder="e.g. Atypical Lymphocytes"
                  className="field w-full"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Unit</label>
                  <input value={newRow.unit} onChange={e => setNewRow(r => ({ ...r, unit: e.target.value }))} placeholder="%" className="field w-full" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Range low</label>
                  <input value={newRow.low} onChange={e => setNewRow(r => ({ ...r, low: e.target.value }))} inputMode="decimal" placeholder="0" className="field w-full" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Range high</label>
                  <input value={newRow.high} onChange={e => setNewRow(r => ({ ...r, high: e.target.value }))} inputMode="decimal" placeholder="5" className="field w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAddRowPanel(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={submitAddRow} disabled={!newRow.name.trim() || addingRow} className="btn btn-primary">
                {addingRow ? 'Adding…' : 'Add row'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-test dialog — append more tests to this patient; the report grows accordingly */}
      {showAddTest && (
        <div
          className="fixed inset-0 z-50 bg-[#0e0f16]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4"
          onClick={() => { setShowAddTest(false); setAddQuery(''); setAddResults([]); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in shadow-[var(--shadow-pop)]"
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <h3 className="text-[16px] font-semibold text-[#14151c] mb-1">Add a test</h3>
            <p className="text-[13px] text-[#3a3b45] mb-3">Search and tap a test to add it to this patient. The bill and report update automatically.</p>
            <input
              autoFocus
              value={addQuery}
              onChange={e => runAddSearch(e.target.value)}
              placeholder="Search test name or code…"
              className="field w-full mb-3"
            />
            <div className="max-h-72 overflow-auto">
              {addResults.length === 0 && addGroupResults.length === 0 ? (
                <p className="text-[13px] text-[#5e6072] py-4 text-center">{addQuery ? 'No matching tests.' : 'Type to search…'}</p>
              ) : (<>
                {addGroupResults.map(g => (
                  <button
                    key={g.id}
                    onClick={() => addGroup(g)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[#fafafe] text-left"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center rounded-md bg-[#eef0fe] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5] shrink-0">Group</span>
                      <span className="text-[14px] text-[#14151c] truncate">{g.label}</span>
                    </span>
                    <span className="text-[12px] tabular-nums text-[#4c4e5d] shrink-0">+{g.codes.length} tests</span>
                  </button>
                ))}
                {addResults.map(t => (
                  <button
                    key={t.id}
                    onClick={() => addTest(t)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[#fafafe] text-left"
                  >
                    <span className="text-[14px] text-[#14151c]">{t.name} <span className="text-[12px] text-[#5e6072]">({t.code})</span></span>
                    <span className="text-[13px] tabular-nums text-[#3a3b45]">₹{t.price}</span>
                  </button>
                ))}
              </>)}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => { setShowAddTest(false); setAddQuery(''); setAddResults([]); }} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit patient details — fix a registration mistake (name/age/sex/doctor) in place */}
      {editDraft && (
        <div
          className="fixed inset-0 z-50 bg-[#0e0f16]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4"
          onClick={() => setEditDraft(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in shadow-[var(--shadow-pop)] max-h-[88vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <h3 className="text-[16px] font-semibold text-[#14151c] mb-1">Edit patient details</h3>
            <p className="text-[13px] text-[#3a3b45] mb-4">Correct a wrong name, age, sex or referring doctor. The receipt number and tests are not affected.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-[5.5rem_1fr] gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Title</label>
                  <select
                    value={editDraft.title}
                    onChange={e => {
                      const title = e.target.value;
                      // Auto-match the sex to a gendered title (Mr./Master → Male, Mrs./Miss/Ms. → Female).
                      const sex: Sex | null = ['Mr.', 'Master'].includes(title) ? 'MALE'
                        : ['Mrs.', 'Miss', 'Ms.'].includes(title) ? 'FEMALE' : null;
                      setEditDraft(d => d && { ...d, title, ...(sex ? { sex } : {}) });
                    }}
                    className="field w-full"
                  >
                    {['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Master', 'Baby', 'Dr.', ''].map(t => <option key={t} value={t}>{t || '—'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Name</label>
                  <input value={editDraft.name} onChange={e => setEditDraft(d => d && { ...d, name: e.target.value })} className="field w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Age</label>
                  <div className="flex gap-1.5">
                    <input value={editDraft.age} onChange={e => setEditDraft(d => d && { ...d, age: e.target.value })} type="number" className="field w-full tabular-nums" />
                    <select value={editDraft.age_unit} onChange={e => setEditDraft(d => d && { ...d, age_unit: e.target.value as AgeUnit })} className="field !w-20 shrink-0">
                      <option value="YRS">YRS</option><option value="MTH">MTH</option><option value="DAYS">DAYS</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Sex</label>
                  <select
                    value={editDraft.baby ? (editDraft.sex === 'FEMALE' ? 'BABY_GIRL' : 'BABY_BOY') : editDraft.sex}
                    onChange={e => {
                      const v = e.target.value;
                      setEditDraft(d => d && (
                        v === 'BABY_BOY' ? { ...d, sex: 'MALE', baby: 1 } :
                        v === 'BABY_GIRL' ? { ...d, sex: 'FEMALE', baby: 1 } :
                        { ...d, sex: v as Sex, baby: 0 }
                      ));
                    }}
                    className="field w-full"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="BABY_BOY">Baby Boy</option>
                    <option value="BABY_GIRL">Baby Girl</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Referred by</label>
                <select
                  value={editDraft.doctor_id ?? ''}
                  onChange={e => setEditDraft(d => d && { ...d, doctor_id: e.target.value === '' ? null : Number(e.target.value) })}
                  className="field w-full"
                >
                  <option value="">SELF</option>
                  {doctors.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Phone</label>
                  <input value={editDraft.phone} onChange={e => setEditDraft(d => d && { ...d, phone: e.target.value })} className="field w-full tabular-nums" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Email</label>
                  <input value={editDraft.email} onChange={e => setEditDraft(d => d && { ...d, email: e.target.value })} className="field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#3a3b45] mb-1">Address</label>
                <input value={editDraft.address} onChange={e => setEditDraft(d => d && { ...d, address: e.target.value })} className="field w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditDraft(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={() => editDraft && !editMut.isPending && editDraft.name.trim() && editMut.mutate(editDraft)}
                disabled={editMut.isPending || !editDraft.name.trim()}
                className="btn btn-primary"
              >
                {editMut.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analyzer review dialog — staff confirm before values touch the patient */}
      {analyzer && (
        <div
          className="fixed inset-0 z-50 bg-[#0e0f16]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4"
          onClick={() => setAnalyzer(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 animate-scale-in shadow-[var(--shadow-pop)]"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-[16px] font-semibold text-[#14151c] mb-1">Values from analyzer</h3>
            <p className="text-[13px] text-[#3a3b45] mb-3">
              Review the {analyzer.matches.length} matched parameter{analyzer.matches.length !== 1 ? 's' : ''}. Applying overwrites the current values.
            </p>
            <div className="max-h-72 overflow-auto rounded-xl border border-[#eef0f4]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#eef0f4] bg-[#fafafe]">
                    <th className="px-3 py-2 text-left table-head">Test</th>
                    <th className="px-3 py-2 text-right table-head w-24">Current</th>
                    <th className="px-3 py-2 text-right table-head w-24">Analyzer</th>
                  </tr>
                </thead>
                <tbody>
                  {analyzer.matches.map(m => (
                    <tr key={m.orderId} className="border-b border-[#e9ebf2] last:border-0">
                      <td className="px-3 py-1.5 text-[#14151c]">{m.testName}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[#5e6072]">{m.current || '—'}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-[#14151c]">{m.incoming}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const h = analyzer.reading.histograms;
              const captured = [...new Set([h.wbcImg, h.rbcImg, h.pltImg].filter(Boolean) as string[])];
              const channels: { key: 'wbcImg' | 'rbcImg' | 'pltImg'; label: string }[] = [
                { key: 'wbcImg', label: 'WBC' }, { key: 'rbcImg', label: 'RBC' }, { key: 'pltImg', label: 'PLT' },
              ];
              if (captured.length) {
                return (
                  <div className="mt-3">
                    <p className="text-[12px] text-[#14743a] mb-1.5">✓ {captured.length} histogram graph{captured.length !== 1 ? 's' : ''} captured — confirm which is which, then Apply.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {channels.map(({ key, label }) => (
                        <div key={key} className="rounded-lg border border-[#eef0f4] p-2">
                          <div className="text-[11px] font-semibold text-[#3a3b45] mb-1">{label}</div>
                          <div className="h-16 flex items-center justify-center bg-[#fafafe] rounded mb-1 overflow-hidden">
                            {imgAssign[key] ? <img src={imgAssign[key]} alt={label} className="max-h-16 w-auto" /> : <span className="text-[11px] text-[#5e6072]">curve</span>}
                          </div>
                          <select
                            value={imgAssign[key] ?? ''}
                            onChange={e => setImgAssign(a => ({ ...a, [key]: e.target.value || undefined }))}
                            className="w-full text-[11px] border border-[#e6e7ee] rounded px-1 py-0.5"
                          >
                            <option value="">(curve)</option>
                            {captured.map((url, i) => <option key={i} value={url}>Graph {i + 1}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (h.wbc || h.rbc || h.plt) {
                return <p className="text-[12px] text-[#14743a] mt-3">✓ Histogram curves captured — they will print on the report.</p>;
              }
              return null;
            })()}
            <div className="flex gap-2.5 justify-end mt-5">
              <button onClick={() => setAnalyzer(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={applyAnalyzer} className="btn btn-primary">Apply {analyzer.matches.length} value{analyzer.matches.length !== 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Raw analyzer output — shown when data arrived but no parameter matched this
          patient's tests, so the exact format can be copied and the parser tuned. */}
      {rawCapture && (
        <div
          className="fixed inset-0 z-50 bg-[#0e0f16]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4"
          onClick={() => setRawCapture(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 animate-scale-in shadow-[var(--shadow-pop)]"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-[16px] font-semibold text-[#14151c] mb-1">Raw data from analyzer</h3>
            <p className="text-[13px] text-[#3a3b45] mb-3">
              {rawCapture.text.trim()
                ? <>Data arrived, but none of it matched this patient's ordered tests. Copy the text below and send it to support so the format can be added.</>
                : <>The analyzer connected but sent no data within the listening window. Re-send the result from the H360 and try again.</>}
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg bg-[#14151c] text-[#e8e6e1] text-[11px] leading-relaxed p-3 whitespace-pre-wrap break-all">
              {rawCapture.text.trim() || '(nothing received)'}
            </pre>
            <div className="flex gap-2.5 justify-end mt-5">
              <button onClick={() => setRawCapture(null)} className="btn btn-secondary">Close</button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(rawCapture.text)
                    .then(() => { setRawCopied(true); toast.success('Raw data copied — paste it to support.'); })
                    .catch(() => toast.error('Could not copy. Select the text and copy manually.'));
                }}
                disabled={!rawCapture.text.trim()}
                className="btn btn-primary"
              >
                {rawCopied ? 'Copied ✓' : 'Copy raw text'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve confirm dialog */}
      {showApprove && (
        <div
          className="fixed inset-0 z-50 bg-[#0e0f16]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4"
          onClick={() => setShowApprove(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in shadow-[var(--shadow-pop)]"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-[16px] font-semibold text-[#14151c] mb-2">Approve report?</h3>
            <p className="text-[13.5px] text-[#3a3b45] leading-relaxed mb-3">
              <span className="tabular-nums">{total}</span> test{total !== 1 ? 's' : ''} entered. Once approved, results are{' '}
              <strong className="text-[#14151c]">locked</strong> (only an Admin can unlock) and the report is ready to print &amp; deliver.
            </p>
            {notDoneOrders.length > 0 && (
              <div className="rounded-xl bg-[#fafafe] border border-[#eef0f4] px-3.5 py-2.5 mb-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4c4e5d] mb-1.5">Excluded — not done</p>
                <ul className="space-y-0.5">
                  {notDoneOrders.map(o => (
                    <li key={o.order.id} className="text-[12.5px] text-[#3a3b45]">{o.test.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2.5 justify-end mt-5">
              <button onClick={() => setShowApprove(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending} className="btn btn-success">
                {approveMut.isPending ? 'Approving…' : 'Approve & View Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
