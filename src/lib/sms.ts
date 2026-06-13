import { invoke } from '@/lib/tauri';

export type SmsProvider = 'msg91' | 'fast2sms';

export interface SmsArgs {
  provider: SmsProvider | string;
  apiKey: string;
  senderId: string;
  /** The DLT-approved template id from the provider (MSG91 flow id / Fast2SMS message id). */
  dltTemplateId: string;
  phone: string;
  /** Fully composed text — used for the delivery log and for providers that accept raw text. */
  message: string;
  /** Template variable values, in order, for the registered DLT template. */
  vars?: string[];
}

/**
 * Build the patient-facing "report ready" SMS. In India the live text must match the
 * DLT-approved template registered with the gateway — keep this wording in sync with
 * the template you register (Settings → SMS explains how). The {name}/{testNo} fill the
 * two template variables.
 */
export function buildSmsMessage(i: { name: string; testNo: number; labName?: string }): string {
  return `Dear ${i.name}, your lab report (Test No ${i.testNo}) from ${i.labName || 'the laboratory'} is ready. Thank you.`;
}

/** Send a transactional SMS through the Rust `send_sms` command (MSG91 / Fast2SMS DLT). */
export async function sendSms(a: SmsArgs): Promise<void> {
  const digits = a.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (digits.length !== 10) throw new Error(`"${a.phone}" is not a valid 10-digit mobile number.`);
  await invoke<void>('send_sms', {
    provider: a.provider,
    apiKey: a.apiKey,
    senderId: a.senderId,
    dltTemplateId: a.dltTemplateId,
    phone: digits,
    message: a.message,
    vars: a.vars ?? [],
  });
}
