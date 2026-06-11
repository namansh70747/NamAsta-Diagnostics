import { Save, Printer } from "lucide-react";
import { Card, TabHeader, TextField, PrimaryButton, SecondaryButton, NoteBox } from "../ui";
import { useSettingsForm } from "../useSettingsForm";

const KEYS = ["printer_name"];

export function PrintingTab({ settings }: { settings: Record<string, string> }) {
  const f = useSettingsForm(settings, KEYS);

  async function onSave() {
    if (await f.save()) f.toast.success("Printing settings saved.");
  }

  function printTestPage() {
    const w = window.open("", "_blank", "width=600,height=700");
    if (!w) {
      f.toast.error("Could not open the print window. Please allow pop-ups.");
      return;
    }
    const printer = f.get("printer_name") || "default printer";
    w.document.write(`<!doctype html><html><head><title>SCL — Print test page</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 24px; color: #1f2937; }
        h1 { color: #7a1f2b; font-size: 20px; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin-top: 12px; }
        .row { display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; font-size: 13px; }
        .scale { height: 16px; background: linear-gradient(to right,#000 0%,#000 50%,#fff 50%,#fff 100%); border:1px solid #000; margin-top:8px; }
      </style></head><body>
      <h1>SHARMA CLINICAL LABORATORY — Print test page</h1>
      <p style="font-size:13px">Target printer: <b>${escapeHtml(printer)}</b></p>
      <div class="box">
        <div class="row"><span>Margins / alignment check — text should sit ~12mm from each edge.</span><span>OK</span></div>
        <div class="row"><span>Black density / greyscale ramp:</span><span></span></div>
        <div class="scale"></div>
      </div>
      <p style="font-size:11px;margin-top:16px;color:#6b7280">If this prints cleanly, the report layout will too.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Card className="space-y-4 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <TabHeader title="Printing" subtitle="Choose the report printer and verify alignment." />
        <PrimaryButton onClick={onSave} disabled={f.saving || !f.dirty}>
          <Save size={15} strokeWidth={1.8} />
          {f.saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>

      <TextField
        label="Printer name"
        value={f.get("printer_name")}
        onChange={(v) => f.set("printer_name", v)}
        placeholder="e.g. HP LaserJet (leave blank for system default)"
        hint="Leave blank to use the operating system's default printer. The browser/OS print dialog still lets you pick at print time."
      />

      <div>
        <SecondaryButton onClick={printTestPage}>
          <Printer size={15} strokeWidth={1.8} />
          Print test page
        </SecondaryButton>
      </div>

      <NoteBox tone="warn">
        <b>Margins:</b> reports use A4 portrait with ~12&nbsp;mm margins. Use your printer's properties dialog (not page scaling) to
        adjust if the header clips — set scaling to 100% / “Actual size” and disable “fit to page”.
      </NoteBox>
    </Card>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
