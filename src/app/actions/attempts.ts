"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAttempt, pickSectionQuestions, SAVE_GRACE_SECONDS, submitAttempt } from "@/lib/attempts";
import { shuffle } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const practiceInput = z.object({
  subject_id: z.string().optional(),
  topic_id: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  count: z.coerce.number().pipe(z.union([z.literal(5), z.literal(10), z.literal(20), z.literal(30), z.literal(50)])),
  source: z.enum(["all", "unanswered", "incorrect", "bookmarked"]),
  collection: z.enum(["practice", "previous_year"]).default("practice"),
});

export async function startPractice(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const raw = Object.fromEntries([...form].filter(([, value]) => value !== ""));
  const parsed = practiceInput.safeParse(raw);
  if (!parsed.success) return { error: "সব তথ্য ঠিকভাবে নির্বাচন করুন।" };
  const { subject_id, topic_id, difficulty, count, source, collection } = parsed.data;

  const { supabase, user } = await requireUser();

  let query = supabase
    .from("questions")
    .select("id, topics!inner(subject_id)")
    .eq("is_published", true);
  query = collection === "previous_year"
    ? query.eq("collection", "previous_year")
    : query.neq("collection", "previous_year");
  if (topic_id) query = query.eq("topic_id", topic_id);
  else if (subject_id) query = query.eq("topics.subject_id", subject_id);
  if (difficulty) query = query.eq("difficulty", difficulty);
  const { data: pool } = await query;
  let ids = (pool ?? []).map((q) => q.id as string);

  if (source !== "all") {
    const { data: seen } = await supabase
      .from("attempt_questions")
      .select("question_id, is_correct, attempts!inner(status)")
      .eq("attempts.status", "submitted");
    const answered = new Set(seen?.map((row) => row.question_id));
    const missed = new Set(seen?.filter((row) => row.is_correct === false).map((row) => row.question_id));
    const { data: bookmarks } = await supabase.from("bookmarks").select("question_id");
    const saved = new Set(bookmarks?.map((row) => row.question_id));

    ids = ids.filter((id) => {
      if (source === "unanswered") return !answered.has(id);
      if (source === "incorrect") return missed.has(id);
      return saved.has(id);
    });
  }

  if (ids.length === 0) {
    return { error: "এই নির্বাচনে কোনো প্রশ্ন পাওয়া যায়নি। অন্য কিছু বেছে নিন।" };
  }

  const attemptId = await createAttempt({
    userId: user.id,
    mode: "practice",
    title: collection === "previous_year" ? "পূর্ববর্তী বছরের প্রশ্ন অনুশীলন" : "অনুশীলন",
    questions: shuffle(ids)
      .slice(0, count)
      .map((id) => ({ id, sectionName: "", marks: 1, negativeMarks: 0 })),
  });
  redirect(`/attempt/${attemptId}`);
}

export async function startMockExam(examId: string) {
  const { supabase, user } = await requireUser();
  const { data: exam } = await supabase
    .from("mock_exams")
    .select("id, name, duration_minutes, mock_exam_sections(*)")
    .eq("id", examId)
    .single();
  if (!exam) redirect("/mock-exams");

  const sections = [...exam.mock_exam_sections].sort((a, b) => a.position - b.position);
  const questions = [];
  for (const section of sections) {
    const { picked } = await pickSectionQuestions(section.subject_slugs, section.question_count);
    if (picked.length < section.question_count) redirect(`/mock-exams/${examId}`);
    for (const id of picked) {
      questions.push({
        id,
        sectionName: section.name,
        marks: Number(section.marks_per_question),
        negativeMarks: Number(section.negative_marks),
      });
    }
  }

  const attemptId = await createAttempt({
    userId: user.id,
    mode: "mock",
    title: exam.name,
    mockExamId: exam.id,
    durationMinutes: exam.duration_minutes,
    questions,
  });
  redirect(`/attempt/${attemptId}`);
}

// Keeps the paper's own order. Papers with an unverified time limit run untimed.
export async function startPaper(paperId: string) {
  const { supabase, user } = await requireUser();
  const { data: paper } = await supabase
    .from("examination_papers")
    .select("id, title, duration_minutes, negative_marks, examination_paper_questions(question_id, position, questions(is_published))")
    .eq("id", paperId)
    .single();
  if (!paper) redirect("/previous-questions");

  const rows = (paper.examination_paper_questions as unknown as {
    question_id: string;
    position: number;
    questions: { is_published: boolean } | null;
  }[])
    .filter((row) => row.questions?.is_published)
    .sort((a, b) => a.position - b.position);
  if (rows.length === 0) redirect(`/previous-questions/paper/${paperId}`);

  const attemptId = await createAttempt({
    userId: user.id,
    mode: "mock",
    title: paper.title,
    durationMinutes: paper.duration_minutes ?? undefined,
    questions: rows.map((row) => ({
      id: row.question_id,
      sectionName: "",
      marks: 1,
      negativeMarks: Number(paper.negative_marks),
    })),
  });
  redirect(`/attempt/${attemptId}`);
}

async function ownedAttempt(attemptId: string) {
  const { user } = await requireUser();
  const { data } = await createAdminClient()
    .from("attempts")
    .select("id, user_id, status, expires_at")
    .eq("id", attemptId)
    .single();
  if (!data || data.user_id !== user.id) throw new Error("Attempt not found");
  return data;
}

const answerInput = z.object({
  attemptId: z.uuid(),
  questionId: z.uuid(),
  selectedOptionId: z.uuid().nullable().optional(),
  markedForReview: z.boolean().optional(),
});

export async function saveAnswer(input: z.input<typeof answerInput>) {
  const { attemptId, questionId, selectedOptionId, markedForReview } = answerInput.parse(input);
  const attempt = await ownedAttempt(attemptId);

  if (attempt.status !== "in_progress") return { status: "closed" as const };
  if (
    attempt.expires_at &&
    Date.now() > new Date(attempt.expires_at).getTime() + SAVE_GRACE_SECONDS * 1000
  ) {
    await submitAttempt(attemptId, true);
    return { status: "closed" as const };
  }

  const admin = createAdminClient();
  if (selectedOptionId) {
    // An option id from another question must not be accepted.
    const { data: option } = await admin
      .from("question_options")
      .select("id")
      .eq("id", selectedOptionId)
      .eq("question_id", questionId)
      .maybeSingle();
    if (!option) throw new Error("Invalid option");
  }

  const update: Record<string, unknown> = {};
  if (selectedOptionId !== undefined) {
    update.selected_option_id = selectedOptionId;
    update.answered_at = selectedOptionId ? new Date().toISOString() : null;
  }
  if (markedForReview !== undefined) update.marked_for_review = markedForReview;

  const { error } = await admin
    .from("attempt_questions")
    .update(update)
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId);
  if (error) throw new Error(error.message);
  return { status: "saved" as const };
}

export async function finishAttempt(attemptId: string, auto = false) {
  const attempt = await ownedAttempt(attemptId);
  const pastDeadline =
    !!attempt.expires_at && Date.now() >= new Date(attempt.expires_at).getTime();
  await submitAttempt(attemptId, auto && pastDeadline);
  redirect(`/results/${attemptId}`);
}
