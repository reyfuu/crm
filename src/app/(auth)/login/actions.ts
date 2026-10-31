"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    // signIn melempar redirect saat sukses — teruskan; tangani hanya error auth.
    if (error instanceof AuthError) return { error: "Email atau password salah." };
    throw error;
  }
}
