import { open } from '@tauri-apps/plugin-shell';
import { revealInFolder } from '@/lib/printing';
import { invoke, isTauri } from '@/lib/tauri';

export interface WaMessageInput {
  title: string;
  name: string;
  tests: string;
  technicianName: string;
  technicianQual: string;
  labName?: string;
}

export function buildWhatsAppMessage(i: WaMessageInput): string {
  const testList = i.tests.length > 90 ? i.tests.slice(0, 90) + '…' : i.tests;
  const lab = i.labName || 'the laboratory';
  return `Dear ${i.title} ${i.name}, your lab report (${testList}) from ${lab} is ready. — ${i.technicianName}, ${i.technicianQual}`;
}

export interface BillMessageInput {
  title: string;
  name: string;
  receiptNo: string | number;
  amount: string;        // already formatted, e.g. "₹200"
  labName?: string;
}

/** WhatsApp caption for a bill/receipt PDF. */
export function buildBillWhatsAppMessage(i: BillMessageInput): string {
  const lab = i.labName || 'the laboratory';
  return `Dear ${i.title} ${i.name}, please find your bill (Receipt #${i.receiptNo}, ${i.amount}) from ${lab}. Thank you.`;
}

export interface WaDocArgs {
  token: string;
  phoneNumberId: string;
  to: string;          // 10-digit mobile; 91 is prefixed automatically
  pdfPath: string;
  filename: string;
  caption: string;
  apiVersion?: string;
}

/**
 * Fully-automatic delivery via the WhatsApp Business Cloud API: uploads the report PDF
 * and sends it as a document message. Requires a Cloud-API phone number + access token
 * (configured in Settings → WhatsApp) — NOT a personal WhatsApp number.
 */
export async function sendWhatsAppDocument(a: WaDocArgs): Promise<string> {
  const digits = a.to.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (digits.length !== 10) throw new Error(`"${a.to}" is not a valid 10-digit mobile number.`);
  if (!a.token || !a.phoneNumberId) throw new Error('WhatsApp Cloud API is not configured (token / phone number ID missing).');
  return invoke<string>('whatsapp_send_document', {
    token: a.token,
    phoneNumberId: a.phoneNumberId,
    to: `91${digits}`,
    pdfPath: a.pdfPath,
    filename: a.filename,
    caption: a.caption,
    apiVersion: a.apiVersion || 'v21.0',
  });
}

/** Semi-automatic WhatsApp (§8A.8 / Phase 6): open the chat prefilled, then reveal the saved
 *  PDF so the user pastes/attaches it in one step. Zero cost, zero ban risk.
 *
 *  Opens the WhatsApp **Desktop** app via its `whatsapp://` deep link (where a clipboard PDF
 *  pastes straight in as a document) rather than wa.me — which opens a browser/WhatsApp Web tab
 *  the lab usually isn't logged into. The deep link must go through `open_path` (the OS opener),
 *  because the Tauri shell `open` scope rejects non-http(s) URLs. Falls back to wa.me if the
 *  WhatsApp protocol handler isn't registered. */
export async function sendWhatsAppSemi(phone: string, message: string, pdfPath?: string): Promise<void> {
  const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (digits.length !== 10) throw new Error(`"${phone}" is not a valid 10-digit mobile number.`);
  const waUrl = `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;
  if (isTauri()) {
    const deepLink = `whatsapp://send?phone=91${digits}&text=${encodeURIComponent(message)}`;
    let deepLinkWorked = false;
    try {
      await invoke<void>('open_path', { path: deepLink });   // opens WhatsApp Desktop
      deepLinkWorked = true;
    } catch (err: unknown) {
      // Deep link failed (WhatsApp may not be installed or registered).
      // Fall back to browser-based wa.me — but surface the error so the user knows.
      console.warn(`WhatsApp deep link failed: ${err instanceof Error ? err.message : String(err)}. Falling back to browser.`);
    }
    if (!deepLinkWorked) {
      // Fallback: open the web-based wa.me link in default browser
      await open(waUrl);
    }
    if (pdfPath) await revealInFolder(pdfPath);
  } else {
    window.open(waUrl, '_blank');
  }
}

/** Put the report PDF on the clipboard so it can be pasted straight into WhatsApp. */
export async function copyPdfToClipboard(path: string): Promise<void> {
  if (!isTauri() || !path) return;
  await invoke<void>('copy_file_to_clipboard', { path });
}

/** Put a PNG image's pixels on the clipboard so it pastes (Ctrl/⌘+V) into WhatsApp Web as a photo.
 *  (A file reference can't be pasted by browsers — only image data — so this replaces the PDF
 *  file-copy in the manual "paste & send" flow.) */
export async function copyImageToClipboard(path: string): Promise<void> {
  if (!isTauri() || !path) return;
  await invoke<void>('copy_image_to_clipboard', { path });
}

export interface WaApiConfig {
  apiKey: string;
  templateName: string;
}

/** API mode is wired behind a Settings toggle; the BSP onboarding (Meta verification +
 *  approved utility template) is a deployment step. Until configured this throws a clear
 *  message so the UI can fall back to semi mode. */
export async function sendWhatsAppApi(_phone: string, _config: WaApiConfig): Promise<void> {
  throw new Error('WhatsApp API mode is not configured. Complete BSP onboarding in Settings → WhatsApp, or use semi-automatic mode.');
}
