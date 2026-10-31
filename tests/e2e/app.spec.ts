import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key, rest.join("=").replace(/^"|"$/g, "")];
    }),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = () => createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const password = "test-password-123";
const newEmail = (name: string) => `${name}-${Date.now()}@example.com`;

async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("আপনার নাম").fill("পরীক্ষার্থী");
  await page.getByLabel("ইমেইল").fill(email);
  await page.getByLabel(/পাসওয়ার্ড/).fill(password);
  await page.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  await page.waitForURL("**/dashboard");
}

const signedIn = async (email: string) => {
  const client = anon();
  await client.auth.signInWithPassword({ email, password });
  return client;
};

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
});

test("a new user sees a real empty dashboard", async ({ page }) => {
  await register(page, newEmail("empty"));
  await expect(page.getByText("কোথা থেকে শুরু করবেন?")).toBeVisible();
  await expect(page.getByText("মোট প্রশ্ন")).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("ইমেইল").fill("nobody@example.com");
  await page.getByLabel("পাসওয়ার্ড").fill("wrong-password");
  await page.getByRole("button", { name: "লগইন" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ঠিক নেই" })).toBeVisible();
});

test("lesson completion persists after refresh", async ({ page }) => {
  await register(page, newEmail("lesson"));
  await page.goto("/learn/math/percentage");
  await page.getByRole("button", { name: "লেসন সম্পন্ন করুন" }).click();
  await expect(page.getByRole("button", { name: /সম্পন্ন হয়েছে/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /সম্পন্ন হয়েছে/ })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("১/৫")).toBeVisible();
});

test("practice saves answers across refresh and scores them", async ({ page }) => {
  await register(page, newEmail("practice"));
  await page.goto("/practice");
  await page.getByLabel("প্রশ্নের সংখ্যা").selectOption("5");
  await page.getByRole("button", { name: "অনুশীলন শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");

  await page.getByRole("radio").first().click();
  await expect(page.getByText("১/৫ উত্তর দেওয়া হয়েছে")).toBeVisible();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByText("১/৫ উত্তর দেওয়া হয়েছে")).toBeVisible();

  await page.getByRole("button", { name: "জমা দিন" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "জমা দিন" }).click();
  await page.waitForURL("**/results/**");
  await expect(page.getByText("প্রাপ্ত নম্বর")).toBeVisible();
  await expect(page.getByText("উত্তর পর্যালোচনা")).toBeVisible();
  await expect(page.getByText("৪", { exact: true }).first()).toBeVisible();
});

test("the active exam payload contains no correct answers", async ({ page }) => {
  await register(page, newEmail("leak"));
  const { data: exam } = await admin.from("mock_exams").select("id").eq("slug", "mini-mock-30").single();
  await page.goto(`/mock-exams/${exam!.id}`);
  await page.getByRole("button", { name: "পরীক্ষা শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  const html = await page.content();
  expect(html).not.toContain("correct_option_id");
  expect(html).not.toContain("explanation");
  expect(html).not.toContain("is_correct");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByLabel("প্রশ্ন ৩০", { exact: true })).toBeVisible();
});

test("the full mock has 90 questions and 90 minutes", async ({ page }) => {
  await register(page, newEmail("full"));
  const { data: exam } = await admin.from("mock_exams").select("id").eq("slug", "primary-full-2025-rules").single();
  await page.goto(`/mock-exams/${exam!.id}`);
  await page.getByRole("button", { name: "পরীক্ষা শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  await expect(page.getByLabel("প্রশ্ন ৯০", { exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toContainText(/১:২৯|১:৩০/);
});

test("the exam submits itself when time runs out", async ({ page }) => {
  await register(page, newEmail("timer"));
  const { data: exam } = await admin.from("mock_exams").select("id").eq("slug", "mini-mock-30").single();
  await page.goto(`/mock-exams/${exam!.id}`);
  await page.getByRole("button", { name: "পরীক্ষা শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  const id = page.url().split("/").pop()!;

  await page.getByRole("radio").first().click();
  await page.waitForTimeout(800);
  await admin.from("attempts").update({ expires_at: new Date(Date.now() + 3000).toISOString() }).eq("id", id);
  await page.reload();
  await page.waitForURL(`**/results/${id}`, { timeout: 20_000 });
  await expect(page.getByText("সময় শেষ হওয়ায়")).toBeVisible();

  const { data } = await admin.from("attempts").select("status, auto_submitted, unanswered_count").eq("id", id).single();
  expect(data).toEqual({ status: "submitted", auto_submitted: true, unanswered_count: 29 });
});

test("a saved answer after the deadline does not count", async ({ page }) => {
  await register(page, newEmail("late"));
  await page.goto("/practice");
  await page.getByRole("button", { name: "অনুশীলন শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  const id = page.url().split("/").pop()!;
  await admin.from("attempts").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
  await page.getByRole("radio").first().click();
  await page.waitForURL(`**/results/${id}`, { timeout: 20_000 });
  const { data } = await admin.from("attempts").select("correct_count, incorrect_count").eq("id", id).single();
  expect(data!.correct_count + data!.incorrect_count).toBe(0);
});

test("negative marking comes from the exam template", async ({ page }) => {
  await register(page, newEmail("negative"));
  await page.goto("/practice");
  await page.getByRole("button", { name: "অনুশীলন শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  const id = page.url().split("/").pop()!;
  await admin.from("attempt_questions").update({ negative_marks: 0.25 }).eq("attempt_id", id);

  const { data: rows } = await admin.from("attempt_questions").select("question_id").eq("attempt_id", id).order("position").limit(1);
  const { data: answer } = await admin.from("question_answers").select("correct_option_id").eq("question_id", rows![0].question_id).single();
  const { data: options } = await admin.from("question_options").select("id").eq("question_id", rows![0].question_id);
  const wrong = options!.find((o) => o.id !== answer!.correct_option_id)!;
  await admin.from("attempt_questions").update({ selected_option_id: wrong.id }).eq("attempt_id", id).eq("question_id", rows![0].question_id);

  await page.reload();
  await page.getByRole("button", { name: "জমা দিন" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "জমা দিন" }).click();
  await page.waitForURL("**/results/**");
  const { data } = await admin.from("attempts").select("score").eq("id", id).single();
  expect(Number(data!.score)).toBe(-0.25);
});

test("question bank search, filter and bookmark work", async ({ page }) => {
  await register(page, newEmail("bank"));
  await page.goto("/question-bank?q=জাতীয় ফুল");
  await expect(page.getByText("বাংলাদেশের জাতীয় ফুল কোনটি?")).toBeVisible();
  await page.getByRole("button", { name: "উত্তর দেখুন" }).click();
  await expect(page.getByText("বাংলাদেশের জাতীয় ফুল শাপলা।")).toBeVisible();
  await page.getByRole("button", { name: "বুকমার্ক" }).click();
  await expect(page.getByRole("button", { name: "বুকমার্ক" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "বুকমার্ক" })).toHaveAttribute("aria-pressed", "true");
});

test("mobile navigation works", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await register(page, newEmail("mobile"));
  await page.getByRole("link", { name: "মক", exact: true }).click();
  await page.waitForURL("**/mock-exams");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("Row Level Security keeps users apart and hides answers", async ({ browser }) => {
  const page = await browser.newPage();
  const emailA = newEmail("rls-a");
  await register(page, emailA);
  await page.goto("/practice");
  await page.getByRole("button", { name: "অনুশীলন শুরু করুন" }).click();
  await page.waitForURL("**/attempt/**");
  const attemptId = page.url().split("/").pop()!;
  const attemptUrl = page.url();

  const context = await browser.newContext();
  const other = await context.newPage();
  const emailB = newEmail("rls-b");
  await register(other, emailB);
  const response = await other.goto(attemptUrl);
  expect(response!.status()).toBe(404);

  const b = await signedIn(emailB);
  expect((await b.from("attempts").select("id").eq("id", attemptId)).data).toEqual([]);
  expect((await b.from("attempt_questions").select("position").eq("attempt_id", attemptId)).data).toEqual([]);
  expect((await b.from("question_answers").select("*").limit(1)).data ?? []).toEqual([]);

  const a = await signedIn(emailA);
  expect((await a.from("question_answers").select("*").limit(1)).data ?? []).toEqual([]);
  const { error } = await a.from("attempts").update({ score: 999 }).eq("id", attemptId).select();
  const { data } = await admin.from("attempts").select("score").eq("id", attemptId).single();
  expect(error !== null || Number(data!.score) === 0).toBe(true);
  expect(Number(data!.score)).toBe(0);
});
