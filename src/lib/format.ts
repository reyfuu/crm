import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Rp 125.000.000 */
export function formatRupiah(value: number | string) {
  return rupiah.format(Number(value)).replace(/ /g, " ");
}

/** Bentuk ringkas untuk kolom & dashboard: Rp 125 jt, Rp 2,4 M */
export function formatRupiahShort(value: number | string) {
  const n = Number(value);
  const fmt = (x: number) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (Math.abs(n) >= 1e12) return `Rp ${fmt(n / 1e12)} T`;
  if (Math.abs(n) >= 1e9) return `Rp ${fmt(n / 1e9)} M`;
  if (Math.abs(n) >= 1e6) return `Rp ${fmt(n / 1e6)} jt`;
  if (Math.abs(n) >= 1e3) return `Rp ${fmt(n / 1e3)} rb`;
  return `Rp ${fmt(n)}`;
}

/** 31 Okt 2026 */
export function formatDate(d: Date | string) {
  return format(new Date(d), "d MMM yyyy", { locale: id });
}

/** "2 jam yang lalu" */
export function formatRelative(d: Date | string) {
  return formatDistanceToNow(new Date(d), { addSuffix: true, locale: id });
}
