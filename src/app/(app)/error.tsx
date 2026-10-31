"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="mt-2 text-muted-foreground">ডেটা আনা যায়নি। Docker ও Supabase চালু আছে কি না দেখে আবার চেষ্টা করুন।</p>
      <Button className="mt-4" onClick={reset}>আবার চেষ্টা করুন</Button>
    </div>
  );
}
