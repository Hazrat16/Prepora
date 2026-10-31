"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/study";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ fullName, target }: { fullName: string; target: number }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">নাম</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="daily_question_target">প্রতিদিনের প্রশ্নের লক্ষ্য</Label>
        <Input id="daily_question_target" name="daily_question_target" type="number" min={1} max={500} defaultValue={target} required />
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-success">{state.message}</p>}
      <Button type="submit" disabled={pending}>সংরক্ষণ করুন</Button>
    </form>
  );
}
