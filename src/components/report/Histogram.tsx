import type { OrderWithResult } from "@/types";

// ── Curve generators ──────────────────────────────────────────────────────────

function gauss(x: number, mu: number, sigma: number): number {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
}

/** WBC: area-normalised Gaussians — peak height ∝ pct/sigma so a narrow
 *  lymphocyte population rises taller than a broad granulocyte population even
 *  when the granulocyte percentage is higher (matches the H360 display). */
function wbcCurve(lymPct: number, midPct: number, granPct: number, N = 220): number[] {
  const SL = 18, SM = 22, SG = 42; // sigmas (fL) — H360 typical population widths
  return Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * 300;
    return (
      (lymPct / SL) * gauss(x, 72,  SL) +
      (midPct / SM) * gauss(x, 135, SM) +
      (granPct / SG) * gauss(x, 210, SG)
    );
  });
}

/** RBC: single Gaussian at MCV, width from RDW-CV (%).
 *  sigma = RDW_CV% × MCV / 235  (converts CV to absolute fL width). */
function rbcCurve(mcv: number, rdwCv: number, N = 220): number[] {
  const sigma = Math.max((rdwCv / 100) * mcv / 2.35, 3);
  return Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * 300;
    return gauss(x, mcv, sigma);
  });
}

/** PLT: log-normal (right-skewed), x spans 0–36 fL.
 *  Mode placed at 0.70 × MPV; width from PDW-CV (%). */
function pltCurve(mpv: number, pdwCv: number, N = 220): number[] {
  const safeM = Math.max(mpv, 2);
  const sigmaLog = Math.max((pdwCv / 100) * 3.0, 0.25);
  // mode of log-normal = exp(μ - σ²); we want mode ≈ 0.70 × MPV
  const mode = safeM * 0.70;
  const muLog = Math.log(mode) + sigmaLog * sigmaLog;
  return Array.from({ length: N }, (_, i) => {
    const x = 0.2 + (i / (N - 1)) * 35.8;
    const lx = Math.log(x);
    return Math.exp(-((lx - muLog) ** 2) / (2 * sigmaLog ** 2)) / x;
  });
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

function HistogramChart({ data, title, xTicks, xMax, vlines, color = '#7b1b1b' }: ChartProps) {
  const W = 160, H = 84;
  const ml = 14, mr = 8, mt = 12, mb = 16;
  const pw = W - ml - mr;
  const ph = H - mt - mb;
  const N = data.length;
  const max = Math.max(...data, 1);

  const pts = data.map((v, i) => [
    ml + (i / (N - 1)) * pw,
    mt + ph - (v / max) * ph,
  ] as [number, number]);

  const lineParts = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
  const linePath = `M${lineParts}`;
  const areaPath = `M${ml},${mt + ph} L${lineParts} L${ml + pw},${mt + ph} Z`;

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

      {/* Filled area */}
      <path d={areaPath} fill={color} fillOpacity="0.13" />

      {/* Curve */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.1" strokeLinejoin="round" />

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
    return <HistogramChart data={data} title="WBC Histogram" xTicks={[0,100,200,300]} xMax={300} vlines={[35,100,150]} color="#1e3f8f" />;
  }
  if (section === 'ERYTHROCYTES') {
    const data = histos?.rbc?.length ? histos.rbc
      : rbcCurve(num('MCV') ?? 90, num('RDW_CV') ?? 13.5);
    return <HistogramChart data={data} title="RBC Histogram" xTicks={[0,100,200,300]} xMax={300} vlines={[60,120]} color="#7b1b1b" />;
  }
  if (section === 'THROMBOCYTES') {
    const data = histos?.plt?.length ? histos.plt
      : pltCurve(num('MPV') ?? 10, num('PDW_CV') ?? 16);
    return <HistogramChart data={data} title="PLT Histogram" xTicks={[0,10,20,30]} xMax={36} vlines={[2,20]} color="#14743a" />;
  }
  return null;
}
