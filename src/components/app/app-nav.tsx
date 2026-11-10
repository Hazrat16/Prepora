"use client";

import { Archive, BookOpen, BookX, ClipboardCheck, Database, LayoutDashboard, Target, UserRound } from "lucide-react";
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
  { href: "/mistakes", label: "আমার ভুলগুলো", short: "ভুল", icon: BookX },
  { href: "/profile", label: "প্রোফাইল", short: "প্রোফাইল", icon: UserRound },
];

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    return (
      <nav aria-label="প্রধান মেনু" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-8 border-t bg-background/95 backdrop-blur md:hidden">
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
            "flex items-center gap-3 rounded-md px-3 py-1.5 text-[0.95rem] transition-colors",
            active(href)
              ? "bg-muted font-semibold text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <Icon className={cn("size-4", active(href) && "text-primary")} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
