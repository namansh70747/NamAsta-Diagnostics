import { invoke, isTauri } from '@/lib/tauri';

/** Print the currently-rendered report. The report HTML lives in #report-print-area
 *  and the print stylesheet (index.css @media print) hides everything else, so the
 *  SAME markup is used for screen preview, paper print, and "Save as PDF" — they can
 *  never diverge (§8.7). The native print dialog also offers "Save as PDF". */
export function printReport(): void {
  window.print();
}

/** Save the report HTML artifact to disk via the Rust `save_pdf` command and return
 *  the written path. Used by the WhatsApp-semi flow which then reveals it for a one-drag
 *  attach. Falls back to browser print when not running inside Tauri. */
export async function saveReportArtifact(html: string, outPath: string): Promise<string> {
  return invoke<string>('save_pdf', { html, outPath });
}

export async function revealInFolder(path: string): Promise<void> {
  if (!isTauri()) return;
  await invoke<void>('reveal_in_folder', { path });
}
