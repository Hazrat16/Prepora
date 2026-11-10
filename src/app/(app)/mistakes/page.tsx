import Link from "next/link";
import { startDueReview } from "@/app/actions/attempts";
import { PaperBadges } from "@/components/app/paper-badges";
import { BankQuestion } from "@/components/app/question-actions";
import { ResolveButton } from "@/components/app/resolve-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bn, formatDate } from "@/lib/format";
import { PAPER_SELECT, paperLabels } from "@/lib/papers";
import { requireUser } from "@/lib/supabase/server";

const selectClass = "h-9 rounded-lg border bg-background px-2 text-sm";
const SHOWN = 50;

type Row = {
  question_id: string;
  wrong_count: number;
  last_wrong_at: string;
  next_review_at: string;
  resolved_at: string | null;
  questions: {
    text: string;
    question_options: { id: string; position: number; text: string }[];
    topics: { id: string; name_bn: string; subject_id: string; subjects: { name_bn: string } };
    examination_paper_questions: { examination_papers: { short_label: string; title: string } | null }[];
  };
};

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; sort?: string; view?: string }>;
}) {
  const { subject, sort, view } = await searchParams;
  const { supabase } = await requireUser();

  const [{ data }, { data: subjects }] = await Promise.all([
    supabase
      .from("mistake_notebook")
      .select(`question_id, wrong_count, last_wrong_at, next_review_at, resolved_at, questions(text, question_options(id, position, text), topics(id, name_bn, subject_id, subjects(name_bn)), ${PAPER_SELECT})`),
    supabase.from("subjects").select("id, name_bn").order("position"),
  ]);
  const all = (data ?? []) as unknown as Row[];
  const now = new Date().toISOString();

  const active = all.filter((m) => !m.resolved_at);
  const due = active.filter((m) => m.next_review_at <= now);
  const resolved = all.length - active.length;

  const missedByTopic = new Map<string, { name: string; count: number }>();
  for (const m of active) {
    const { id, name_bn } = m.questions.topics;
    const entry = missedByTopic.get(id) ?? { name: name_bn, count: 0 };
    entry.count += m.wrong_count;
    missedByTopic.set(id, entry);
  }
  const weakTopics = [...missedByTopic.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const shown = (view === "resolved" ? all.filter((m) => m.resolved_at) : active)
    .filter((m) => !subject || m.questions.topics.subject_id === subject)
    .sort((a, b) => {
      if (sort === "date") return b.last_wrong_at.localeCompare(a.last_wrong_at);
      if (sort === "count") return b.wrong_count - a.wrong_count;
      return a.next_review_at.localeCompare(b.next_review_at);
    });

  const stats = [
    ["আজকের রিভিশন", bn(due.length)],
    ["চলমান ভুল", bn(active.length)],
    ["শেখা হয়ে গেছে", bn(resolved)],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">আমার ভুলগুলো</h1>
        <p className="text-muted-foreground">
          ভুল প্রশ্ন ১, ৩, ৭ ও ১৪ দিন পরে আবার আসবে। আবার ভুল হলে সময়সূচি শুরু থেকে হবে।
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(([label, value]) => (
          <Card key={label} size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {due.length > 0 && (
        <form action={startDueReview}>
          <Button type="submit" size="lg" className="w-full">
            আজকের রিভিশন শুরু করুন ({bn(Math.min(due.length, 20))}টি প্রশ্ন)
          </Button>
        </form>
      )}

      {weakTopics.length > 0 && (
        <p className="text-sm text-muted-foreground">
          সবচেয়ে বেশি ভুল: {weakTopics.map((t) => `${t.name} (${bn(t.count)})`).join(", ")}
        </p>
      )}

      <form className="flex flex-wrap gap-2">
        <select name="subject" defaultValue={subject ?? ""} aria-label="বিষয়" className={selectClass}>
          <option value="">সব বিষয়</option>
          {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name_bn}</option>)}
        </select>
        <select name="sort" defaultValue={sort ?? ""} aria-label="সাজান" className={selectClass}>
          <option value="">রিভিশনের তারিখ</option>
          <option value="date">সর্বশেষ ভুল</option>
          <option value="count">সবচেয়ে বেশি ভুল</option>
        </select>
        <select name="view" defaultValue={view ?? ""} aria-label="দেখান" className={selectClass}>
          <option value="">চলমান ভুল</option>
          <option value="resolved">শেখা হয়ে গেছে</option>
        </select>
        <Button type="submit" size="sm" className="h-9">দেখুন</Button>
      </form>

      {shown.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <p>এখানে কোনো প্রশ্ন নেই।</p>
          {all.length === 0 && (
            <Button asChild className="mt-3"><Link href="/practice">অনুশীলন শুরু করুন</Link></Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.slice(0, SHOWN).map((m) => (
            <Card key={m.question_id} size="sm">
              <CardContent>
                <div className="flex items-start gap-2">
                  <p className="flex-1 font-medium">{m.questions.text}</p>
                  <ResolveButton questionId={m.question_id} resolved={!!m.resolved_at} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <PaperBadges labels={paperLabels(m.questions)} />
                  <Badge variant="secondary">{m.questions.topics.subjects.name_bn} · {m.questions.topics.name_bn}</Badge>
                  <Badge variant="outline">{bn(m.wrong_count)} বার ভুল</Badge>
                  {!m.resolved_at && <Badge variant="outline">পরের রিভিশন: {formatDate(m.next_review_at)}</Badge>}
                </div>
                <BankQuestion
                  id={m.question_id}
                  options={[...m.questions.question_options].sort((a, b) => a.position - b.position)}
                />
              </CardContent>
            </Card>
          ))}
          {shown.length > SHOWN && (
            <p className="text-center text-sm text-muted-foreground">প্রথম {bn(SHOWN)}টি দেখানো হচ্ছে।</p>
          )}
        </div>
      )}
    </div>
  );
}
