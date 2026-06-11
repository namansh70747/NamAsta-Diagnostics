import { useState } from "react";
import { Save, Send } from "lucide-react";
import { Card, TabHeader, TextField, SelectField, PrimaryButton, SecondaryButton } from "../ui";
import { useSettingsForm } from "../useSettingsForm";
import { sendWhatsAppSemi } from "@/lib/whatsapp";
import { errMessage } from "../toast";

const KEYS = ["whatsapp_mode", "bsp_api_key", "bsp_template_name"];

export function WhatsAppTab({ settings }: { settings: Record<string, string> }) {
  const f = useSettingsForm(settings, KEYS);
  const [sending, setSending] = useState(false);
  const mode = f.get("whatsapp_mode") || "semi";

  async function onSave() {
    if (await f.save()) f.toast.success("WhatsApp settings saved.");
  }

  async function sendTest() {
    const input = window.prompt("Send a test WhatsApp to which 10-digit number?", "");
    if (!input) return;
    const phone = input.replace(/\D/g, "");
    if (phone.length !== 10) {
      f.toast.error("Please enter a 10-digit mobile number.");
      return;
    }
    setSending(true);
    try {
      await sendWhatsAppSemi(
        phone,
        "Test message from Sharma Clinical Laboratory. If you can read this, WhatsApp delivery is working."
      );
      f.toast.success(`Opened WhatsApp for ${phone}.`);
    } catch (e) {
      f.toast.error(errMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="space-y-4 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <TabHeader title="WhatsApp" subtitle="How report PDFs are sent to patients' WhatsApp." />
        <PrimaryButton onClick={onSave} disabled={f.saving || !f.dirty}>
          <Save size={15} strokeWidth={1.8} />
          {f.saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>

      <SelectField
        label="Delivery mode"
        value={mode}
        onChange={(v) => f.set("whatsapp_mode", v)}
        options={[
          { value: "semi", label: "Semi-automatic (opens WhatsApp, one click)" },
          { value: "api", label: "Automatic via WhatsApp Business API" },
        ]}
        hint={
          mode === "api"
            ? "Requires completed BSP onboarding (Meta verification + approved utility template)."
            : "Zero cost, zero ban risk — opens wa.me prefilled and reveals the PDF to drag in."
        }
      />

      {mode === "api" && (
        <>
          <TextField
            label="BSP API key"
            type="password"
            value={f.get("bsp_api_key")}
            onChange={(v) => f.set("bsp_api_key", v)}
            placeholder="Provided by your WhatsApp Business Solution Provider"
          />
          <TextField
            label="Template name"
            value={f.get("bsp_template_name")}
            onChange={(v) => f.set("bsp_template_name", v)}
            placeholder="report_ready"
          />
        </>
      )}

      <div>
        <SecondaryButton onClick={sendTest} disabled={sending}>
          <Send size={15} strokeWidth={1.8} />
          {sending ? "Opening…" : "Send test message"}
        </SecondaryButton>
      </div>
    </Card>
  );
}
