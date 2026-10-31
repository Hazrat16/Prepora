import { describe, expect, it } from "vitest";
import { accuracy, scoreAnswers, shuffle } from "@/lib/scoring";
import { bn, currentStreak, dhakaDay, formatClock } from "@/lib/format";

const q = (selected: string | null, negativeMarks = 0, marks = 1) => ({
  selectedOptionId: selected,
  correctOptionId: "right",
  marks,
  negativeMarks,
});

describe("scoreAnswers", () => {
  it("counts correct, incorrect and unanswered", () => {
    expect(scoreAnswers([q("right"), q("wrong"), q(null)])).toEqual({
      total: 3,
      correct: 1,
      incorrect: 1,
      unanswered: 1,
      score: 1,
      maxScore: 3,
    });
  });

  it("applies negative marks only to wrong answers", () => {
    expect(scoreAnswers([q("right", 0.25), q("wrong", 0.25), q(null, 0.25)]).score).toBe(0.75);
  });

  it("can go below zero", () => {
    expect(scoreAnswers([q("wrong", 0.25), q("wrong", 0.25)]).score).toBe(-0.5);
  });

  it("does not drift with decimal marks", () => {
    expect(scoreAnswers([q("right", 0, 0.1), q("right", 0, 0.2)]).score).toBe(0.3);
  });

  it("handles an empty attempt", () => {
    expect(scoreAnswers([]).maxScore).toBe(0);
  });
});

describe("helpers", () => {
  it("calculates accuracy without dividing by zero", () => {
    expect(accuracy(0, 0)).toBe(0);
    expect(accuracy(2, 3)).toBe(67);
  });

  it("shuffle keeps every item", () => {
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });

  it("writes Bangla digits and clocks", () => {
    expect(bn(120)).toBe("১২০");
    expect(formatClock(5400)).toBe("১:৩০:০০");
    expect(formatClock(-5)).toBe("০০:০০");
  });

  it("uses Dhaka time for study days", () => {
    expect(dhakaDay("2026-01-01T19:00:00Z")).toBe("2026-01-02");
  });

  it("counts a streak ending today or yesterday", () => {
    const today = new Date("2026-03-10T06:00:00Z");
    expect(currentStreak(["2026-03-10", "2026-03-09", "2026-03-07"], today)).toBe(2);
    expect(currentStreak(["2026-03-09", "2026-03-08"], today)).toBe(2);
    expect(currentStreak(["2026-03-07"], today)).toBe(0);
  });
});
