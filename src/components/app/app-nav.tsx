"use client";

import { Archive, BookOpen, ClipboardCheck, Database, LayoutDashboard, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "ড্যাশবোর্ড", short: "হোম", icon: LayoutDashboard },
  { href: "/learn", label: "শিখুন", short: "শিখুন", icon: BookOpen },
  { href: "/practice", label: "অনুশীলন", short: "অনুশীলন", icon: Target },
  { href: "/question-bank", label: "প্রশ্ন ব্যাংক", short: "প্রশ্ন", icon: Database },
  { href: "/previous-questions", label: "পূর্ববর্তী বছরের প্রশ্ন", short: "বিগত", icon: Archive },
  { href: "/mock-exams", label: "মক পরীক্ষা", short: "মক", icon: ClipboardCheck },
  { href: "/profile", label: "প্রোফাইল", short: "প্রোফাইল", icon: UserRound },
];

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    return (
      <nav aria-label="প্রধান মেনু" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t bg-card md:hidden">
        {ITEMS.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              active(href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {short}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="প্রধান মেনু" className="space-y-1">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
            active(href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
