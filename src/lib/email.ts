import { invoke } from '@/lib/tauri';

export interface EmailArgs {
  host: string;
  port: number;
  username: string;
  password: string;
  to: string;
  subject: string;
  bodyHtml: string;
  pdfPath?: string | null;
}

/** Send an email with optional PDF attachment via the Rust `send_email` (lettre/SMTP). */
export async function sendEmail(a: EmailArgs): Promise<void> {
  await invoke<void>('send_email', {
    host: a.host,
    port: a.port,
    username: a.username,
    password: a.password,
    to: a.to,
    subject: a.subject,
    bodyHtml: a.bodyHtml,
    pdfPath: a.pdfPath ?? null,
  });
}
