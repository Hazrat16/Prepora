import { readFileSync } from "node:fs";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { bn } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

type RegisterPaper = { exam_type: string; year_in_name: number };

const EXAM_TYPE_LABELS: Record<string, string> = {
  primary: "প্রাথমিক সহকারী শিক্ষক",
  pre_primary: "প্রাক-প্রাথমিক",
  registered_non_govt: "রেজিস্টার্ড বেসরকারি",
  freedom_fighter_quota: "মুক্তিযোদ্ধা কোটা",
  bcs: "বিসিএস প্রিলিমিনারি",
  ntrca: "শিক্ষক নিবন্ধন (NTRCA)",
};

function discoveredPapers(): RegisterPaper[] {
  const register = JSON.parse(readFileSync("content/archive/source-register.json", "utf8"));
  return register.sources.sattacademy.papers;
}

export default async function PreviousQuestionsPage() {
  const { supabase } = await requireUser();
  const [{ data: papers }, { count: total }, { count: verified }] = await Promise.all([
    supabase.from("examination_papers").select("id, year, exam_type"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("collection", "previous_year"),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("collection", "previous_year")
      .in("verification_status", ["verified_official", "verified_secondary"]),
  ]);

  const discovered = discoveredPapers();
  const imported = papers ?? [];
  // Imported papers may come from exams the register does not list, such as BCS.
  const keys = [
    ...new Set([
      ...discovered.map((p) => `${p.exam_type}|${p.year_in_name}`),
      ...imported.map((p) => `${p.exam_type}|${p.year}`),
    ]),
  ].sort((a, b) => b.split("|")[1].localeCompare(a.split("|")[1]));

  const stats = [
    ["খুঁজে পাওয়া পেপার", bn(discovered.length)],
    ["সংগ্রহ করা পেপার", bn(imported.length)],
    ["মোট প্রশ্ন", bn(total ?? 0)],
    ["যাচাইকৃত প্রশ্ন", bn(verified ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">পূর্ববর্তী বছরের প্রশ্ন</h1>
        <p className="text-muted-foreground">সংখ্যাগুলো আসল রেকর্ড থেকে নেওয়া। খুঁজে পাওয়া মানে এখানে সংগ্রহ করা নয়।</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {imported.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="text-sm">
            এখনো কোনো আসল পেপার সংগ্রহ করা হয়নি। অনুমতি আছে এমন উৎস থেকে পেপার যুক্ত হলে এখানে দেখা যাবে।
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-2 font-semibold">সংগ্রহের অবস্থা</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">সাল</th>
                <th className="px-3 py-2">পরীক্ষা</th>
                <th className="px-3 py-2">খুঁজে পাওয়া</th>
                <th className="px-3 py-2">সংগ্রহ করা</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keys.map((key) => {
                const [type, year] = key.split("|");
                const found = discovered.filter((p) => p.exam_type === type && p.year_in_name === Number(year)).length;
                const have = imported.filter((p) => p.exam_type === type && p.year === Number(year)).length;
                return (
                  <tr key={key}>
                    <td className="px-3 py-2">
                      {have > 0 ? <Link className="text-primary hover:underline" href={`/previous-questions/${year}`}>{bn(year)}</Link> : bn(year)}
                    </td>
                    <td className="px-3 py-2">{EXAM_TYPE_LABELS[type] ?? type}</td>
                    <td className="px-3 py-2">{bn(found)}টি</td>
                    <td className="px-3 py-2">{bn(have)}টি</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
