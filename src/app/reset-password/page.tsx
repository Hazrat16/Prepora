import { resetPassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/app/auth-card";
import { AuthForm } from "@/components/app/auth-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard title="নতুন পাসওয়ার্ড" description="কমপক্ষে ৮ অক্ষরের একটি পাসওয়ার্ড দিন।">
      <AuthForm
        action={resetPassword}
        submitLabel="পাসওয়ার্ড সংরক্ষণ করুন"
        fields={[{ name: "password", label: "নতুন পাসওয়ার্ড", type: "password", autoComplete: "new-password" }]}
      />
    </AuthCard>
  );
}
