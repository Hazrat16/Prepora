import { ArrowRight, BookOpen, ClipboardCheck, Flame, RotateCcw, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { bn, formatDate, formatMinutes } from "@/lib/format";
import { getDashboardStats, preparationLevel } from "@/lib/stats";
import { requireUser } from "@/lib/supabase/server";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [stats, { data: profile }] = await Promise.all([
    getDashboardStats(supabase),
    supabase.from("profiles").select("full_name, daily_question_target").eq("id", user.id).single(),
  ]);

  const isNew = stats.attempted === 0 && stats.lessonsCompleted === 0;
  const target = profile?.daily_question_target ?? 20;
  const maxWeek = Math.max(1, ...stats.week.map((d) => d.count));
  const next = stats.nextLesson;
  const nextHref = next
    ? `/learn/${next.topics.subjects.slug}/${next.topics.slug}`
    : "/learn";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">স্বাগতম, {profile?.full_name || "শিক্ষার্থী"}</h1>
        <p className="text-muted-foreground">
          বর্তমান অবস্থা: {preparationLevel(stats.attempted, stats.accuracy)}
          {stats.streak > 0 && ` · ${bn(stats.streak)} দিনের ধারাবাহিকতা`}
        </p>
      </div>

      {isNew && (
        <Card className="border-success/40 bg-success/5">
          <CardContent>
            <h2 className="font-semibold">কোথা থেকে শুরু করবেন?</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
              <li>একটি লেসন পড়ুন। পরিসংখ্যান ধীরে ধীরে এখানে জমা হবে।</li>
              <li>সেই টপিকের ৫টি প্রশ্নের ছোট টেস্ট দিন।</li>
              <li>প্রতিদিন অল্প হলেও পড়ুন। সপ্তাহ শেষে একটি মিনি মক দিন।</li>
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button asChild><Link href={nextHref}><BookOpen />শেখা চালিয়ে যান</Link></Button>
        <Button asChild variant="outline"><Link href="/practice"><Target />অনুশীলন</Link></Button>
        <Button asChild variant="outline"><Link href="/mock-exams"><ClipboardCheck />মক পরীক্ষা</Link></Button>
        <Button asChild variant="outline"><Link href="/mistakes"><RotateCcw />ভুলগুলো দেখুন{stats.dueReviews > 0 && ` (${bn(stats.dueReviews)})`}</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="মোট প্রশ্ন" value={bn(stats.attempted)} />
        <Stat label="সঠিক উত্তর" value={bn(stats.correct)} />
        <Stat label="ভুল উত্তর" value={bn(stats.incorrect)} />
        <Stat label="নির্ভুলতা" value={`${bn(stats.accuracy)}%`} />
        <Stat label="মোট পড়াশোনা" value={formatMinutes(stats.studyMinutes)} />
        <Stat label="সম্পন্ন লেসন" value={`${bn(stats.lessonsCompleted)}/${bn(stats.lessonsTotal)}`} />
        <Stat label="ধারাবাহিকতা" value={`${bn(stats.streak)} দিন`} />
        <Stat label="আজকের প্রশ্ন" value={`${bn(stats.answeredToday)}/${bn(target)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>আজকের লক্ষ্য</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Progress value={Math.min(100, (stats.answeredToday / target) * 100)} aria-label="আজকের লক্ষ্য" />
            {next ? (
              <Link href={nextHref} className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
                <span>
                  <span className="block text-muted-foreground">পরবর্তী লেসন</span>
                  <span className="font-medium">{next.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">সব লেসন সম্পন্ন। এখন অনুশীলনে মন দিন।</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="size-4 text-success" />এই সপ্তাহের প্রশ্ন</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-2">
              {stats.week.map((d) => (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs text-muted-foreground">{d.count > 0 ? bn(d.count) : ""}</span>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(d.count / maxWeek) * 75}%`, minHeight: 2 }} />
                  <span className="text-xs text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>বিষয়ভিত্তিক অবস্থা</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.subjectStats.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.attempted ? `${bn(s.accuracy)}% (${bn(s.attempted)}টি)` : "এখনো শুরু হয়নি"}
                  </span>
                </div>
                <Progress value={s.accuracy} className="mt-1" aria-label={s.name} />
              </div>
            ))}
            {stats.weakest && (
              <p className="pt-1 text-sm text-muted-foreground">
                সবচেয়ে দুর্বল: {stats.weakest.name}
                {stats.strongest && ` · সবচেয়ে ভালো: ${stats.strongest.name}`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>সাম্প্রতিক মক পরীক্ষা</CardTitle></CardHeader>
          <CardContent>
            {stats.recentMocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">এখনো কোনো মক দেননি। কয়েকটি লেসনের পরে মিনি মক দিয়ে দেখুন।</p>
            ) : (
              <ul className="divide-y">
                {stats.recentMocks.map((m) => (
                  <li key={m.id}>
                    <Link href={`/results/${m.id}`} className="flex justify-between gap-3 py-2 text-sm hover:underline">
                      <span>{m.title} · {formatDate(m.submitted_at)}</span>
                      <span className="font-medium">{bn(m.score)}/{bn(m.max_score)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
