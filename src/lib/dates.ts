export function startOfMonth(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0, 1);
}

export function endOfMonth(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0 + 1, 0);
}

export function monthLabel(year: number, monthIndex0: number): string {
  return new Date(year, monthIndex0, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function shortDate(d: string | Date): string {
  const dt = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Validates `YYYY-MM-DD` for Postgres `date` columns (rejects empty or invalid calendar dates). */
export function isValidIsoDateOnly(s: string): boolean {
  if (!ISO_DATE_ONLY.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
