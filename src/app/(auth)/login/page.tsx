import type { Metadata } from "next";
import { ArrowRight, Check, Layers2, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh bg-card lg:grid-cols-2">
      <section className="relative hidden min-h-dvh flex-col overflow-hidden bg-sidebar px-12 py-10 text-sidebar-accent-foreground lg:flex xl:px-20">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar"><Layers2 className="size-6" aria-hidden="true" /></span><span className="text-2xl font-semibold tracking-tight">CRM<span className="text-sidebar-primary">.</span></span></div>
        <div className="relative z-10 my-auto py-16">
          <p className="mb-6 flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-sidebar-primary uppercase"><span className="size-1.5 rounded-full bg-sidebar-primary" /> Ruang kolaborasi tim</p>
          <h2 className="max-w-lg text-5xl leading-[1.14] font-semibold tracking-[-0.045em] xl:text-6xl">Relasi lebih dekat.<br /><span className="text-sidebar-primary">Peluang lebih besar.</span></h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-sidebar-foreground">Satukan kontak, kelola pipeline, dan gerakkan tim menuju tujuan yang sama.</p>
          <div className="mt-12 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-6">
            <div className="mb-6 flex items-center justify-between"><span className="text-xs font-medium text-sidebar-foreground">Dari percakapan menjadi peluang</span><ArrowRight className="size-4 text-sidebar-primary" aria-hidden="true" /></div>
            <div className="flex items-center gap-3" aria-label="Alur kerja: Terhubung, Tindak lanjut, Bertumbuh">
              {["Terhubung", "Tindak lanjut", "Bertumbuh"].map((step, index) => <div key={step} className="min-w-0 flex-1"><div className="mb-3 h-1 rounded-full bg-sidebar-primary" style={{ opacity: 0.4 + index * 0.3 }} /><span className="text-[10px] text-sidebar-primary">0{index + 1}</span><p className="mt-1 text-xs font-medium">{step}</p></div>)}
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-sidebar-foreground"><Check className="size-4 text-sidebar-primary" aria-hidden="true" /> Lebih teratur. Lebih fokus. Bersama tim.</p>
        </div>
        <p className="relative text-xs text-sidebar-foreground">Satu workspace. Semua langkah penting.</p>
        <div aria-hidden="true" className="pointer-events-none absolute -right-64 -bottom-72 size-[600px] rounded-full border border-sidebar-primary/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 -bottom-56 size-[480px] rounded-full border border-sidebar-primary/10" />
      </section>
      <section className="flex min-h-dvh flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2 text-sm font-semibold lg:justify-end"><Layers2 className="size-5 text-primary" aria-hidden="true" /><span className="lg:hidden">CRM Workspace</span><span className="hidden text-xs font-normal text-muted-foreground lg:block">CRM Workspace</span></div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" /> Ruang kerja internal</span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Selamat datang kembali.</h1>
          <p className="mt-3 mb-8 text-sm leading-relaxed text-muted-foreground">Masuk untuk melanjutkan pekerjaan dan terhubung dengan tim Anda.</p>
          {error === "inactive" && (
            <p role="alert" className="mb-5 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              Akun Anda sudah dinonaktifkan atau dihapus. Hubungi administrator tim Anda.
            </p>
          )}
          <LoginForm />
          <p className="mt-7 text-center text-xs leading-relaxed text-muted-foreground">Belum memiliki akses?<br />Hubungi administrator tim Anda.</p>
        </div>
        <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5" aria-hidden="true" /> Akses workspace sesuai peran Anda</p>
      </section>
    </main>
  );
}
