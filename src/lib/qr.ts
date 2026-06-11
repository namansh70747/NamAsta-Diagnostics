import QRCode from 'qrcode';

/** Generate a QR code data-URL encoding test_no|name|report_date for instant
 *  lookup/re-print (§8.6 / §15A.2). Encodes no sensitive clinical data. */
export async function generateReportQR(testNo: number, name: string, reportDate: string | null): Promise<string> {
  const payload = `SCL|${testNo}|${name}|${reportDate ?? ''}`;
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 96,
      color: { dark: '#111827', light: '#ffffff' },
    });
  } catch {
    return '';
  }
}
