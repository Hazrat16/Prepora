"use client";

import { useActionState, useState } from "react";
import { startPractice } from "@/app/actions/attempts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DIFFICULTY_LABELS, bn } from "@/lib/format";

type Topic = { id: string; name_bn: string; subject_id: string };
type Subject = { id: string; name_bn: string };

const selectClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

export function PracticeForm({
  subjects,
  topics,
  defaultTopic,
  defaultSource = "all",
}: {
  subjects: Subject[];
  topics: Topic[];
  defaultTopic?: Topic;
  defaultSource?: string;
}) {
  const [state, action, pending] = useActionState(startPractice, {});
  const [subjectId, setSubjectId] = useState(defaultTopic?.subject_id ?? "");
  const shown = topics.filter((t) => t.subject_id === subjectId);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="subject_id">বিষয়</Label>
        <select id="subject_id" name="subject_id" className={selectClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">সব বিষয়</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name_bn}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="topic_id">টপিক</Label>
        <select key={subjectId} id="topic_id" name="topic_id" className={selectClass} defaultValue={defaultTopic?.id ?? ""} disabled={!subjectId}>
          <option value="">সব টপিক</option>
          {shown.map((t) => <option key={t.id} value={t.id}>{t.name_bn}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="difficulty">কঠিনতা</Label>
        <select id="difficulty" name="difficulty" className={selectClass} defaultValue="">
          <option value="">সব</option>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="source">কোন প্রশ্ন</Label>
        <select id="source" name="source" className={selectClass} defaultValue={defaultSource}>
          <option value="all">সব প্রশ্ন</option>
          <option value="unanswered">যেগুলো এখনো দিইনি</option>
          <option value="incorrect">যেগুলো ভুল করেছি</option>
          <option value="bookmarked">বুকমার্ক করা</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="collection">প্রশ্নের ধরন</Label>
        <select id="collection" name="collection" className={selectClass} defaultValue="practice">
          <option value="practice">অনুশীলনের প্রশ্ন</option>
          <option value="previous_year">পূর্ববর্তী বছরের প্রশ্ন</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="count">প্রশ্নের সংখ্যা</Label>
        <select id="count" name="count" className={selectClass} defaultValue={defaultTopic ? "5" : "10"}>
          {[5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>{bn(n)}টি</option>)}
        </select>
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="sm:col-span-2">
        {pending ? "প্রস্তুত হচ্ছে..." : "অনুশীলন শুরু করুন"}
      </Button>
    </form>
  );
}
