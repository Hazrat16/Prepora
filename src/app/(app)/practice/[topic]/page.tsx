import { PracticeSetup } from "@/components/app/practice-setup";

export default async function TopicPracticePage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return <PracticeSetup topicId={topic} />;
}
