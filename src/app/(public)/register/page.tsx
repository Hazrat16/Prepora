import Link from "next/link";
import { register } from "@/app/actions/auth";
import { AuthCard } from "@/components/app/auth-card";
import { AuthForm } from "@/components/app/auth-form";

export default function RegisterPage() {
  return (
    <AuthCard title="অ্যাকাউন্ট তৈরি করুন" description="আপনার তথ্য শুধু এই কম্পিউটারেই থাকবে।">
      <AuthForm
        action={register}
        submitLabel="অ্যাকাউন্ট তৈরি করুন"
        fields={[
          { name: "full_name", label: "আপনার নাম", type: "text", autoComplete: "name" },
          { name: "email", label: "ইমেইল", type: "email", autoComplete: "email" },
          { name: "password", label: "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-4 text-sm">
        আগেই অ্যাকাউন্ট আছে? <Link href="/login" className="text-primary underline-offset-4 hover:underline">লগইন করুন</Link>
      </p>
    </AuthCard>
  );
}
