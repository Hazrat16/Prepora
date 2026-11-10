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

// Notes read like margin notes in a book: a coloured rule on the left, not a box.
const TONES = {
  note: "border-primary/60 bg-primary/[0.04]",
  warning: "border-destructive/60 bg-destructive/[0.04]",
  revision: "border-success/60 bg-success/[0.05]",
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
    <article className="space-y-9 text-[1.08rem]">
      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">{subject.name_bn} · {topic.name_bn}</p>
        <h1 className="mt-2 text-3xl font-bold md:text-[2.1rem]">{lesson.title}</h1>
        {lesson.summary && <p className="mt-3 text-lg text-muted-foreground">{lesson.summary}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{bn(lesson.estimated_minutes)} মিনিট</Badge>
          {lesson.is_ai_written && <Badge variant="outline">AI-লিখিত, যাচাই বাকি</Badge>}
        </div>
      </header>

      {(lesson.sections as Section[]).map((section) => (
        <section key={section.heading} className={cn(section.tone && ["rounded-r-md border-l-4 py-3 pr-4 pl-5", TONES[section.tone]])}>
          <h2 className="mb-3 text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs?.map((p) => <p key={p} className="mb-4 last:mb-0">{p}</p>)}
          {section.bullets && (
            <ul className="list-disc space-y-2 pl-6 marker:text-muted-foreground">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
          )}
          {section.table && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-[0.95rem]">
                <thead className="border-b bg-muted/60 text-left">
                  <tr>{section.table.head.map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {section.table.rows.map((row) => (
                    <tr key={row[0]}>{row.map((cell) => <td key={cell} className="px-4 py-2.5">{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <footer className="flex flex-wrap gap-3 border-t pt-6">
        <CompleteButton lessonId={lesson.id} completed={!!progress} path={`/learn/${subjectSlug}/${topicSlug}`} />
        {practice}
      </footer>
    </article>
  );
}
