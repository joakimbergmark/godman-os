export const LIFE_AREAS = [
  { value: "economy", label: "Ekonomi" },
  { value: "authorities", label: "Myndigheter" },
  { value: "health", label: "Hälsa" },
  { value: "transportation", label: "Transport" },
  { value: "housing", label: "Boende" },
  { value: "daily_activities", label: "Daglig verksamhet" },
  { value: "family_network", label: "Familj & Nätverk" },
  { value: "legal", label: "Juridik" },
  { value: "other", label: "Övrigt" },
] as const;

export const CASE_STATUS = [
  { value: "draft", label: "Utkast" },
  { value: "active", label: "Aktivt" },
  { value: "waiting", label: "Väntar" },
  { value: "completed", label: "Avslutat" },
  { value: "cancelled", label: "Avbrutet" },
] as const;

export const CASE_PRIORITY = [
  { value: "low", label: "Låg" },
  { value: "medium", label: "Medel" },
  { value: "high", label: "Hög" },
  { value: "critical", label: "Kritisk" },
] as const;

export const OPEN_STATUSES = ["draft", "active", "waiting"] as const;

export const lifeAreaLabel = (v?: string | null) =>
  LIFE_AREAS.find((x) => x.value === v)?.label ?? v ?? "—";
export const statusLabel = (v?: string | null) =>
  CASE_STATUS.find((x) => x.value === v)?.label ?? v ?? "—";
export const priorityLabel = (v?: string | null) =>
  CASE_PRIORITY.find((x) => x.value === v)?.label ?? v ?? "—";

export const priorityClass: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  critical: "bg-destructive/20 text-destructive border-destructive/40",
};

export const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-primary/15 text-primary border-primary/30",
  waiting: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
};
