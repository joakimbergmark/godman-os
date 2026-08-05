export type ExistingTx = {
  transaction_date: string;
  type: string;
  amount: number | string;
  comment?: string | null;
};

export type CandidateTx = {
  date: string;
  bookingDate?: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
};

export const DAY_TOLERANCE = 4;

export function normalizeText(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9åäöéü]/g, "");
}

export function cents(v: number | string): number {
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) : NaN;
}

function daysApart(a: string, b: string): number {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return Infinity;
  return Math.abs(da - db) / 86400000;
}

function textMatches(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
}

/**
 * True when `candidate` already exists among `existing`.
 * Match requires same amount (in cents) and same type, plus either
 * an exact date match or a near date match with matching text.
 */
export function isDuplicate(candidate: CandidateTx, existing: ExistingTx[]): boolean {
  const c = cents(candidate.amount);
  if (!Number.isFinite(c)) return false;
  const dates = [candidate.date, candidate.bookingDate].filter(Boolean) as string[];

  return existing.some((e) => {
    if (e.type !== candidate.type) return false;
    if (cents(e.amount) !== c) return false;
    if (dates.some((d) => d === e.transaction_date)) return true;
    const near = dates.some((d) => daysApart(d, e.transaction_date) <= DAY_TOLERANCE);
    return near && textMatches(candidate.description, e.comment ?? "");
  });
}

export function shiftDate(iso: string, days: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}
