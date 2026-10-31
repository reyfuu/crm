import "server-only";
import { z } from "zod";
import { ForbiddenError } from "@/server/permissions";

// Bentuk hasil seragam untuk semua Server Action — docs/TRD.md bagian 5.
export type ActionError = {
  code: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "INTERNAL";
  message: string;
  fields?: Record<string, string>;
};
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ActionError };

export class NotFoundError extends Error {}
export class ValidationError extends Error {}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Jalankan isi action dan ubah error yang dikenal menjadi ActionResult. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: { code: "FORBIDDEN", message: e.message } };
    if (e instanceof NotFoundError) return { ok: false, error: { code: "NOT_FOUND", message: e.message || "Data tidak ditemukan." } };
    if (e instanceof ValidationError) return { ok: false, error: { code: "VALIDATION", message: e.message } };
    if (e instanceof z.ZodError)
      return { ok: false, error: { code: "VALIDATION", message: "Periksa kembali isian Anda.", fields: fieldErrors(e) } };
    // Biarkan redirect/notFound dari Next.js tetap berjalan.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: { code: "INTERNAL", message: "Terjadi kesalahan. Coba lagi." } };
  }
}
