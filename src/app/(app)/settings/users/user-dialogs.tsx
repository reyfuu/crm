"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Lock, Pencil, Plus, RotateCcw, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { roleLabel } from "@/lib/labels";
import { ROLE_DEFAULTS, permissionGroups, type Permission } from "@/lib/access";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { createUserAction, deleteUserAction, resetPasswordAction, updateUserAction } from "@/server/actions/users";

type Role = keyof typeof roleLabel;
export type UserRow = { id: string; name: string; email: string; role: Role; isActive: boolean; permissions: Permission[] };
type Errors = Record<string, string>;

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  // Ulangi sampai memenuhi aturan: ada huruf dan angka.
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint32Array(length));
    const pw = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) return pw;
  }
}

function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{message}</p>;
}

function PasswordField({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>Password *</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            name="password"
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            minLength={8}
            maxLength={72}
            required
            autoComplete="new-password"
            className="pr-11"
            aria-invalid={!!error}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Button type="button" variant="secondary" onClick={() => { onChange(generatePassword()); setVisible(true); }}>
          <Wand2 className="size-4" /> Acak
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Minimal 8 karakter, berisi huruf dan angka.</p>
      <FieldError message={error} />
    </div>
  );
}

function CredentialsNotice({ title, email, password, onClose }: { title: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Email: ${email}\nPassword: ${password}`;
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-[13px] font-medium text-success"><Check className="size-4" /> {title}</p>
      <p className="text-[13px] text-muted-foreground">
        Bagikan data login ini ke pengguna lewat jalur pribadi. Password tidak bisa dilihat lagi setelah jendela ini ditutup.
      </p>
      <pre className="rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-[13px] whitespace-pre-wrap">{text}</pre>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Tersalin" : "Salin"}
        </Button>
        <Button type="button" onClick={onClose}>Selesai</Button>
      </div>
    </div>
  );
}

function RoleSelect({ id, value, onChange, disabled }: { id: string; value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  const role = value;
  return (
    <div>
      <Label htmlFor={id}>Peran *</Label>
      <Select id={id} name="role" value={role} onChange={(e) => onChange(e.target.value as Role)} disabled={disabled}>
        {(Object.keys(roleLabel) as Role[]).map((r) => (
          <option key={r} value={r}>{roleLabel[r].label}</option>
        ))}
      </Select>
      <p className="mt-1 text-xs text-muted-foreground">
        {disabled ? "Anda tidak dapat mengubah peran akun sendiri." : roleLabel[role].description}
      </p>
    </div>
  );
}

/** Daftar centang hak akses per aksi (FR-AUTH-12). Nilai = hak efektif. */
function AccessEditor({ role, value, onChange, lockedReason }: { role: Role; value: Permission[]; onChange: (v: Permission[]) => void; lockedReason?: string }) {
  const isAdmin = role === "ADMIN";
  const defaults = new Set<Permission>(ROLE_DEFAULTS[role]);
  const selected = new Set(value);
  const locked = isAdmin || !!lockedReason;
  const changed = !isAdmin && (value.length !== defaults.size || value.some((p) => !defaults.has(p)));

  const toggle = (p: Permission, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(p);
    else next.delete(p);
    onChange([...next]);
  };

  return (
    <fieldset className="rounded-md border border-border">
      <legend className="sr-only">Hak akses</legend>
      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
        <div>
          <p className="text-[13px] font-medium">Hak akses</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? "Admin selalu memiliki semua hak akses."
              : lockedReason ?? `Awalnya mengikuti peran ${roleLabel[role].label}. Centang atau hapus centang untuk pengecualian orang ini.`}
          </p>
        </div>
        {changed && !locked && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...ROLE_DEFAULTS[role]])}>
            <RotateCcw className="size-3.5" /> Default peran
          </Button>
        )}
      </div>
      <div className="divide-y divide-border">
        {permissionGroups().map(([group, items]) => (
          <div key={group} className="px-3 py-2.5">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{group}</p>
            <ul className="space-y-1">
              {items.map((p) => {
                const checked = isAdmin || selected.has(p.key);
                const diff = !isAdmin && checked !== defaults.has(p.key);
                return (
                  <li key={p.key}>
                    <label className={cn("flex items-start gap-2.5 rounded-sm py-1 text-[13px]", locked ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={(e) => toggle(p.key, e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {p.label}
                          {diff && (checked ? <Badge tone="green" className="min-h-5 px-2 text-[11px]">Ditambahkan</Badge> : <Badge tone="amber" className="min-h-5 px-2 text-[11px]">Dicabut</Badge>)}
                        </span>
                        {"hint" in p && <span className="block text-xs text-muted-foreground">{p.hint}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" /> Kelola pengguna & reset password khusus peran Admin.
        </p>
      </div>
    </fieldset>
  );
}

// ——— Tambah pengguna ———

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <Button onClick={() => { setKey((k) => k + 1); setOpen(true); }}><Plus /> Pengguna</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Tambah pengguna" className="max-w-xl">
        <CreateUserForm key={key} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [role, setRole] = useState<Role>("MEMBER");
  const [permissions, setPermissions] = useState<Permission[]>([...ROLE_DEFAULTS.MEMBER]);
  const changeRole = (r: Role) => { setRole(r); setPermissions([...ROLE_DEFAULTS[r]]); };

  if (created) return <CredentialsNotice title="Pengguna berhasil dibuat." {...created} onClose={onClose} />;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        startTransition(async () => {
          const res = await createUserAction({ ...input, role, permissions });
          if (res.ok) setCreated({ email: input.email.trim().toLowerCase(), password: input.password });
          else {
            setErrors(res.error.fields ?? {});
            setMessage(res.error.message);
          }
        });
      }}
    >
      <FormMessage message={message} />
      <div>
        <Label htmlFor="new-name">Nama lengkap *</Label>
        <Input id="new-name" name="name" required minLength={2} maxLength={100} autoFocus aria-invalid={!!errors.name} />
        <FieldError message={errors.name} />
      </div>
      <div>
        <Label htmlFor="new-email">Email *</Label>
        <Input id="new-email" name="email" type="email" required autoComplete="off" aria-invalid={!!errors.email} />
        <FieldError message={errors.email} />
      </div>
      <RoleSelect id="new-role" value={role} onChange={changeRole} />
      <PasswordField id="new-password" value={password} onChange={setPassword} error={errors.password} />
      <AccessEditor role={role} value={permissions} onChange={setPermissions} />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
      </div>
    </form>
  );
}

// ——— Aksi per baris ———

export function UserRowActions({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [dialog, setDialog] = useState<"edit" | "password" | "delete" | null>(null);
  const close = () => setDialog(null);
  const btn = "flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground";

  return (
    <div className="flex justify-end gap-1">
      <button type="button" className={btn} onClick={() => setDialog("edit")} aria-label={`Ubah ${user.name}`} title="Ubah">
        <Pencil className="size-4" />
      </button>
      <button type="button" className={btn} onClick={() => setDialog("password")} aria-label={`Reset password ${user.name}`} title="Reset password">
        <KeyRound className="size-4" />
      </button>
      {!isSelf && (
        <button type="button" className={`${btn} hover:text-danger`} onClick={() => setDialog("delete")} aria-label={`Hapus ${user.name}`} title="Hapus">
          <Trash2 className="size-4" />
        </button>
      )}

      <Dialog open={dialog === "edit"} onClose={close} title="Ubah pengguna" className="max-w-xl">
        {dialog === "edit" && <EditUserForm user={user} isSelf={isSelf} onClose={close} />}
      </Dialog>
      <Dialog open={dialog === "password"} onClose={close} title={`Reset password · ${user.name}`}>
        {dialog === "password" && <ResetPasswordForm user={user} onClose={close} />}
      </Dialog>
      <Dialog open={dialog === "delete"} onClose={close} title="Hapus pengguna?">
        {dialog === "delete" && <DeleteUserConfirm user={user} onClose={close} />}
      </Dialog>
    </div>
  );
}

function EditUserForm({ user, isSelf, onClose }: { user: UserRow; isSelf: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(user.role);
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions);
  // Ganti peran → hak akses kembali ke default peran baru (bisa disesuaikan lagi).
  const changeRole = (r: Role) => { setRole(r); setPermissions(r === user.role ? user.permissions : [...ROLE_DEFAULTS[r]]); };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const input = {
          id: user.id,
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          role: isSelf ? user.role : role,
          isActive: isSelf ? true : fd.get("isActive") === "on",
          // Akun sendiri: hak akses tidak dikirim (tidak bisa diubah sendiri).
          ...(isSelf ? {} : { permissions }),
        };
        startTransition(async () => {
          const res = await updateUserAction(input);
          if (res.ok) onClose();
          else {
            setErrors(res.error.fields ?? {});
            setMessage(res.error.message);
          }
        });
      }}
    >
      <FormMessage message={message} />
      <div>
        <Label htmlFor="edit-name">Nama lengkap *</Label>
        <Input id="edit-name" name="name" defaultValue={user.name} required minLength={2} maxLength={100} aria-invalid={!!errors.name} />
        <FieldError message={errors.name} />
      </div>
      <div>
        <Label htmlFor="edit-email">Email *</Label>
        <Input id="edit-email" name="email" type="email" defaultValue={user.email} required aria-invalid={!!errors.email} />
        <FieldError message={errors.email} />
      </div>
      <RoleSelect id="edit-role" value={role} onChange={changeRole} disabled={isSelf} />
      <label className="flex items-start gap-3 rounded-md border border-border p-3 text-[13px]">
        <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} className="mt-0.5 size-4 accent-primary" />
        <span>
          <span className="block font-medium">Akun aktif</span>
          <span className="block text-muted-foreground">
            {isSelf
              ? "Anda tidak dapat menonaktifkan akun sendiri."
              : "Jika dimatikan, pengguna langsung keluar dan tidak bisa login. Data miliknya tetap tersimpan."}
          </span>
        </span>
      </label>
      <AccessEditor
        role={role}
        value={permissions}
        onChange={setPermissions}
        lockedReason={isSelf && role !== "ADMIN" ? "Anda tidak dapat mengubah hak akses akun sendiri." : undefined}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  if (done) return <CredentialsNotice title="Password berhasil diganti." email={user.email} password={password} onClose={onClose} />;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await resetPasswordAction({ id: user.id, password });
          if (res.ok) setDone(true);
          else {
            setErrors(res.error.fields ?? {});
            setMessage(res.error.message);
          }
        });
      }}
    >
      <FormMessage message={message} />
      <p className="text-[13px] text-muted-foreground">Password lama {user.name} langsung tidak berlaku setelah disimpan.</p>
      <PasswordField id="reset-password" value={password} onChange={setPassword} error={errors.password} />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan password"}</Button>
      </div>
    </form>
  );
}

function DeleteUserConfirm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [canDeactivate, setCanDeactivate] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-[13px]">
        <strong>{user.name}</strong> ({user.email}) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
      <p className="text-[13px] text-muted-foreground">
        Pengguna yang sudah punya data (kontak, deal, tugas, komentar) tidak bisa dihapus. Nonaktifkan saja agar riwayatnya tetap utuh.
      </p>
      <FormMessage message={message} />
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        {canDeactivate && user.isActive ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateUserAction({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: false });
                if (res.ok) onClose();
                else setMessage(res.error.message);
              })
            }
          >
            {pending ? "Memproses…" : "Nonaktifkan saja"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteUserAction(user.id);
                if (res.ok) onClose();
                else {
                  setMessage(res.error.message);
                  setCanDeactivate(res.error.message.includes("Nonaktifkan"));
                }
              })
            }
          >
            {pending ? "Menghapus…" : "Hapus permanen"}
          </Button>
        )}
      </div>
    </div>
  );
}
