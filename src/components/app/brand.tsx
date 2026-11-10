import { GraduationCap } from "lucide-react";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold text-foreground">
      <GraduationCap className="size-5 text-primary" />
      Govt Job Preparation BD
    </Link>
  );
}
