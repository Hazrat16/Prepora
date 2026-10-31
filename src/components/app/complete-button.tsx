"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { setLessonComplete } from "@/app/actions/study";
import { Button } from "@/components/ui/button";

export function CompleteButton({ lessonId, completed, path }: { lessonId: string; completed: boolean; path: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      variant={completed ? "outline" : "default"}
      onClick={() => start(() => setLessonComplete(lessonId, !completed, path))}
    >
      <Check />
      {completed ? "সম্পন্ন হয়েছে (বাতিল করুন)" : "লেসন সম্পন্ন করুন"}
    </Button>
  );
}
