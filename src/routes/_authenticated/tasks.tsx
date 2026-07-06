import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, ArrowUpDown } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";


export const Route = createFileRoute("/_authenticated/tasks")({
  validateSearch: (s: Record<string, unknown>) => ({ highlight: typeof s.highlight === "string" ? s.highlight : undefined }),
  component: TasksPage,
});

const PRIORITY: Record<string, { label: string; className: string }> = {
  high: { label: "Hög", className: "bg-destructive/20 text-destructive border-destructive/40" },
  medium: { label: "Medel", className: "bg-primary/15 text-primary border-primary/30" },
  low: { label: "Låg", className: "bg-muted text-muted-foreground border-border" },
};

const schema = z.object({
  title: z.string().trim().min(1, "Titel krävs").max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "in_progress", "done"]),
});
type Form = z.infer<typeof schema>;
const empty: Form = { title: "", description: "", deadline: "", priority: "medium", status: "open" };

function TasksPage() {
  const qc = useQueryClient();
  const { highlight } = Route.useSearch();
  const navigate = useNavigate();
  const { selectedId: yearId, selected: selectedYear } = useAccountingYear();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "done">("all");
  const [sortKey, setSortKey] = useState<"deadline" | "priority" | "title" | "created_at">("deadline");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data = [] } = useQuery({
    queryKey: ["tasks", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("accounting_year_id", yearId!);
      if (error) throw error;
      return data;
    },
  });


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = statusFilter === "all" ? data : data.filter((t) => t.status === statusFilter);
    if (q) rows = rows.filter((t) => [t.title, t.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
    const prioRank = { high: 0, medium: 1, low: 2 } as const;
    return [...rows].sort((a, b) => {
      if (sortKey === "deadline") {
        const ad = a.deadline ?? "9999";
        const bd = b.deadline ?? "9999";
        return ad.localeCompare(bd);
      }
      if (sortKey === "priority") return prioRank[a.priority as keyof typeof prioRank] - prioRank[b.priority as keyof typeof prioRank];
      if (sortKey === "created_at") return String(b.created_at).localeCompare(String(a.created_at));
      return String(a.title).localeCompare(String(b.title), "sv");
    });
  }, [data, search, statusFilter, sortKey]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (row: typeof data[number]) => {
    setEditing(row.id);
    setForm({
      title: row.title,
      description: row.description ?? "",
      deadline: row.deadline ?? "",
      priority: (row.priority as Form["priority"]) ?? "medium",
      status: (row.status as Form["status"]) ?? "open",
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!highlight || data.length === 0) return;
    const row = data.find((r) => r.id === highlight);
    if (row) {
      openEdit(row);
      navigate({ to: "/tasks", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, data]);

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: sessionRes } = await supabase.auth.getSession();
    const owner_id = sessionRes.session?.user?.id;
    if (!owner_id) {
      toast.error("Sessionen har gått ut, logga in igen");
      navigate({ to: "/auth" });
      return;
    }
    const base = {
      title: parsed.data.title,
      description: parsed.data.description || null,
      deadline: parsed.data.deadline || null,
      priority: parsed.data.priority,
      status: parsed.data.status,
    };
    const res = editing
      ? await supabase.from("tasks").update(base).eq("id", editing)
      : await supabase.from("tasks").insert({ owner_id, ...base });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Sparad" : "Tillagd");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };


  const del = async (id: string) => {
    if (!confirm("Ta bort uppgiften?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const toggleDone = async (row: typeof data[number], checked: boolean) => {
    const { error } = await supabase.from("tasks").update({ status: checked ? "done" : "open" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Uppgifter</h1>
          <p className="text-sm text-muted-foreground">Att-göra-lista</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Ny uppgift</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Redigera uppgift" : "Ny uppgift"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Titel *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline ?? ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioritet</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Form["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Hög</SelectItem>
                    <SelectItem value="medium">Medel</SelectItem>
                    <SelectItem value="low">Låg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Form["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Öppen</SelectItem>
                    <SelectItem value="in_progress">Pågår</SelectItem>
                    <SelectItem value="done">Klar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Beskrivning</Label>
                <Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? "Spara" : "Lägg till"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Sök…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla</SelectItem>
            <SelectItem value="open">Öppna</SelectItem>
            <SelectItem value="in_progress">Pågår</SelectItem>
            <SelectItem value="done">Klara</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
          <SelectTrigger className="w-[180px]"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Sortera på deadline</SelectItem>
            <SelectItem value="priority">Sortera på prioritet</SelectItem>
            <SelectItem value="title">Sortera på titel</SelectItem>
            <SelectItem value="created_at">Senast skapad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga uppgifter.</CardContent></Card>
        )}
        {filtered.map((t) => {
          const done = t.status === "done";
          const overdue = t.deadline && !done && new Date(t.deadline) < new Date(new Date().toDateString());
          const p = PRIORITY[t.priority] ?? PRIORITY.medium;
          return (
            <Card key={t.id}>
              <CardContent className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
                <Checkbox checked={done} onCheckedChange={(v) => toggleDone(t, !!v)} className="mt-1" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`font-semibold truncate ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                    <Badge variant="outline" className={p.className}>{p.label}</Badge>
                    {t.status === "in_progress" && <Badge variant="secondary">Pågår</Badge>}
                    {t.deadline && (
                      <span className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        Deadline: {new Date(t.deadline).toLocaleDateString("sv-SE")}
                      </span>
                    )}
                  </div>
                  {t.description && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{t.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
