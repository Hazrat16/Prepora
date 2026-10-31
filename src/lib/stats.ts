import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentStreak, dhakaDay } from "@/lib/format";
import { accuracy } from "@/lib/scoring";

export type SubjectStat = {
  id: string;
  name: string;
  attempted: number;
  correct: number;
  accuracy: number;
};

// Accuracy from fewer answers than this says little, so it is not ranked.
const MIN_ANSWERS_FOR_RANKING = 5;

export function preparationLevel(attempted: number, percent: number) {
  if (attempted < 50) return "শুরুর ধাপ";
  if (percent < 50) return "প্রাথমিক";
  if (percent < 75) return "মাঝারি";
  return "উন্নত";
}

export async function getDashboardStats(supabase: SupabaseClient) {
  const [{ data: attempts }, { data: answers }, { data: completed }, { data: lessons }, { data: subjects }] =
    await Promise.all([
      supabase
        .from("attempts")
        .select("id, title, mode, started_at, submitted_at, score, max_score, correct_count, incorrect_count")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false }),
      supabase
        .from("attempt_questions")
        .select("is_correct, questions!inner(topics!inner(subject_id)), attempts!inner(status)")
        .eq("attempts.status", "submitted")
        .not("is_correct", "is", null),
      supabase.from("lesson_progress").select("lesson_id, completed_at"),
      supabase
        .from("lessons")
        .select("id, title, estimated_minutes, topics!inner(slug, position, subjects!inner(slug, position))"),
      supabase.from("subjects").select("id, name_bn").order("position"),
    ]);

  const submitted = attempts ?? [];
  const correct = submitted.reduce((sum, a) => sum + a.correct_count, 0);
  const incorrect = submitted.reduce((sum, a) => sum + a.incorrect_count, 0);
  const attempted = correct + incorrect;

  const completedIds = new Set(completed?.map((c) => c.lesson_id));
  const allLessons = (lessons ?? []) as unknown as {
    id: string;
    title: string;
    estimated_minutes: number;
    topics: { slug: string; position: number; subjects: { slug: string; position: number } };
  }[];
  const lessonMinutes = allLessons
    .filter((l) => completedIds.has(l.id))
    .reduce((sum, l) => sum + l.estimated_minutes, 0);
  const attemptMinutes = submitted.reduce(
    (sum, a) => sum + (new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 60_000,
    0,
  );

  const perSubject = new Map<string, { attempted: number; correct: number }>();
  for (const row of (answers ?? []) as unknown as {
    is_correct: boolean;
    questions: { topics: { subject_id: string } };
  }[]) {
    const id = row.questions.topics.subject_id;
    const entry = perSubject.get(id) ?? { attempted: 0, correct: 0 };
    entry.attempted++;
    if (row.is_correct) entry.correct++;
    perSubject.set(id, entry);
  }
  const subjectStats: SubjectStat[] = (subjects ?? []).map((s) => {
    const entry = perSubject.get(s.id) ?? { attempted: 0, correct: 0 };
    return { id: s.id, name: s.name_bn, ...entry, accuracy: accuracy(entry.correct, entry.attempted) };
  });
  const ranked = subjectStats
    .filter((s) => s.attempted >= MIN_ANSWERS_FOR_RANKING)
    .sort((a, b) => a.accuracy - b.accuracy);

  const activity = new Map<string, number>();
  const today = dhakaDay(new Date());
  let answeredToday = 0;
  for (const a of submitted) {
    const day = dhakaDay(a.submitted_at);
    const count = a.correct_count + a.incorrect_count;
    activity.set(day, (activity.get(day) ?? 0) + count);
    if (day === today) answeredToday += count;
  }
  const activeDays = new Set(activity.keys());
  completed?.forEach((c) => activeDays.add(dhakaDay(c.completed_at)));

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86_400_000);
    const day = dhakaDay(date);
    return {
      day,
      label: new Intl.DateTimeFormat("bn-BD", { weekday: "short", timeZone: "Asia/Dhaka" }).format(date),
      count: activity.get(day) ?? 0,
    };
  });

  const nextLesson = allLessons
    .filter((l) => !completedIds.has(l.id))
    .sort(
      (a, b) =>
        a.topics.subjects.position - b.topics.subjects.position || a.topics.position - b.topics.position,
    )[0];

  return {
    attempted,
    correct,
    incorrect,
    accuracy: accuracy(correct, attempted),
    studyMinutes: lessonMinutes + attemptMinutes,
    lessonsCompleted: completedIds.size,
    lessonsTotal: allLessons.length,
    streak: currentStreak(activeDays),
    answeredToday,
    week,
    subjectStats,
    weakest: ranked[0],
    strongest: ranked.length > 1 ? ranked[ranked.length - 1] : undefined,
    recentMocks: submitted.filter((a) => a.mode === "mock").slice(0, 5),
    nextLesson,
  };
}
