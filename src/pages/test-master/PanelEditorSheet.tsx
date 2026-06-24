import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updatePanel,
  setPanelOrderable,
  createPanelTest,
  reorderPanelTests,
  reassignTestPanel,
} from "@/lib/queries/tests";
import { Panel, Test } from "@/types";
import { Sheet, ConfirmDialog } from "./Overlays";
import { Field, TextInput } from "./Fields";
import { TestDetailsTab, TestRangesTab, TestInterpretationTab } from "./TestEditorTabs";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Search, Lock, Pencil } from "lucide-react";

type SubTab = "details" | "ranges" | "interpretation";

/** Full editor for one panel: rename / heading / order / page-break, an "orderable as one
 *  profile" toggle, add/remove/reorder of its member tests, AND in-place full editing of any
 *  member test (details / ranges / interpretation) — a one-stop customization hub. */
export function PanelEditorSheet({
  panel,
  allTests,
  panels,
  canManage,
  canEditTests,
  canEditRanges,
  onClose,
  onSuccess,
  onError,
}: {
  panel: Panel;
  allTests: Test[];
  panels: Panel[];
  canManage: boolean;
  canEditTests: boolean;
  canEditRanges: boolean;
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [tab, setTab] = useState<"details" | "tests">("details");
  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("details");

  const members = useMemo(
    () =>
      allTests
        .filter((t) => t.panel_id === panel.id && !t.is_panel)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [allTests, panel.id]
  );
  const bundle = useMemo(
    () => allTests.find((t) => t.panel_id === panel.id && t.is_panel),
    [allTests, panel.id]
  );
  // Looked up across ALL tests (not panel-filtered) so editing survives a reassign; stays fresh
  // after ["tests"] invalidation.
  const editingTest = editingTestId == null ? undefined : allTests.find((t) => t.id === editingTestId);

  // Opening a different member starts on Details; bail back to the list if it ever disappears.
  useEffect(() => { setSubTab("details"); }, [editingTestId]);
  useEffect(() => {
    if (editingTestId != null && !editingTest) setEditingTestId(null);
  }, [editingTestId, editingTest]);

  const editing = !!editingTest;

  return (
    <Sheet
      title={editing ? editingTest!.name : panel.name}
      chip={editing ? editingTest!.code : panel.code}
      subtitle={editing ? `in ${panel.name}` : `${members.length} test${members.length === 1 ? "" : "s"}`}
      onClose={onClose}
      header={
        editing ? (
          <div className="shrink-0 border-b border-[#eef0f4]">
            <button
              onClick={() => setEditingTestId(null)}
              className="flex items-center gap-1 px-5 pt-2.5 text-[12px] font-medium text-[#8a8b97] hover:text-maroon-700 transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={2} /> Back to {panel.name}
            </button>
            <div className="flex gap-1 px-5 mt-1.5">
              {(["details", "ranges", "interpretation"] as SubTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSubTab(t)}
                  className={cn(
                    "px-3 py-2.5 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors",
                    subTab === t
                      ? "border-maroon-600 text-[#14151c]"
                      : "border-transparent text-[#8a8b97] hover:text-[#54555f]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-1 border-b border-[#eef0f4] px-5 shrink-0">
            {(["details", "tests"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-2.5 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-maroon-600 text-[#14151c]"
                    : "border-transparent text-[#8a8b97] hover:text-[#54555f]"
                )}
              >
                {t === "tests" ? `Tests (${members.length})` : t}
              </button>
            ))}
          </div>
        )
      }
    >
      {editing ? (
        <>
          {subTab === "details" && (
            <TestDetailsTab test={editingTest!} panels={panels} canEdit={canEditTests} onSuccess={onSuccess} onError={onError} />
          )}
          {subTab === "ranges" && (
            <TestRangesTab test={editingTest!} canEdit={canEditRanges} onSuccess={onSuccess} onError={onError} />
          )}
          {subTab === "interpretation" && (
            <TestInterpretationTab test={editingTest!} canEdit={canEditTests} onSuccess={onSuccess} onError={onError} />
          )}
        </>
      ) : (
        <>
          {!canManage && (
            <div className="flex items-center gap-2 mb-4 rounded-lg bg-[#fdf0d7]/60 px-3 py-2 text-[12px] text-[#92600a]">
              <Lock size={13} strokeWidth={1.8} /> Read-only — managing panels requires elevated access.
            </div>
          )}
          {tab === "details" && (
            <DetailsTab panel={panel} bundle={bundle} canManage={canManage} onSuccess={onSuccess} onError={onError} />
          )}
          {tab === "tests" && (
            <TestsTab
              panel={panel}
              members={members}
              allTests={allTests}
              canManage={canManage}
              onEdit={(id) => setEditingTestId(id)}
              onSuccess={onSuccess}
              onError={onError}
            />
          )}
        </>
      )}
    </Sheet>
  );
}

function DetailsTab({
  panel,
  bundle,
  canManage,
  onSuccess,
  onError,
}: {
  panel: Panel;
  bundle: Test | undefined;
  canManage: boolean;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(panel.name);
  const [heading, setHeading] = useState(panel.report_heading ?? "");
  const [sortOrder, setSortOrder] = useState(String(panel.sort_order ?? 0));
  const [pageBreak, setPageBreak] = useState(!!panel.page_break_after);

  // Orderable-as-one-profile state, seeded from the existing (enabled) bundle test.
  const orderableNow = !!bundle && !!bundle.enabled;
  const [orderable, setOrderable] = useState(orderableNow);
  const [profilePrice, setProfilePrice] = useState(String(bundle?.price ?? 0));
  const [profileName, setProfileName] = useState(bundle?.name ?? panel.name);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["panels"] });
    qc.invalidateQueries({ queryKey: ["tests"] });
  };

  const saveDetails = useMutation({
    mutationFn: () =>
      updatePanel(panel.id, {
        name: name.trim() || panel.name,
        report_heading: heading.trim(),
        sort_order: Number(sortOrder) || 0,
        page_break_after: pageBreak ? 1 : 0,
      }),
    onSuccess: () => {
      invalidate();
      onSuccess("Panel saved.");
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to save panel."),
  });

  const saveOrderable = useMutation({
    mutationFn: () =>
      setPanelOrderable(panel.id, {
        orderable,
        price: Number(profilePrice) || 0,
        name: profileName.trim() || panel.name,
      }),
    onSuccess: () => {
      invalidate();
      onSuccess(orderable ? "Panel is now orderable as one profile." : "Profile ordering turned off.");
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to update profile ordering."),
  });

  return (
    <div className="space-y-4">
      <Field label="Code" hint="The code is the unique key and cannot be changed.">
        <TextInput value={panel.code} onChange={() => {}} disabled />
      </Field>
      <Field label="Name *">
        <TextInput value={name} onChange={setName} disabled={!canManage} />
      </Field>
      <Field label="Report Heading" hint="Prints as the section title on the report. Defaults to the NAME in capitals.">
        <TextInput value={heading} onChange={setHeading} disabled={!canManage} placeholder={name.toUpperCase()} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sort Order" hint="Lower = higher on the report.">
          <TextInput value={sortOrder} onChange={setSortOrder} type="number" numeric disabled={!canManage} />
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-[#54555f] cursor-pointer select-none mt-7">
          <input
            type="checkbox"
            checked={pageBreak}
            disabled={!canManage}
            onChange={(e) => setPageBreak(e.target.checked)}
            className="rounded accent-maroon-600"
          />
          Page break after this panel
        </label>
      </div>

      {canManage && (
        <div className="flex justify-end pt-1">
          <button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending} className="btn btn-primary">
            {saveDetails.isPending ? "Saving…" : "Save Panel"}
          </button>
        </div>
      )}

      {/* Orderable as one profile */}
      <div className="rounded-xl border border-[#eef0f4] p-4 space-y-3 mt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#14151c]">Orderable as one profile</p>
            <p className="text-[11.5px] text-[#8a8b97] mt-0.5 leading-relaxed">
              Lets the front desk order the whole panel as a single billed line (like CBC / HbA1c Profile)
              that auto-includes its tests.
            </p>
          </div>
          <Switch on={orderable} disabled={!canManage} onToggle={() => setOrderable((v) => !v)} />
        </div>
        {orderable && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Profile name" hint="Shown when searching.">
              <TextInput value={profileName} onChange={setProfileName} disabled={!canManage} />
            </Field>
            <Field label="Profile price (₹)">
              <TextInput value={profilePrice} onChange={setProfilePrice} type="number" numeric disabled={!canManage} />
            </Field>
          </div>
        )}
        {canManage && (
          <div className="flex justify-end">
            <button onClick={() => saveOrderable.mutate()} disabled={saveOrderable.isPending} className="btn btn-secondary">
              {saveOrderable.isPending ? "Saving…" : orderable ? "Save profile" : "Turn off profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TestsTab({
  panel,
  members,
  allTests,
  canManage,
  onEdit,
  onSuccess,
  onError,
}: {
  panel: Panel;
  members: Test[];
  allTests: Test[];
  canManage: boolean;
  onEdit: (testId: number) => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["panels"] });
    qc.invalidateQueries({ queryKey: ["tests"] });
  };

  const [confirmRemove, setConfirmRemove] = useState<Test | null>(null);
  // Add-new-test form
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newLow, setNewLow] = useState("");
  const [newHigh, setNewHigh] = useState("");
  // Add-existing search
  const [existingQ, setExistingQ] = useState("");

  const reorder = useMutation({
    mutationFn: (ids: number[]) => reorderPanelTests(ids),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to reorder."),
  });

  const addNew = useMutation({
    mutationFn: () =>
      createPanelTest({
        panelId: panel.id,
        name: newName.trim(),
        unit: newUnit.trim() || undefined,
        low: newLow.trim() === "" ? null : Number(newLow),
        high: newHigh.trim() === "" ? null : Number(newHigh),
      }),
    onSuccess: (newId) => {
      invalidate();
      onSuccess("Test added — opening it so you can set ranges, interpretation, etc.");
      setNewName("");
      setNewUnit("");
      setNewLow("");
      setNewHigh("");
      if (newId) onEdit(newId);   // jump straight into the new test for full setup
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to add test."),
  });

  const assign = useMutation({
    mutationFn: ({ testId, panelId }: { testId: number; panelId: number | null }) =>
      reassignTestPanel(testId, panelId),
    onSuccess: (_d, vars) => {
      invalidate();
      onSuccess(vars.panelId == null ? "Test removed from panel." : "Test added to panel.");
      setConfirmRemove(null);
    },
    onError: (e: unknown) => {
      onError(e instanceof Error ? e.message : "Failed to update test.");
      setConfirmRemove(null);
    },
  });

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= members.length) return;
    const ids = members.map((m) => m.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate(ids);
  }

  function handleAddNew() {
    if (!newName.trim()) return onError("Test name is required.");
    const lowN = newLow.trim() === "" ? null : Number(newLow);
    const highN = newHigh.trim() === "" ? null : Number(newHigh);
    if (lowN !== null && !Number.isFinite(lowN)) return onError("Low must be a number, or blank.");
    if (highN !== null && !Number.isFinite(highN)) return onError("High must be a number, or blank.");
    if (lowN !== null && highN !== null && lowN > highN) return onError("Low cannot be greater than High.");
    addNew.mutate();
  }

  // Existing tests not already in this panel (and not bundle rows), matched by code/name.
  const candidates = useMemo(() => {
    const q = existingQ.trim().toLowerCase();
    if (!q) return [];
    return allTests
      .filter((t) => t.panel_id !== panel.id && !t.is_panel && t.enabled)
      .filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTests, existingQ, panel.id]);

  return (
    <div className="space-y-5">
      {/* Member list */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97] mb-3">
          Tests in this panel
        </p>
        {members.length === 0 ? (
          <p className="text-[13.5px] text-[#8a8b97] py-2">No tests yet. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {members.map((t, i) => (
              <div
                key={t.id}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-xl border border-[#eef0f4] bg-[#fcfbfa] px-3.5 py-2.5"
              >
                <button
                  onClick={() => onEdit(t.id)}
                  className="min-w-0 text-left"
                  title="Edit this test (details, ranges, interpretation)"
                >
                  <div className="text-[13.5px] font-medium text-[#14151c] truncate group-hover:text-maroon-700 transition-colors">
                    {t.name}
                  </div>
                  <div className="text-[11.5px] font-mono text-[#a3a5b3] mt-0.5">
                    {t.code}
                    {t.unit ? ` · ${t.unit}` : ""}
                  </div>
                </button>
                <div className="flex items-center gap-0.5">
                  <IconBtn label="Edit test" onClick={() => onEdit(t.id)}>
                    <Pencil size={14} strokeWidth={1.8} />
                  </IconBtn>
                  {canManage && (
                    <>
                      <IconBtn label="Move up" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                        <ArrowUp size={15} strokeWidth={1.8} />
                      </IconBtn>
                      <IconBtn label="Move down" disabled={i === members.length - 1 || reorder.isPending} onClick={() => move(i, 1)}>
                        <ArrowDown size={15} strokeWidth={1.8} />
                      </IconBtn>
                      <IconBtn label="Remove from panel" danger onClick={() => setConfirmRemove(t)}>
                        <Trash2 size={15} strokeWidth={1.8} />
                      </IconBtn>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <>
          {/* Add existing test */}
          <div className="rounded-xl border border-[#eef0f4] p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">
              Add an existing test
            </p>
            <div className="relative">
              <Search size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a5b3] pointer-events-none" />
              <input
                value={existingQ}
                onChange={(e) => setExistingQ(e.target.value)}
                placeholder="Search code or name…"
                className="field pl-9"
              />
            </div>
            {candidates.length > 0 && (
              <div className="rounded-lg border border-[#eef0f4] divide-y divide-[#f1f1f5] overflow-hidden">
                {candidates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { assign.mutate({ testId: t.id, panelId: panel.id }); setExistingQ(""); }}
                    disabled={assign.isPending}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#fafafe] transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="text-[13px] text-[#14151c]">{t.name}</span>
                      <span className="text-[11px] font-mono text-[#a3a5b3] ml-2">{t.code}</span>
                      {t.panel_code && <span className="text-[11px] text-[#a3a5b3] ml-1">({t.panel_code})</span>}
                    </span>
                    <Plus size={15} strokeWidth={2} className="text-maroon-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {existingQ.trim() && candidates.length === 0 && (
              <p className="text-[12px] text-[#a3a5b3]">No matching tests outside this panel.</p>
            )}
          </div>

          {/* Add new test */}
          <div className="rounded-xl border border-[#eef0f4] p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">
              Create a new test
            </p>
            <Field label="Name *">
              <TextInput value={newName} onChange={setNewName} placeholder="e.g. Free T4" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Unit">
                <TextInput value={newUnit} onChange={setNewUnit} placeholder="e.g. ng/dL" />
              </Field>
              <Field label="Low">
                <TextInput value={newLow} onChange={setNewLow} type="number" numeric placeholder="—" />
              </Field>
              <Field label="High">
                <TextInput value={newHigh} onChange={setNewHigh} type="number" numeric placeholder="—" />
              </Field>
            </div>
            <p className="text-[11.5px] text-[#a3a5b3]">
              Just the basics — after adding, the test opens so you can set decimals, type, more ranges and an interpretation.
            </p>
            <div className="flex justify-end">
              <button onClick={handleAddNew} disabled={addNew.isPending} className="btn btn-primary">
                <Plus size={15} strokeWidth={2.2} /> {addNew.isPending ? "Adding…" : "Add Test"}
              </button>
            </div>
          </div>
        </>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove test from panel?"
          message={`"${confirmRemove.name}" will be unlinked from ${panel.name}. The test itself is kept (you can reassign it to another panel later).`}
          confirmLabel="Remove"
          onConfirm={() => assign.mutate({ testId: confirmRemove.id, panelId: null })}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        danger
          ? "text-[#a3a5b3] hover:bg-[#fbe5e5] hover:text-[#a31e1e]"
          : "text-[#8a8b97] hover:bg-[#eef0f4] hover:text-[#14151c]"
      )}
    >
      {children}
    </button>
  );
}

/** Small on/off switch (matches the Test Master MiniSwitch look). */
function Switch({ on, disabled, onToggle }: { on: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full transition-colors align-middle mt-0.5",
        on ? "bg-[#15803d]" : "bg-[#cfd1da]",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        !disabled && !on && "hover:bg-[#c4c6d2]"
      )}
    >
      <span
        className={cn(
          "inline-block h-[13px] w-[13px] rounded-full bg-white shadow-[0_1px_2px_rgba(26,22,18,0.25)] transition-transform",
          on ? "translate-x-[14px]" : "translate-x-[2.5px]"
        )}
      />
    </button>
  );
}
