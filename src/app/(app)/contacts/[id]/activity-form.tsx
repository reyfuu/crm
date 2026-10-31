"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Select, Textarea } from "@/components/ui/form";
import { activityType } from "@/lib/labels";
import { createActivityAction } from "@/server/actions/contacts";

const manualTypes = Object.entries(activityType).filter(([k]) => k !== "SYSTEM");

export function ActivityForm({ contactId }: { contactId: string }) {
  const [state, action, pending] = useActionState(createActivityAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="contactId" value={contactId} />
      <Textarea name="body" placeholder="Tulis catatan, hasil telepon, atau meeting…" required />
      <FieldError message={state && !state.ok ? state.error.fields?.body ?? state.error.message : undefined} />
      <div className="flex justify-end gap-2">
        <Select name="type" defaultValue="NOTE" className="w-36">
          {manualTypes.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Button type="submit" size="default" disabled={pending}>{pending ? "Menyimpan…" : "Catat"}</Button>
      </div>
    </form>
  );
}
