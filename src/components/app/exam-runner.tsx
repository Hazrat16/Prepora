"use client";

import { ChevronLeft, ChevronRight, Flag, Maximize, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { finishAttempt, saveAnswer } from "@/app/actions/attempts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PaperBadges } from "@/components/app/paper-badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { bn, formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  section: string;
  text: string;
  papers: string[];
  selected: string | null;
  marked: boolean;
  options: { id: string; position: number; text: string }[];
};

const OPTION_LABELS = ["ক", "খ", "গ", "ঘ"];

export function ExamRunner({
  attemptId,
  title,
  isMock,
  secondsLeft,
  questions: initial,
}: {
  attemptId: string;
  title: string;
  isMock: boolean;
  secondsLeft: number | null;
  questions: Question[];
}) {
  const [questions, setQuestions] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(0, initial.findIndex((q) => !q.selected)));
  const [saveFailed, setSaveFailed] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const pendingSaves = useRef(new Set<Promise<unknown>>());
  const submitted = useRef(false);

  // Measured from a fixed end point, so a slow tab cannot stretch the exam.
  const [endsAt] = useState(() => (secondsLeft === null ? null : Date.now() + secondsLeft * 1000));
  const [remaining, setRemaining] = useState(secondsLeft);

  const submit = useCallback(
    (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      startSubmit(async () => {
        await Promise.allSettled(pendingSaves.current);
        await finishAttempt(attemptId, auto);
      });
    },
    [attemptId],
  );

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        submit(true);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [endsAt, submit]);

  const persist = (input: { questionId: string; selectedOptionId?: string | null; markedForReview?: boolean }) => {
    const save = saveAnswer({ attemptId, ...input })
      .then((result) => {
        setSaveFailed(false);
        if (result.status === "closed") submit(true);
      })
      .catch(() => setSaveFailed(true))
      .finally(() => pendingSaves.current.delete(save));
    pendingSaves.current.add(save);
  };

  const question = questions[index];
  const answered = questions.filter((q) => q.selected).length;
  const unanswered = questions.length - answered;

  const update = (patch: Partial<Question>) =>
    setQuestions((all) => all.map((q) => (q.id === question.id ? { ...q, ...patch } : q)));

  const choose = (optionId: string) => {
    const next = question.selected === optionId ? null : optionId;
    update({ selected: next });
    persist({ questionId: question.id, selectedOptionId: next });
  };

  const toggleMark = () => {
    update({ marked: !question.marked });
    persist({ questionId: question.id, markedForReview: !question.marked });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{bn(answered)}/{bn(questions.length)} উত্তর দেওয়া হয়েছে</p>
          </div>
          <div className="flex items-center gap-2">
            {remaining !== null && (
              <span
                role="timer"
                className={cn(
                  "flex items-center gap-1 rounded-lg bg-muted px-3 py-1 font-semibold tabular-nums",
                  remaining <= 300 && "bg-destructive/10 text-destructive",
                )}
              >
                <Timer className="size-4" />
                {formatClock(remaining)}
              </span>
            )}
            {isMock && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="পূর্ণ পর্দা"
                onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
              >
                <Maximize className="size-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={submitting}>{submitting ? "জমা হচ্ছে..." : "জমা দিন"}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>পরীক্ষা জমা দেবেন?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {unanswered > 0
                      ? `${bn(unanswered)}টি প্রশ্নের উত্তর দেওয়া হয়নি। জমা দেওয়ার পরে আর বদলানো যাবে না।`
                      : "সব প্রশ্নের উত্তর দেওয়া হয়েছে। জমা দেওয়ার পরে আর বদলানো যাবে না।"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ফিরে যান</AlertDialogCancel>
                  <AlertDialogAction onClick={() => submit(false)}>জমা দিন</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <Progress className="mx-auto mt-2 h-1 max-w-6xl" value={(answered / questions.length) * 100} aria-label="অগ্রগতি" />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 lg:grid-cols-[1fr_280px]">
        <main>
          {saveFailed && (
            <p role="alert" className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              উত্তর সংরক্ষণ করা যায়নি। সংযোগ দেখে উত্তরটি আবার দিন।
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            প্রশ্ন {bn(index + 1)}/{bn(questions.length)}
            {question.section && ` · ${question.section}`}
          </p>
          <h1 className="mt-2 text-lg font-medium">{question.text}</h1>
          {question.papers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5"><PaperBadges labels={question.papers} /></div>
          )}
          <div role="radiogroup" className="mt-4 space-y-2">
            {question.options.map((option, i) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={question.selected === option.id}
                onClick={() => choose(option.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary",
                  question.selected === option.id && "border-primary bg-primary/10",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                  {OPTION_LABELS[i]}
                </span>
                {option.text}
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              <ChevronLeft />আগের
            </Button>
            <Button variant={question.marked ? "secondary" : "ghost"} onClick={toggleMark}>
              <Flag />{question.marked ? "রিভিউ চিহ্ন আছে" : "রিভিউয়ের জন্য রাখুন"}
            </Button>
            <Button variant="outline" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>
              পরের<ChevronRight />
            </Button>
          </div>
        </main>

        <aside aria-label="প্রশ্ন প্যালেট" className="rounded-xl border bg-card p-3 lg:sticky lg:top-24 lg:self-start">
          <div className="grid max-h-72 grid-cols-8 gap-1.5 overflow-y-auto lg:grid-cols-6">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                aria-label={`প্রশ্ন ${bn(i + 1)}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "aspect-square rounded-md border text-xs font-medium",
                  q.selected && "border-success bg-success text-success-foreground",
                  q.marked && "ring-2 ring-amber-500",
                  i === index && "outline-2 outline-offset-1 outline-primary",
                )}
              >
                {bn(i + 1)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><i className="size-3 rounded-sm bg-success" />উত্তর দেওয়া</span>
            <span className="flex items-center gap-1"><i className="size-3 rounded-sm ring-2 ring-amber-500" />রিভিউ</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
