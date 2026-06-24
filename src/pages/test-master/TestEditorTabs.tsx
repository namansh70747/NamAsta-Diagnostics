import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTestRanges,
  upsertTest,
  setInterpretation,
  upsertRange,
  deleteRange,
} from "@/lib/queries/tests";
import { Panel, ResultType, Test, TestRange } from "@/types";
import { ConfirmDialog } from "./Overlays";
import { Field, TextInput, Select, TextArea } from "./Fields";
import { FormulaBuilder } from "./FormulaBuilder";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

// Shared test-editing tabs. Used by both the Test Master sheet (TestSheet) and the in-place editor
// inside the panel customization hub (PanelEditorSheet), so a test can be fully customised from
// either place. Behaviour is identical regardless of where they're rendered.

export const RESULT_TYPES: ResultType[] = ["numeric", "text", "choice", "calculated"];

export function TestDetailsTab({
  test,
  panels,
  canEdit,
  onSuccess,
  onError,
}: {
  test: Test;
  panels: Panel[];
  canEdit: boolean;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(test.name);
  const [panelId, setPanelId] = useState<number | "">(test.panel_id ?? "");
  const [resultType, setResultType] = useState<ResultType>(test.result_type);
  const [unit, setUnit] = useState(test.unit ?? "");
  const [decimals, setDecimals] = useState(String(test.decimals ?? 0));
  const [price, setPrice] = useState(String(test.price ?? 0));
  const [sortOrder, setSortOrder] = useState(String(test.sort_order ?? 0));
  const [defaultValue, setDefaultValue] = useState(test.default_value ?? "");
  const [formula, setFormula] = useState(test.formula ?? "");
  const [choices, setChoices] = useState(() => {
    if (!test.choices) return "";
    try {
      const arr = JSON.parse(test.choices);
      return Array.isArray(arr) ? arr.join(", ") : test.choices;
    } catch {
      return test.choices;
    }
  });
  const [needsReview, setNeedsReview] = useState(!!test.needs_review);

  // Re-seed local form state when the selected test changes (the panel hub reuses this component
  // for different members without remounting it).
  useEffect(() => {
    setName(test.name);
    setPanelId(test.panel_id ?? "");
    setResultType(test.result_type);
    setUnit(test.unit ?? "");
    setDecimals(String(test.decimals ?? 0));
    setPrice(String(test.price ?? 0));
    setSortOrder(String(test.sort_order ?? 0));
    setDefaultValue(test.default_value ?? "");
    setFormula(test.formula ?? "");
    setChoices(() => {
      if (!test.choices) return "";
      try {
        const arr = JSON.parse(test.choices);
        return Array.isArray(arr) ? arr.join(", ") : test.choices;
      } catch {
        return test.choices;
      }
    });
    setNeedsReview(!!test.needs_review);
  }, [test.id]);

  const save = useMutation({
    mutationFn: (t: Partial<Test> & { code: string; name: string }) => upsertTest(t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tests"] });
      onSuccess("Test details saved.");
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to save."),
  });

  function handleSave() {
    let choicesJson: string | null = test.choices;
    if (resultType === "choice") {
      const list = choices.split(",").map((c) => c.trim()).filter(Boolean);
      choicesJson = list.length ? JSON.stringify(list) : null;
    }
    save.mutate({
      code: test.code,
      name: name.trim() || test.name,
      panel_id: panelId === "" ? undefined : Number(panelId),
      result_type: resultType,
      unit: unit.trim(),
      decimals: Number(decimals) || 0,
      price: Number(price) || 0,
      sort_order: Number(sortOrder) || 0,
      default_value: defaultValue.trim() || null,
      formula: formula.trim() || null,
      choices: choicesJson,
      enabled: test.enabled,
      is_panel: test.is_panel,
      interpretation_note: test.interpretation_note,
      needs_review: needsReview ? 1 : 0,
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Code" hint="Code is the unique key and cannot be changed here.">
        <TextInput value={test.code} onChange={() => {}} disabled />
      </Field>
      <Field label="Name">
        <TextInput value={name} onChange={setName} disabled={!canEdit} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Panel">
          <Select value={String(panelId)} onChange={(v) => setPanelId(v === "" ? "" : Number(v))}>
            <option value="">— None —</option>
            {panels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Result Type">
          <Select value={resultType} onChange={(v) => setResultType(v as ResultType)}>
            {RESULT_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unit">
          <TextInput value={unit} onChange={setUnit} disabled={!canEdit} />
        </Field>
        <Field label="Decimals">
          <TextInput value={decimals} onChange={setDecimals} type="number" numeric disabled={!canEdit} />
        </Field>
        <Field label="Price (₹)">
          <TextInput value={price} onChange={setPrice} type="number" numeric disabled={!canEdit} />
        </Field>
        <Field label="Sort Order">
          <TextInput value={sortOrder} onChange={setSortOrder} type="number" numeric disabled={!canEdit} />
        </Field>
      </div>
      <Field label="Default Value">
        <TextInput value={defaultValue} onChange={setDefaultValue} disabled={!canEdit} />
      </Field>
      {resultType === "choice" && (
        <Field label="Choices" hint="Comma-separated list.">
          <TextArea value={choices} onChange={setChoices} rows={2} />
        </Field>
      )}
      {resultType === "calculated" && (
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-[#3a3b45]">Formula</label>
          <FormulaBuilder
            value={formula}
            onChange={setFormula}
            currentCode={test.code}
            disabled={!canEdit}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-[13px] text-[#3a3b45] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={needsReview}
          disabled={!canEdit}
          onChange={(e) => setNeedsReview(e.target.checked)}
          className="rounded accent-maroon-600"
        />
        Needs review
      </label>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={save.isPending} className="btn btn-primary">
            {save.isPending ? "Saving…" : "Save Details"}
          </button>
        </div>
      )}
    </div>
  );
}

function ageLabel(min: number, max: number): string {
  if (min === 0 && max >= 36500) return "All ages";
  if (min === 0 && max <= 28)   return "Neonate (0–28 d)";
  if (min <= 29 && max <= 366)  return "Infant (1–12 mo)";
  if (min <= 366 && max <= 4380) return "Child (1–12 yr)";
  if (min <= 4381 && max <= 6570) return "Adolescent (12–18 yr)";
  if (min >= 6000 && max >= 36500) return "Adult (18+ yr)";
  const d = (days: number) => days < 30 ? `${days}d` : days < 365 ? `${Math.round(days/30)}mo` : `${Math.round(days/365)}yr`;
  return `${d(min)} – ${d(max)}`;
}

function sexChip(sex: TestRange["sex"]) {
  if (sex === "M") return { cls: "chip-blue", label: "M" };
  if (sex === "F") return { cls: "chip-red", label: "F" };
  return { cls: "chip-gray", label: "Any" };
}

export function TestRangesTab({
  test,
  canEdit,
  onSuccess,
  onError,
}: {
  test: Test;
  canEdit: boolean;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const { data: ranges = [], isLoading } = useQuery({
    queryKey: ["test-ranges", test.id],
    queryFn: () => getTestRanges(test.id),
  });

  const [confirmDel, setConfirmDel] = useState<TestRange | null>(null);

  // Add-range form state
  const [sex, setSex] = useState<"M" | "F" | "ANY">("ANY");
  const [ageMin, setAgeMin] = useState("0");
  const [ageMax, setAgeMax] = useState("36500");

  // Age-group presets so the lab can pick "Child" / "Adult" without calculating days.
  const AGE_GROUPS = [
    { label: "All ages",            min: 0,     max: 36500 },
    { label: "Neonate (0–28 d)",    min: 0,     max: 28    },
    { label: "Infant (1–12 mo)",    min: 29,    max: 365   },
    { label: "Child (1–12 yr)",     min: 366,   max: 4380  },
    { label: "Adolescent (12–18 yr)",min: 4381, max: 6570  },
    { label: "Adult (18+ yr)",      min: 6571,  max: 36500 },
    { label: "Adult Male",          min: 6571,  max: 36500 },
    { label: "Adult Female",        min: 6571,  max: 36500 },
  ];
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [rangeText, setRangeText] = useState("");
  const [bandText, setBandText] = useState("");
  const [rangeUnit, setRangeUnit] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["test-ranges", test.id] });

  const add = useMutation({
    mutationFn: (r: Omit<TestRange, "id">) => upsertRange(r),
    onSuccess: () => {
      invalidate();
      onSuccess("Range added.");
      setLow("");
      setHigh("");
      setRangeText("");
      setBandText("");
      setRangeUnit("");
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to add range."),
  });

  const del = useMutation({
    mutationFn: (id: number) => deleteRange(id),
    onSuccess: () => {
      invalidate();
      onSuccess("Range deleted.");
      setConfirmDel(null);
    },
    onError: (e: unknown) => {
      onError(e instanceof Error ? e.message : "Failed to delete range.");
      setConfirmDel(null);
    },
  });

  function handleAdd() {
    // Validate STRICTLY — a NaN low/high silently disables H/L flagging (num < NaN is always
    // false), so a clearly-abnormal result would print with no flag. That's a patient-safety
    // hole, so reject bad input here instead of writing NaN into a reference range.
    const aMin = ageMin.trim() === "" ? 0 : Number(ageMin);
    const aMax = ageMax.trim() === "" ? 0 : Number(ageMax);
    const lowN = low.trim() === "" ? null : Number(low);
    const highN = high.trim() === "" ? null : Number(high);

    if (!Number.isInteger(aMin) || aMin < 0) return onError("Age (min days) must be a whole number ≥ 0.");
    if (!Number.isInteger(aMax) || aMax < 0) return onError("Age (max days) must be a whole number ≥ 0.");
    if (aMin > aMax) return onError("Age (min days) cannot be greater than age (max days).");
    if (lowN !== null && !Number.isFinite(lowN)) return onError("Low value must be a number, or left blank.");
    if (highN !== null && !Number.isFinite(highN)) return onError("High value must be a number, or left blank.");
    if (lowN !== null && highN !== null && lowN > highN) return onError("Low value cannot be greater than the high value.");
    if (lowN === null && highN === null && !rangeText.trim() && !bandText.trim())
      return onError("Enter a numeric low/high, or a range text (e.g. \"Negative\").");

    add.mutate({
      test_id: test.id,
      sex,
      age_min_days: aMin,
      age_max_days: aMax,
      low: lowN,
      high: highN,
      range_text: rangeText.trim() || null,
      band_text: bandText.trim() || null,
      unit: rangeUnit.trim() || null,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4c4e5d] mb-3">
          Existing Ranges
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[#eef0f4]" />
            ))}
          </div>
        ) : ranges.length === 0 ? (
          <p className="text-[13.5px] text-[#4c4e5d] py-3">No reference ranges yet.</p>
        ) : (
          <div className="space-y-2">
            {ranges.map((r) => {
              const sc = sexChip(r.sex);
              return (
                <div
                  key={r.id}
                  className="group grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-xl border border-[#eef0f4] bg-[#fcfbfa] px-3.5 py-2.5"
                >
                  <span className={cn("chip text-[10.5px] mt-0.5", sc.cls)}>{sc.label}</span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-[#14151c] tabular-nums truncate">
                      {r.range_text || (
                        <>
                          {r.low ?? "—"} <span className="text-[#5e6072] font-normal">–</span>{" "}
                          {r.high ?? "—"}
                        </>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[#4c4e5d] mt-0.5">
                      {ageLabel(r.age_min_days, r.age_max_days)}
                    </div>
                    {r.unit && (
                      <div className="text-[11.5px] font-medium text-[#4f46e5] mt-0.5">Unit: {r.unit}</div>
                    )}
                    {r.band_text && (
                      <div className="text-[11.5px] text-[#4c4e5d] mt-0.5 truncate">{r.band_text}</div>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setConfirmDel(r)}
                      aria-label="Delete range"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#5e6072] opacity-0 group-hover:opacity-100 hover:bg-[#fbe5e5] hover:text-[#a31e1e] transition-all"
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="rounded-xl border border-[#eef0f4] p-4 space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4c4e5d] mb-3">
            Add Range
          </p>
          {/* Age-group preset — fills min/max days automatically */}
          <div className="mb-1">
            <p className="text-[11px] font-medium text-[#4c4e5d] mb-2">Age group (quick fill)</p>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.map(g => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => { setAgeMin(String(g.min)); setAgeMax(String(g.max)); }}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors
                    ${ageMin === String(g.min) && ageMax === String(g.max)
                      ? "bg-[#eef0fe] border-[#6366f1] text-[#4338ca]"
                      : "bg-white border-[#e6e7ee] text-[#3a3b45] hover:border-[#c7c9ff]"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Sex">
              <Select value={sex} onChange={(v) => setSex(v as "M" | "F" | "ANY")}>
                <option value="ANY">Any</option>
                <option value="M">M (Male)</option>
                <option value="F">F (Female)</option>
              </Select>
            </Field>
            <Field label="Age from (days)" hint="0 = birth">
              <TextInput value={ageMin} onChange={setAgeMin} type="number" numeric />
            </Field>
            <Field label="Age to (days)" hint="36500 = no limit">
              <TextInput value={ageMax} onChange={setAgeMax} type="number" numeric />
            </Field>
            <Field label="Low">
              <TextInput value={low} onChange={setLow} type="number" numeric placeholder="—" />
            </Field>
            <Field label="High">
              <TextInput value={high} onChange={setHigh} type="number" numeric placeholder="—" />
            </Field>
            <div className="col-span-3">
              <Field label="Range text" hint="Overrides low/high on the report (e.g. 70 - 110).">
                <TextInput value={rangeText} onChange={setRangeText} placeholder="e.g. < 40" />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit for this age group" hint="Leave blank to use the test's default unit. E.g. set '/cumm' for adults and '10^3/µL' for paediatric.">
              <TextInput value={rangeUnit} onChange={setRangeUnit} placeholder="e.g. /cumm" />
            </Field>
            <Field label="Band text" hint="Multi-band / interpretation line (optional).">
              <TextInput value={bandText} onChange={setBandText} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button onClick={handleAdd} disabled={add.isPending} className="btn btn-primary">
              <Plus size={15} strokeWidth={2.2} /> {add.isPending ? "Adding…" : "Add Range"}
            </button>
          </div>
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete range?"
          message={`This will permanently remove the ${
            confirmDel.sex === "ANY" ? "Any" : confirmDel.sex
          } range (${confirmDel.range_text || `${confirmDel.low ?? "—"}–${confirmDel.high ?? "—"}`}).`}
          confirmLabel="Delete"
          onConfirm={() => del.mutate(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

export function TestInterpretationTab({
  test,
  canEdit,
  onSuccess,
  onError,
}: {
  test: Test;
  canEdit: boolean;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState(test.interpretation_note ?? "");

  // Keep local state in sync if the selected test changes.
  useEffect(() => {
    setNote(test.interpretation_note ?? "");
  }, [test.id, test.interpretation_note]);

  const save = useMutation({
    mutationFn: (n: string) => setInterpretation(test.id, n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tests"] });
      onSuccess("Interpretation saved.");
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to save interpretation."),
  });

  return (
    <div className="space-y-4">
      <Field label="Interpretation note" hint="Free text printed beneath the results.">
        <TextArea
          value={note}
          onChange={setNote}
          rows={12}
          placeholder="Enter the printed interpretation / diagnosis note for this test…"
        />
      </Field>
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => save.mutate(note)} disabled={save.isPending} className="btn btn-primary">
            {save.isPending ? "Saving…" : "Save Interpretation"}
          </button>
        </div>
      )}
    </div>
  );
}
