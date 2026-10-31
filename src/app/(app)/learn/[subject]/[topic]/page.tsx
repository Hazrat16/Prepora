import { Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompleteButton } from "@/components/app/complete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bn } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Section = {
  heading: string;
  tone?: "note" | "warning" | "revision";
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
};

const TONES = {
  note: "border-primary/30 bg-primary/5",
  warning: "border-destructive/30 bg-destructive/5",
  revision: "border-success/40 bg-success/5",
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>;
}) {
  const { subject: subjectSlug, topic: topicSlug } = await params;
  const { supabase, user } = await requireUser();

  const { data: subject } = await supabase.from("subjects").select("id, name_bn").eq("slug", subjectSlug).maybeSingle();
  if (!subject) notFound();
  const { data: topic } = await supabase
    .from("topics")
    .select("id, name_bn, lessons(*)")
    .eq("subject_id", subject.id)
    .eq("slug", topicSlug)
    .maybeSingle();
  if (!topic) notFound();

  const { count: questionCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topic.id);

  const lesson = topic.lessons[0];
  const { data: progress } = lesson
    ? await supabase.from("lesson_progress").select("lesson_id").eq("lesson_id", lesson.id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  const practice = !!questionCount && (
    <Button asChild variant="outline">
      <Link href={`/practice/${topic.id}`}><Target />টপিক টেস্ট ({bn(questionCount)}টি প্রশ্ন)</Link>
    </Button>
  );

  if (!lesson) {
    return (
      <div className="space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">{topic.name_bn}</h1>
        <p className="text-muted-foreground">এই টপিকের লেসন এখনো লেখা হয়নি।</p>
        {practice}
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{subject.name_bn} · {topic.name_bn}</p>
        <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{bn(lesson.estimated_minutes)} মিনিট</Badge>
          {lesson.is_ai_written && <Badge variant="outline">AI-লিখিত, যাচাই বাকি</Badge>}
        </div>
      </header>

      {(lesson.sections as Section[]).map((section) => (
        <section key={section.heading} className={cn(section.tone && ["rounded-xl border p-4", TONES[section.tone]])}>
          <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
          {section.paragraphs?.map((p) => <p key={p} className="mb-2">{p}</p>)}
          {section.bullets && (
            <ul className="list-disc space-y-1 pl-5">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
          )}
          {section.table && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>{section.table.head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {section.table.rows.map((row) => (
                    <tr key={row[0]}>{row.map((cell) => <td key={cell} className="px-3 py-2">{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <footer className="flex flex-wrap gap-3 border-t pt-4">
        <CompleteButton lessonId={lesson.id} completed={!!progress} path={`/learn/${subjectSlug}/${topicSlug}`} />
        {practice}
      </footer>
    </article>
  );
}
