export type ScorableAnswer = {
  selectedOptionId: string | null;
  correctOptionId: string;
  marks: number;
  negativeMarks: number;
};

export type ScoreResult = {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maxScore: number;
};

// Rounds to 2 decimals so 0.1 + 0.2 style errors never reach a result.
const round = (value: number) => Math.round(value * 100) / 100;

export function scoreAnswers(answers: ScorableAnswer[]): ScoreResult {
  const result: ScoreResult = {
    total: answers.length,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    score: 0,
    maxScore: 0,
  };

  for (const answer of answers) {
    result.maxScore += answer.marks;
    if (answer.selectedOptionId === null) {
      result.unanswered++;
    } else if (answer.selectedOptionId === answer.correctOptionId) {
      result.correct++;
      result.score += answer.marks;
    } else {
      result.incorrect++;
      result.score -= answer.negativeMarks;
    }
  }

  return { ...result, score: round(result.score), maxScore: round(result.maxScore) };
}

export function accuracy(correct: number, attempted: number) {
  return attempted === 0 ? 0 : Math.round((correct / attempted) * 100);
}

// Fisher-Yates. `random` is injectable so tests stay deterministic.
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
