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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, ArrowUpDown } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";


export const Route = createFileRoute("/_authenticated/activities")({
  validateSearch: (s: Record<string, unknown>) => ({ highlight: typeof s.highlight === "string" ? s.highlight : undefined }),
  component: ActivitiesPage,
});

const CATEGORIES = ["Ekonomi", "Vård", "Boende", "Myndighet", "Kontakt", "Övrigt"] as const;

const schema = z.object({
  activity_date: z.string().min(1, "Datum krävs"),
  title: z.string().trim().min(1, "Rubrik krävs").max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  category: z.string().max(60).optional().or(z.literal("")),
  tags: z.string().max(300).optional().or(z.literal("")),
});
type Form = z.infer<typeof schema>;
const today = () => new Date().toISOString().slice(0, 10);
const empty: Form = { activity_date: today(), title: "", description: "", category: "", tags: "" };

function ActivitiesPage() {
  const qc = useQueryClient();
  const { highlight } = Route.useSearch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"activity_date" | "title" | "category">("activity_date");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").order("activity_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.filter((a) =>
          [a.title, a.description, a.category, ...(a.tags ?? [])]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : data;
    return [...rows].sort((a, b) => {
      if (sortKey === "activity_date") return String(b.activity_date).localeCompare(String(a.activity_date));
      return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "sv");
    });
  }, [data, search, sortKey]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (row: typeof data[number]) => {
    setEditing(row.id);
    setForm({
      activity_date: row.activity_date,
      title: row.title,
      description: row.description ?? "",
      category: row.category ?? "",
      tags: (row.tags ?? []).join(", "),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!highlight || data.length === 0) return;
    const row = data.find((r) => r.id === highlight);
    if (row) {
      openEdit(row);
      navigate({ to: "/activities", search: {}, replace: true });
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
    const tags = (parsed.data.tags || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const base = {
      activity_date: parsed.data.activity_date,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      tags,
    };
    const res = editing
      ? await supabase.from("activities").update(base).eq("id", editing)
      : await supabase.from("activities").insert({ owner_id, ...base });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Sparad" : "Tillagd");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };


  const del = async (id: string) => {
    if (!confirm("Ta bort aktiviteten?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Aktiviteter</h1>
          <p className="text-sm text-muted-foreground">Händelselogg för uppdraget</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Ny aktivitet</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Redigera aktivitet" : "Ny aktivitet"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Datum *</Label>
                <Input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Rubrik *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Beskrivning</Label>
                <Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Taggar (kommaseparerade)</Label>
                <Input value={form.tags ?? ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="t.ex. bank, försäkringskassan" />
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
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
          <SelectTrigger className="w-[180px]"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activity_date">Sortera på datum</SelectItem>
            <SelectItem value="title">Sortera på rubrik</SelectItem>
            <SelectItem value="category">Sortera på kategori</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga aktiviteter.</CardContent></Card>
        )}
        {filtered.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(a.activity_date).toLocaleDateString("sv-SE")}</span>
                  {a.category && <Badge variant="secondary">{a.category}</Badge>}
                </div>
                <div className="font-semibold mt-1 truncate">{a.title}</div>
                {a.description && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{a.description}</p>}
                {a.tags && a.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
