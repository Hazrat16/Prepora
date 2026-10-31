"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/app/actions/auth";

type Field = { name: string; label: string; type: string; autoComplete?: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input id={field.name} required {...field} />
        </div>
      ))}
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-success">{state.message}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "অপেক্ষা করুন..." : submitLabel}
      </Button>
    </form>
  );
}
