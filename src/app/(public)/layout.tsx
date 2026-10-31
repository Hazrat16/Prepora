import Link from "next/link";
import { Brand } from "@/components/app/brand";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-4">
        <Brand />
        <Button asChild size="sm" variant="outline"><Link href="/login">লগইন</Link></Button>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
