import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, AlertTriangle, Clock, Layers, ShieldCheck } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";
import {
  OPEN_STATUSES, LIFE_AREAS, lifeAreaLabel, statusLabel, priorityLabel,
  priorityClass, statusClass,
} from "@/lib/cases";
import { expiryTier, expiryTierClass, expiryTierLabel, daysUntil, obligationTypeLabel } from "@/lib/obligations";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");
const DAY = 24 * 60 * 60 * 1000;

function Dashboard() {
  const { selectedId: yearId } = useAccountingYear();

  const { data: principal } = useQuery({
    queryKey: ["dash-principal"],
    queryFn: async () => (await supabase.from("principal").select("full_name").limit(1).maybeSingle()).data,
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["dash-cases", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("accounting_year_id", yearId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: lastActivity = {} } = useQuery({
    queryKey: ["dash-last-activity", cases.map((c) => c.id).join(",")],
    enabled: cases.length > 0,
    queryFn: async () => {
      const caseIds = cases.map((c) => c.id);
      const [act, tsk, doc, tx, dec] = await Promise.all([
        supabase.from("activities").select("case_id,activity_date").in("case_id", caseIds),
        supabase.from("tasks").select("case_id,updated_at").in("case_id", caseIds),
        supabase.from("documents").select("case_id,created_at").in("case_id", caseIds),
        supabase.from("transactions").select("case_id,transaction_date").in("case_id", caseIds),
        supabase.from("case_decisions").select("case_id,decision_date").in("case_id", caseIds),
      ]);
      const map: Record<string, string> = {};
      const bump = (id: string | null, d: string | null) => {
        if (!id || !d) return;
        if (!map[id] || map[id] < d) map[id] = d;
      };
      (act.data ?? []).forEach((r) => bump(r.case_id, r.activity_date));
      (tsk.data ?? []).forEach((r) => bump(r.case_id, r.updated_at));
      (doc.data ?? []).forEach((r) => bump(r.case_id, r.created_at));
      (tx.data ?? []).forEach((r) => bump(r.case_id, r.transaction_date));
      (dec.data ?? []).forEach((r) => bump(r.case_id, r.decision_date));
      return map;
    },
  });

  const { data: obligations = [] } = useQuery({
    queryKey: ["dash-obligations", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase.from("obligations").select("*").eq("accounting_year_id", yearId!);
      if (error) throw error;
      return data;
    },
  });

  const now = Date.now();
  const openCases = useMemo(() => cases.filter((c) => OPEN_STATUSES.includes(c.status as never)), [cases]);
  const staleCases = useMemo(() => openCases.filter((c) => {
    const last = (lastActivity as Record<string, string>)[c.id] ?? c.created_at;
    return now - new Date(last).getTime() > 30 * DAY;
  }), [openCases, lastActivity, now]);
  const dueSoon = useMemo(() => openCases.filter((c) => {
    if (!c.due_date) return false;
    const d = new Date(c.due_date).getTime();
    return d >= now - DAY && d - now <= 30 * DAY;
  }).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)), [openCases, now]);
  const byLifeArea = useMemo(() => {
    const m: Record<string, number> = {};
    openCases.forEach((c) => { m[c.life_area] = (m[c.life_area] ?? 0) + 1; });
    return LIFE_AREAS.map((l) => ({ ...l, count: m[l.value] ?? 0 })).filter((l) => l.count > 0);
  }, [openCases]);

  const expiring = useMemo(() => {
    const rows = obligations
      .map((o) => {
        const ref = o.renewal_date ?? o.valid_until;
        return { o, days: daysUntil(ref), tier: expiryTier(ref, o.status) };
      })
      .filter((r) => r.days !== null && r.days >= 0 && r.days <= 90 && r.o.status !== "expired" && r.o.status !== "cancelled" && r.o.status !== "completed")
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
    return {
      d30: rows.filter((r) => (r.days ?? 0) < 30),
      d60: rows.filter((r) => (r.days ?? 0) >= 30 && (r.days ?? 0) < 60),
      d90: rows.filter((r) => (r.days ?? 0) >= 60 && (r.days ?? 0) <= 90),
      all: rows,
    };
  }, [obligations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Översikt</h1>
        <p className="text-sm text-muted-foreground">
          {principal?.full_name ? `Huvudman: ${principal.full_name}` : "Sammanfattning av ditt uppdrag"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Aktiva ärenden" value={openCases.length} icon={<Briefcase className="h-4 w-4" />} to="/cases" />
        <StatCard title="Utan aktivitet 30 dgr" value={staleCases.length} icon={<AlertTriangle className="h-4 w-4" />} to="/cases" />
        <StatCard title="Deadline inom 30 dgr" value={dueSoon.length} icon={<Clock className="h-4 w-4" />} to="/cases" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Åtaganden som löper ut</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <ExpiryBucket label="Inom 30 dagar" tone="red" count={expiring.d30.length} />
            <ExpiryBucket label="Inom 60 dagar" tone="yellow" count={expiring.d60.length} />
            <ExpiryBucket label="Inom 90 dagar" tone="green" count={expiring.d90.length} />
          </div>
          {expiring.all.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga åtaganden med förnyelse inom 90 dagar.</p>
          ) : (
            <div className="space-y-2">
              {expiring.all.slice(0, 8).map(({ o, days, tier }) => (
                <Link key={o.id} to="/obligations/$obligationId" params={{ obligationId: o.id }} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{obligationTypeLabel(o.obligation_type)}</div>
                  </div>
                  <Badge variant="outline" className={expiryTierClass[tier]}>{expiryTierLabel(tier, days)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Deadline kommande 30 dagar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {dueSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga deadlines.</p>
            ) : dueSoon.slice(0, 8).map((c) => (
              <Link key={c.id} to="/cases/$caseId" params={{ caseId: c.id }} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.title}</div>
                  <div className="flex gap-1 mt-0.5">
                    <Badge variant="outline" className={statusClass[c.status] ?? ""}>{statusLabel(c.status)}</Badge>
                    <Badge variant="outline" className={priorityClass[c.priority] ?? ""}>{priorityLabel(c.priority)}</Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{fmt(c.due_date)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Ärenden utan aktivitet 30 dgr</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {staleCases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Alla aktiva ärenden har rörelse.</p>
            ) : staleCases.slice(0, 8).map((c) => (
              <Link key={c.id} to="/cases/$caseId" params={{ caseId: c.id }} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{lifeAreaLabel(c.life_area)}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">Senast: {fmt((lastActivity as Record<string, string>)[c.id] ?? c.created_at)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Aktiva ärenden per livsområde</CardTitle></CardHeader>
        <CardContent>
          {byLifeArea.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga aktiva ärenden.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byLifeArea.map((l) => (
                <Link key={l.value} to="/cases" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:border-primary/50">
                  <span>{l.label}</span>
                  <Badge variant="secondary">{l.count}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, to }: { title: string; value: number; icon: React.ReactNode; to: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        <Link to={to} className="text-xs text-primary hover:underline">Visa ärenden →</Link>
      </CardContent>
    </Card>
  );
}
