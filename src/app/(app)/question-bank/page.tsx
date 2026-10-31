import Link from "next/link";
import { BankQuestion, BookmarkButton } from "@/components/app/question-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { bn, DIFFICULTY_LABELS, VERIFICATION_LABELS } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

const PAGE_SIZE = 20;
const COLLECTION_LABELS = { practice: "অনুশীলন", model: "মডেল", previous_year: "পূর্ববর্তী বছর" };
const selectClass = "h-9 rounded-lg border bg-background px-2 text-sm";

type Filters = { q?: string; subject?: string; difficulty?: string; page?: string };

export default async function QuestionBankPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { supabase } = await requireUser();

  const { data: subjects } = await supabase.from("subjects").select("id, name_bn").order("position");

  let query = supabase
    .from("questions")
    .select("id, text, difficulty, collection, source_label, verification_status, question_options(id, position, text), topics!inner(name_bn, subject_id)", { count: "exact" })
    .order("external_id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  // Commas and brackets are PostgREST syntax, so they are removed from the search term.
  const search = params.q?.replace(/[%,()]/g, " ").trim();
  if (search) query = query.ilike("text", `%${search}%`);
  if (params.subject) query = query.eq("topics.subject_id", params.subject);
  if (params.difficulty === "easy" || params.difficulty === "medium" || params.difficulty === "hard") {
    query = query.eq("difficulty", params.difficulty);
  }
  const { data, count } = await query;
  const questions = (data ?? []) as unknown as {
    id: string;
    text: string;
    difficulty: keyof typeof DIFFICULTY_LABELS;
    collection: keyof typeof COLLECTION_LABELS;
    verification_status: keyof typeof VERIFICATION_LABELS | null;
    source_label: string;
    question_options: { id: string; position: number; text: string }[];
    topics: { name_bn: string };
  }[];

  const { data: bookmarks } = await supabase.from("bookmarks").select("question_id");
  const saved = new Set(bookmarks?.map((b) => b.question_id));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.subject) next.set("subject", params.subject);
    if (params.difficulty) next.set("difficulty", params.difficulty);
    next.set("page", String(target));
    return `/question-bank?${next}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">প্রশ্ন ব্যাংক</h1>
        <p className="text-muted-foreground">{bn(count ?? 0)}টি প্রশ্ন পাওয়া গেছে</p>
      </div>
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={params.q} placeholder="প্রশ্ন খুঁজুন" aria-label="প্রশ্ন খুঁজুন" className="h-9 min-w-48 flex-1" />
        <select name="subject" defaultValue={params.subject ?? ""} aria-label="বিষয়" className={selectClass}>
          <option value="">সব বিষয়</option>
          {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name_bn}</option>)}
        </select>
        <select name="difficulty" defaultValue={params.difficulty ?? ""} aria-label="কঠিনতা" className={selectClass}>
          <option value="">সব মান</option>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button type="submit" size="sm" className="h-9">খুঁজুন</Button>
      </form>

      {questions.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">এই ফিল্টারে কোনো প্রশ্ন নেই। ফিল্টার বদলে দেখুন।</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} size="sm">
              <CardContent>
                <div className="flex items-start gap-2">
                  <p className="flex-1 font-medium">{q.text}</p>
                  <BookmarkButton questionId={q.id} bookmarked={saved.has(q.id)} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{q.topics.name_bn}</Badge>
                  <Badge variant="outline">{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                  <Badge variant="outline">{COLLECTION_LABELS[q.collection]}</Badge>
                  {q.verification_status && <Badge variant="outline">{VERIFICATION_LABELS[q.verification_status]}</Badge>}
                </div>
                <BankQuestion id={q.id} options={[...q.question_options].sort((a, b) => a.position - b.position)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Button asChild variant="outline" size="sm"><Link href={pageHref(page - 1)}>আগের</Link></Button>}
          <span>{bn(page)}/{bn(totalPages)}</span>
          {page < totalPages && <Button asChild variant="outline" size="sm"><Link href={pageHref(page + 1)}>পরের</Link></Button>}
        </div>
      )}
    </div>
  );
}
