import type { OrderWithResult } from "@/types";

// ── Curve generators ──────────────────────────────────────────────────────────

function gauss(x: number, mu: number, sigma: number): number {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
}

/** WBC: 3-part differential curve matching the H360 display — one dominant,
 *  narrow lymphocyte peak on the left, then a broad low granulocyte shoulder
 *  to the right (with a small mid bump between). Peak height ∝ pct/sigma, so a
 *  narrow lymph population towers over a broad granulocyte population even when
 *  Gran% > Lym% — exactly how the machine renders it. */
function wbcCurve(lymPct: number, midPct: number, granPct: number, N = 220): number[] {
  // MATHEMATICAL MODEL (3-part differential volume histogram, x = cell volume in fL):
  //   Each population is a Gaussian whose AREA equals its cell fraction, because the
  //   y-axis is relative cell frequency. For a Gaussian, area = amplitude·σ·√(2π),
  //   so  amplitude ∝ pct / σ.  Lymphocytes are uniform (narrow σ) → a sharp peak;
  //   granulocytes span a wide volume range (large σ) → a broad hump.
  //   Power 1.4 calibration (peak ∝ pct/σ, valley collapses fast):
  //     • 50% lym / 40% gran: gran_norm=0.576 → ^1.4 = 46%  — matches H360 right shoulder ✓
  //     • 58% gran (Manisha): gran=1.0, lym^1.4=0.820 → gran barely taller ✓
  //     • 81% gran (Sarojni): lym_norm^1.4=0.163 → gran dominant ✓
  //   Valley at x=115 fL: ~9% height — deep and clean like the H360 screen.
  //   σ_gran=25: narrower hump (clean peak at 165 fL, drops to ~0 by 240 fL).
  //   σ_mid=60: wide spread so mid cells gently fill the valley without a visible 3rd peak.
  const peaks = [
    { pct: lymPct,  mu: 75,  sigma: 18 },  // lymphocytes: narrow sharp peak
    { pct: midPct,  mu: 128, sigma: 60 },  // mid cells: very wide — fills valley gently
    { pct: granPct, mu: 165, sigma: 25 },  // granulocytes: clean hump at 165 fL
  ];
  const raw = Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * 300;
    return peaks.reduce((s, p) => s + (p.pct / p.sigma) * gauss(x, p.mu, p.sigma), 0);
  });
  // Power 1.4: valley=0.16→0.095, peak=1→1. Deepens bimodal separation without over-crushing.
  const maxRaw = Math.max(...raw) || 1;
  return raw.map(v => Math.pow(v / maxRaw, 1.4));
}

/** RBC: single Gaussian centred at MCV. RDW-CV is the coefficient of variation
 *  of the RBC volume distribution, so the actual SD (fL) = RDW_CV% × MCV — no
 *  extra division. This gives the realistically-wide bell the machine shows
 *  (a too-thin spike was the old /2.35 bug). */
function rbcCurve(mcv: number, rdwCv: number, N = 220): number[] {
  const sigma = Math.max((rdwCv / 100) * mcv, 6);
  return Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * 300;
    return gauss(x, mcv, sigma);
  });
}

/** PLT: log-normal primary peak + Gaussian secondary shoulder — matching the
 *  characteristic H360 bimodal PLT display (main peak ~8-12 fL, clear secondary
 *  hump at ~1.75×MPV from large/aggregated platelets, long right tail to ~35 fL). */
function pltCurve(mpv: number, pdwCv: number, N = 220): number[] {
  const safeM = Math.max(mpv, 2);
  const sigmaLog = Math.min(Math.max((pdwCv / 100) * 1.8, 0.30), 0.50);
  const muLog = Math.log(safeM) - (sigmaLog * sigmaLog) / 2;

  const xs = Array.from({ length: N }, (_, i) => 0.2 + (i / (N - 1)) * 35.8);
  const primary = xs.map(x => {
    const lx = Math.log(x);
    return Math.exp(-((lx - muLog) ** 2) / (2 * sigmaLog ** 2)) / x;
  });
  const pMax = Math.max(...primary) || 1;

  // Secondary shoulder centred at 1.75×MPV, width ~0.55×MPV — matches H360 photos.
  // Amplitude 50% of primary peak so it's clearly visible but subordinate.
  const shoulderMu = safeM * 1.75;
  const shoulderSigma = Math.max(safeM * 0.55, 3.5);

  const combined = primary.map((p, i) => p + pMax * 0.50 * gauss(xs[i], shoulderMu, shoulderSigma));
  const cMax = Math.max(...combined) || 1;
  // Mild power 1.3: deepens valley between the two PLT humps while keeping both visible.
  return combined.map(v => Math.pow(v / cMax, 1.3));
}

