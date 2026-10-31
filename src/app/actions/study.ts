"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

export async function setLessonComplete(lessonId: string, complete: boolean, path: string) {
  const { supabase, user } = await requireUser();
  if (complete) {
    await supabase
      .from("lesson_progress")
      .upsert({ user_id: user.id, lesson_id: lessonId }, { ignoreDuplicates: true });
  } else {
    await supabase.from("lesson_progress").delete().eq("lesson_id", lessonId).eq("user_id", user.id);
  }
  revalidatePath(path);
  revalidatePath("/learn", "layout");
  revalidatePath("/dashboard");
}

export async function toggleBookmark(questionId: string, bookmarked: boolean) {
  const { supabase, user } = await requireUser();
  if (bookmarked) {
    await supabase.from("bookmarks").delete().eq("question_id", questionId).eq("user_id", user.id);
  } else {
    await supabase.from("bookmarks").insert({ user_id: user.id, question_id: questionId });
  }
  return !bookmarked;
}

export async function reportQuestion(questionId: string, message: string) {
  const parsed = z.string().trim().min(3).max(1000).safeParse(message);
  if (!parsed.success) return { error: "সমস্যাটি অন্তত কয়েকটি শব্দে লিখুন।" };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("question_reports")
    .insert({ user_id: user.id, question_id: questionId, message: parsed.data });
  return error ? { error: "রিপোর্ট পাঠানো যায়নি।" } : {};
}

// Refuses while the question is in a running mock exam, so the bank cannot leak answers.
export async function revealAnswer(questionId: string) {
  const { supabase } = await requireUser();
  const { data: active } = await supabase
    .from("attempt_questions")
    .select("question_id, attempts!inner(status, mode)")
    .eq("question_id", questionId)
    .eq("attempts.status", "in_progress")
    .eq("attempts.mode", "mock")
    .limit(1);
  if (active?.length) return { blocked: true as const };

  const { data } = await createAdminClient()
    .from("question_answers")
    .select("correct_option_id, explanation_bn")
    .eq("question_id", questionId)
    .single();
  return { blocked: false as const, correctOptionId: data?.correct_option_id, explanation: data?.explanation_bn };
}

export async function updateProfile(
  _: { error?: string; message?: string },
  form: FormData,
): Promise<{ error?: string; message?: string }> {
  const parsed = z
    .object({
      full_name: z.string().trim().min(2).max(80),
      daily_question_target: z.coerce.number().int().min(1).max(500),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "নাম ও দৈনিক লক্ষ্য ঠিকভাবে লিখুন।" };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "সংরক্ষণ করা যায়নি।" };
  revalidatePath("/", "layout");
  return { message: "সংরক্ষণ করা হয়েছে।" };
}
