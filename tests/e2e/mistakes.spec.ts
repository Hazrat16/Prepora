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

test("a wrong answer enters the notebook and returns for review", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("আপনার নাম").fill("পরীক্ষার্থী");
  await page.getByLabel("ইমেইল").fill(`mistake-${Date.now()}@example.com`);
  await page.getByLabel(/পাসওয়ার্ড/).fill("test-password-123");
  await page.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/practice");
  await page.getByLabel("প্রশ্নের সংখ্যা").selectOption("5");
  await page.getByRole("button", { name: "অনুশীলন শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  const attemptId = page.url().split("/").pop()!;

  const { data: rows } = await admin.from("attempt_questions").select("question_id").eq("attempt_id", attemptId).order("position");
  const questionId = rows![0].question_id;
  const { data: answer } = await admin.from("question_answers").select("correct_option_id").eq("question_id", questionId).single();
  const { data: options } = await admin.from("question_options").select("id").eq("question_id", questionId);
  const wrong = options!.find((o) => o.id !== answer!.correct_option_id)!;
  await admin.from("attempt_questions").update({ selected_option_id: wrong.id }).eq("attempt_id", attemptId).eq("question_id", questionId);

  await page.reload();
  await page.getByRole("button", { name: "জমা দিন" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "জমা দিন" }).click();
  await page.waitForURL("**/results/**");

  const { data: attempt } = await admin.from("attempts").select("user_id").eq("id", attemptId).single();
  const userId = attempt!.user_id;
  const read = () => admin.from("mistake_notebook").select("wrong_count, interval_step, resolved_at").eq("user_id", userId).eq("question_id", questionId).single();
  expect((await read()).data).toMatchObject({ wrong_count: 1, interval_step: 0, resolved_at: null });

  await page.goto("/mistakes");
  await expect(page.getByText("১ বার ভুল")).toBeVisible();
  await expect(page.getByRole("button", { name: /আজকের রিভিশন/ })).toHaveCount(0);

  await admin.from("mistake_notebook").update({ next_review_at: new Date(Date.now() - 1000).toISOString() }).eq("user_id", userId);
  await page.reload();
  await page.getByRole("button", { name: /আজকের রিভিশন/ }).click();
  await page.waitForURL("**/attempt/**");
  const reviewId = page.url().split("/").pop()!;
  await admin.from("attempt_questions").update({ selected_option_id: answer!.correct_option_id }).eq("attempt_id", reviewId);
  await page.reload();
  await page.getByRole("button", { name: "জমা দিন" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "জমা দিন" }).click();
  await page.waitForURL("**/results/**");
  expect((await read()).data).toMatchObject({ wrong_count: 1, interval_step: 1, resolved_at: null });

  await page.goto("/mistakes");
  await page.getByRole("button", { name: "শিখে ফেলেছি" }).click();
  await expect(page.getByText("এখানে কোনো প্রশ্ন নেই।")).toBeVisible();
});
