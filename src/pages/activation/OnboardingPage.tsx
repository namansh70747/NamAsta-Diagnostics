import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Check, Loader2, ShieldCheck, KeyRound, Sparkles, Building2, Wallet, Eye, EyeOff, CheckCircle2, Monitor, Copy } from "lucide-react";
import { NamAstaWordmark } from "@/components/common/NamAstaLogo";
import { activateLicense, startTrial, getDeviceFingerprint, type LicenseStatus } from "@/lib/license";
import { validatePassword } from "@/lib/password";
import { completeSetup } from "@/lib/onboarding";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ── Vendor payment details (edit here to rebill) ──
const UPI_ID = "namsh70747@oksbi";
const PAYEE = "Naman Sharma";
const VENDOR_CONTACT = "the NamAsta team";

// Pricing: ₹4500 for the first year (new lab), ₹1800 for each renewal.
const PRICE_NEW     = 4500;   // first-time registration
const PRICE_RENEWAL = 1800;   // every subsequent year

const fieldLabel = "block text-[12px] font-medium text-white/60 mb-1.5";

export function OnboardingPage({ licensed, status, onDone, preview }: {
  licensed: boolean; needSetup: boolean; status: LicenseStatus; onDone: () => void; preview?: boolean;
}) {
  // Pricing is driven by whether the lab has EVER paid (paid_once), NOT by "setup done" — a
  // trial lab that set up but never paid is still a NEW lab (first year ₹5000), and only a
  // genuinely-paid lab renews at ₹1000. (Existing paid labs are backfilled by migration 0046.)
  const isRenewal = status.paidBefore === true;
  const [step, setStep] = useState<"activate" | "setup">(licensed && !preview ? "setup" : "activate");
  // Always clear the "show onboarding" request once we leave, so the next launch behaves normally.
  const finishOnboarding = () => { localStorage.removeItem("namasta_show_onboard"); onDone(); };

  // Re-read needsSetup from the DB at the moment activation completes — not from the stale prop
  // captured at mount. A brand-new lab (setup_done missing) → show the lab-details form.
  // A renewing lab (setup_done = '1') → go straight to sign-in, no re-entering details ever.
  const afterActivate = async () => {
    const { needsSetup } = await import("@/lib/onboarding");
    const fresh = await needsSetup();
    if (fresh) setStep("setup"); else finishOnboarding();
  };
  const exitPreview = () => finishOnboarding();

  return (
    <div className="relative min-h-screen w-full text-white"
         style={{ background: "linear-gradient(150deg, #14161f 0%, #0e0f16 55%, #0a0b10 100%)" }}>
      <div className="pointer-events-none fixed -top-32 -left-24 w-[34rem] h-[34rem] rounded-full bg-[#6366f1]/25 blur-3xl animate-float" />
      <div className="pointer-events-none fixed top-1/3 right-[-10rem] w-[30rem] h-[30rem] rounded-full bg-[#7c3aed]/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-[#22d3ee]/12 blur-3xl" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06]"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "30px 30px" }} />

      <div className="relative mx-auto max-w-5xl px-6 py-9">
        <div className="flex items-center justify-between gap-4">
          <NamAstaWordmark size={42} light />
          <Stepper step={step} showActivate={!licensed} />
        </div>

        {preview && (
          <div className="mt-4 flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.05] text-white/50">
              {isRenewal ? "Subscription management — pay to renew, then enter your new key" : "Register a new laboratory — pay, then set it up"}
            </span>
            <button onClick={exitPreview} className="ml-auto px-2.5 py-1 rounded-full border border-white/15 text-white/45 hover:text-white/80 transition-colors">
              ← Back to sign in
            </button>
          </div>
        )}

        {/* Strict order: credentials (setup) are only reachable AFTER a valid activation key. */}
        {step === "activate"
          ? <ActivateStep status={status} isRenewal={isRenewal} onActivated={afterActivate} />
          : <SetupStep onDone={finishOnboarding} />}
      </div>
    </div>
  );
}

function Stepper({ step, showActivate }: { step: string; showActivate: boolean }) {
  if (!showActivate) return null;
  const items = [{ id: "activate", label: "Pay & activate" }, { id: "setup", label: "Set up lab" }];
  return (
    <div className="hidden sm:flex items-center gap-2 text-[12px]">
      {items.map((it, i) => (
        <span key={it.id} className="flex items-center gap-2">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
            step === it.id ? "bg-[#6366f1] text-white" : "bg-white/10 text-white/50")}>{i + 1}</span>
          <span className={step === it.id ? "text-white/90" : "text-white/40"}>{it.label}</span>
          {i === 0 && <span className="mx-1 h-px w-6 bg-white/15" />}
        </span>
      ))}
    </div>
  );
}