// ── SVG chart ────────────────────────────────────────────────────────────────

type ChartProps = {
  data: number[];
  title: string;
  xTicks: number[];
  xMax: number;
  vlines?: number[];
  color?: string;
};

// Deterministic [0,1) pseudo-noise (stable across re-renders, unlike Math.random).
function hash(i: number, seed: number): number {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function HistogramChart({ data, title, xTicks, xMax, vlines, color = '#7b1b1b' }: ChartProps) {
  const W = 160, H = 84;
  const ml = 14, mr = 8, mt = 12, mb = 16;
  const pw = W - ml - mr;
  const ph = H - mt - mb;
  const N = data.length;
  // Normalise to the curve's OWN peak so it fills the chart height. (Do NOT clamp the
  // floor to 1 — the PLT log-normal peaks at ~0.09, so a floor of 1 crushed it to ~9%
  // of the chart and made it look flat. Fall back to 1 only if every value is 0.)
  const max = Math.max(...data) || 1;

  // Render as a solid filled BAR histogram with Poisson-like noise — the authentic
  // analyzer look. A real cell counter shows per-channel counts whose noise ∝ √count,
  // so the tails/shoulders look spikier than the smooth peak. We seed the noise from
  // the data so WBC/RBC/PLT each get a distinct, stable jagged pattern.
  const B = 96;                                   // number of bars — dense, like the machine
  const seed = (Math.round(max * 1000) % 97) + 1; // per-curve seed
  const bars = Array.from({ length: B }, (_, b) => {
    const idx = Math.round((b / (B - 1)) * (N - 1));
    const u = data[idx] / max;                    // 0..1 relative height
    const noise = 0.07 * Math.sqrt(Math.max(u, 0)) * (hash(b, seed) - 0.5) * 2;
    const un = Math.max(0, Math.min(1.02, u + noise));
    return { x: ml + (b / B) * pw, h: un * ph, bw: pw / B };
  });
  // Jagged top outline tracing the bar tops, for crisp definition like the machine.
  const topLine = 'M' + bars.map(d => `${(d.x + d.bw / 2).toFixed(1)},${(mt + ph - d.h).toFixed(1)}`).join(' L');

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Title */}
      <text
        x={W / 2} y={9}
        textAnchor="middle" fontSize="7" fontWeight="bold"
        fill="#222" fontFamily="Arial, sans-serif"
      >
        {title}
      </text>

      {/* Axes */}
      <line x1={ml} y1={mt} x2={ml} y2={mt + ph} stroke="#555" strokeWidth="0.8" />
      <line x1={ml} y1={mt + ph} x2={ml + pw} y2={mt + ph} stroke="#555" strokeWidth="0.8" />

      {/* Reference dashed lines */}
      {vlines?.map(v => {
        const x = ml + (v / xMax) * pw;
        return (
          <line key={v}
            x1={x} y1={mt} x2={x} y2={mt + ph}
            stroke="#888" strokeWidth="0.6" strokeDasharray="2.5,2" />
        );
      })}

      {/* Solid filled bars */}
      {bars.map((d, i) => (
        <rect key={i} x={d.x} y={mt + ph - d.h} width={d.bw + 0.3} height={d.h}
          fill={color} fillOpacity="0.5" />
      ))}

      {/* Jagged top outline */}
      <path d={topLine} fill="none" stroke={color} strokeWidth="0.8" strokeLinejoin="round" />

      {/* X-axis ticks and labels */}
      {xTicks.map(tick => {
        const x = ml + (tick / xMax) * pw;
        return (
          <g key={tick}>
            <line x1={x} y1={mt + ph} x2={x} y2={mt + ph + 2.5} stroke="#555" strokeWidth="0.7" />
            <text x={x} y={mt + ph + 9} textAnchor="middle" fontSize="6" fill="#555" fontFamily="Arial, sans-serif">
              {tick}
            </text>
          </g>
        );
      })}

      {/* fL label */}
      <text
        x={ml + pw + 2} y={mt + ph + 9}
        textAnchor="start" fontSize="5.5" fill="#666" fontFamily="Arial, sans-serif"
      >
        fL
      </text>

      {/* Y-axis analyte label */}
      <text
        x={2} y={mt + ph / 2}
        textAnchor="middle" fontSize="6.5" fontWeight="bold"
        fill="#555" fontFamily="Arial, sans-serif"
        transform={`rotate(-90, 5, ${mt + ph / 2})`}
      >
        {title.split(' ')[0]}
      </text>
    </svg>
  );
}

