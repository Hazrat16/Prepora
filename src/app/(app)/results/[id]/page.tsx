import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookmarkButton } from "@/components/app/question-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { bn, formatMinutes } from "@/lib/format";
import { accuracy } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Row = {
  question_id: string;
  section_name: string;
  selected_option_id: string | null;
  is_correct: boolean | null;
  questions: {
    text: string;
    question_options: { id: string; position: number; text: string }[];
    topics: { id: string; slug: string; name_bn: string; subjects: { slug: string; name_bn: string } };
  };
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: attempt } = await supabase.from("attempts").select("*").eq("id", id).maybeSingle();
  if (!attempt) notFound();
  // Answers stay hidden until the attempt is closed.
  if (attempt.status !== "submitted") redirect(`/attempt/${id}`);

  const { data } = await supabase
    .from("attempt_questions")
    .select("question_id, section_name, selected_option_id, is_correct, questions(text, question_options(id, position, text), topics(id, slug, name_bn, subjects(slug, name_bn)))")
    .eq("attempt_id", id)
    .order("position");
  const rows = (data ?? []) as unknown as Row[];

  const { data: answers } = await createAdminClient()
    .from("question_answers")
    .select("question_id, correct_option_id, explanation_bn")
    .in("question_id", rows.map((r) => r.question_id));
  const answerBy = new Map(answers?.map((a) => [a.question_id, a]));

  const { data: bookmarks } = await supabase.from("bookmarks").select("question_id");
  const saved = new Set(bookmarks?.map((b) => b.question_id));

  const attempted = attempt.correct_count + attempt.incorrect_count;
  const minutes = (new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60_000;

  const bySubject = new Map<string, { name: string; total: number; correct: number }>();
  const missedTopics = new Map<string, { name: string; href: string; count: number }>();
  for (const row of rows) {
    const { topics } = row.questions;
    const subject = bySubject.get(topics.subjects.slug) ?? { name: topics.subjects.name_bn, total: 0, correct: 0 };
    subject.total++;
    if (row.is_correct) subject.correct++;
    bySubject.set(topics.subjects.slug, subject);

    if (!row.is_correct) {
      const topic = missedTopics.get(topics.id) ?? { name: topics.name_bn, href: `/learn/${topics.subjects.slug}/${topics.slug}`, count: 0 };
      topic.count++;
      missedTopics.set(topics.id, topic);
    }
  }
  const weakTopics = [...missedTopics.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const summary = [
    ["মোট প্রশ্ন", bn(attempt.total_questions)],
    ["সঠিক", bn(attempt.correct_count)],
    ["ভুল", bn(attempt.incorrect_count)],
    ["উত্তর দেননি", bn(attempt.unanswered_count)],
    ["নির্ভুলতা", `${bn(accuracy(attempt.correct_count, attempted))}%`],
    ["সময় লেগেছে", formatMinutes(minutes)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{attempt.title}: ফলাফল</h1>
        {attempt.auto_submitted && <p className="text-sm text-muted-foreground">সময় শেষ হওয়ায় পরীক্ষাটি নিজে থেকে জমা হয়েছে।</p>}
      </div>

      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">প্রাপ্ত নম্বর</p>
          <p className="text-4xl font-bold text-primary">{bn(Number(attempt.score))}<span className="text-xl text-muted-foreground">/{bn(Number(attempt.max_score))}</span></p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {summary.map(([label, value]) => (
              <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>বিষয়ভিত্তিক ফল</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[...bySubject.values()].map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm"><span>{s.name}</span><span>{bn(s.correct)}/{bn(s.total)}</span></div>
                <Progress className="mt-1" value={(s.correct / s.total) * 100} aria-label={s.name} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>যা পড়া দরকার</CardTitle></CardHeader>
          <CardContent>
            {weakTopics.length ? (
              <ul className="space-y-2 text-sm">
                {weakTopics.map((t) => (
                  <li key={t.href} className="flex justify-between gap-3">
                    <Link href={t.href} className="text-primary hover:underline">{t.name}</Link>
                    <span className="text-muted-foreground">{bn(t.count)}টি বাকি বা ভুল</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">দারুণ! কোনো দুর্বল টপিক পাওয়া যায়নি।</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link href="/practice?source=incorrect">ভুলগুলো আবার অনুশীলন করুন</Link></Button>
        <Button asChild variant="outline"><Link href="/dashboard">ড্যাশবোর্ডে যান</Link></Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">উত্তর পর্যালোচনা</h2>
        {rows.map((row, i) => {
          const answer = answerBy.get(row.question_id);
          const options = [...row.questions.question_options].sort((a, b) => a.position - b.position);
          return (
            <Card key={row.question_id} size="sm">
              <CardContent>
                <div className="flex items-start gap-2">
                  {row.is_correct === true && <CheckCircle2 className="mt-1 size-5 shrink-0 text-success" />}
                  {row.is_correct === false && <XCircle className="mt-1 size-5 shrink-0 text-destructive" />}
                  {row.is_correct === null && <CircleSlash className="mt-1 size-5 shrink-0 text-muted-foreground" />}
                  <p className="flex-1 font-medium">{bn(i + 1)}. {row.questions.text}</p>
                  <BookmarkButton questionId={row.question_id} bookmarked={saved.has(row.question_id)} />
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {options.map((o) => {
                    const correct = o.id === answer?.correct_option_id;
                    const chosen = o.id === row.selected_option_id;
                    return (
                      <li
                        key={o.id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-2 py-1",
                          correct && "bg-success/15",
                          chosen && !correct && "bg-destructive/10",
                        )}
                      >
                        {o.text}
                        {correct && <Badge variant="secondary">সঠিক</Badge>}
                        {chosen && !correct && <Badge variant="outline">আপনার উত্তর</Badge>}
                      </li>
                    );
                  })}
                </ul>
                {answer?.explanation_bn && <p className="mt-2 rounded-md bg-muted p-2 text-sm">{answer.explanation_bn}</p>}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