function ActivateStep({ status, isRenewal, onActivated }: {
  status: LicenseStatus; isRenewal: boolean; onActivated: () => void;
}) {
  const price = isRenewal ? PRICE_RENEWAL : PRICE_NEW;
  const upiNote = isRenewal ? "NamAsta Annual Renewal" : "NamAsta New Lab";

  const [qr, setQr] = useState("");
  const [key, setKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [deviceId, setDeviceId] = useState(status.deviceId ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const upi = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${price}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
    QRCode.toDataURL(upi, { errorCorrectionLevel: "M", margin: 1, width: 240, color: { dark: "#14151c", light: "#ffffff" } })
      .then(setQr).catch(() => setQr(""));
  }, [price, upiNote]);

  useEffect(() => { getDeviceFingerprint().then(setDeviceId).catch(() => {}); }, []);

  function copyDeviceId() {
    navigator.clipboard?.writeText(deviceId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  async function activate() {
    if (!key.trim() || activating) return;
    setActivating(true);
    try {
      const info = await activateLicense(key);
      toast.success(`Activated — valid till ${new Date(info.exp * 1000).toLocaleDateString("en-IN")}.`);
      onActivated();
    } catch (e) { toast.error(e); } finally { setActivating(false); }
  }

  // Offered only to a brand-new lab that has never paid and hasn't used the trial yet.
  const canTrial = !isRenewal && !status.trialUsed;
  const [startingTrial, setStartingTrial] = useState(false);
  async function beginTrial() {
    if (startingTrial) return;
    setStartingTrial(true);
    try {
      await startTrial();
      toast.success("Free trial started — you have 7 days. Set up your lab to begin.");
      onActivated();
    } catch (e) { toast.error(e); } finally { setStartingTrial(false); }
  }

  return (
    <div className="mt-7 grid lg:grid-cols-2 gap-6 items-start">
      {/* ── Left: what they're paying for ── */}
      <div className="rounded-3xl border border-white/10 glass-dark p-7">
        <div className="flex items-center gap-2 text-[#c7cbff] text-[12px] font-semibold uppercase tracking-[0.15em]">
          <Sparkles size={14} /> {isRenewal ? "Renew your subscription" : "Register your laboratory"}
        </div>
        <h1 className="mt-3 text-[1.9rem] font-extrabold leading-tight">
          {isRenewal
            ? <>Renew for another year —{" "}<span style={{ background: "linear-gradient(120deg,#818cf8,#c7cbff 50%,#67e8f9)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>stay active.</span></>
            : <>Get started —{" "}<span style={{ background: "linear-gradient(120deg,#818cf8,#c7cbff 50%,#67e8f9)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>activate your lab.</span></>}
        </h1>

        {isRenewal ? (
          <p className="mt-3 text-white/55 text-[14px] leading-relaxed">
            Pay the annual renewal fee and you'll receive a new activation key. Your lab profile,
            login, patient history and all data are completely safe — renewing never touches them.
          </p>
        ) : (
          <p className="mt-3 text-white/55 text-[14px] leading-relaxed">
            NamAsta needs an <b className="text-white/80">active subscription</b> to run.
            Pay the one-time first-year fee, send your payment screenshot and Device ID,
            and you'll get an activation key. Everything works fully offline after that.
          </p>
        )}

        {/* Price card — single, clear */}
        <div className="mt-6 rounded-2xl border border-[#818cf8] bg-[#6366f1]/15 shadow-[0_8px_30px_-10px_rgba(99,102,241,0.6)] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-white">
              {isRenewal ? "Annual Renewal" : "First Year"}
            </p>
            <p className="text-[12px] text-white/45 mt-0.5">
              {isRenewal ? "Valid for 1 year from activation" : "Includes setup + 1 year access"}
            </p>
            {!isRenewal && (
              <p className="text-[11.5px] text-[#a5f3fc] mt-1">Renew every year at just ₹1,000</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[2.2rem] font-extrabold tabular-nums leading-none">₹{price.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-white/45">/ year</p>
          </div>
        </div>

        {status.expired && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
            Your subscription for <b>{status.lab}</b> has expired. Renew below — <b>your data is safe</b>.
          </div>
        )}
        {status.trialExpired && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
            <b>This device has already used its 7-day free trial.</b> Subscribe below to keep using NamAsta — <b>your data is safe</b> and carries over.
          </div>
        )}
        {status.deviceMismatch && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
            <b>This computer is not on the key.</b> An activation key works on a maximum of <b>2 PCs</b>,
            and this is a different one{status.deviceId ? <> (Device ID <b className="font-mono">{status.deviceId}</b>)</> : null}.
            To move or replace a computer, send this Device ID to {VENDOR_CONTACT} for a re-issued key.
          </div>
        )}
      </div>

      {/* ── Right: pay + steps ── */}
      <div className="rounded-3xl border border-white/10 glass-dark p-7">
        <div className="flex items-baseline justify-between mb-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#c7cbff]">Step 1 — Pay</div>
          <div className="text-[26px] font-extrabold tabular-nums">₹{price.toLocaleString("en-IN")}</div>
        </div>
        <div className="flex items-center gap-5">
          <div className="rounded-2xl bg-white p-2.5 shrink-0">
            {qr ? <img src={qr} alt="UPI QR" width={132} height={132} /> : <div className="w-[132px] h-[132px] skeleton" />}
          </div>
          <div className="min-w-0 text-[13px] text-white/70 leading-relaxed">
            <p>Scan with any UPI app (GPay / PhonePe / Paytm), or tap:</p>
            <a
              href={`upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&am=${price}&cu=INR&tn=${encodeURIComponent(upiNote)}`}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#16a34a] to-[#15803d] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(21,128,61,0.7)]"
            >
              <Wallet size={15} /> Pay ₹{price.toLocaleString("en-IN")}
            </a>
            <p className="mt-2.5 text-white/45">Paying <span className="font-semibold text-white">{PAYEE}</span></p>
            <p className="font-mono text-[12px] text-[#c7cbff] break-all">{UPI_ID}</p>
          </div>
        </div>

        <div className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#c7cbff]">Step 2 — Send your Device ID with payment screenshot</div>
        <p className="mt-2 text-[13px] text-white/55 leading-relaxed">
          Your key is locked to this computer — each key works on at most <b className="text-white/85">2 PCs</b>.
          Copy this Device ID and send it to {VENDOR_CONTACT} along with your payment screenshot.
          <b className="text-white/85"> Setting up two computers?</b> Send <b className="text-white/85">both</b> Device IDs together to get one key for both.
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <Monitor size={16} className="text-[#c7cbff] shrink-0" />
          <span className="font-mono text-[15px] font-bold tracking-wider text-white flex-1 select-all">{deviceId || "…"}</span>
          <button type="button" onClick={copyDeviceId}
            className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-[12px] text-white/70 hover:bg-white/10 transition-colors">
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>

        <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#c7cbff]">Step 3 — Enter your activation key</div>
        <p className="mt-2 text-[13px] text-white/55 leading-relaxed">
          {VENDOR_CONTACT} sends back an <b className="text-white/85">activation key</b> — paste it here to unlock the app.
        </p>
        <div className="mt-3 relative">
          <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === "Enter") activate(); }}
            placeholder="Paste activation key" spellCheck={false} className="login-input !pl-9 font-mono text-[12.5px]" />
        </div>
        <button onClick={activate} disabled={activating || !key.trim()} className="login-btn mt-3">
          {activating ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={17} /> Unlock the app</>}
        </button>

        {canTrial && (
          <>
            <div className="my-4 flex items-center gap-3 text-white/30 text-[11px]">
              <span className="h-px flex-1 bg-white/10" /> OR <span className="h-px flex-1 bg-white/10" />
            </div>
            <button onClick={beginTrial} disabled={startingTrial}
              className="w-full rounded-xl border border-[#6366f1]/40 bg-[#6366f1]/10 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#6366f1]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {startingTrial ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={16} />}
              Start 7-day free trial
            </button>
            <p className="mt-2 text-center text-[11px] text-white/40">Full app, no payment, for 7 days. Your data carries over when you subscribe.</p>
          </>
        )}
        <p className="mt-3 text-center text-[11px] text-white/35">🔒 Works fully offline · subscription required after the trial</p>
      </div>
    </div>
  );
}

function SetupStep({ onDone }: { onDone: () => void }) {
  const setUser = useSession(s => s.setUser);
  const navigate = useNavigate();
  const [f, setF] = useState({ labName: "", address: "", phones: "", timings: "", incharge: "", qual: "", username: "", pw: "", pw2: "" });
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  // Synchronous double-submit guard — the confirm field's Enter handler bypasses the disabled
  // button, and the `busy` state updates too late to block a second rapid Enter. Two completeSetup
  // calls would rename the admin twice and delete the doctor list twice.
  const submitting = useRef(false);

  async function finish() {
    if (submitting.current) return;   // block a second Enter before the first completes
    setErr("");
    if (!f.labName.trim()) return setErr("Enter your laboratory's name.");
    if (!f.incharge.trim()) return setErr("Enter the lab in-charge / signatory name (it appears on reports).");
    if (f.username.trim().length < 3) return setErr("Choose a username of at least 3 characters.");
    if (/\s/.test(f.username.trim())) return setErr("Username can't contain spaces.");
    const weakPw = validatePassword(f.pw);
    if (weakPw) return setErr(weakPw);
    if (f.pw !== f.pw2) return setErr("Passwords do not match.");
    submitting.current = true;
    setBusy(true);
    try {
      const user = await completeSetup({
        labName: f.labName, address: f.address, phones: f.phones, timings: f.timings,
        inchargeName: f.incharge, inchargeQual: f.qual, username: f.username, password: f.pw,
      });
      if (!user) throw new Error("Could not create your account. Please try again.");
      setUser(user);
      toast.success(`Welcome, ${f.labName.trim()}!`);
      onDone();
      navigate("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      submitting.current = false;   // allow a retry only on failure (success navigates away)
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 mx-auto max-w-2xl rounded-3xl border border-white/10 glass-dark p-8 animate-pop-in">
      <div className="flex items-center gap-2 text-[#c7cbff] text-[12px] font-semibold uppercase tracking-[0.15em]">
        <Building2 size={15} /> Set up your laboratory
      </div>
      <h2 className="mt-2 text-2xl font-bold">Your lab details &amp; login</h2>
      <p className="mt-1 text-[13px] text-white/45">These print on every report. You'll sign in with the username &amp; password next time. (You can change all of this later in Settings.)</p>

      <div className="mt-6 space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Report letterhead</div>
        <div>
          <label className={fieldLabel}>Laboratory name *</label>
          <input value={f.labName} onChange={e => set("labName")(e.target.value.toUpperCase())} placeholder="CITY DIAGNOSTIC LABORATORY" className="login-input uppercase" autoFocus />
        </div>
        <div>
          <label className={fieldLabel}>Address</label>
          <input value={f.address} onChange={e => set("address")(e.target.value)} placeholder="Main Road, Your City, District" className="login-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Phone number(s)</label>
            <input value={f.phones} onChange={e => set("phones")(e.target.value)} placeholder="98xxxxxxxx / 94xxxxxxxx" className="login-input" inputMode="tel" />
          </div>
          <div>
            <label className={fieldLabel}>Timings (optional)</label>
            <input value={f.timings} onChange={e => set("timings")(e.target.value)} placeholder="8:00 am – 8:00 pm" className="login-input" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={fieldLabel}>Lab in-charge / signatory name *</label>
            <input value={f.incharge} onChange={e => set("incharge")(e.target.value)} placeholder="e.g. full name" className="login-input" />
          </div>
          <div>
            <label className={fieldLabel}>Qualification</label>
            <input value={f.qual} onChange={e => set("qual")(e.target.value)} placeholder="DMLT" className="login-input sm:w-32" />
          </div>
        </div>

        <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Your login</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={fieldLabel}>Username *</label>
            <input value={f.username} onChange={e => set("username")(e.target.value)}
              placeholder="e.g. citylab" autoCapitalize="off" spellCheck={false} className="login-input" />
          </div>
          <div>
            <label className={fieldLabel}>Password *</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={f.pw}
                onChange={e => set("pw")(e.target.value)} placeholder="Min 8 characters"
                className="login-input pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Confirm *</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={f.pw2}
                onChange={e => set("pw2")(e.target.value)} placeholder="Re-enter password"
                onKeyDown={e => { if (e.key === "Enter") finish(); }}
                className={cn("login-input pr-10",
                  f.pw2 && (f.pw === f.pw2 ? "!border-emerald-400/70" : "!border-red-400/60")
                )} />
              {f.pw2 && f.pw === f.pw2 && (
                <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
              )}
            </div>
          </div>
        </div>

        {err && <p className="text-[13px] text-red-300 bg-red-500/15 border border-red-400/25 rounded-xl px-3 py-2">{err}</p>}
        <button onClick={finish} disabled={busy} className="login-btn">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={17} /> Finish &amp; enter</>}
        </button>
      </div>
    </div>
  );
}
