import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { bn, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export default async function PapersByYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) notFound();
  const { supabase } = await requireUser();
  const { data: papers } = await supabase
    .from("examination_papers")
    .select("id, title, exam_date, phase, region, is_complete")
    .eq("year", Number(year))
    .order("exam_date");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{bn(year)} সালের পেপার</h1>
      {papers?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/previous-questions/paper/${paper.id}`}>
              <Card size="sm" className="h-full transition-shadow hover:shadow-md">
                <CardContent>
                  <h2 className="font-semibold text-primary">{paper.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[paper.exam_date && formatDate(paper.exam_date), paper.phase, paper.region].filter(Boolean).join(" · ")}
                  </p>
                  {!paper.is_complete && <Badge variant="outline" className="mt-2">অসম্পূর্ণ পেপার</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">এই সালের কোনো পেপার এখনো সংগ্রহ করা হয়নি।</p>
      )}
    </div>
  );
}
