import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Search } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";
import {
  LIFE_AREAS, CASE_STATUS, CASE_PRIORITY, OPEN_STATUSES,
  lifeAreaLabel, statusLabel, priorityLabel, priorityClass, statusClass,
} from "@/lib/cases";

export const Route = createFileRoute("/_authenticated/cases")({
  component: CasesPage,
});

const schema = z.object({
  title: z.string().trim().min(1, "Titel krävs").max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  category: z.string().max(120).optional().or(z.literal("")),
  life_area: z.string().min(1),
  status: z.string().min(1),
  priority: z.string().min(1),
  start_date: z.string().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  authority_contact_id: z.string().optional().or(z.literal("")),
  notes: z.string().max(4000).optional().or(z.literal("")),
});
type Form = z.infer<typeof schema>;
const empty: Form = {
  title: "", description: "", category: "",
  life_area: "other", status: "active", priority: "medium",
  start_date: new Date().toISOString().slice(0, 10),
  due_date: "", authority_contact_id: "", notes: "",
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");

function CasesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { selectedId: yearId, principalId } = useAccountingYear();

  const [search, setSearch] = useState("");
  const [lifeAreaFilter, setLifeAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const { data: cases = [] } = useQuery({
    queryKey: ["cases", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("accounting_year_id", yearId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (lifeAreaFilter !== "all" && c.life_area !== lifeAreaFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (statusFilter === "open" ? !OPEN_STATUSES.includes(c.status as never) : statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q && ![c.title, c.description, c.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [cases, search, lifeAreaFilter, statusFilter, priorityFilter]);

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!yearId || !principalId) return toast.error("Välj redovisningsår först");
    const { data: sessionRes } = await supabase.auth.getSession();
    const owner_id = sessionRes.session?.user?.id;
    if (!owner_id) { toast.error("Sessionen har gått ut"); navigate({ to: "/auth" }); return; }
    const insert = {
      owner_id,
      principal_id: principalId,
      accounting_year_id: yearId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      life_area: parsed.data.life_area,
      status: parsed.data.status,
      priority: parsed.data.priority,
      start_date: parsed.data.start_date || null,
      due_date: parsed.data.due_date || null,
      authority_contact_id: parsed.data.authority_contact_id || null,
      notes: parsed.data.notes || null,
    };
    const { data, error } = await supabase.from("cases").insert(insert).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Ärende skapat");
    setOpen(false);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["cases"] });
    if (data?.id) navigate({ to: "/cases/$caseId", params: { caseId: data.id } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ärenden</h1>
          <p className="text-sm text-muted-foreground">Allt arbete organiseras som ärenden</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nytt ärende</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nytt ärende</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Titel *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Beskrivning</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Livsområde</Label>
                  <Select value={form.life_area} onValueChange={(v) => setForm({ ...form, life_area: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LIFE_AREAS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CASE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioritet</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CASE_PRIORITY.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Startdatum</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Deadline</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Myndighetskontakt</Label>
                <Select value={form.authority_contact_id || "none"} onValueChange={(v) => setForm({ ...form, authority_contact_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen</SelectItem>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Anteckningar</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <Button onClick={save}>Skapa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Sök titel, beskrivning…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={lifeAreaFilter} onValueChange={setLifeAreaFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla livsområden</SelectItem>
              {LIFE_AREAS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Öppna</SelectItem>
              <SelectItem value="all">Alla statusar</SelectItem>
              {CASE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla prioriteter</SelectItem>
              {CASE_PRIORITY.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Inga ärenden matchar filtret.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c) => (
            <Link key={c.id} to="/cases/$caseId" params={{ caseId: c.id }} className="block">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{c.title}</span>
                        <Badge variant="outline" className={statusClass[c.status] ?? ""}>{statusLabel(c.status)}</Badge>
                        <Badge variant="outline" className={priorityClass[c.priority] ?? ""}>{priorityLabel(c.priority)}</Badge>
                        <Badge variant="outline">{lifeAreaLabel(c.life_area)}</Badge>
                        {c.category && <Badge variant="secondary">{c.category}</Badge>}
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                    </div>
                    <div className="text-xs text-muted-foreground text-right shrink-0">
                      <div>Start: {fmt(c.start_date)}</div>
                      <div>Deadline: {fmt(c.due_date)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
