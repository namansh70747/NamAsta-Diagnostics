import { invoke, isTauri } from "@/lib/tauri";

/**
 * Binary-safe analyzer capture + inspection helpers.
 *
 * The ERBA H360 transmits the CBC histograms as bitmap IMAGES (PNG/BMP), not numbers. The
 * normal text capture (`tcp_capture`/`serial_read`) UTF-8-decodes the bytes, which destroys
 * any embedded image. These helpers fetch the RAW bytes (base64) and let us SEE the wire
 * format — hex dump, detected PNG/BMP images, and base64-encoded image blocks — so the exact
 * histogram framing can be reverse-engineered from one real transmission.
 */

// ── transport: fetch the raw bytes (base64) from the Rust capture commands ──

export async function captureRawB64Tcp(mode: string, host: string, port: number, windowMs = 60000): Promise<string> {
  if (!isTauri()) throw new Error("Network reading is only available in the desktop app.");
  return invoke<string>("tcp_capture_b64", { mode, host, port, windowMs });
}

export async function captureRawB64Serial(port: string, baud: number, windowMs = 20000): Promise<string> {
  if (!isTauri()) throw new Error("Serial reading is only available in the desktop app.");
  if (!port) throw new Error("No analyzer port selected. Set it in Settings → Analyzer.");
  return invoke<string>("serial_read_b64", { port, baud, windowMs });
}

// ── base64 ⇄ bytes (browser-native, chunked to avoid call-stack limits) ──

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Latin-1 view of the bytes (1 byte → 1 char) so text scanning never mangles high bytes. */
function latin1(bytes: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}

// ── hex dump (classic offset | hex | ascii) for the diagnostic UI ──

export function toHexDump(bytes: Uint8Array, max = 4096): string {
  const n = Math.min(bytes.length, max);
  const lines: string[] = [];
  for (let off = 0; off < n; off += 16) {
    const row = bytes.subarray(off, off + 16);
    const hex = Array.from(row).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = Array.from(row).map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    lines.push(`${off.toString(16).padStart(8, "0")}  ${hex.padEnd(16 * 3 - 1)}  ${ascii}`);
  }
  let out = lines.join("\n");
  if (bytes.length > max) out += `\n… (${bytes.length - max} more bytes)`;
  return out;
}

// ── image detection (PNG/BMP magic markers) ──

export interface FoundImage {
  format: "png" | "bmp";
  start: number; // byte offset where the image begins
  end: number; // byte offset just past the image
  dataUrl: string; // ready to drop into <img src=…>
}

function indexOfSeq(hay: Uint8Array, needle: number[], from: number): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_END = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]; // IEND + CRC

/** Scan a byte buffer for embedded PNG and BMP images, returning each as a previewable image. */
export function scanForImages(bytes: Uint8Array): FoundImage[] {
  const out: FoundImage[] = [];
  // PNG: signature … IEND+CRC
  let i = 0;
  while ((i = indexOfSeq(bytes, PNG_SIG, i)) >= 0) {
    const e = indexOfSeq(bytes, PNG_END, i + 8);
    if (e < 0) break;
    const end = e + PNG_END.length;
    out.push({ format: "png", start: i, end, dataUrl: "data:image/png;base64," + bytesToB64(bytes.subarray(i, end)) });
    i = end;
  }
  // BMP: "BM" + 4-byte little-endian file size at offset 2
  let j = 0;
  while ((j = indexOfSeq(bytes, [0x42, 0x4d], j)) >= 0) {
    if (j + 6 <= bytes.length) {
      const size = (bytes[j + 2] | (bytes[j + 3] << 8) | (bytes[j + 4] << 16) | (bytes[j + 5] << 24)) >>> 0;
      if (size >= 26 && j + size <= bytes.length) {
        out.push({ format: "bmp", start: j, end: j + size, dataUrl: "data:image/bmp;base64," + bytesToB64(bytes.subarray(j, j + size)) });
        j += size;
        continue;
      }
    }
    j += 2;
  }
  return out.sort((a, b) => a.start - b.start);
}

// ── base64-embedded images (HL7 OBX "ED" / ASTM "M|" carry the bitmap as base64 text) ──

export interface Base64Block {
  start: number; // char offset of the base64 run
  length: number; // length of the run
  images: FoundImage[]; // images found INSIDE the decoded block
}

/** Find long base64 runs in the stream, decode each, and scan the result for images. This
 *  catches the common case where the histogram bitmap is base64-encoded inside a text record. */
export function scanForBase64Blocks(bytes: Uint8Array): Base64Block[] {
  const text = latin1(bytes);
  const re = /[A-Za-z0-9+/]{40,}={0,2}/g;
  const out: Base64Block[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    try {
      const decoded = b64ToBytes(m[0]);
      const images = scanForImages(decoded);
      if (images.length) out.push({ start: m.index, length: m[0].length, images });
    } catch {
      /* not valid base64 — skip */
    }
  }
  return out;
}

// ── full inspection result for the diagnostic UI ──

export interface CaptureInspection {
  bytes: Uint8Array;
  byteCount: number;
  hex: string;
  text: string; // latin1 text view (for spotting ASTM/HL7 records)
  rawImages: FoundImage[]; // images sitting raw in the byte stream
  base64Images: FoundImage[]; // images decoded out of base64 text blocks
  base64BlockCount: number;
}

