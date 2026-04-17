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
