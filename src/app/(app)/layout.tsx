import { Suspense } from "react";
import { AppNav } from "@/components/app/app-nav";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:grid md:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card p-4 md:flex">
        <div className="text-sm"><Brand href="/dashboard" /></div>
        <Suspense><AppNav variant="sidebar" /></Suspense>
        <div className="mt-auto"><ThemeToggle /></div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b bg-card px-4 py-2 text-sm md:hidden">
          <Brand href="/dashboard" />
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:px-8 md:pb-10">{children}</main>
      </div>
      <Suspense><AppNav variant="bottom" /></Suspense>
    </div>
  );
}
