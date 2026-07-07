import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sun, PauseCircle, CalendarClock, Activity as ActivityIcon,
  Layers, BarChart3, FileText, CheckSquare, ShieldCheck, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
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
const todayStr = () => new Date(new Date().toDateString()).toISOString().slice(0, 10);

function Dashboard() {
  const { selectedId: yearId } = useAccountingYear();
  const navigate = useNavigate();

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

  const { data: tasks = [] } = useQuery({
    queryKey: ["dash-tasks", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,deadline,status,priority,case_id")
        .eq("accounting_year_id", yearId!)
        .neq("status", "done");
      if (error) throw error;
      return data;
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

  const { data: counts } = useQuery({
    queryKey: ["dash-counts", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const q = (t: "transactions" | "activities" | "documents") =>
        supabase.from(t).select("id", { count: "exact", head: true }).eq("accounting_year_id", yearId!);
      const [tx, act, doc] = await Promise.all([q("transactions"), q("activities"), q("documents")]);
      return {
        transactions: tx.count ?? 0,
        activities: act.count ?? 0,
        documents: doc.count ?? 0,
      };
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

  type TimelineItem = {
    type: "activity" | "document" | "task" | "decision" | "transaction";
    id: string; title: string; created_at: string;
    meta: Record<string, unknown>;
  };
  const { data: recent = [] } = useQuery({
    queryKey: ["dash-recent", yearId],
    enabled: !!yearId,
    queryFn: async (): Promise<TimelineItem[]> => {
      const [act, doc, tsk, dec, tx] = await Promise.all([
        supabase.from("activities").select("id,title,created_at,case_id").eq("accounting_year_id", yearId!).order("created_at", { ascending: false }).limit(10),
        supabase.from("documents").select("id,title,storage_path,created_at,case_id").eq("accounting_year_id", yearId!).order("created_at", { ascending: false }).limit(10),
        supabase.from("tasks").select("id,title,status,created_at,case_id").eq("accounting_year_id", yearId!).order("created_at", { ascending: false }).limit(10),
        supabase.from("case_decisions").select("id,title,created_at,case_id").order("created_at", { ascending: false }).limit(10),
        supabase.from("transactions").select("id,comment,amount,created_at,case_id").eq("accounting_year_id", yearId!).order("created_at", { ascending: false }).limit(10),
      ]);
      const out: TimelineItem[] = [];
      (act.data ?? []).forEach((r) => out.push({ type: "activity", id: r.id, title: r.title, created_at: r.created_at, meta: {} }));
      (doc.data ?? []).forEach((r) => out.push({ type: "document", id: r.id, title: r.title, created_at: r.created_at, meta: { storage_path: r.storage_path } }));
      (tsk.data ?? []).forEach((r) => out.push({ type: "task", id: r.id, title: r.title, created_at: r.created_at, meta: {} }));
      (dec.data ?? []).forEach((r) => out.push({ type: "decision", id: r.id, title: r.title, created_at: r.created_at, meta: { case_id: r.case_id } }));
      (tx.data ?? []).forEach((r) => out.push({ type: "transaction", id: r.id, title: r.description ?? "Transaktion", created_at: r.created_at, meta: { amount: r.amount } }));
      return out.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);
    },
  });

  const now = Date.now();
  const today = todayStr();

  const openCases = useMemo(() => cases.filter((c) => OPEN_STATUSES.includes(c.status as never)), [cases]);
  const waitingCases = useMemo(() => cases.filter((c) => c.status === "waiting"), [cases]);
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

  const tasksToday = useMemo(
    () => tasks.filter((t) => t.deadline && t.deadline <= today).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1)),
    [tasks, today],
  );

  const expiringSoon = useMemo(() => {
    return obligations
      .map((o) => {
        const ref = o.renewal_date ?? o.valid_until;
        return { o, days: daysUntil(ref), tier: expiryTier(ref, o.status) };
      })
      .filter((r) => r.days !== null && r.days >= 0 && r.days < 30 && r.o.status !== "expired" && r.o.status !== "cancelled" && r.o.status !== "completed")
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  }, [obligations]);

  const activeObligationCount = useMemo(
    () => obligations.filter((o) => o.status === "active" || o.status === "pending_renewal").length,
    [obligations],
  );

  const openRecent = async (it: TimelineItem) => {
    if (it.type === "activity") navigate({ to: "/activities", search: { highlight: it.id } });
    else if (it.type === "task") navigate({ to: "/tasks", search: { highlight: it.id } });
    else if (it.type === "transaction") navigate({ to: "/economy" });
    else if (it.type === "decision" && it.meta.case_id) navigate({ to: "/cases/$caseId", params: { caseId: String(it.meta.case_id) } });
    else if (it.type === "document") {
      const path = String(it.meta.storage_path);
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
      if (error || !data) return toast.error(error?.message ?? "Kunde inte öppna");
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cockpit</h1>
        <p className="text-sm text-muted-foreground">
          {principal?.full_name ? `Huvudman: ${principal.full_name}` : "Din överblick över dagens arbete"}
        </p>
      </div>

      {/* IDAG */}
      <section className="space-y-3">
        <SectionHeader icon={<Sun className="h-4 w-4" />} title="Idag" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4" />Uppgifter att göra idag</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tasksToday.length === 0 ? (
                <Empty text="Inga uppgifter förfaller idag." />
              ) : tasksToday.slice(0, 8).map((t) => (
                <Link key={t.id} to="/tasks" search={{ highlight: t.id }} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">Deadline: {fmt(t.deadline)}</div>
                  </div>
                  {t.deadline && t.deadline < today && <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive shrink-0">Försenad</Badge>}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" />Ärenden som kräver aktivitet</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {staleCases.length === 0 ? (
                <Empty text="Alla aktiva ärenden har rörelse." />
              ) : staleCases.slice(0, 6).map((c) => (
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

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Åtaganden som snart löper ut</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {expiringSoon.length === 0 ? (
                <Empty text="Inga åtaganden löper ut inom 30 dagar." />
              ) : expiringSoon.slice(0, 6).map(({ o, days, tier }) => (
                <Link key={o.id} to="/obligations/$obligationId" params={{ obligationId: o.id }} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{obligationTypeLabel(o.obligation_type)}</div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${expiryTierClass[tier]}`}>{expiryTierLabel(tier, days)}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* VÄNTAR PÅ + KOMMANDE DEADLINES */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <SectionHeader icon={<PauseCircle className="h-4 w-4" />} title="Väntar på" />
          <Card>
            <CardContent className="p-4 space-y-2">
              {waitingCases.length === 0 ? (
                <Empty text="Inga ärenden väntar på svar." />
              ) : waitingCases.map((c) => (
                <Link key={c.id} to="/cases/$caseId" params={{ caseId: c.id }} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="outline" className={statusClass[c.status] ?? ""}>{statusLabel(c.status)}</Badge>
                      <Badge variant="outline" className={priorityClass[c.priority] ?? ""}>{priorityLabel(c.priority)}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{lifeAreaLabel(c.life_area)}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader icon={<CalendarClock className="h-4 w-4" />} title="Kommande deadlines (30 dagar)" />
          <Card>
            <CardContent className="p-4 space-y-2">
              {dueSoon.length === 0 ? (
                <Empty text="Inga deadlines de närmaste 30 dagarna." />
              ) : dueSoon.slice(0, 10).map((c) => (
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
        </section>
      </div>

      {/* SENASTE AKTIVITET */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader icon={<ActivityIcon className="h-4 w-4" />} title="Senaste aktivitet" />
          <Link to="/timeline" className="text-xs text-primary hover:underline">Öppna tidslinje →</Link>
        </div>
        <Card>
          <CardContent className="p-4 space-y-2">
            {recent.length === 0 ? (
              <Empty text="Inget att visa ännu." />
            ) : recent.map((it) => (
              <button key={`${it.type}-${it.id}`} type="button" onClick={() => openRecent(it)} className="w-full text-left flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0 hover:text-primary">
                <div className="min-w-0 flex items-center gap-2">
                  <TimelineIcon type={it.type} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-xs text-muted-foreground">{typeLabel(it.type)}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{new Date(it.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* REDOVISNINGSÅR */}
      <section className="space-y-3">
        <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="Redovisningsår" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat title="Transaktioner" value={counts?.transactions ?? 0} to="/economy" />
          <Stat title="Aktiviteter" value={counts?.activities ?? 0} to="/activities" />
          <Stat title="Dokument" value={counts?.documents ?? 0} to="/documents" />
          <Stat title="Öppna ärenden" value={openCases.length} to="/cases" />
          <Stat title="Aktiva åtaganden" value={activeObligationCount} to="/obligations" />
        </div>
      </section>

      {/* LIVSOMRÅDEN */}
      <section className="space-y-3">
        <SectionHeader icon={<Layers className="h-4 w-4" />} title="Öppna ärenden per livsområde" />
        <Card>
          <CardContent className="p-4">
            {byLifeArea.length === 0 ? (
              <Empty text="Inga aktiva ärenden." />
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
      </section>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function Stat({ title, value, to }: { title: string; value: number; to: string }) {
  return (
    <Link to={to} className="block">
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="text-3xl font-semibold mt-1">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TimelineIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0 text-muted-foreground";
  if (type === "activity") return <ActivityIcon className={cls} />;
  if (type === "document") return <FileText className={cls} />;
  if (type === "task") return <CheckSquare className={cls} />;
  if (type === "transaction") return <BarChart3 className={cls} />;
  return <Briefcase className={cls} />;
}

function typeLabel(type: string) {
  return type === "activity" ? "Aktivitet"
    : type === "document" ? "Dokument"
    : type === "task" ? "Uppgift"
    : type === "transaction" ? "Transaktion"
    : type === "decision" ? "Beslut" : type;
}
