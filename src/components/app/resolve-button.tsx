"use client";

import { Check, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { setMistakeResolved } from "@/app/actions/study";
import { Button } from "@/components/ui/button";

export function ResolveButton({ questionId, resolved }: { questionId: string; resolved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => setMistakeResolved(questionId, !resolved))}
    >
      {resolved ? <RotateCcw /> : <Check />}
      {resolved ? "আবার রাখুন" : "শিখে ফেলেছি"}
    </Button>
  );
}
