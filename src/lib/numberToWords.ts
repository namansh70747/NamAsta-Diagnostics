// Convert a rupee amount to words using the Indian numbering system (Thousand / Lakh / Crore).
// Used on the patient bill/receipt, e.g. 780 → "Rupees Seven Hundred Eighty Only".

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** Words for an integer 0–999 (no leading/trailing spaces). */
function twoOrThreeDigits(n: number): string {
  let out = "";
  if (n >= 100) {
    out += ONES[Math.floor(n / 100)] + " Hundred";
    n %= 100;
    if (n) out += " ";
  }
  if (n >= 20) {
    out += TENS[Math.floor(n / 10)];
    if (n % 10) out += " " + ONES[n % 10];
  } else if (n > 0) {
    out += ONES[n];
  }
  return out;
}

/** Integer (0 … crores) → words in the Indian system. */
export function numberToWords(n: number): string {
  if (!isFinite(n) || n <= 0) return "Zero";
  n = Math.floor(n);
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(twoOrThreeDigits(crore) + " Crore");
  if (lakh) parts.push(twoOrThreeDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoOrThreeDigits(thousand) + " Thousand");
  if (rest) parts.push(twoOrThreeDigits(rest));
  return parts.join(" ");
}

/** A rupee amount as a receipt-ready phrase, e.g. "Rupees Seven Hundred Eighty Only".
 *  Amounts are rounded to whole rupees (bills don't carry paise here). */
export function amountInWords(amount: number): string {
  const rupees = Math.round(Number(amount) || 0);
  return `Rupees ${numberToWords(rupees)} Only`;
}
