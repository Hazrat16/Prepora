import { PracticeSetup } from "@/components/app/practice-setup";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  return <PracticeSetup source={source} />;
}
