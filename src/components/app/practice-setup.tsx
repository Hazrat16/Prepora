import { PracticeForm } from "@/components/app/practice-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";

export async function PracticeSetup({ topicId, source }: { topicId?: string; source?: string }) {
  const { supabase } = await requireUser();
  const [{ data: subjects }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("id, name_bn").order("position"),
    supabase.from("topics").select("id, name_bn, subject_id").order("position"),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">অনুশীলন</h1>
        <p className="text-muted-foreground">জমা দেওয়ার পরে প্রতিটি উত্তরের ব্যাখ্যা দেখতে পাবেন।</p>
      </div>
      <Card>
        <CardContent>
          <PracticeForm
            subjects={subjects ?? []}
            topics={topics ?? []}
            defaultTopic={topics?.find((t) => t.id === topicId)}
            defaultSource={source}
          />
        </CardContent>
      </Card>
    </div>
  );
}
