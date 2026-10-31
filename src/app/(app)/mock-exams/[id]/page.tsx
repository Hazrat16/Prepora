import Link from "next/link";
import { notFound } from "next/navigation";
import { startMockExam } from "@/app/actions/attempts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pickSectionQuestions } from "@/lib/attempts";
import { bn, formatMinutes } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export default async function MockExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: exam } = await supabase.from("mock_exams").select("*, mock_exam_sections(*)").eq("id", id).maybeSingle();
  if (!exam) notFound();

  const { data: running } = await supabase
    .from("attempts")
    .select("id")
    .eq("mock_exam_id", id)
    .eq("status", "in_progress")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const sections = [...exam.mock_exam_sections].sort((a, b) => a.position - b.position);
  const pools = await Promise.all(sections.map((s) => pickSectionQuestions(s.subject_slugs, s.question_count)));
  const short = sections.filter((s, i) => pools[i].available < s.question_count);
  const totalMarks = sections.reduce((sum, s) => sum + s.question_count * Number(s.marks_per_question), 0);
  const start = startMockExam.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{exam.name}</h1>
        <p className="text-muted-foreground">{bn(totalMarks)} নম্বর · {formatMinutes(exam.duration_minutes)}{exam.pass_marks && ` · পাস নম্বর ${bn(Number(exam.pass_marks))}`}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="px-3 py-2">অংশ</th><th className="px-3 py-2">প্রশ্ন</th><th className="px-3 py-2">প্রতি প্রশ্নে</th><th className="px-3 py-2">ভুলে কাটা</th></tr>
          </thead>
          <tbody className="divide-y">
            {sections.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{bn(s.question_count)}টি</td>
                <td className="px-3 py-2">{bn(Number(s.marks_per_question))}</td>
                <td className="px-3 py-2">{bn(Number(s.negative_marks))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <CardContent className="space-y-2 text-sm">
          <h2 className="font-semibold">নির্দেশনা</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>শুরু করলেই সময় চলতে থাকবে, পেজ বন্ধ করলেও থামবে না।</li>
            <li>প্রতিটি উত্তর সঙ্গে সঙ্গে সংরক্ষণ হয়।</li>
            <li>সময় শেষ হলে পরীক্ষা নিজে থেকে জমা হবে।</li>
          </ul>
          {exam.source_note && <p className="border-t pt-2 text-muted-foreground">{exam.source_note}</p>}
        </CardContent>
      </Card>
      {short.length > 0 && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          প্রশ্ন কম আছে: {short.map((s) => s.name).join(", ")}। আরও প্রশ্ন যোগ না হওয়া পর্যন্ত এই মক শুরু করা যাবে না।
        </p>
      )}
      {running ? (
        <Button asChild size="lg" className="w-full"><Link href={`/attempt/${running.id}`}>চলমান পরীক্ষা চালিয়ে যান</Link></Button>
      ) : (
        <form action={start}>
          <Button type="submit" size="lg" className="w-full" disabled={short.length > 0}>পরীক্ষা শুরু করুন</Button>
        </form>
      )}
    </div>
  );
}
