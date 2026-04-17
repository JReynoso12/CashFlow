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

/**
 * Formats a raw amount string with thousand separators while preserving an
 * optional decimal portion (up to 2 places). Non-numeric characters besides
 * a single decimal point are stripped. Leading zeros are trimmed except
 * when the user is typing "0." for a sub-₱1 value.
 */
export function formatAmountInput(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  let intPart: string;
  let decPart: string | null;
  if (firstDot === -1) {
    intPart = cleaned;
    decPart = null;
  } else {
    intPart = cleaned.slice(0, firstDot);
    decPart = cleaned.slice(firstDot + 1).slice(0, 2);
  }

  const trimmedInt =
    intPart.length > 1 ? intPart.replace(/^0+/, "") || "0" : intPart;
  const withCommas = trimmedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart !== null) {
    return `${withCommas || "0"}.${decPart}`;
  }
  return withCommas;
}
