import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, Header, Footer, ImageRun, AlignmentType,
  PageNumber, VerticalAlign, TableLayoutType,
} from "docx";
import { invoke, isTauri } from "@/lib/tauri";
import { documentDir, join } from "@tauri-apps/api/path";
import { parseDbDate } from "@/lib/format";
import type { HistogramPngs } from "@/lib/docxHistograms";

// ── Serializable model (built by the report page, reusing its value/flag/range logic) ──
export interface DocxRow { name: string; value: string; unit: string; range: string; abnormal: boolean; note?: string | null; }
export interface DocxSubSection { label: string; rows: DocxRow[]; }
export interface DocxPanel {
  code: string;
  dept: string;
  showDept: boolean;
  heading?: string;
  layout: 'standard' | 'cbc' | 'urine';
  rows?: DocxRow[];
  sections?: DocxSubSection[];
  bandText?: string | null;
}
export interface ReportDocxModel {
  patientPairs: [string, string][];   // 8 label/value pairs for the info box
  panels: DocxPanel[];
  comment?: string;
}

// ── Geometry (A4, twips: 1mm ≈ 56.6929) ──
const TWIPS_PER_MM = 56.6929;
const A4 = { width: 11906, height: 16838 };
const MARGIN = 680;                              // ~12mm
const BODY_W = A4.width - 2 * MARGIN;            // 10546
const PCTS = [0.24, 0.18, 0.12, 0.46];           // default column ratios (overridden by the report's live widths)
const CBC_HISTO_W = 3515;                        // ~62mm
const CBC_DATA = BODY_W - CBC_HISTO_W;

// Colours (hex, no #)
const NAVY = '1A3A8F', MAROON = '7B1B1B', GREY = '8A8B97', LINE = '9CA3AF', DARK = '111111';
// Font sizes (half-points): body 10.5pt, col-head 11pt, dept 12pt, small 8pt, lab name 15pt.
// (Matches the on-screen report so the Word file looks the same.)
const S_BODY = 21, S_HEAD = 22, S_DEPT = 24, S_SMALL = 16, S_LAB = 30;

// ── helpers ──
/** Decode a data-URL (or bare base64) into bytes for an ImageRun. */
export function dataUrlToUint8(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

type ImgType = 'png' | 'jpg' | 'gif' | 'bmp';
async function imgInfo(dataUrl: string): Promise<{ w: number; h: number; type: ImgType }> {
  const m = /^data:image\/(png|jpe?g|gif|bmp)/i.exec(dataUrl);
  const type = (m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png') as ImgType;
  const img = new Image();
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = dataUrl; });
  return { w: img.naturalWidth || 120, h: img.naturalHeight || 60, type };
}
/** Build an ImageRun from a data-URL, scaled to a target pixel height (null if blank). */
async function imgRun(dataUrl: string | undefined, targetH: number): Promise<ImageRun | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  try {
    const { w, h, type } = await imgInfo(dataUrl);
    const width = Math.round((w / h) * targetH) || targetH;
    return new ImageRun({ data: dataUrlToUint8(dataUrl), transformation: { width, height: targetH }, type });
  } catch { return null; }
}

const run = (text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number; font?: string } = {}) =>
  new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color, size: o.size ?? S_BODY, font: o.font ?? 'Arial' });

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
const para = (children: (TextRun | ImageRun)[], o: { align?: Align; spacingAfter?: number; spacingBefore?: number; line?: number } = {}) =>
  new Paragraph({ children, alignment: o.align, spacing: { after: o.spacingAfter ?? 0, before: o.spacingBefore ?? 0, ...(o.line ? { line: o.line, lineRule: 'auto' as const } : {}) } });

// Map the report's per-column alignment to Word alignment (default: left).
const alignOf = (a: ('left' | 'center' | 'right')[] | undefined, i: number): Align =>
  a?.[i] === 'center' ? AlignmentType.CENTER : a?.[i] === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT;