export function inspectCaptureB64(b64: string): CaptureInspection {
  const bytes = b64ToBytes(b64);
  const blocks = scanForBase64Blocks(bytes);
  return {
    bytes,
    byteCount: bytes.length,
    hex: toHexDump(bytes),
    text: latin1(bytes),
    rawImages: scanForImages(bytes),
    base64Images: blocks.flatMap((b) => b.images),
    base64BlockCount: blocks.length,
  };
}

// ── BMP → PNG (browsers render BMP in <img>; canvas re-encodes to PNG for storage) ──

export async function bmpToPngDataUrl(bmpDataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not decode BMP image"));
    img.src = bmpDataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

// ── histogram-image extraction (format-agnostic) ──
// Some analyzers base64-encode the bitmap AND deflate it first; try to inflate a decoded block
// (raw-deflate and zlib-wrapped) so an embedded image is still found. Returns null if it can't.
async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) return null;
  for (const fmt of ["deflate-raw", "deflate"] as const) {
    try {
      const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DS(fmt));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      if (buf.length) return buf;
    } catch { /* try the next format */ }
  }
  return null;
}

type ImgKey = "wbcImg" | "rbcImg" | "pltImg";

/** Pull the WBC/RBC/PLT histogram bitmaps out of a raw analyzer capture, whatever the framing:
 *  raw bytes, base64 text, or deflate+base64. All are normalised to PNG data URLs. Mapping is by
 *  a channel label sitting near the image in the stream, else by order of appearance (WBC,RBC,PLT).
 *  The technician confirms/reassigns in the result-entry review before anything is saved. */
/** Precise decoder for the ERBA H360 format: HL7 OBX "ED" segments carry each histogram as
 *  `OBX|n|ED|<code>^WBC Histogram…^…||^Image^PNG^Base64^<base64>|…`. We map by the channel name
 *  in OBX-3, decode the base64 after `Base64^`, and (if BMP) convert to PNG. */
async function extractHl7EdImages(text: string): Promise<Partial<Record<ImgKey, string>>> {
  const out: Partial<Record<ImgKey, string>> = {};
  for (const seg of text.split(/[\r\n\x1c\x0b]+/)) {
    if (!/^OBX/i.test(seg.trim())) continue;
    const at = seg.indexOf("Base64^");
    if (at < 0) continue;
    const fields = seg.split("|");
    const obx3 = (fields[3] || "").toUpperCase();
    let key: ImgKey | null = null;
    if (obx3.includes("WBC")) key = "wbcImg";
    else if (obx3.includes("RBC")) key = "rbcImg";
    else if (obx3.includes("PLT") || obx3.includes("PLATELET")) key = "pltImg";
    if (!key || out[key]) continue;
    const b64 = seg.slice(at + "Base64^".length).replace(/[^A-Za-z0-9+/=]/g, "");
    if (b64.length < 40) continue;
    try {
      const imgs = scanForImages(b64ToBytes(b64));
      if (!imgs.length) continue;
      const img = imgs[0];
      out[key] = img.format === "bmp" ? await bmpToPngDataUrl(img.dataUrl).catch(() => img.dataUrl) : img.dataUrl;
    } catch { /* skip a malformed/truncated block */ }
  }
  return out;
}

export async function extractHistogramImages(bytes: Uint8Array): Promise<Partial<Record<ImgKey, string>>> {
  const text = latin1(bytes);
  // Precise HL7 OBX-ED path first (the H360's actual format); fall back to a generic scan.
  const ed = await extractHl7EdImages(text);
  if (ed.wbcImg || ed.rbcImg || ed.pltImg) return ed;
  const found: { url: string; pos: number }[] = [];
  const add = async (img: FoundImage, pos: number) => {
    const url = img.format === "bmp" ? await bmpToPngDataUrl(img.dataUrl).catch(() => img.dataUrl) : img.dataUrl;
    found.push({ url, pos });
  };
  // (a) images sitting raw in the byte stream
  for (const img of scanForImages(bytes)) await add(img, img.start);
  // (b) images inside long base64 runs — directly, or after inflating a deflate'd block
  const re = /[A-Za-z0-9+/]{40,}={0,2}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let decoded: Uint8Array;
    try { decoded = b64ToBytes(m[0]); } catch { continue; }
    let imgs = scanForImages(decoded);
    if (!imgs.length) { const inf = await inflate(decoded); if (inf) imgs = scanForImages(inf); }
    for (const img of imgs) await add(img, m.index);
  }
  // de-dupe identical images, keep stream order
  const seen = new Set<string>();
  const uniq = found.filter((f) => (seen.has(f.url) ? false : (seen.add(f.url), true))).sort((a, b) => a.pos - b.pos);
  if (!uniq.length) return {};

  const out: Partial<Record<ImgKey, string>> = {};
  const used = new Set<number>();
  const labelAt = (pos: number): ImgKey | null => {
    const w = text.slice(Math.max(0, pos - 240), pos + 240).toUpperCase();
    if (w.includes("WBC") || w.includes("LEUKO")) return "wbcImg";
    if (w.includes("RBC") || w.includes("ERYTHRO")) return "rbcImg";
    if (w.includes("PLT") || w.includes("PLATELET") || w.includes("THROMBO")) return "pltImg";
    return null;
  };
  // pass 1: assign by nearby label
  uniq.forEach((f, i) => { const k = labelAt(f.pos); if (k && !out[k]) { out[k] = f.url; used.add(i); } });
  // pass 2: fill the rest in canonical order
  const order: ImgKey[] = ["wbcImg", "rbcImg", "pltImg"];
  uniq.forEach((f, i) => {
    if (used.has(i)) return;
    const k = order.find((key) => !out[key]);
    if (k) out[k] = f.url;
  });
  return out;
}
