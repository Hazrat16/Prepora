import { notFound, redirect } from "next/navigation";
import { ExamRunner } from "@/components/app/exam-runner";
import { secondsUntil, submitAttempt } from "@/lib/attempts";
import { PAPER_SELECT, paperLabels } from "@/lib/papers";
import { requireUser } from "@/lib/supabase/server";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, title, mode, status, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!attempt) notFound();
  if (attempt.status === "submitted") redirect(`/results/${id}`);
  if (attempt.expires_at && secondsUntil(attempt.expires_at) <= 0) {
    await submitAttempt(id, true);
    redirect(`/results/${id}`);
  }

  // Reads options only. Correct answers are never part of this payload.
  const { data: rows } = await supabase
    .from("attempt_questions")
    .select(`question_id, position, section_name, selected_option_id, marked_for_review, questions(text, question_options(id, position, text), ${PAPER_SELECT})`)
    .eq("attempt_id", id)
    .order("position");

  const questions = ((rows ?? []) as unknown as {
    question_id: string;
    section_name: string;
    selected_option_id: string | null;
    marked_for_review: boolean;
    questions: {
      text: string;
      question_options: { id: string; position: number; text: string }[];
      examination_paper_questions: { examination_papers: { short_label: string; title: string } | null }[];
    };
  }[]).map((row) => ({
    id: row.question_id,
    section: row.section_name,
    text: row.questions.text,
    papers: paperLabels(row.questions),
    selected: row.selected_option_id,
    marked: row.marked_for_review,
    options: [...row.questions.question_options].sort((a, b) => a.position - b.position),
  }));

  return (
    <ExamRunner
      attemptId={id}
      title={attempt.title}
      isMock={attempt.mode === "mock"}
      secondsLeft={attempt.expires_at ? secondsUntil(attempt.expires_at) : null}
      questions={questions}
    />
  );
}
