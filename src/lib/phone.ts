/** Normalisasi nomor Indonesia ke format E.164: 0812-3456 → +628123456 */
export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return "+" + digits.slice(1).replace(/\D/g, "");
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  if (digits.startsWith("62")) return "+" + digits;
  return "+" + digits;
}
