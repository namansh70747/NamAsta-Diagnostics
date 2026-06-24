import { useEffect, useState } from "react";
import { Save, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Card, TabHeader, TextField, PrimaryButton, SecondaryButton, NoteBox } from "../ui";
import { useSettingsForm } from "../useSettingsForm";
import { invoke, isTauri } from "@/lib/tauri";
import { confirmDialog } from "@/lib/dialog";
import { checkForUpdate, installUpdate } from "@/lib/updates";

const KEYS = ["next_test_no", "financial_year", "backup_retention_days"];

export function SystemTab({ settings }: { settings: Record<string, string> }) {
  const f = useSettingsForm(settings, KEYS);
  const [version, setVersion] = useState("…");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTauri()) {
        if (!cancelled) setVersion("dev");
        return;
      }
      try {
        const v = await invoke<string>("app_version");
        if (!cancelled) setVersion(v);
      } catch {
        if (!cancelled) setVersion("unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextChanged = (f.get("next_test_no") || "") !== (settings.next_test_no ?? "");

  async function onSave() {
    if (nextChanged) {
      const ok = await confirmDialog({
        title: "Change Next Test Number?",
        message: "Setting it lower than existing records can cause duplicate test numbers. Continue?",
        danger: true,
        confirmText: "Change",
      });
      if (!ok) return;
    }
    if (await f.save()) f.toast.success("System settings saved.");
  }

  async function checkUpdates() {
    if (!isTauri()) {
      setUpdateStatus("Update checks run in the installed desktop app.");
      return;
    }
    setUpdateBusy(true);
    setUpdateStatus("Checking for updates…");
    try {
      const update = await checkForUpdate();
      if (!update) {
        setUpdateStatus(`You're on the latest version (v${version}).`);
        return;
      }
      const ok = await confirmDialog({
        title: `Update available — v${update.version}`,
        message: `A new version (v${update.version}) is ready to install.${update.body ? `\n\nWhat's new:\n${update.body}` : ""}\n\nThe app will download it and restart. Your data is not affected.`,
        confirmText: "Update & restart",
      });
      if (!ok) {
        setUpdateStatus(`Update v${update.version} is available — run the check again when you're ready.`);
        return;
      }
      setUpdateStatus("Downloading update… 0%");
      await installUpdate(update, (pct) => setUpdateStatus(`Downloading update… ${pct}%`));
      // installUpdate relaunches the app on success, so this point is normally not reached.
      setUpdateStatus("Update installed — restarting…");
    } catch (e) {
      setUpdateStatus(null);
      f.toast.error(`Update check failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUpdateBusy(false);
    }
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <TabHeader title="System" subtitle="Numbering, financial year and maintenance." />
          <PrimaryButton onClick={onSave} disabled={f.saving || !f.dirty}>
            <Save size={15} strokeWidth={1.8} />
            {f.saving ? "Saving…" : "Save"}
          </PrimaryButton>
        </div>

        <TextField
          label="Next test number"
          type="number"
          value={f.get("next_test_no") || "1"}
          onChange={(v) => f.set("next_test_no", v)}
        />
        {nextChanged && (
          <NoteBox tone="warn">
            <span className="flex items-start gap-2">
              <AlertTriangle size={15} strokeWidth={1.8} className="shrink-0 mt-0.5" />
              <span>
                Changing this affects the numbering of the next receipt. Setting it below an existing number risks duplicate
                test numbers — only lower it during a fresh financial-year rollover.
              </span>
            </span>
          </NoteBox>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Financial year"
            value={f.get("financial_year") || ""}
            onChange={(v) => f.set("financial_year", v)}
            placeholder="2026-2027"
          />
          <TextField
            label="Backup retention (days)"
            type="number"
            value={f.get("backup_retention_days") || "30"}
            onChange={(v) => f.set("backup_retention_days", v)}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <TabHeader title="About" />
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-[#3a3b45]">App version</span>
          <span className="font-mono text-[#14151c] tabular-nums">{version}</span>
        </div>
        <div className="space-y-2">
          <SecondaryButton onClick={checkUpdates} disabled={updateBusy}>
            {updateBusy
              ? <Loader2 size={15} strokeWidth={1.8} className="animate-spin" />
              : <RefreshCw size={15} strokeWidth={1.8} />}
            {updateBusy ? "Working…" : "Check for updates"}
          </SecondaryButton>
          {updateStatus && <p className="text-[12.5px] text-[#3a3b45]">{updateStatus}</p>}
        </div>
      </Card>
    </div>
  );
}
