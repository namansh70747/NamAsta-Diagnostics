import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Loader2, BadgeCheck, AlertTriangle, Monitor, Copy, Check } from "lucide-react";
import { Card, TabHeader, PrimaryButton } from "../ui";
import { getLicenseStatus, activateLicense, getDeviceFingerprint, type LicenseStatus } from "@/lib/license";
import { toast } from "@/lib/toast";

const PLAN_LABEL: Record<string, string> = { monthly: "Monthly", yearly: "Yearly", triennial: "3-Year", lifetime: "Lifetime" };

export function LicenseTab() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [copied, setCopied] = useState(false);
  const load = () => getLicenseStatus().then(setStatus).catch(() => setStatus({ active: false }));
  useEffect(() => { load(); getDeviceFingerprint().then(setDeviceId).catch(() => {}); }, []);

  async function renew() {
    if (!key.trim() || busy) return;
    setBusy(true);
    try {
      const info = await activateLicense(key);
      toast.success(`Subscription updated — valid till ${new Date(info.exp * 1000).toLocaleDateString("en-IN")}.`);
      setKey("");
      await load();
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  }

  const expDate = status?.exp ? new Date(status.exp * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
  const lifetime = status?.plan === "lifetime";
  const warn = status?.active && status.daysLeft != null && status.daysLeft <= 14 && !lifetime;

  return (
    <Card className="space-y-5 animate-fade-up">
      <TabHeader title="Subscription" subtitle="Your NamAsta Diagnostics licence for this PC." />

      {status?.dev ? (
        <div className="rounded-xl border border-[#c7c9ff] bg-[#eef0fe] px-4 py-3 text-[13px] text-[#4338ca]">
          Developer build — the app is unlocked without a licence here. Customers see the activation screen.
        </div>
      ) : (
        <>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${status?.active ? (warn ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50") : "border-red-200 bg-red-50"}`}>
            {status?.active
              ? <BadgeCheck size={22} className={warn ? "text-amber-600" : "text-emerald-600"} />
              : <AlertTriangle size={22} className="text-red-600" />}
            <div className="min-w-0">
              <p className={`text-[14px] font-semibold ${status?.active ? (warn ? "text-amber-800" : "text-emerald-800") : "text-red-700"}`}>
                {status?.active ? (lifetime ? "Active — Lifetime licence" : `Active — ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`) : "No active subscription"}
              </p>
              <p className="text-[12.5px] text-[#3a3b45]">
                {status?.lab ? `${status.lab} · ` : ""}{status?.plan ? `${PLAN_LABEL[status.plan] ?? status.plan} plan` : ""}{expDate && !lifetime ? ` · expires ${expDate}` : ""}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4c4e5d] mb-2">
              {status?.active ? "Renew / replace key" : "Enter activation key"}
            </p>
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5e6072]" />
                <input value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === "Enter") renew(); }}
                  placeholder="Paste a new activation key to extend" spellCheck={false} className="field !pl-9 font-mono text-[12.5px]" />
              </div>
              <PrimaryButton onClick={renew} disabled={busy || !key.trim()}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {busy ? "Applying…" : "Apply"}
              </PrimaryButton>
            </div>
            <p className="mt-2 text-[12px] text-[#4c4e5d]">
              Pay ₹1,800 annual renewal to Naman Sharma (namsh70747@oksbi), send the screenshot to NamAsta, then paste the key received. Your lab data is never affected by renewal.
            </p>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4c4e5d] mb-2">This PC's Device ID</p>
            <div className="flex items-center gap-2 rounded-xl border border-[#e6e7ee] bg-[#f7f8fb] px-3 py-2.5">
              <Monitor size={16} className="text-[#4f46e5] shrink-0" />
              <span className="font-mono text-[14px] font-bold tracking-wider text-[#14151c] flex-1 select-all">{deviceId || "…"}</span>
              <button type="button"
                onClick={() => navigator.clipboard?.writeText(deviceId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}
                className="flex items-center gap-1 rounded-lg border border-[#d7d8e0] px-2.5 py-1 text-[12px] text-[#3a3b45] hover:bg-white transition-colors">
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-[#4c4e5d]">
              Each key works on a maximum of <b>2 computers</b>; a 3rd PC is refused. To add a second PC
              (or move/replace one), send this Device ID to NamAsta for a re-issued key.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