type Margins = { top: number; bottom: number; left: number; right: number };
const ROW_MARGINS: Margins = { top: 46, bottom: 46, left: 50, right: 50 };   // comfortable row breathing room

type BStyle = (typeof BorderStyle)[keyof typeof BorderStyle];
type Edge = { style: BStyle; size: number; color: string };
type Borders = { top: Edge; bottom: Edge; left: Edge; right: Edge };
const NO_BORDERS: Borders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};
const BOX_BORDERS: Borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' }, right: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
};
const navyRule = () => new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: NAVY } }, spacing: { after: 60, before: 40 } });

function cell(children: Paragraph[], o: { width?: number; columnSpan?: number; rowSpan?: number; valign?: typeof VerticalAlign.CENTER; borders?: Borders; margins?: Margins } = {}): TableCell {
  return new TableCell({
    children,
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    columnSpan: o.columnSpan,
    rowSpan: o.rowSpan,
    verticalAlign: o.valign,
    borders: o.borders ?? NO_BORDERS,
    margins: o.margins ?? { top: 28, bottom: 28, left: 40, right: 40 },
  });
}

const fixedTable = (rows: TableRow[], columnWidths: number[]) =>
  new Table({ rows, width: { size: BODY_W, type: WidthType.DXA }, columnWidths, layout: TableLayoutType.FIXED });

// header row of column labels with a bottom rule
function headRow(widths: number[], al?: ('left' | 'center' | 'right')[]): TableRow {
  const labels = ['Test Name', 'Results', 'Units', 'Normal Ranges'];
  const b = { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 6, color: '6B7280' } };
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => cell([para([run(l, { bold: true, size: S_HEAD, color: DARK })], { align: alignOf(al, i) })], { width: widths[i], borders: b, margins: ROW_MARGINS })),
  });
}
function dataRow(r: DocxRow, widths: number[], al?: ('left' | 'center' | 'right')[]): TableRow {
  const bold = r.abnormal;
  return new TableRow({
    children: [
      cell([para([run(r.name, { bold, color: DARK })], { align: alignOf(al, 0) })], { width: widths[0], margins: ROW_MARGINS }),
      cell([para([run(r.value || '—', { bold, color: DARK })], { align: alignOf(al, 1) })], { width: widths[1], margins: ROW_MARGINS }),
      cell([para([run(r.unit, { color: '374151' })], { align: alignOf(al, 2) })], { width: widths[2], margins: ROW_MARGINS }),
      cell([para([run(r.range, { color: '374151' })], { align: alignOf(al, 3) })], { width: widths[3], margins: ROW_MARGINS }),
    ],
  });
}
// full-width bordered interpretation note, sitting directly under its test — padded & comfortably
// line-spaced so it reads as a clean callout (not a cramped strip).
function noteRowEl(text: string, span = 4): TableRow {
  return new TableRow({
    children: [cell(
      [para([run(text, { size: S_SMALL + 2, color: '1F2937' })], { line: 288 })],
      { columnSpan: span, borders: BOX_BORDERS, margins: { top: 70, bottom: 70, left: 110, right: 110 } },
    )],
  });
}
function sectionHeaderRow(label: string, dataSpan: number, widths: number[], histoCell?: TableCell): TableRow {
  const b = { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 6, color: '6B7280' } };
  const children = [cell([para([run(label.toUpperCase(), { bold: true, size: S_SMALL, color: DARK })])], { columnSpan: dataSpan, borders: b, margins: ROW_MARGINS })];
  if (histoCell) children.push(histoCell);
  return new TableRow({ children });
}

/** Pre-printed-paper mode: the lab's stationery already carries the header & footer, so the
 *  Word file is emitted with NO header/footer and just blank top/bottom gaps, so the data lands
 *  inside the printed frame. Mirrors the on-screen "Print lab letterhead" off mode. */
