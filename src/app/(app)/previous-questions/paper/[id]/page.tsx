import { notFound } from "next/navigation";
import { startPaper } from "@/app/actions/attempts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bn, formatDate, formatMinutes, VERIFICATION_LABELS } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireUser();
  const { data: paper } = await supabase
    .from("examination_papers")
    .select("*, examination_paper_questions(position, questions(id, text, verification_status, is_published))")
    .eq("id", id)
    .maybeSingle();
  if (!paper) notFound();

  const rows = ([...paper.examination_paper_questions] as unknown as {
    position: number;
    questions: { id: string; text: string; verification_status: keyof typeof VERIFICATION_LABELS; is_published: boolean } | null;
  }[]).filter((row) => row.questions).sort((a, b) => a.position - b.position);
  const start = startPaper.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{paper.title}</h1>
        <p className="text-muted-foreground">
          {[
            paper.exam_date && formatDate(paper.exam_date),
            paper.phase,
            paper.full_marks && `${bn(Number(paper.full_marks))} নম্বর`,
            paper.duration_minutes ? formatMinutes(paper.duration_minutes) : "সময় যাচাই হয়নি",
          ].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">উৎস: {paper.source_name}</p>
      </div>
      {!paper.is_complete && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          এই পেপারটি অসম্পূর্ণ বা পুনর্গঠিত। এটি মূল পরীক্ষার হুবহু রূপ নয়।
        </p>
      )}
      <form action={start}>
        <Button type="submit" size="lg" className="w-full" disabled={rows.length === 0}>
          Previous Year Exam Mode শুরু করুন
        </Button>
      </form>
      <ol className="divide-y rounded-xl border bg-card">
        {rows.map((row, index) => (
          <li key={row.questions!.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <span>{bn(index + 1)}. {row.questions!.text}</span>
            <Badge variant="outline">{VERIFICATION_LABELS[row.questions!.verification_status]}</Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}
