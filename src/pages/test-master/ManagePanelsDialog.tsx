import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/types";
import { createPanel, deletePanel, reorderPanels } from "@/lib/queries/tests";
import { Modal, ConfirmDialog } from "./Overlays";
import { Field, TextInput } from "./Fields";
import { Layers, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ManagePanelsDialog({
  panels,
  canManage,
  onClose,
  onEdit,
  onSuccess,
  onError,
}: {
  panels: Panel[];
  canManage: boolean;
  onClose: () => void;
  onEdit: (panel: Panel) => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["panels"] });
    qc.invalidateQueries({ queryKey: ["tests"] });
  };

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [heading, setHeading] = useState("");
  const [pageBreak, setPageBreak] = useState(false);
  const [nameErr, setNameErr] = useState<string | undefined>();
  const [confirmDel, setConfirmDel] = useState<Panel | null>(null);

  // After creating, open the new panel in the editor once the refreshed list contains it.
  const pendingOpenId = useRef<number | null>(null);
  useEffect(() => {
    if (pendingOpenId.current == null) return;
    const p = panels.find((x) => x.id === pendingOpenId.current);
    if (p) {
      pendingOpenId.current = null;
      onEdit(p);
    }
  }, [panels, onEdit]);

  const create = useMutation({
    mutationFn: () =>
      createPanel({
        name: name.trim(),
        code: code.trim() || undefined,
        report_heading: heading.trim() || undefined,
        page_break_after: pageBreak ? 1 : 0,
      }),
    onSuccess: (id) => {
      invalidate();
      onSuccess("Panel created.");
      pendingOpenId.current = id;
      setShowCreate(false);
      setName("");
      setCode("");
      setHeading("");
      setPageBreak(false);
    },
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to create panel."),
  });

  const del = useMutation({
    mutationFn: (id: number) => deletePanel(id),
    onSuccess: () => {
      invalidate();
      onSuccess("Panel deleted.");
      setConfirmDel(null);
    },
    onError: (e: unknown) => {
      onError(e instanceof Error ? e.message : "Failed to delete panel.");
      setConfirmDel(null);
    },
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => reorderPanels(ids),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => onError(e instanceof Error ? e.message : "Failed to reorder panels."),
  });

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= panels.length) return;
    const ids = panels.map((p) => p.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate(ids);
  }

  function handleCreate() {
    if (!name.trim()) {
      setNameErr("Panel name is required.");
      return;
    }
    setNameErr(undefined);
    create.mutate();
  }

  return (
    <Modal title="Manage Panels" onClose={onClose} width="max-w-xl">
      <p className="text-[13px] text-[#6b6c7e] leading-relaxed mb-4">
        Panels group tests on the report and can be ordered as a single billed profile. Create a panel,
        then open it to add tests and turn on profile ordering.
      </p>

      {canManage && (
        <div className="mb-4">
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <Plus size={15} strokeWidth={2.2} /> New Panel
            </button>
          ) : (
            <div className="rounded-xl border border-[#eef0f4] p-4 space-y-3">
              <Field label="Name *" error={nameErr}>
                <TextInput value={name} onChange={(v) => { setName(v); setNameErr(undefined); }} error={!!nameErr} placeholder="e.g. Thyroid Profile" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code" hint="Leave blank to auto-generate.">
                  <TextInput value={code} onChange={setCode} placeholder="e.g. THY2" />
                </Field>
                <Field label="Report Heading" hint="Defaults to NAME in capitals.">
                  <TextInput value={heading} onChange={setHeading} placeholder={name.trim() ? name.toUpperCase() : "REPORT HEADING"} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#54555f] cursor-pointer select-none">
                <input type="checkbox" checked={pageBreak} onChange={(e) => setPageBreak(e.target.checked)} className="rounded accent-maroon-600" />
                Page break after this panel
              </label>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowCreate(false); setNameErr(undefined); }} className="btn btn-ghost">Cancel</button>
                <button onClick={handleCreate} disabled={create.isPending} className="btn btn-primary">
                  {create.isPending ? "Creating…" : "Create Panel"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {panels.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#eef0f4] text-[#6b6c7e] flex items-center justify-center mx-auto mb-3">
            <Layers size={17} strokeWidth={1.8} />
          </div>
          <p className="text-[13.5px] text-[#6b6c7e]">No panels configured.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#eef0f4] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eef0f4]">
                <th className="px-4 py-2.5 text-left table-head">Code</th>
                <th className="px-4 py-2.5 text-left table-head">Report Heading</th>
                <th className="px-4 py-2.5 text-center table-head">Page Break</th>
                {canManage && <th className="px-4 py-2.5 text-right table-head">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {panels.map((p, i) => (
                <tr key={p.id} className="group border-b border-[#f1f1f5] last:border-0 hover:bg-[#fafafe]">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[#6b6c7e]">{p.code}</td>
                  <td className="px-4 py-2.5 text-[13.5px] text-[#14151c]">
                    {canManage ? (
                      <button onClick={() => onEdit(p)} className="text-left hover:text-maroon-700 transition-colors">
                        {p.report_heading || p.name}
                      </button>
                    ) : (
                      p.report_heading || p.name
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {p.page_break_after ? (
                      <span className="chip chip-gray text-[10.5px]">Yes</span>
                    ) : (
                      <span className="text-[12px] text-[#82849a]">—</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <RowBtn label="Move up" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                          <ArrowUp size={14} strokeWidth={1.8} />
                        </RowBtn>
                        <RowBtn label="Move down" disabled={i === panels.length - 1 || reorder.isPending} onClick={() => move(i, 1)}>
                          <ArrowDown size={14} strokeWidth={1.8} />
                        </RowBtn>
                        <RowBtn label="Edit panel" onClick={() => onEdit(p)}>
                          <Pencil size={14} strokeWidth={1.8} />
                        </RowBtn>
                        <RowBtn label="Delete panel" danger onClick={() => setConfirmDel(p)}>
                          <Trash2 size={14} strokeWidth={1.8} />
                        </RowBtn>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end mt-5">
        <button onClick={onClose} className="btn btn-secondary">Close</button>
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Delete panel?"
          message={`Permanently delete the "${confirmDel.report_heading || confirmDel.name}" panel. Panels with tests can't be deleted — remove or reassign their tests first.`}
          confirmLabel="Delete"
          onConfirm={() => del.mutate(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </Modal>
  );
}

function RowBtn({
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
          ? "text-[#82849a] hover:bg-[#fbe5e5] hover:text-[#a31e1e]"
          : "text-[#6b6c7e] hover:bg-[#eef0f4] hover:text-[#14151c]"
      )}
    >
      {children}
    </button>
  );
}
