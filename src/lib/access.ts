// Katalog hak akses per aksi (docs/FRD.md bagian 2 & FR-AUTH-12).
// Dipakai bersama oleh server (pengecekan) dan UI (modal Ubah pengguna).
//
// Hak efektif = default peran + hak yang ditambahkan − hak yang dicabut.
// Admin selalu memiliki semua hak; "Kelola pengguna" khusus peran Admin dan tidak bisa diberikan.

export type Role = "ADMIN" | "MANAGER" | "MEMBER";

export const PERMISSIONS = [
  { key: "contact.updateAll", group: "Kontak & perusahaan", label: "Ubah semua kontak & perusahaan", hint: "Tanpa hak ini, hanya data miliknya sendiri yang bisa diubah." },
  { key: "contact.delete", group: "Kontak & perusahaan", label: "Hapus kontak & perusahaan" },
  { key: "deal.delete", group: "Pipeline", label: "Hapus deal" },
  { key: "deal.changeOwner", group: "Pipeline", label: "Ganti owner deal" },
  { key: "board.manageAll", group: "Board & tugas", label: "Akses semua board", hint: "Melihat & mengubah tugas di semua board, termasuk board privat yang bukan anggotanya." },
  { key: "task.deleteAny", group: "Board & tugas", label: "Hapus tugas & komentar orang lain" },
  { key: "dashboard.team", group: "Laporan & data", label: "Lihat kinerja tim di dashboard" },
  { key: "data.import", group: "Laporan & data", label: "Import data (CSV)" },
  { key: "data.export", group: "Laporan & data", label: "Export data (CSV)" },
  { key: "settings.manage", group: "Administrasi", label: "Kelola pengaturan", hint: "Tahap pipeline, alasan Lost, sumber lead." },
  { key: "audit.view", group: "Administrasi", label: "Lihat audit log" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as Permission[];

export const ROLE_DEFAULTS: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSION_KEYS,
  MANAGER: PERMISSION_KEYS.filter((k) => k !== "audit.view"),
  MEMBER: [],
};

export function isPermission(value: string): value is Permission {
  return (PERMISSION_KEYS as string[]).includes(value);
}

/** Hak efektif dari peran + pengecualian per pengguna. */
export function effectivePermissions(role: Role, granted: readonly string[] = [], revoked: readonly string[] = []): Permission[] {
  if (role === "ADMIN") return [...PERMISSION_KEYS];
  const set = new Set<Permission>(ROLE_DEFAULTS[role]);
  for (const g of granted) if (isPermission(g)) set.add(g);
  for (const r of revoked) if (isPermission(r)) set.delete(r);
  return PERMISSION_KEYS.filter((k) => set.has(k));
}

/** Kebalikan dari effectivePermissions: simpan hanya selisih terhadap default peran. */
export function overridesFor(role: Role, selected: readonly string[]) {
  if (role === "ADMIN") return { granted: [] as Permission[], revoked: [] as Permission[] };
  const chosen = new Set(selected.filter(isPermission));
  const defaults = new Set(ROLE_DEFAULTS[role]);
  return {
    granted: PERMISSION_KEYS.filter((k) => chosen.has(k) && !defaults.has(k)),
    revoked: PERMISSION_KEYS.filter((k) => !chosen.has(k) && defaults.has(k)),
  };
}

export function permissionGroups() {
  const groups = new Map<string, (typeof PERMISSIONS)[number][]>();
  for (const p of PERMISSIONS) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);
  return [...groups.entries()];
}
