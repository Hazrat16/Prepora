import { CheckCircle2, Circle, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/supabase/server";

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: slug } = await params;
  const { supabase } = await requireUser();
  const { data: subject } = await supabase
    .from("subjects")
    .select("name_bn, topics(id, slug, name_bn, group_name, position, lessons(id))")
    .eq("slug", slug)
    .maybeSingle();
  if (!subject) notFound();

  const { data: progress } = await supabase.from("lesson_progress").select("lesson_id");
  const done = new Set(progress?.map((p) => p.lesson_id));
  const topics = [...subject.topics].sort((a, b) => a.position - b.position);
  const groups = [...new Set(topics.map((t) => t.group_name))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{subject.name_bn}</h1>
      {groups.map((group) => (
        <section key={group}>
          <h2 className="mb-2 font-semibold text-muted-foreground">{group}</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {topics.filter((t) => t.group_name === group).map((topic) => {
              const hasLesson = topic.lessons.length > 0;
              const finished = topic.lessons.some((l) => done.has(l.id));
              return (
                <li key={topic.id}>
                  <Link href={`/learn/${slug}/${topic.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                    {finished ? <CheckCircle2 className="size-5 text-success" /> : hasLesson ? <Circle className="size-5 text-primary" /> : <Clock className="size-5 text-muted-foreground" />}
                    <span className="flex-1">{topic.name_bn}</span>
                    {!hasLesson && <Badge variant="secondary">শীঘ্রই</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
