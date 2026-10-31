import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").trim().split("\n").map((line) => {
    const [key, ...rest] = line.split("=");
    return [key, rest.join("=").replace(/^"|"$/g, "")];
  }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

test("a paper keeps its order and is labelled when incomplete", async ({ page }) => {
  // A throwaway paper built from practice questions, removed again below.
  const { data: paper } = await admin
    .from("examination_papers")
    .insert({ slug: `test-${Date.now()}`, title: "টেস্ট পেপার", year: 1999, source_name: "Test only", is_complete: false })
    .select("id")
    .single();
  try {
    const { data: questions } = await admin.from("questions").select("id").eq("collection", "practice").order("external_id").limit(3);
    await admin.from("examination_paper_questions").insert(
      questions!.map((q, position) => ({ paper_id: paper!.id, question_id: q.id, position })),
    );

    await page.goto("/register");
    await page.getByLabel("আপনার নাম").fill("পরীক্ষার্থী");
    await page.getByLabel("ইমেইল").fill(`archive-${Date.now()}@example.com`);
    await page.getByLabel(/পাসওয়ার্ড/).fill("test-password-123");
    await page.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/previous-questions");
    await expect(page.getByText("খুঁজে পাওয়া পেপার")).toBeVisible();
    await page.goto(`/previous-questions/paper/${paper!.id}`);
    await expect(page.getByRole("alert").filter({ hasText: "অসম্পূর্ণ" })).toBeVisible();
    await page.getByRole("button", { name: /Previous Year Exam Mode/ }).click();
    await page.waitForURL("**/attempt/**");
    const id = page.url().split("/").pop()!;
    const { data: rows } = await admin.from("attempt_questions").select("question_id").eq("attempt_id", id).order("position");
    expect(rows!.map((r) => r.question_id)).toEqual(questions!.map((q) => q.id));
    await expect(page.getByRole("timer")).toHaveCount(0);
    await admin.from("attempts").delete().eq("id", id);
  } finally {
    await admin.from("examination_papers").delete().eq("id", paper!.id);
  }
});
