import { describe, expect, it } from "vitest";
import { nextRevision } from "@/lib/revision";

const now = new Date("2026-01-01T00:00:00Z");
const daysLater = (date: Date) => (date.getTime() - now.getTime()) / 86_400_000;

describe("nextRevision", () => {
  it("schedules 1, 3, 7 and 14 days as answers stay right", () => {
    expect(daysLater(nextRevision(0, true, now).nextReviewAt)).toBe(3);
    expect(daysLater(nextRevision(1, true, now).nextReviewAt)).toBe(7);
    expect(daysLater(nextRevision(2, true, now).nextReviewAt)).toBe(14);
  });

  it("restarts after a wrong answer", () => {
    const state = nextRevision(3, false, now);
    expect(state.intervalStep).toBe(0);
    expect(daysLater(state.nextReviewAt)).toBe(1);
    expect(state.resolved).toBe(false);
  });

  it("resolves after the last gap is passed", () => {
    expect(nextRevision(3, true, now).resolved).toBe(true);
  });
});
