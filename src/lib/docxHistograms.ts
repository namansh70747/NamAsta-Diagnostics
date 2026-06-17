import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CbcSectionHistogram } from "@/components/report/Histogram";
import type { OrderWithResult, Panel } from "@/types";
import { dataUrlToUint8 } from "@/lib/docx";

/** A rasterised CBC histogram (PNG bytes) ready for a docx ImageRun. */
export interface HistoPng { bytes: Uint8Array; width: number; height: number; }
export type HistogramPngs = Partial<Record<'LEUKOCYTES' | 'ERYTHROCYTES' | 'THROMBOCYTES', HistoPng>>;

const SECTIONS: ('LEUKOCYTES' | 'ERYTHROCYTES' | 'THROMBOCYTES')[] = ['LEUKOCYTES', 'ERYTHROCYTES', 'THROMBOCYTES'];

/** Rasterise one CbcSectionHistogram SVG to a PNG Uint8Array via an off-DOM canvas.
 *  The chart uses only native SVG primitives with inline font attributes (no foreignObject,
 *  no CSS classes), so canvas rasterisation is faithful. */
async function svgToPng(svgMarkup: string, w: number, h: number): Promise<Uint8Array> {
  let svg = svgMarkup;
  if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  // The chart renders width="100%" and no height — pin explicit pixel dimensions for the raster.
  svg = svg.replace(/\swidth="[^"]*"/, ` width="${w}" height="${h}"`);

  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image();
  img.width = w; img.height = h;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('histogram svg load failed'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';          // white so transparent areas don't render black in Word
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return dataUrlToUint8(canvas.toDataURL('image/png'));
}

/** Render the 3 CBC histograms (or whichever sections the CBC panel has) to PNGs.
 *  Returns {} when there is no CBC panel. */
export async function rasterizeHistograms(
  sortedPanels: { panel: Panel; orders: OrderWithResult[] }[],
  histos: { wbc?: number[]; rbc?: number[]; plt?: number[] } | null | undefined,
  scale = 4,
): Promise<HistogramPngs> {
  const cbc = sortedPanels.find(p => p.panel.code === 'CBC');
  if (!cbc) return {};
  const W = 160 * scale, H = 84 * scale;
  const out: HistogramPngs = {};
  for (const section of SECTIONS) {
    try {
      const markup = renderToStaticMarkup(createElement(CbcSectionHistogram, { section, orders: cbc.orders, histos }));
      if (!markup || !markup.includes('<svg')) continue;
      out[section] = { bytes: await svgToPng(markup, W, H), width: W, height: H };
    } catch { /* skip a section that fails to rasterise */ }
  }
  return out;
}
