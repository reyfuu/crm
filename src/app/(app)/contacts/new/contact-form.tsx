"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { contactStatus } from "@/lib/labels";
import { createContactAction, type CreateContactState } from "@/server/actions/contacts";

export function ContactForm({ companies, sources }: { companies: { id: string; name: string }[]; sources: string[] }) {
  const [state, action, pending] = useActionState<CreateContactState, FormData>(createContactAction, null);
  const errors = state && !state.ok ? state.error.fields ?? {} : {};
  const duplicate = state?.ok ? state.data.duplicate : undefined;

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Nama depan *</Label>
          <Input id="firstName" name="firstName" required autoFocus />
          <FieldError message={errors.firstName} />
        </div>
        <div>
          <Label htmlFor="lastName">Nama belakang</Label>
          <Input id="lastName" name="lastName" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
          <FieldError message={errors.email} />
        </div>
        <div>
          <Label htmlFor="phone">Telepon / WhatsApp</Label>
          <Input id="phone" name="phone" placeholder="0812…" />
        </div>
        <div>
          <Label htmlFor="jobTitle">Jabatan</Label>
          <Input id="jobTitle" name="jobTitle" />
        </div>
        <div>
          <Label htmlFor="companyId">Perusahaan</Label>
          <Select id="companyId" name="companyId" defaultValue="">
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="source">Sumber lead</Label>
          <Select id="source" name="source" defaultValue="">
            <option value="">—</option>
            {sources.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue="LEAD">
            {Object.entries(contactStatus).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {duplicate && (
        <div role="alert" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[13px]">
          <p>
            Kemungkinan duplikat: email atau telepon ini sudah dipakai oleh{" "}
            <Link href={`/contacts/${duplicate.id}`} className="font-medium underline">{duplicate.name}</Link>.
          </p>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" name="allowDuplicate" value="1" /> Tetap simpan sebagai kontak baru
          </label>
        </div>
      )}
      {state && !state.ok && !state.error.fields && <p className="text-[13px] text-danger">{state.error.message}</p>}

      <div className="flex justify-end gap-2">
        <Link href="/contacts" className="inline-flex h-9 items-center rounded-md px-4 hover:bg-surface">Batal</Link>
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan kontak"}</Button>
      </div>
    </form>
  );
}
