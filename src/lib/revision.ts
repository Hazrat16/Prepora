export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14];

const DAY_MS = 86_400_000;

export type RevisionState = {
  intervalStep: number;
  nextReviewAt: Date;
  resolved: boolean;
};

// A wrong answer restarts the schedule. A right answer moves to the next gap,
// and passing the last gap means the question is remembered.
export function nextRevision(step: number, correct: boolean, now: Date = new Date()): RevisionState {
  const nextStep = correct ? step + 1 : 0;
  const resolved = nextStep >= REVIEW_INTERVAL_DAYS.length;
  const days = REVIEW_INTERVAL_DAYS[Math.min(nextStep, REVIEW_INTERVAL_DAYS.length - 1)];
  return {
    intervalStep: nextStep,
    nextReviewAt: new Date(now.getTime() + days * DAY_MS),
    resolved,
  };
}
