import { GraduationCap } from "lucide-react";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold text-primary">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-5" />
      </span>
      Govt Job Preparation BD
    </Link>
  );
}
