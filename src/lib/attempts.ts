import "server-only";
import { nextRevision } from "@/lib/revision";
import { scoreAnswers, shuffle } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

// Extra seconds so an answer sent just before the deadline still counts.
export const SAVE_GRACE_SECONDS = 5;

export function secondsUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 1000);
}

// Scores from saved answers only. Safe to call twice: the second call does nothing.
export async function submitAttempt(attemptId: string, auto = false) {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, status, user_id")
    .eq("id", attemptId)
    .single();
  if (!attempt || attempt.status === "submitted") return;

  const { data: rows } = await admin
    .from("attempt_questions")
    .select("question_id, selected_option_id, marks, negative_marks")
    .eq("attempt_id", attemptId);
  const questions = rows ?? [];

  const { data: answers } = await admin
    .from("question_answers")
    .select("question_id, correct_option_id")
    .in("question_id", questions.map((q) => q.question_id));
  const correctBy = new Map(answers?.map((a) => [a.question_id, a.correct_option_id]));

  const score = scoreAnswers(
    questions.map((q) => ({
      selectedOptionId: q.selected_option_id,
      correctOptionId: correctBy.get(q.question_id)!,
      marks: Number(q.marks),
      negativeMarks: Number(q.negative_marks),
    })),
  );

  const answered = questions.filter((q) => q.selected_option_id !== null);
  const isRight = (q: (typeof answered)[number]) =>
    q.selected_option_id === correctBy.get(q.question_id);

  await admin
    .from("attempt_questions")
    .update({ is_correct: true })
    .eq("attempt_id", attemptId)
    .in("question_id", answered.filter(isRight).map((q) => q.question_id));
  await admin
    .from("attempt_questions")
    .update({ is_correct: false })
    .eq("attempt_id", attemptId)
    .in("question_id", answered.filter((q) => !isRight(q)).map((q) => q.question_id));

  await admin
    .from("attempts")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      auto_submitted: auto,
      total_questions: score.total,
      correct_count: score.correct,
      incorrect_count: score.incorrect,
      unanswered_count: score.unanswered,
      score: score.score,
      max_score: score.maxScore,
    })
    .eq("id", attemptId)
    .eq("status", "in_progress");

  await updateMistakes(
    attempt.user_id,
    answered.map((q) => ({ questionId: q.question_id, correct: isRight(q) })),
  );
}

async function updateMistakes(userId: string, answers: { questionId: string; correct: boolean }[]) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("mistake_notebook")
    .select("question_id, wrong_count, last_wrong_at, interval_step, next_review_at, resolved_at")
    .eq("user_id", userId)
    .in("question_id", answers.map((a) => a.questionId));
  const byQuestion = new Map(existing?.map((row) => [row.question_id, row]));
  const now = new Date();

  const rows = answers.flatMap(({ questionId, correct }) => {
    const row = byQuestion.get(questionId);
    // A right answer only counts as revision once the question is due.
    if (correct && (!row || row.resolved_at || new Date(row.next_review_at) > now)) return [];

    const state = nextRevision(row?.interval_step ?? 0, correct, now);
    return [{
      user_id: userId,
      question_id: questionId,
      wrong_count: (row?.wrong_count ?? 0) + (correct ? 0 : 1),
      last_wrong_at: correct ? row!.last_wrong_at : now.toISOString(),
      interval_step: state.intervalStep,
      next_review_at: state.nextReviewAt.toISOString(),
      resolved_at: state.resolved ? now.toISOString() : null,
    }];
  });
  if (rows.length === 0) return;
  const { error } = await admin.from("mistake_notebook").upsert(rows);
  if (error) throw new Error(error.message);
}

type NewQuestion = { id: string; sectionName: string; marks: number; negativeMarks: number };

export async function createAttempt(input: {
  userId: string;
  mode: "practice" | "mock";
  title: string;
  mockExamId?: string;
  durationMinutes?: number;
  questions: NewQuestion[];
}) {
  const admin = createAdminClient();
  const expiresAt = input.durationMinutes
    ? new Date(Date.now() + input.durationMinutes * 60_000).toISOString()
    : null;

  const { data: attempt, error } = await admin
    .from("attempts")
    .insert({
      user_id: input.userId,
      mode: input.mode,
      title: input.title,
      mock_exam_id: input.mockExamId ?? null,
      expires_at: expiresAt,
      total_questions: input.questions.length,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: rowsError } = await admin.from("attempt_questions").insert(
    input.questions.map((q, position) => ({
      attempt_id: attempt.id,
      question_id: q.id,
      position,
      section_name: q.sectionName,
      marks: q.marks,
      negative_marks: q.negativeMarks,
    })),
  );
  if (rowsError) throw new Error(rowsError.message);
  return attempt.id as string;
}

// Picks a section's questions from the non-historical pool for its subjects.
export async function pickSectionQuestions(subjectSlugs: string[], count: number) {
  const admin = createAdminClient();
  const { data: subjects } = await admin.from("subjects").select("id").in("slug", subjectSlugs);
  const { data: topics } = await admin
    .from("topics")
    .select("id")
    .in("subject_id", subjects?.map((s) => s.id) ?? []);
  const { data: questions } = await admin
    .from("questions")
    .select("id")
    .eq("is_published", true)
    .neq("collection", "previous_year")
    .in("topic_id", topics?.map((t) => t.id) ?? []);
  const ids = (questions ?? []).map((q) => q.id as string);
  return { available: ids.length, picked: shuffle(ids).slice(0, count) };
}