export interface DocxLayoutOpts {
  noLetterhead?: boolean; preTopMm?: number; preBottomMm?: number;
  colWidths?: number[];                              // 4 percentages summing ~100 (from the on-screen report)
  colAlign?: ('left' | 'center' | 'right')[];        // per-column text alignment
}

// ── public: build the Word document ──
export async function buildReportDocx(
  model: ReportDocxModel,
  settings: Record<string, string>,
  histogramPngs: HistogramPngs,
  qr: string,
  layout: DocxLayoutOpts = {},
): Promise<Blob> {
  const labName = settings.lab_name || 'YOUR LABORATORY';
  const noLetterhead = !!layout.noLetterhead;

  // Column geometry & alignment from the on-screen report (so Word matches what the user tuned).
  const pcts = (layout.colWidths && layout.colWidths.length === 4 && layout.colWidths.every(w => w > 0))
    ? layout.colWidths.map(w => w / 100) : PCTS;
  const colw = pcts.map(p => Math.round(BODY_W * p));
  const cbcColw = pcts.map(p => Math.round(CBC_DATA * p));
  const al = layout.colAlign && layout.colAlign.length === 4 ? layout.colAlign : undefined;

  // pre-resolve header/footer images (skipped entirely in pre-printed-paper mode)
  const logo = noLetterhead ? null : await imgRun(settings.logo_data, 52);
  const sig = noLetterhead ? null : await imgRun(settings.signature_data, 46);
  const qrImg = noLetterhead ? null : await imgRun(qr, 60);

  // ── header (repeats on every page) ──
  const headerChildren: (Paragraph | Table)[] = [];
  if (!noLetterhead) {
  headerChildren.push(fixedTable([
    new TableRow({
      children: [
        cell([para(logo ? [logo] : [run('')])], { width: Math.round(BODY_W * 0.18) }),
        cell([
          para([run(labName, { bold: true, color: MAROON, size: S_LAB })]),
          settings.address_line ? para([run(settings.address_line.toUpperCase(), { bold: true, size: 15, color: DARK })]) : para([run('')]),
          new Paragraph({ children: [run('FULLY COMPUTERISED HI-TECH LAB.', { bold: true, size: 15, color: DARK })], border: BOX_BORDERS, spacing: { before: 30 } }),
        ], { width: Math.round(BODY_W * 0.82) }),
      ],
    }),
  ], [Math.round(BODY_W * 0.18), Math.round(BODY_W * 0.82)]));

  const phones = settings.phones ? `Mob : ${settings.phones.replace(/^\s*mob\s*:?\s*/i, '')}` : '';
  const timings = settings.timings ? `Timing : ${settings.timings}` : '';
  headerChildren.push(fixedTable([
    new TableRow({
      children: [
        cell([para([run(phones, { bold: true, color: MAROON, size: S_SMALL })])], { width: Math.round(BODY_W / 3) }),
        cell([para([run(timings, { size: S_SMALL, color: DARK })], { align: AlignmentType.CENTER })], { width: Math.round(BODY_W / 3) }),
        cell([
          para([run(settings.technician_name ?? '', { color: MAROON, size: S_HEAD, italics: true })], { align: AlignmentType.RIGHT }),
          para([run(settings.technician_qual ?? '', { size: 14, color: DARK })], { align: AlignmentType.RIGHT }),
        ], { width: Math.round(BODY_W / 3) }),
      ],
    }),
  ], [Math.round(BODY_W / 3), Math.round(BODY_W / 3), Math.round(BODY_W / 3)]));
  if (settings.equipment_line) headerChildren.push(para([run(`Equipped With ${settings.equipment_line.replace(/^\s*equipped with\s*/i, '')}`, { bold: true, size: 14, color: DARK })], { align: AlignmentType.CENTER }));
  headerChildren.push(navyRule());
  }

  // ── footer (repeats on every page) ──
  const footerChildren: (Paragraph | Table)[] = [];
  if (!noLetterhead) {
  footerChildren.push(fixedTable([
    new TableRow({
      children: [
        cell([para(qrImg ? [qrImg] : [run('')])], { width: Math.round(BODY_W * 0.5) }),
        cell([
          para(sig ? [sig] : [run('')], { align: AlignmentType.RIGHT }),
          para([run('Lab Technician', { bold: true, color: MAROON, size: S_SMALL })], { align: AlignmentType.RIGHT }),
        ], { width: Math.round(BODY_W * 0.5) }),
      ],
    }),
  ], [Math.round(BODY_W * 0.5), Math.round(BODY_W * 0.5)]));
  footerChildren.push(navyRule());
  footerChildren.push(fixedTable([
    new TableRow({
      children: [
        cell([para([run(settings.footer_left_text || 'NOT FOR MEDICO LEGAL PURPOSE', { bold: true, size: 15, color: DARK })])], { width: Math.round(BODY_W * 0.5) }),
        cell([para([run(settings.footer_right_text || 'ALL TEST ARE AVAILABLE HERE', { bold: true, size: 15, color: DARK })], { align: AlignmentType.RIGHT })], { width: Math.round(BODY_W * 0.5) }),
      ],
    }),
  ], [Math.round(BODY_W * 0.5), Math.round(BODY_W * 0.5)]));
  if (settings.footer_tests_line) footerChildren.push(para([run(settings.footer_tests_line, { bold: true, size: 13, color: DARK })], { align: AlignmentType.CENTER }));
  footerChildren.push(new Paragraph({ children: [run('Page ', { size: 13, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 13, color: GREY }), run(' of ', { size: 13, color: GREY }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: GREY })], alignment: AlignmentType.RIGHT, spacing: { before: 20 } }));
  }

  // ── body ──
  const body: (Paragraph | Table)[] = [];

  // patient info box (2-col bordered table, 4 rows)
  const infoRows: TableRow[] = [];
  for (let i = 0; i < model.patientPairs.length; i += 2) {
    const mk = (pair?: [string, string]) => cell(
      [new Paragraph({ children: pair ? [run(`${pair[0]} : `, { bold: true }), run(pair[1])] : [run('')] })],
      { width: Math.round(BODY_W / 2), borders: BOX_BORDERS },
    );
    infoRows.push(new TableRow({ children: [mk(model.patientPairs[i]), mk(model.patientPairs[i + 1])] }));
  }
  body.push(fixedTable(infoRows, [Math.round(BODY_W / 2), Math.round(BODY_W / 2)]));
  body.push(para([run('')], { spacingAfter: 80 }));

  for (const p of model.panels) {
    if (p.showDept) body.push(para([run(p.dept, { bold: true, size: S_DEPT, color: DARK })], { align: AlignmentType.CENTER, spacingBefore: 120, spacingAfter: 40 }));
    if (p.heading) body.push(para([run(p.heading, { bold: true, size: S_HEAD, color: DARK })], { spacingBefore: 40, spacingAfter: 40 }));

    if (p.layout === 'cbc' && p.sections) {
      const rows: TableRow[] = [headRowCbc(cbcColw, al)];
      for (const sec of p.sections) {
        let histoCell: TableCell | undefined;
        const png = histogramPngs[sec.label as keyof HistogramPngs];
        if (png) {
          const dispW = 210, dispH = Math.round(210 * (png.height / png.width));
          histoCell = cell([para([new ImageRun({ data: png.bytes, transformation: { width: dispW, height: dispH }, type: 'png' })], { align: AlignmentType.CENTER })],
            { width: CBC_HISTO_W, rowSpan: 1 + sec.rows.length, valign: VerticalAlign.CENTER });
        }
        rows.push(sectionHeaderRow(sec.label, 4, cbcColw, histoCell));
        for (const r of sec.rows) rows.push(dataRow(r, cbcColw, al));
      }
      body.push(new Table({ rows, width: { size: BODY_W, type: WidthType.DXA }, columnWidths: [...cbcColw, CBC_HISTO_W], layout: TableLayoutType.FIXED }));
    } else if (p.layout === 'urine' && p.sections) {
      const rows: TableRow[] = [headRow(colw, al)];
      for (const sec of p.sections) {
        rows.push(sectionHeaderRow(sec.label, 4, colw));
        for (const r of sec.rows) { rows.push(dataRow(r, colw, al)); if (r.note) rows.push(noteRowEl(r.note)); }
      }
      body.push(fixedTable(rows, colw));
    } else if (p.rows) {
      const rows: TableRow[] = [headRow(colw, al)];
      for (const r of p.rows) { rows.push(dataRow(r, colw, al)); if (r.note) rows.push(noteRowEl(r.note)); }
      body.push(fixedTable(rows, colw));
    }
    if (p.bandText) body.push(para([run(p.bandText, { size: S_SMALL, color: '374151' })], { spacingBefore: 30 }));
  }

  if (model.comment) body.push(para([run('Comments : ', { bold: true, size: S_SMALL }), run(model.comment, { size: S_SMALL })], { spacingBefore: 80 }));
  body.push(para([run('*** End Of Report ***', { bold: true, size: S_HEAD, color: DARK })], { align: AlignmentType.CENTER, spacingBefore: 120 }));

  // In pre-printed-paper mode the top/bottom margins become the blank gaps that drop the data
  // into the stationery's printed frame; with no header/footer there is nothing else on the page.
  const topMargin = noLetterhead ? Math.round((layout.preTopMm ?? 40) * TWIPS_PER_MM) : MARGIN;
  const bottomMargin = noLetterhead ? Math.round((layout.preBottomMm ?? 24) * TWIPS_PER_MM) : MARGIN;

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: S_BODY } } } },
    sections: [{
      properties: { page: { size: { width: A4.width, height: A4.height }, margin: { top: topMargin, right: MARGIN, bottom: bottomMargin, left: MARGIN } } },
      ...(noLetterhead ? {} : {
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
      }),
      children: body,
    }],
  });
  return Packer.toBlob(doc);
}

