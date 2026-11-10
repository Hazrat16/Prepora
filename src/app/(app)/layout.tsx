import { Suspense } from "react";
import { AppNav } from "@/components/app/app-nav";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r bg-sidebar px-4 py-6 md:flex">
        <div className="text-sm"><Brand href="/dashboard" /></div>
        <Suspense><AppNav variant="sidebar" /></Suspense>
        <div className="mt-auto"><ThemeToggle /></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/90 px-4 py-2 text-sm backdrop-blur md:hidden">
          <Brand href="/dashboard" />
          <ThemeToggle />
        </header>
        {/* One comfortable reading column (about 65 Bangla characters a line) on every page. */}
        <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:px-8 md:py-12 md:pb-16">{children}</main>
      </div>
      <Suspense><AppNav variant="bottom" /></Suspense>
    </div>
  );
}