// ── Public exports ────────────────────────────────────────────────────────────

/**
 * Renders one distribution curve from real channel-count data (e.g. captured from ASTM).
 * Used when the analyzer actually transmitted histogram data over the LIS port.
 */
export function Histogram({
  data, title, color = '#7b1b1b', width = 168, height = 64,
}: {
  data: number[]; title: string; color?: string; width?: number; height?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const n = data.length;
  const stepX = width / (n - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    .join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div className="inline-block">
      <div className="text-[9px] font-bold text-gray-800 mb-0.5">{title}</div>
      <svg width={width} height={height} className="border border-gray-300 bg-white">
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={0} y1={height * g} x2={width} y2={height * g} stroke="#eee" strokeWidth={0.5} />
        ))}
        <polygon points={area} fill={color} fillOpacity={0.12} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * Renders CBC histogram charts from analyzer-captured data (ASTM real curves).
 * Falls back to nothing if no data — use CbcHistogramPanel for synthetic charts.
 */
export function HistogramRow({
  histos,
}: {
  histos: { wbc?: number[]; rbc?: number[]; plt?: number[] } | null | undefined;
}) {
  if (!histos || (!histos.wbc && !histos.rbc && !histos.plt)) return null;
  return (
    <div className="flex flex-wrap gap-4 mt-2">
      {histos.wbc && <Histogram data={histos.wbc} title="WBC Histogram" color="#1e3f8f" />}
      {histos.rbc && <Histogram data={histos.rbc} title="RBC Histogram" color="#7b1b1b" />}
      {histos.plt && <Histogram data={histos.plt} title="PLT Histogram" color="#14743a" />}
    </div>
  );
}

/**
 * Single histogram chart for one CBC section (LEUKOCYTES / ERYTHROCYTES / THROMBOCYTES).
 * Placed in a rowspan table cell next to its section, so the chart top always aligns
 * with the section header row — exact match to the H360's own printout.
 */
export function CbcSectionHistogram({
  section,
  orders,
  histos,
}: {
  section: string;
  orders: OrderWithResult[];
  histos: { wbc?: number[]; rbc?: number[]; plt?: number[] } | null | undefined;
}) {
  function num(code: string): number | null {
    const o = orders.find(x => x.test.code === code);
    const v = o?.result?.value;
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  if (section === 'LEUKOCYTES') {
    const data = histos?.wbc?.length ? histos.wbc
      : wbcCurve(num('LYM_PCT') ?? 33, num('MID_PCT') ?? 8, num('GRAN_PCT') ?? 59);
    return <HistogramChart data={data} title="WBC Histogram" xTicks={[0,100,200,300]} xMax={300} vlines={[50,110]} color="#1e3f8f" />;
  }
  if (section === 'ERYTHROCYTES') {
    const data = histos?.rbc?.length ? histos.rbc
      : rbcCurve(num('MCV') ?? 90, num('RDW_CV') ?? 13.5);
    return <HistogramChart data={data} title="RBC Histogram" xTicks={[0,100,200,300]} xMax={300} vlines={[25,300]} color="#7b1b1b" />;
  }
  if (section === 'THROMBOCYTES') {
    const data = histos?.plt?.length ? histos.plt
      : pltCurve(num('MPV') ?? 10, num('PDW_CV') ?? 16);
    return <HistogramChart data={data} title="PLT Histogram" xTicks={[0,10,20,30]} xMax={36} vlines={[2,20]} color="#14743a" />;
  }
  return null;
}
