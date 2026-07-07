import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, FileText, CheckSquare, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/timeline")({
  component: TimelinePage,
});

type Item = {
  type: "activity" | "document" | "task" | "decision";
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  meta: Record<string, unknown>;
};

function TimelinePage() {
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: async (): Promise<Item[]> => {
      const [act, doc, tsk] = await Promise.all([
        supabase.from("activities").select("id,title,description,activity_date,category,created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("documents").select("id,title,category,file_name,storage_path,document_date,created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("tasks").select("id,title,description,status,deadline,priority,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
      ]);
      const items: Item[] = [];
      (act.data ?? []).forEach((r) => items.push({
        type: "activity", id: r.id, title: r.title, description: r.description,
        created_at: r.created_at, meta: { date: r.activity_date, category: r.category },
      }));
      (doc.data ?? []).forEach((r) => items.push({
        type: "document", id: r.id, title: r.title, description: r.category ? `Kategori: ${r.category}` : null,
        created_at: r.created_at, meta: { file_name: r.file_name, storage_path: r.storage_path },
      }));
      (tsk.data ?? []).forEach((r) => items.push({
        type: "task", id: r.id, title: r.title, description: r.description,
        created_at: r.created_at, meta: { status: r.status, deadline: r.deadline },
      }));
      return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of data) {
      const day = new Date(it.created_at).toLocaleDateString("sv-SE");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(it);
    }
    return Array.from(map.entries());
  }, [data]);

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message ?? "Kunde inte öppna");
    window.open(data.signedUrl, "_blank");
  };

  const onClick = (it: Item) => {
    if (it.type === "activity") navigate({ to: "/activities", search: { highlight: it.id } });
    else if (it.type === "task") navigate({ to: "/tasks", search: { highlight: it.id } });
    else if (it.type === "document") openDoc(String(it.meta.storage_path));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tidslinje</h1>
        <p className="text-sm text-muted-foreground">Allt som händer i systemet, senaste först</p>
      </div>

      {isLoading && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Laddar…</CardContent></Card>}
      {!isLoading && data.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inget att visa ännu.</CardContent></Card>
      )}

      <div className="space-y-6">
        {grouped.map(([day, items]) => (
          <div key={day} className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{day}</span>
            </div>
            <div className="space-y-2 border-l-2 border-border pl-4 ml-1.5">
              {items.map((it) => <TimelineCard key={`${it.type}-${it.id}`} item={it} onClick={() => onClick(it)} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const { icon, badge, badgeClass } = iconFor(item);
  const time = new Date(item.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-3 flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{time}</span>
              <Badge variant="outline" className={badgeClass}>{badge}</Badge>
            </div>
            <div className="font-medium truncate mt-0.5">{item.title}</div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-wrap">{item.description}</p>
            )}
            {item.type === "document" && Boolean(item.meta.file_name) && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">📎 {String(item.meta.file_name)}</div>
            )}
            {item.type === "task" && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Status: {String(item.meta.status) === "done" ? "✅ Klar" : String(item.meta.status) === "in_progress" ? "⏳ Pågår" : "Öppen"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function iconFor(item: Item) {
  if (item.type === "activity") return { icon: <Activity className="h-4 w-4" />, badge: "Aktivitet", badgeClass: "" };
  if (item.type === "document") return { icon: <FileText className="h-4 w-4" />, badge: "Dokument", badgeClass: "" };
  return { icon: <CheckSquare className="h-4 w-4" />, badge: "Uppgift", badgeClass: "" };
}
