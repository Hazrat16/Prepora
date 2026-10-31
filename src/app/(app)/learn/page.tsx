import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { bn } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export default async function LearnPage() {
  const { supabase } = await requireUser();
  const [{ data: subjects }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("subjects").select("id, slug, name_bn, description_bn, topics(id)").order("position"),
    supabase.from("lessons").select("id, topics!inner(subject_id)"),
    supabase.from("lesson_progress").select("lesson_id"),
  ]);
  const done = new Set(progress?.map((p) => p.lesson_id));
  const lessonRows = (lessons ?? []) as unknown as { id: string; topics: { subject_id: string } }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">শিখুন</h1>
        <p className="text-muted-foreground">একটি বিষয় বেছে নিন। প্রতিদিন সব বিষয় থেকে অল্প করে পড়াই সবচেয়ে ভালো।</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {subjects?.map((s) => {
          const own = lessonRows.filter((l) => l.topics.subject_id === s.id);
          const completed = own.filter((l) => done.has(l.id)).length;
          return (
            <Link key={s.id} href={`/learn/${s.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent>
                  <h2 className="font-semibold text-primary">{s.name_bn}</h2>
                  <p className="text-sm text-muted-foreground">{s.description_bn}</p>
                  <p className="mt-3 text-sm">{bn(s.topics.length)}টি টপিক · {bn(completed)}/{bn(own.length)} লেসন সম্পন্ন</p>
                  <Progress className="mt-1" value={own.length ? (completed / own.length) * 100 : 0} aria-label={s.name_bn} />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
