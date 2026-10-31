import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-(--shadow-card)">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-primary">◆ CRM</p>
          <h1 className="mt-2 text-xl font-semibold">Masuk ke akun Anda</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
