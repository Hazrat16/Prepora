import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bn, formatDate, formatMinutes } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export default async function MockExamsPage() {
  const { supabase } = await requireUser();
  const [{ data: exams }, { data: history }] = await Promise.all([
    supabase.from("mock_exams").select("id, name, description, duration_minutes, mock_exam_sections(question_count, marks_per_question)").order("position"),
    supabase
      .from("attempts")
      .select("id, title, status, started_at, score, max_score")
      .eq("mode", "mock")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">মক পরীক্ষা</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {exams?.map((exam) => {
          const marks = exam.mock_exam_sections.reduce((sum, s) => sum + s.question_count * Number(s.marks_per_question), 0);
          return (
            <Card key={exam.id}>
              <CardContent className="flex h-full flex-col">
                <h2 className="font-semibold text-primary">{exam.name}</h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{exam.description}</p>
                <p className="mt-3 text-sm">{bn(marks)} নম্বর · {formatMinutes(exam.duration_minutes)}</p>
                <Button asChild className="mt-3"><Link href={`/mock-exams/${exam.id}`}>বিস্তারিত ও শুরু</Link></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">পরীক্ষার ইতিহাস</h2>
        {history?.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {history.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.status === "submitted" ? `/results/${a.id}` : `/attempt/${a.id}`}
                  className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-muted"
                >
                  <span>{a.title} · {formatDate(a.started_at)}</span>
                  <span className="font-medium">
                    {a.status === "submitted" ? `${bn(a.score)}/${bn(a.max_score)}` : "চলমান, চালিয়ে যান"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">এখনো কোনো মক পরীক্ষা দেননি।</p>
        )}
      </section>
    </div>
  );
}
