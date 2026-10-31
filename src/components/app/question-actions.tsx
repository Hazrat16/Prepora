"use client";

import { Bookmark, Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { reportQuestion, revealAnswer, toggleBookmark } from "@/app/actions/study";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function BookmarkButton({ questionId, bookmarked }: { questionId: string; bookmarked: boolean }) {
  const [saved, setSaved] = useState(bookmarked);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-pressed={saved}
      aria-label="বুকমার্ক"
      onClick={() => start(async () => setSaved(await toggleBookmark(questionId, saved)))}
    >
      <Bookmark className={cn("size-4", saved && "fill-current text-primary")} />
    </Button>
  );
}

type Option = { id: string; position: number; text: string };

export function BankQuestion({
  id,
  options,
}: {
  id: string;
  options: Option[];
}) {
  const [correctId, setCorrectId] = useState<string>();
  const [explanation, setExplanation] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const reveal = () =>
    start(async () => {
      const result = await revealAnswer(id);
      if (result.blocked) setNotice("এই প্রশ্নটি চলমান মক পরীক্ষায় আছে, তাই উত্তর এখন দেখানো যাবে না।");
      else {
        setCorrectId(result.correctOptionId);
        setExplanation(result.explanation);
      }
    });

  const report = () =>
    start(async () => {
      const result = await reportQuestion(id, message);
      setNotice(result.error ?? "রিপোর্ট পাঠানো হয়েছে। ধন্যবাদ।");
      if (!result.error) setReporting(false);
    });

  return (
    <div className="mt-2 text-sm">
      <ul className="grid gap-1 sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.id} className={cn("rounded-md px-2 py-1", o.id === correctId ? "bg-success/15 font-medium" : "bg-muted/60")}>{o.text}</li>
        ))}
      </ul>
      {explanation && <p className="mt-2 rounded-md bg-muted p-2">{explanation}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {!correctId && <Button size="sm" variant="outline" disabled={pending} onClick={reveal}>উত্তর দেখুন</Button>}
        <Button size="sm" variant="ghost" onClick={() => setReporting(!reporting)}><Flag />ভুল জানান</Button>
      </div>
      {reporting && (
        <div className="mt-2 space-y-2">
          <Textarea aria-label="সমস্যার বিবরণ" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="প্রশ্ন বা উত্তরে কী ভুল আছে?" />
          <Button size="sm" disabled={pending} onClick={report}>পাঠান</Button>
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-muted-foreground">{notice}</p>}
    </div>
  );
}
