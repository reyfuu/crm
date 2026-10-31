"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { createBoardAction } from "@/server/actions/tasks";

export function CreateBoardForm() {
  const [state, action, pending] = useActionState(createBoardAction, null);
  const errors = state && !state.ok ? state.error.fields ?? {} : {};

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label htmlFor="name">Nama *</Label>
        <Input id="name" name="name" required placeholder="mis. Marketing Q1" />
        <FieldError message={errors.name} />
      </div>
      <div>
        <Label htmlFor="template">Template kolom</Label>
        <Select id="template" name="template" defaultValue="basic">
          <option value="basic">To Do → In Progress → Done</option>
          <option value="review">To Do → In Progress → Review → Done</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="visibility">Visibilitas</Label>
        <Select id="visibility" name="visibility" defaultValue="ALL">
          <option value="ALL">Semua pengguna</option>
          <option value="MEMBERS">Anggota saja</option>
        </Select>
      </div>
      {state && !state.ok && !state.error.fields && <p className="text-[13px] text-danger">{state.error.message}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Membuat…" : "Buat board"}
      </Button>
    </form>
  );
}
