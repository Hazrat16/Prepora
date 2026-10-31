import { forgotPassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/app/auth-card";
import { AuthForm } from "@/components/app/auth-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="পাসওয়ার্ড ভুলে গেছেন?" description="ইমেইল দিন, নতুন পাসওয়ার্ড সেট করার লিংক পাবেন।">
      <AuthForm
        action={forgotPassword}
        submitLabel="লিংক পাঠান"
        fields={[{ name: "email", label: "ইমেইল", type: "email", autoComplete: "email" }]}
      />
    </AuthCard>
  );
}