// CBC header row carries a 5th (empty) histogram-column header so widths line up.
function headRowCbc(widths: number[], al?: ('left' | 'center' | 'right')[]): TableRow {
  const labels = ['Test Name', 'Results', 'Units', 'Normal Ranges'];
  const b = { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 6, color: '6B7280' } };
  const cells = labels.map((l, i) => cell([para([run(l, { bold: true, size: S_HEAD, color: DARK })], { align: alignOf(al, i) })], { width: widths[i], borders: b, margins: ROW_MARGINS }));
  cells.push(cell([para([run('')])], { width: CBC_HISTO_W }));
  return new TableRow({ children: cells });
}

function chunkedBase64(bytes: Uint8Array): string {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)) as unknown as number[]);
  return btoa(bin);
}
function safeName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'report';
}

/** Build the .docx, write it under Documents/SCL Reports/YYYY/MM and open it in Word.
 *  Returns the saved path (empty string in a plain browser, where it downloads instead). */
export async function exportReportDocx(opts: {
  model: ReportDocxModel;
  settings: Record<string, string>;
  histogramPngs: HistogramPngs;
  qr: string;
  testNo: number;
  name: string;
  reportDate?: string | null;
  layout?: DocxLayoutOpts;
}): Promise<string> {
  const blob = await buildReportDocx(opts.model, opts.settings, opts.histogramPngs, opts.qr, opts.layout);
  const fileName = `${opts.testNo}-${safeName(opts.name)}.docx`;

  if (!isTauri()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return '';
  }

  let d = opts.reportDate ? parseDbDate(opts.reportDate) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const outPath = await join(await documentDir(), 'SCL Reports', yyyy, mm, fileName);

  const base64 = chunkedBase64(new Uint8Array(await blob.arrayBuffer()));
  const saved = await invoke<string>('save_pdf_bytes', { base64Data: base64, outPath });
  await invoke('open_path', { path: saved || outPath });
  return saved || outPath;
}
