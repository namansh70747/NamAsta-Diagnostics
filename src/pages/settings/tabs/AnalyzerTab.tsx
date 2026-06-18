import { useState, useEffect } from "react";
import { Save, RefreshCw, Cable, Copy, Check, ImageDown } from "lucide-react";
import { Card, TabHeader, TextField, SelectField, PrimaryButton, SecondaryButton, NoteBox } from "../ui";
import { useSettingsForm } from "../useSettingsForm";
import { listSerialPorts, readSerialRaw, readTcpRaw, localIps } from "@/lib/serial";
import { parseAnalyzer } from "@/lib/astm";
import { captureRawB64Tcp, captureRawB64Serial, inspectCaptureB64, extractHistogramImages, type CaptureInspection } from "@/lib/analyzerBinary";
import { errMessage } from "../toast";

const KEYS = ["analyzer_conn", "analyzer_tcp_mode", "analyzer_host", "analyzer_tcp_port", "analyzer_port", "analyzer_baud"];
const BAUDS = ["1200", "2400", "4800", "9600", "19200", "38400", "57600", "115200"];

export function AnalyzerTab({ settings }: { settings: Record<string, string> }) {
  const f = useSettingsForm(settings, KEYS);
  const [ports, setPorts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState<string>("");
  const [pcIps, setPcIps] = useState<string[]>([]);
  const [rawCopied, setRawCopied] = useState(false);
  const [binBusy, setBinBusy] = useState(false);
  const [inspect, setInspect] = useState<CaptureInspection | null>(null);
  const [edImgs, setEdImgs] = useState<{ wbcImg?: string; rbcImg?: string; pltImg?: string }>({});
  const [binB64, setBinB64] = useState<string>("");
  const [b64Copied, setB64Copied] = useState(false);

  const conn = f.get("analyzer_conn") || "network";
  const tcpMode = f.get("analyzer_tcp_mode") || "listen";

  useEffect(() => { localIps().then(setPcIps).catch(() => {}); }, []);

  async function refreshPorts() {
    try { setPorts(await listSerialPorts()); }
    catch (e) { f.toast.error(errMessage(e)); }
  }

  async function capture() {
    if (!(await f.save())) return;
    setBusy(true);
    setRaw("");
    try {
      const text = conn === "network"
        ? await readTcpRaw(tcpMode, f.get("analyzer_host"), Number(f.get("analyzer_tcp_port") || "5000"), 60000)
        : await readSerialRaw(f.get("analyzer_port"), Number(f.get("analyzer_baud") || "9600"), 20000);
      setRaw(text);
      const n = Object.keys(parseAnalyzer(text).values).length;
      f.toast.success(n ? `Read ${n} parameters from the analyzer.` : "Data received, but no parameters were recognised — see raw output below.");
    } catch (e) {
      f.toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Binary-safe capture — keeps the raw bytes intact so an embedded histogram image
  // (PNG/BMP) survives, then inspects them (hex + detected images) to reverse-engineer the
  // H360's histogram transmission format. The numeric "Capture raw (test)" above is unaffected.
  async function captureBinary() {
    if (!(await f.save())) return;
    setBinBusy(true);
    setInspect(null);
    setEdImgs({});
    setBinB64("");
    try {
      const b64 = conn === "network"
        ? await captureRawB64Tcp(tcpMode, f.get("analyzer_host"), Number(f.get("analyzer_tcp_port") || "5000"), 120000)
        : await captureRawB64Serial(f.get("analyzer_port"), Number(f.get("analyzer_baud") || "9600"), 20000);
      setBinB64(b64);
      const info = inspectCaptureB64(b64);
      setInspect(info);
      const ed = await extractHistogramImages(info.bytes).catch(() => ({} as { wbcImg?: string; rbcImg?: string; pltImg?: string }));
      setEdImgs(ed);
      const got = [ed.wbcImg, ed.rbcImg, ed.pltImg].filter(Boolean).length;
      if (got && info.mllpComplete) {
        f.toast.success(`Captured ${info.byteCount.toLocaleString()} bytes — ${got} histogram graph(s) decoded.`);
      } else if (info.imageFieldCount > 0) {
        f.toast.error(`Captured ${info.byteCount.toLocaleString()} bytes — histogram fields seen but the message was CUT OFF (no end marker). Re-transmit; if it persists, send the base64.`);
      } else {
        f.toast.error(`Captured ${info.byteCount.toLocaleString()} bytes — no histogram field yet. Check Graph Format = PNG, Histogram Transmission = Bitmap, then re-transmit.`);
      }
    } catch (e) {
      f.toast.error(errMessage(e));
    } finally {
      setBinBusy(false);
    }
  }

  const portOptions = [
    { value: "", label: "— select port —" },
    ...ports.map((p) => ({ value: p, label: p })),
    ...(f.get("analyzer_port") && !ports.includes(f.get("analyzer_port"))
      ? [{ value: f.get("analyzer_port"), label: `${f.get("analyzer_port")} (saved)` }] : []),
  ];

  return (
    <Card className="space-y-4 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <TabHeader title="CBC analyzer" subtitle="Read CBC results from the ERBA H360." />
        <PrimaryButton onClick={async () => { if (await f.save()) f.toast.success("Analyzer settings saved."); }} disabled={f.saving || !f.dirty}>
          <Save size={15} strokeWidth={1.8} />
          {f.saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>

      <SelectField
        label="Connection"
        value={conn}
        onChange={(v) => f.set("analyzer_conn", v)}
        options={[
          { value: "network", label: "Network (Ethernet / LAN) — H360 default" },
          { value: "serial", label: "Serial cable (COM port)" },
        ]}
      />

      {conn === "network" ? (
        <>
          <NoteBox>
            The H360 sends results over the network. On the analyzer's <b>Host Communication</b>{" "}
            screen set the <b>Host IP</b> to <b>this PC's IP</b> and <b>Host Port</b> to the port
            below, then keep <b>“PC waits for analyzer”</b> here. Both must be on the same network.
            Run a sample, then click <b>Capture raw</b> to confirm.
          </NoteBox>
          {pcIps.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-[#c7c9ff] bg-[#eef0fe] px-3.5 py-2.5">
              <span className="text-[12.5px] text-[#4338ca]">
                This PC's IP — enter on the H360 as Host IP:
              </span>
              <span className="font-mono font-semibold text-[13px] text-[#312e81] tabular-nums">{pcIps.join(", ")}</span>
            </div>
          )}

          <SelectField
            label="Who connects?"
            value={tcpMode}
            onChange={(v) => f.set("analyzer_tcp_mode", v)}
            options={[
              { value: "listen", label: "PC waits for the analyzer to send (recommended)" },
              { value: "connect", label: "PC connects to the analyzer" },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label={tcpMode === "connect" ? "Analyzer IP address" : "Analyzer IP (for reference)"}
              value={f.get("analyzer_host")}
              onChange={(v) => f.set("analyzer_host", v)}
              placeholder="192.168.1.110"
              hint={tcpMode === "connect" ? "The H360's IP from its network screen." : "Shown on the H360 network screen."}
            />
            <TextField
              label="Port"
              type="number"
              value={f.get("analyzer_tcp_port") || "5000"}
              onChange={(v) => f.set("analyzer_tcp_port", v)}
              placeholder="5000"
              hint="Must match the analyzer's Host Port."
            />
          </div>
        </>
      ) : (
        <>
          <NoteBox>
            Connect the H360 to this PC's serial (COM) port and set the same baud rate as the
            machine's LIS/Host setting. Run a sample, then click <b>Capture raw</b> to confirm.
          </NoteBox>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <SelectField label="Serial port" value={f.get("analyzer_port")} onChange={(v) => f.set("analyzer_port", v)} options={portOptions} />
            <SecondaryButton onClick={refreshPorts}>
              <RefreshCw size={14} strokeWidth={1.8} /> List ports
            </SecondaryButton>
          </div>
          <SelectField
            label="Baud rate"
            value={f.get("analyzer_baud") || "9600"}
            onChange={(v) => f.set("analyzer_baud", v)}
            options={BAUDS.map((b) => ({ value: b, label: b }))}
            hint="Must match the rate configured on the analyzer (commonly 9600)."
          />
        </>
      )}

      <NoteBox>
        <b>To import the CBC histogram graphs:</b> on the H360's <b>LIS Communication</b> screen set
        <b> Graph Format = PNG</b> and <b>Histogram Transmission Method = “Bitmap”</b> (not “for
        printing”, not “Not transmit”). Then run a sample and use <b>Capture raw (binary)</b> below —
        it shows whether the histogram images are arriving and in what format.
      </NoteBox>

      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={capture} disabled={busy || binBusy}>
          <Cable size={15} strokeWidth={1.8} />
          {busy ? "Listening… (now re-transmit on the H360)" : "Capture raw (test)"}
        </SecondaryButton>
        <SecondaryButton onClick={captureBinary} disabled={busy || binBusy}>
          <ImageDown size={15} strokeWidth={1.8} />
          {binBusy ? "Listening for graphs… (re-transmit on the H360)" : "Capture raw (binary) — graphs"}
        </SecondaryButton>
      </div>

      {inspect && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">
              Binary capture — {inspect.byteCount.toLocaleString()} bytes
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(binB64)
                  .then(() => { setB64Copied(true); setTimeout(() => setB64Copied(false), 1500); })
                  .catch(() => f.toast.error("Could not copy."));
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#d7d8e0] px-2.5 py-1 text-[12px] text-[#54555f] hover:bg-[#fafafe] transition-colors"
            >
              {b64Copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy base64 (send to support)</>}
            </button>
          </div>

          {(() => {
            const got = [edImgs.wbcImg, edImgs.rbcImg, edImgs.pltImg].filter(Boolean).length;
            return (
              <div className={`text-[12.5px] rounded-lg px-3 py-2 ${got === 3 && inspect.mllpComplete ? 'bg-[#eafaf0] text-[#14743a]' : inspect.imageFieldCount > 0 ? 'bg-[#fdf0d7] text-[#92600a]' : 'bg-[#fafafe] text-[#54555f]'}`}>
                Histogram graphs decoded: <b>{got} / 3</b>{" "}(WBC {edImgs.wbcImg ? '✓' : '—'}, RBC {edImgs.rbcImg ? '✓' : '—'}, PLT {edImgs.pltImg ? '✓' : '—'}).{" "}
                Image fields in message: <b>{inspect.imageFieldCount}</b>.{" "}
                {inspect.mllpComplete ? "Full message received." : <b>Message was cut off (no end marker) — re-transmit.</b>}
              </div>
            );
          })()}

          {[edImgs.wbcImg, edImgs.rbcImg, edImgs.pltImg].some(Boolean) && (
            <div className="flex flex-wrap gap-3">
              {([['WBC', edImgs.wbcImg], ['RBC', edImgs.rbcImg], ['PLT', edImgs.pltImg]] as const).filter(([, u]) => u).map(([label, url]) => {
                // Decoded image size. Capture the SAME report twice — these sizes (and the byte
                // count above) must be IDENTICAL. Any difference means the capture truncated.
                const b64 = (url || '').split(',')[1] || '';
                const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
                const bytes = Math.max(0, Math.floor(b64.length * 3 / 4) - pad);
                return (
                  <div key={label} className="rounded-lg border border-[#e6e7ee] p-2 bg-white">
                    <img src={url} alt={label} className="max-h-32 w-auto" />
                    <div className="mt-1 text-[10.5px] text-[#8a8b97]">{label} · {bytes.toLocaleString()} B</div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97] mb-1.5">Hex dump (first 4 KB)</div>
            <pre className="max-h-72 overflow-auto rounded-lg bg-[#14151c] text-[#e8e6e1] text-[10.5px] leading-tight p-3 select-all">{inspect.hex}</pre>
          </div>
        </div>
      )}

      {raw && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8b97]">Raw output</div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(raw)
                  .then(() => { setRawCopied(true); setTimeout(() => setRawCopied(false), 1500); })
                  .catch(() => f.toast.error("Could not copy — select the text and press Ctrl+C."));
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#d7d8e0] px-2.5 py-1 text-[12px] text-[#54555f] hover:bg-[#fafafe] transition-colors"
            >
              {rawCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy all</>}
            </button>
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg bg-[#14151c] text-[#e8e6e1] text-[11px] leading-relaxed p-3 whitespace-pre-wrap break-all select-all">{raw}</pre>
        </div>
      )}
    </Card>
  );
}
