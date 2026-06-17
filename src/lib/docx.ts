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
const CBC_HISTO_W = 2780;                        // ~49mm — narrower so data sits closer to the graph
const CBC_DATA = BODY_W - CBC_HISTO_W;

// Colours (hex, no #)
const NAVY = '1A3A8F', MAROON = '7B1B1B', GREY = '8A8B97', LINE = '9CA3AF', DARK = '111111';
// Font sizes (half-points): body 13pt, col-head 13pt, dept 14pt, name box 12pt, CBC 11pt,
// interpretation 10pt, lab name 15pt.
const S_BODY = 26, S_HEAD = 26, S_DEPT = 28, S_NAME = 24, S_CBC = 22, S_SMALL = 20, S_LAB = 30;
const LINE_15 = 360;                             // 1.5 line spacing (240 = single)
const SERIF = 'Times New Roman';                 // interpretation/remarks font (matches the lab's printed style)

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
const ROW_MARGINS: Margins = { top: 22, bottom: 22, left: 70, right: 70 };   // wide column gaps; 1.5 line spacing supplies the vertical room

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
// A test row. `cantSplit` keeps the whole row on one page (a single test never breaks across
// pages). Default body 13pt @ 1.5 line spacing; CBC passes a smaller size + single spacing to fit.
function dataRow(r: DocxRow, widths: number[], al?: ('left' | 'center' | 'right')[], o: { size?: number; line?: number } = {}): TableRow {
  const bold = r.abnormal;
  const size = o.size ?? S_BODY;
  const line = o.line ?? LINE_15;
  return new TableRow({
    cantSplit: true,
    children: [
      cell([para([run(r.name, { bold, color: DARK, size })], { align: alignOf(al, 0), line })], { width: widths[0], margins: ROW_MARGINS }),
      cell([para([run(r.value || '—', { bold, color: DARK, size })], { align: alignOf(al, 1), line })], { width: widths[1], margins: ROW_MARGINS }),
      cell([para([run(r.unit, { color: '374151', size })], { align: alignOf(al, 2), line })], { width: widths[2], margins: ROW_MARGINS }),
      cell([para([run(r.range, { color: '374151', size })], { align: alignOf(al, 3), line })], { width: widths[3], margins: ROW_MARGINS }),
    ],
  });
}
// Full-width bordered interpretation note, directly under its test. Smaller serif (Times) text at
// single line spacing — matches the lab's printed style; still padded so it reads as a clean box.
function noteRowEl(text: string, span = 4): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [cell(
      [new Paragraph({ children: [run(text, { size: S_SMALL, color: '1F2937', font: SERIF })], spacing: { after: 0, line: 240, lineRule: 'auto' as const } })],
      { columnSpan: span, borders: BOX_BORDERS, margins: { top: 60, bottom: 60, left: 100, right: 100 } },
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
  showSignature?: boolean;                           // print the signature at all (toggle)
  sigHeightMm?: number;                              // signature image height
  sigBottomMm?: number;                              // signature distance from page bottom (user-movable)
  sigRightMm?: number;                               // signature distance from right margin (move left/right)
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
  const sigShown = layout.showSignature !== false;

  // Column geometry & alignment from the on-screen report (so Word matches what the user tuned).
  const pcts = (layout.colWidths && layout.colWidths.length === 4 && layout.colWidths.every(w => w > 0))
    ? layout.colWidths.map(w => w / 100) : PCTS;
  const colw = pcts.map(p => Math.round(BODY_W * p));
  const cbcColw = pcts.map(p => Math.round(CBC_DATA * p));
  const al = layout.colAlign && layout.colAlign.length === 4 ? layout.colAlign : undefined;

  // Lab branding (logo/QR) is pre-printed on the stationery, so skip it in no-letterhead mode.
  // The signature is ALWAYS resolved — it must print on every report, with or without letterhead —
  // and is sized from the user's saved signature height (mm → px @96dpi).
  const logo = noLetterhead ? null : await imgRun(settings.logo_data, 52);
  const qrImg = noLetterhead ? null : await imgRun(qr, 60);
  const sigPx = Math.max(20, Math.round((layout.sigHeightMm ?? 14) * 3.7795));
  const sig = await imgRun(settings.signature_data, sigPx);
  // Shift the signature in from the right margin by (sigRightMm − 12mm), matching the on-screen
  // "Signature from right" control — used in BOTH letterhead and pre-printed footers.
  const sigRightIndent = Math.max(0, Math.round(((layout.sigRightMm ?? 25) - 12) * TWIPS_PER_MM));

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
          ...(settings.tagline ? [new Paragraph({ children: [run(settings.tagline, { bold: true, size: 15, color: DARK })], border: BOX_BORDERS, spacing: { before: 30 } })] : []),
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
        cell(sigShown ? [
          new Paragraph({ children: sig ? [sig] : [run('')], alignment: AlignmentType.RIGHT, indent: { right: sigRightIndent } }),
          new Paragraph({ children: [run(settings.signatory_label || 'Lab Technician', { bold: true, color: MAROON, size: S_SMALL })], alignment: AlignmentType.RIGHT, indent: { right: sigRightIndent } }),
        ] : [para([run('')])], { width: Math.round(BODY_W * 0.5) }),
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

  // Patient info box (2-col bordered table). The LEFT column (Name, Collected AT …) is wider than
  // the RIGHT column (Test Request ID, dates) — those values are short, so the extra width goes to
  // the name side and a long "Collected AT" lab name fits on one line. Fixed 12pt (S_NAME).
  const NAME_L = Math.round(BODY_W * 0.58), NAME_R = BODY_W - NAME_L;
  const infoRows: TableRow[] = [];
  for (let i = 0; i < model.patientPairs.length; i += 2) {
    const mk = (pair: [string, string] | undefined, w: number) => cell(
      [new Paragraph({ children: pair ? [run(`${pair[0]} : `, { bold: true, size: S_NAME }), run(pair[1], { size: S_NAME })] : [run('')] })],
      { width: w, borders: BOX_BORDERS },
    );
    infoRows.push(new TableRow({ children: [mk(model.patientPairs[i], NAME_L), mk(model.patientPairs[i + 1], NAME_R)] }));
  }
  body.push(fixedTable(infoRows, [NAME_L, NAME_R]));
  body.push(para([run('')], { spacingAfter: 80 }));

  for (const p of model.panels) {
    if (p.showDept) body.push(para([run(p.dept, { bold: true, size: S_DEPT, color: DARK })], { align: AlignmentType.CENTER, spacingBefore: 120, spacingAfter: 40 }));
    if (p.heading) body.push(para([run(p.heading, { bold: true, size: S_HEAD, color: DARK })], { spacingBefore: 40, spacingAfter: 40 }));

    if (p.layout === 'cbc' && p.sections) {
      // Column header once at the top (data columns only, width = CBC_DATA).
      body.push(new Table({ rows: [headRowCbcData(cbcColw, al)], width: { size: CBC_DATA, type: WidthType.DXA }, columnWidths: cbcColw, layout: TableLayoutType.FIXED }));
      // Each section is its OWN 2-column table: left = the section's data sub-table, right = the
      // histogram image. This avoids the rowSpan+columnSpan-across-uneven-rows combination, which
      // produced OOXML that Word refused to open ("can't open this file") for CBC reports.
      for (const sec of p.sections) {
        const dataRows: TableRow[] = [sectionHeaderRow(sec.label, 4, cbcColw)];
        for (const r of sec.rows) dataRows.push(dataRow(r, cbcColw, al, { size: S_CBC, line: 240 }));
        const nested = new Table({ rows: dataRows, width: { size: CBC_DATA, type: WidthType.DXA }, columnWidths: cbcColw, layout: TableLayoutType.FIXED });

        const png = histogramPngs[sec.label as keyof HistogramPngs];
        const histoChildren: Paragraph[] = png
          ? [para([new ImageRun({ data: png.bytes, transformation: { width: 172, height: Math.max(1, Math.round(172 * (png.height / png.width))) }, type: 'png' })], { align: AlignmentType.CENTER })]
          : [para([run('')])];

        const leftCell = new TableCell({ children: [nested], width: { size: CBC_DATA, type: WidthType.DXA }, borders: NO_BORDERS, margins: { top: 0, bottom: 0, left: 0, right: 0 }, verticalAlign: VerticalAlign.TOP });
        const rightCell = new TableCell({ children: histoChildren, width: { size: CBC_HISTO_W, type: WidthType.DXA }, borders: NO_BORDERS, verticalAlign: VerticalAlign.CENTER });
        body.push(new Table({ rows: [new TableRow({ children: [leftCell, rightCell] })], width: { size: BODY_W, type: WidthType.DXA }, columnWidths: [CBC_DATA, CBC_HISTO_W], layout: TableLayoutType.FIXED }));
      }
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
  body.push(para([run(settings.end_of_report_text || '*** End Of Report ***', { bold: true, size: S_HEAD, color: DARK })], { align: AlignmentType.CENTER, spacingBefore: 120 }));

  // Pre-printed paper: top margin = the lab's header gap; the signature prints in a footer LOCKED
  // ~45mm above the page bottom (just above the pre-printed "Lab Technician" line) — no label, that
  // text is already on the paper. The bottom margin clears the signature band so content never
  // overlaps it. With the digital letterhead on, the full footer (incl. "Lab Technician") is used.
  const sigBottomMm = layout.sigBottomMm ?? 35;
  const sigClearMm = sigShown ? sigBottomMm + (layout.sigHeightMm ?? 24) + 7 : 20;
  const topMargin = noLetterhead ? Math.round((layout.preTopMm ?? 60) * TWIPS_PER_MM) : MARGIN;
  const bottomMargin = noLetterhead ? Math.round(sigClearMm * TWIPS_PER_MM) : MARGIN;
  const footerDist = Math.round(sigBottomMm * TWIPS_PER_MM);
  const sigFooter = new Footer({ children: [
    new Paragraph({ children: sigShown && sig ? [sig] : [run('')], alignment: AlignmentType.RIGHT, indent: { right: sigRightIndent } }),
  ] });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: S_BODY } } } },
    sections: [{
      properties: { page: {
        size: { width: A4.width, height: A4.height },
        margin: { top: topMargin, right: MARGIN, bottom: bottomMargin, left: MARGIN, ...(noLetterhead ? { footer: footerDist } : {}) },
      } },
      ...(noLetterhead
        ? { footers: { default: sigFooter } }
        : { headers: { default: new Header({ children: headerChildren }) }, footers: { default: new Footer({ children: footerChildren }) } }),
      children: body,
    }],
  });
  return Packer.toBlob(doc);
}

// CBC column header (data columns only — the histogram sits in a separate right cell per section).
function headRowCbcData(widths: number[], al?: ('left' | 'center' | 'right')[]): TableRow {
  const labels = ['Test Name', 'Results', 'Units', 'Normal Ranges'];
  const b = { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 6, color: '6B7280' } };
  const cells = labels.map((l, i) => cell([para([run(l, { bold: true, size: S_HEAD, color: DARK })], { align: alignOf(al, i) })], { width: widths[i], borders: b, margins: ROW_MARGINS }));
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
