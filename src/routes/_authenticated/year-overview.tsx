import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckSquare, FileText, Wallet, ClipboardList } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAccountingYear, YEAR_STATUS_LABELS } from "@/lib/accounting-year";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const Route = createFileRoute("/_authenticated/year-overview")({
  component: YearOverviewPage,
});

function YearOverviewPage() {
  const { selected, selectedId } = useAccountingYear();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["year-overview", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const [activities, documents, tasks, transactions] = await Promise.all([
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("accounting_year_id", selectedId!),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("accounting_year_id", selectedId!),
        supabase.from("tasks").select("id,status").eq("accounting_year_id", selectedId!),
        supabase.from("transactions").select("type,amount").eq("accounting_year_id", selectedId!),
      ]);
      const t = tasks.data ?? [];
      const txs = transactions.data ?? [];
      let income = 0, expense = 0;
      for (const tx of txs) {
        const amt = Number(tx.amount);
        if (tx.type === "income") income += amt;
        else if (tx.type === "expense") expense += amt;
      }
      return {
        activitiesCount: activities.count ?? 0,
        documentsCount: documents.count ?? 0,
        openTasks: t.filter((x) => x.status !== "done").length,
        doneTasks: t.filter((x) => x.status === "done").length,
        income,
        expense,
        net: income - expense,
        txCount: txs.length,
      };
    },
  });

  const updateStatus = async (status: string) => {
    if (!selectedId) return;
    const { error } = await supabase.from("accounting_years").update({ status }).eq("id", selectedId);
    if (error) return toast.error(error.message);
    toast.success("Status uppdaterad");
    qc.invalidateQueries({ queryKey: ["accounting-years"] });
    qc.invalidateQueries({ queryKey: ["year-overview"] });
  };

  if (!selected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Årsöversikt</h1>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Inget redovisningsår valt. Skapa en huvudman eller lägg till ett år via årsväljaren i toppmenyn.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Årsöversikt {selected.year}</h1>
          <p className="text-sm text-muted-foreground">Sammanfattning av redovisningsåret</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select value={selected.status} onValueChange={updateStatus}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(YEAR_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiviteter</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{data?.activitiesCount ?? 0}</div>
            <Link to="/activities" className="text-xs text-primary hover:underline">Visa aktiviteter →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokument</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{data?.documentsCount ?? 0}</div>
            <Link to="/documents" className="text-xs text-primary hover:underline">Visa dokument →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uppgifter</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div>
                <div className="text-3xl font-semibold">{data?.openTasks ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">öppna</div>
              </div>
              <div className="text-muted-foreground">/</div>
              <div>
                <div className="text-xl font-semibold">{data?.doneTasks ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">slutförda</div>
              </div>
            </div>
            <Link to="/tasks" className="text-xs text-primary hover:underline">Visa uppgifter →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Årsräkning</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{YEAR_STATUS_LABELS[selected.status] ?? selected.status}</Badge>
            {selected.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{selected.notes}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Ekonomi
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">Kommer snart</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Inkomster</div>
            <div className="text-xl font-semibold text-muted-foreground">—</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Utgifter</div>
            <div className="text-xl font-semibold text-muted-foreground">—</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className="text-xl font-semibold text-muted-foreground">—</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
