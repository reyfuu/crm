"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5" aria-busy={pending}>
      <div>
        <Label htmlFor="email">Email kerja</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="nama@perusahaan.com" required autoFocus aria-describedby={state.error ? "login-error" : undefined} />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Label htmlFor="password" className="mb-0">Kata sandi</Label>
          <button type="button" onClick={() => setShowForgot(!showForgot)} aria-expanded={showForgot} aria-controls="forgot-info" className="text-[13px] font-medium text-primary hover:underline">
            Lupa kata sandi?
          </button>
        </div>
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" required className="pr-12" aria-describedby={state.error ? "login-error" : undefined} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword} className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        </div>
      </div>
      {showForgot && (
        <div id="forgot-info" role="note" className="rounded-md border border-border bg-surface px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Kata sandi direset oleh Admin.</p>
          <p className="mt-1">Hubungi administrator tim Anda. Admin akan membuat kata sandi baru untuk Anda dari menu <span className="font-medium text-foreground">Pengguna</span>, lalu membagikannya secara pribadi.</p>
        </div>
      )}
      {state.error && (
        <p id="login-error" role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> Memproses…</> : <>Masuk ke workspace <ArrowRight aria-hidden="true" /></>}
      </Button>
    </form>
  );
}
