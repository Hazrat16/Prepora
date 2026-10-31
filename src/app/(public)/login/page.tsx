import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthCard } from "@/components/app/auth-card";
import { AuthForm } from "@/components/app/auth-form";

export default function LoginPage() {
  return (
    <AuthCard title="লগইন করুন" description="আপনার প্রস্তুতি যেখানে থেমেছিল, সেখান থেকে শুরু করুন।">
      <AuthForm
        action={login}
        submitLabel="লগইন"
        fields={[
          { name: "email", label: "ইমেইল", type: "email", autoComplete: "email" },
          { name: "password", label: "পাসওয়ার্ড", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link>
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">নতুন অ্যাকাউন্ট</Link>
      </div>
    </AuthCard>
  );
}
