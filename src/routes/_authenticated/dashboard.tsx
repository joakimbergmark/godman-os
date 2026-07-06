import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckSquare, FileText, User } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE");
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [principal, tasks, activities, documents] = await Promise.all([
        supabase.from("principal").select("full_name").limit(1).maybeSingle(),
        supabase
          .from("tasks")
          .select("id,title,deadline,priority,status")
          .neq("status", "done")
          .order("deadline", { ascending: true, nullsFirst: false }),
        supabase
          .from("activities")
          .select("id,title,activity_date,category")
          .order("activity_date", { ascending: false })
          .limit(5),
        supabase
          .from("documents")
          .select("id,title,category,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return {
        principalName: principal.data?.full_name ?? null,
        openTasks: tasks.data ?? [],
        recentActivities: activities.data ?? [],
        recentDocuments: documents.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Översikt</h1>
        <p className="text-sm text-muted-foreground">Sammanfattning av ditt uppdrag</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Huvudman</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold truncate">
              {data?.principalName ?? "Ej registrerad"}
            </div>
            <Link to="/principal" className="text-xs text-primary hover:underline">
              Hantera uppgifter →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Öppna uppgifter</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{data?.openTasks.length ?? 0}</div>
            <Link to="/tasks" className="text-xs text-primary hover:underline">
              Visa uppgifter →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senaste dokument</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{data?.recentDocuments.length ?? 0}</div>
            <Link to="/documents" className="text-xs text-primary hover:underline">
              Visa dokument →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Senaste aktiviteter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentActivities.length ? (
              data.recentActivities.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    {a.category && <div className="text-xs text-muted-foreground">{a.category}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDate(a.activity_date)}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Inga aktiviteter ännu.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Senast uppladdade dokument
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentDocuments.length ? (
              data.recentDocuments.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    {d.category && <Badge variant="secondary" className="mt-1 text-[10px]">{d.category}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDate(d.created_at)}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Inga dokument uppladdade ännu.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
