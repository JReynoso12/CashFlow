export function formatPhp(cents: number): string {
  const n = cents / 100;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function parsePhpToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
