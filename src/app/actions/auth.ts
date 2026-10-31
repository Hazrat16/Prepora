"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

const SITE_URL = "http://localhost:3000";

const credentials = z.object({
  email: z.email("সঠিক ইমেইল লিখুন।"),
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।"),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "ইমেইল বা পাসওয়ার্ড ঠিক নেই।" };
  redirect("/dashboard");
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials
    .extend({ full_name: z.string().trim().min(2, "আপনার নাম লিখুন।").max(80) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, password, full_name } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) {
    return {
      error: error.code === "user_already_exists"
        ? "এই ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করুন।"
        : "অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।",
    };
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPassword(_: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { error: "সঠিক ইমেইল লিখুন।" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: "লিংক পাঠানো যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।" };
  return { message: "লিংক পাঠানো হয়েছে। লোকাল ইনবক্স খুলুন: http://127.0.0.1:54324" };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = z.string().min(8).safeParse(form.get("password"));
  if (!password.success) return { error: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "পাসওয়ার্ড বদলানো যায়নি। নতুন লিংক নিয়ে আবার চেষ্টা করুন।" };
  redirect("/dashboard");
}
