// Nested select that brings each question's past papers along with it.
export const PAPER_SELECT = "examination_paper_questions(examination_papers(short_label, title))";

type PaperLinks = {
  examination_paper_questions?: { examination_papers: { short_label: string; title: string } | null }[];
};

// One label per paper, e.g. ["BCS-41", "NTRCA-17 School"]. Falls back to the
// paper title when no short label has been set.
export function paperLabels(question: PaperLinks) {
  const labels = (question.examination_paper_questions ?? [])
    .map((link) => link.examination_papers)
    .filter((paper) => paper !== null)
    .map((paper) => paper.short_label || paper.title);
  return [...new Set(labels)].sort();
}
