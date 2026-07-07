export const OBLIGATION_TYPES = [
  { value: "authority_decision", label: "Myndighetsbeslut" },
  { value: "permit", label: "Tillstånd" },
  { value: "benefit", label: "Bidrag/Förmån" },
  { value: "court_decision", label: "Domstolsbeslut" },
  { value: "healthcare", label: "Hälso- & sjukvård" },
  { value: "housing", label: "Boende" },
  { value: "insurance", label: "Försäkring" },
  { value: "other", label: "Övrigt" },
] as const;

export const OBLIGATION_STATUS = [
  { value: "active", label: "Aktivt" },
  { value: "pending_renewal", label: "Väntar förnyelse" },
  { value: "expired", label: "Utgånget" },
  { value: "completed", label: "Avslutat" },
  { value: "cancelled", label: "Avbrutet" },
] as const;

export const obligationTypeLabel = (v?: string | null) =>
  OBLIGATION_TYPES.find((x) => x.value === v)?.label ?? v ?? "—";
export const obligationStatusLabel = (v?: string | null) =>
  OBLIGATION_STATUS.find((x) => x.value === v)?.label ?? v ?? "—";

const DAY = 24 * 60 * 60 * 1000;

/** Returnerar antal dagar kvar till datumet (positivt = i framtiden). */
export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((target - today) / DAY);
}

export type ExpiryTier = "green" | "yellow" | "red" | "grey";

export function expiryTier(date?: string | null, status?: string | null): ExpiryTier {
  if (status === "expired" || status === "cancelled" || status === "completed") return "grey";
  const d = daysUntil(date);
  if (d === null) return "grey";
  if (d < 0) return "grey";
  if (d < 30) return "red";
  if (d <= 90) return "yellow";
  return "green";
}

export const expiryTierClass: Record<ExpiryTier, string> = {
  green: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  red: "bg-destructive/20 text-destructive border-destructive/40",
  grey: "bg-muted text-muted-foreground border-border",
};

export const expiryTierLabel = (t: ExpiryTier, days: number | null) => {
  if (t === "grey") return days !== null && days < 0 ? "Utgånget" : "Inget datum";
  if (days === null) return "—";
  if (days === 0) return "Idag";
  if (days === 1) return "1 dag kvar";
  return `${days} dagar kvar`;
};
