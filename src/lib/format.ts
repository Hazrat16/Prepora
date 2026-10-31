const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function bn(value: number | string) {
  return String(value).replace(/\d/g, (digit) => BN_DIGITS[Number(digit)]);
}

export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return bn(h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
}

export function formatMinutes(totalMinutes: number) {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${bn(minutes)} মিনিট`;
  const rest = minutes % 60;
  return `${bn(Math.floor(minutes / 60))} ঘণ্টা${rest ? ` ${bn(rest)} মিনিট` : ""}`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(iso));
}

// Study days follow Bangladesh time, whatever the machine's clock zone is.
export function dhakaDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(date));
}

export function currentStreak(activeDays: Iterable<string>, today: Date = new Date()) {
  const days = new Set(activeDays);
  const cursor = new Date(today);
  // A streak survives until the end of today, so start from yesterday if needed.
  if (!days.has(dhakaDay(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(dhakaDay(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export const DIFFICULTY_LABELS = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" } as const;
