// Urutan kartu Kanban memakai angka desimal (docs/TRD.md TR-01):
// posisi baru = titik tengah antara kartu di atas dan di bawahnya.

export const POSITION_GAP = 1024;

export function positionBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) return POSITION_GAP;
  if (before == null) return after! / 2;
  if (after == null) return before + POSITION_GAP;
  return (before + after) / 2;
}

/** True bila dua posisi sudah terlalu rapat dan kolom perlu diurutkan ulang. */
export function needsRebalance(a: number, b: number) {
  return Math.abs(a - b) < 1e-6;
}
