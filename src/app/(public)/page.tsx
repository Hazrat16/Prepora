import { BookOpen, ClipboardCheck, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { icon: BookOpen, title: "শূন্য থেকে শেখা", text: "সহজ বাংলায় ধাপে ধাপে লেসন, উদাহরণ ও পরীক্ষার নোট।" },
  { icon: Target, title: "বিষয়ভিত্তিক অনুশীলন", text: "প্রতিটি উত্তরের পরে বাংলায় বিস্তারিত ব্যাখ্যা।" },
  { icon: ClipboardCheck, title: "আসল পরীক্ষার মতো মক", text: "টাইমার, প্রশ্ন প্যালেট, স্বয়ংক্রিয় জমা ও ফলাফল বিশ্লেষণ।" },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold leading-tight text-primary md:text-5xl md:leading-tight">
          প্রাথমিক সহকারী শিক্ষক নিয়োগ পরীক্ষার প্রস্তুতি শুরু করুন একদম শূন্য থেকে
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          শেখা, অনুশীলন ও মক পরীক্ষা, সবকিছু এক জায়গায়। আপনার অগ্রগতি প্রতিদিন মাপা হবে আসল তথ্য দিয়ে।
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link href="/register">প্রস্তুতি শুরু করুন</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/about">বিস্তারিত জানুন</Link></Button>
        </div>
      </section>
      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardContent>
              <Icon className="size-6 text-success" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
