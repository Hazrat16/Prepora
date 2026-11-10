import { Badge } from "@/components/ui/badge";

// Shows which past exams asked this question, e.g. "BCS-41".
export function PaperBadges({ labels }: { labels: string[] }) {
  return labels.map((label) => (
    <Badge key={label} className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
      {label}
    </Badge>
  ));
}
