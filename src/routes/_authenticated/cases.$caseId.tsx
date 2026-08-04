import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Activity as ActivityIcon, CheckSquare, FileText, Wallet, Gavel, Clock, Pencil } from "lucide-react";
import {
  LIFE_AREAS, CASE_STATUS, CASE_PRIORITY,
  lifeAreaLabel, statusLabel, priorityLabel, priorityClass, statusClass,
} from "@/lib/cases";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  component: CaseDetailPage,
});

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");
const fmtDT = (d?: string | null) => (d ? new Date(d).toLocaleString("sv-SE") : "—");
const money = (n: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function CaseDetailPage() {
  const { caseId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: c, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["case-activities", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("case_id", caseId).order("activity_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["case-tasks", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("case_id", caseId).order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["case-documents", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("case_id", caseId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["case-transactions", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("case_id", caseId).order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: decisions = [] } = useQuery({
    queryKey: ["case-decisions", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("case_decisions").select("*").eq("case_id", caseId).order("decision_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: authorityContact } = useQuery({
    queryKey: ["contact", c?.authority_contact_id],
    enabled: !!c?.authority_contact_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id,name,organization,email,phone").eq("id", c!.authority_contact_id!).single();
      if (error) throw error;
      return data;
    },
  });

  const timeline = useMemo(() => {
    type T = { type: string; id: string; when: string; title: string; sub?: string };
    const items: T[] = [];
    activities.forEach((a) => items.push({ type: "Aktivitet", id: a.id, when: a.activity_date, title: a.title, sub: a.description ?? undefined }));
    tasks.forEach((t) => items.push({ type: "Uppgift", id: t.id, when: t.deadline ?? t.created_at, title: t.title, sub: `Status: ${t.status}` }));
    documents.forEach((d) => items.push({ type: "Dokument", id: d.id, when: d.document_date ?? d.created_at, title: d.title, sub: d.category ?? undefined }));
    transactions.forEach((t) => items.push({ type: "Transaktion", id: t.id, when: t.transaction_date, title: t.comment ?? "(utan kommentar)", sub: `${t.type} · ${money(Number(t.amount))}` }));
    decisions.forEach((d) => items.push({ type: "Beslut", id: d.id, when: d.decision_date, title: d.title, sub: d.description ?? undefined }));
    return items.sort((a, b) => String(b.when).localeCompare(String(a.when)));
  }, [activities, tasks, documents, transactions, decisions]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Laddar…</div>;
  if (!c) return <div className="text-sm text-muted-foreground">Ärendet finns inte.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/cases" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />Tillbaka
        </Button>
      </div>

      <CaseHeader c={c} authorityContact={authorityContact ?? null} onUpdated={() => qc.invalidateQueries({ queryKey: ["case", caseId] })} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="activities"><ActivityIcon className="h-3.5 w-3.5 mr-1" />Aktiviteter ({activities.length})</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-3.5 w-3.5 mr-1" />Uppgifter ({tasks.length})</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Dokument ({documents.length})</TabsTrigger>
          <TabsTrigger value="transactions"><Wallet className="h-3.5 w-3.5 mr-1" />Transaktioner ({transactions.length})</TabsTrigger>
          <TabsTrigger value="decisions"><Gavel className="h-3.5 w-3.5 mr-1" />Beslut ({decisions.length})</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="h-3.5 w-3.5 mr-1" />Tidslinje</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Beskrivning</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{c.description || <span className="text-muted-foreground">Ingen beskrivning</span>}</CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Stat label="Aktiviteter" value={activities.length} to="activities" />
            <Stat label="Öppna uppgifter" value={tasks.filter((t) => t.status !== "done").length} to="tasks" />
            <Stat label="Dokument" value={documents.length} to="documents" />
            <Stat label="Transaktioner" value={transactions.length} to="transactions" />
          </div>
          {c.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Anteckningar</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{c.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <RelatedList items={activities.map((a) => ({ id: a.id, title: a.title, sub: a.category, when: a.activity_date }))} emptyText="Inga aktiviteter kopplade." linkTo="/activities" />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <RelatedList items={tasks.map((t) => ({ id: t.id, title: t.title, sub: `${t.status} · ${t.priority}`, when: t.deadline }))} emptyText="Inga uppgifter kopplade." linkTo="/tasks" />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <RelatedList items={documents.map((d) => ({ id: d.id, title: d.title, sub: d.category, when: d.document_date ?? d.created_at }))} emptyText="Inga dokument kopplade." linkTo="/documents" />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <RelatedList items={transactions.map((t) => ({ id: t.id, title: t.comment ?? "(utan kommentar)", sub: `${t.type} · ${money(Number(t.amount))}`, when: t.transaction_date }))} emptyText="Inga transaktioner kopplade." linkTo="/economy" />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <DecisionsTab caseId={caseId} decisions={decisions} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-2">
          {timeline.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inget att visa ännu.</CardContent></Card>
          ) : timeline.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.type}</Badge>
                      <span className="font-medium truncate">{item.title}</span>
                    </div>
                    {item.sub && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.sub}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{fmt(item.when)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}

function RelatedList({ items, emptyText, linkTo }: { items: { id: string; title: string; sub?: string | null; when?: string | null }[]; emptyText: string; linkTo: string }) {
  if (items.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground space-y-2">
        <div>{emptyText}</div>
        <div><Link to={linkTo} className="text-primary hover:underline">Gå till modulen och koppla poster →</Link></div>
      </CardContent></Card>
    );
  }
  return (
    <div className="grid gap-2">
      {items.map((i) => (
        <Card key={i.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{i.title}</div>
              {i.sub && <div className="text-xs text-muted-foreground truncate">{i.sub}</div>}
            </div>
            <div className="text-xs text-muted-foreground shrink-0">{fmt(i.when)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Case header (edit) ----------
const headerSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  category: z.string().max(120).optional().or(z.literal("")),
  life_area: z.string(),
  status: z.string(),
  priority: z.string(),
  start_date: z.string().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  completed_date: z.string().optional().or(z.literal("")),
  authority_contact_id: z.string().optional().or(z.literal("")),
  notes: z.string().max(4000).optional().or(z.literal("")),
});

function CaseHeader({ c, authorityContact, onUpdated }: { c: any; authorityContact: { id: string; name: string; organization: string | null; email: string | null; phone: string | null } | null; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: c.title, description: c.description ?? "", category: c.category ?? "",
    life_area: c.life_area, status: c.status, priority: c.priority,
    start_date: c.start_date ?? "", due_date: c.due_date ?? "", completed_date: c.completed_date ?? "",
    authority_contact_id: c.authority_contact_id ?? "", notes: c.notes ?? "",
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name").order("name");
      if (error) throw error; return data;
    },
  });

  const save = async () => {
    const parsed = headerSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    // Håll status och avslutsdatum i synk
    let status = parsed.data.status;
    let completed_date = parsed.data.completed_date || null;
    if (completed_date && status !== "completed" && status !== "cancelled") status = "completed";
    if (status === "completed" && !completed_date) completed_date = new Date().toISOString().slice(0, 10);
    const upd = {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      life_area: parsed.data.life_area,
      status,
      priority: parsed.data.priority,
      start_date: parsed.data.start_date || null,
      due_date: parsed.data.due_date || null,
      completed_date,
      authority_contact_id: parsed.data.authority_contact_id || null,
      notes: parsed.data.notes || null,
    };
    const { error } = await supabase.from("cases").update(upd).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Sparat");
    setOpen(false);
    onUpdated();
  };

  const del = async () => {
    if (!confirm("Ta bort ärendet? Kopplade poster kopplas loss men tas inte bort.")) return;
    const { error } = await supabase.from("cases").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Borttaget");
    window.history.back();
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{c.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={statusClass[c.status] ?? ""}>{statusLabel(c.status)}</Badge>
              <Badge variant="outline" className={priorityClass[c.priority] ?? ""}>{priorityLabel(c.priority)}</Badge>
              <Badge variant="outline">{lifeAreaLabel(c.life_area)}</Badge>
              {c.category && <Badge variant="secondary">{c.category}</Badge>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Dialog open={open} onOpenChange={(v) => {
              setOpen(v);
              if (v) setForm({
                title: c.title, description: c.description ?? "", category: c.category ?? "",
                life_area: c.life_area, status: c.status, priority: c.priority,
                start_date: c.start_date ?? "", due_date: c.due_date ?? "", completed_date: c.completed_date ?? "",
                authority_contact_id: c.authority_contact_id ?? "", notes: c.notes ?? "",
              });
            }}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />Redigera</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Redigera ärende</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
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
                    <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div><Label>Deadline</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                    <div><Label>Avslutat</Label><Input type="date" value={form.completed_date} onChange={(e) => setForm({ ...form, completed_date: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Myndighetskontakt</Label>
                    <Select value={form.authority_contact_id || "none"} onValueChange={(v) => setForm({ ...form, authority_contact_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ingen</SelectItem>
                        {contacts.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Anteckningar</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
                  <Button onClick={save}>Spara</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-4 text-sm">
          <div><span className="text-muted-foreground">Start: </span>{fmt(c.start_date)}</div>
          <div><span className="text-muted-foreground">Deadline: </span>{fmt(c.due_date)}</div>
          <div><span className="text-muted-foreground">Avslutat: </span>{fmt(c.completed_date)}</div>
          <div className="truncate">
            <span className="text-muted-foreground">Kontakt: </span>
            {authorityContact ? <>{authorityContact.name}{authorityContact.organization ? ` (${authorityContact.organization})` : ""}</> : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Decisions tab ----------
function DecisionsTab({ caseId, decisions }: { caseId: string; decisions: any[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ decision_date: new Date().toISOString().slice(0, 10), title: "", description: "" });

  const save = async () => {
    if (!form.title.trim()) return toast.error("Titel krävs");
    const { data: sessionRes } = await supabase.auth.getSession();
    const owner_id = sessionRes.session?.user?.id;
    if (!owner_id) { navigate({ to: "/auth" }); return; }
    const { error } = await supabase.from("case_decisions").insert({
      owner_id, case_id: caseId,
      decision_date: form.decision_date,
      title: form.title.trim(),
      description: form.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Beslut registrerat");
    setOpen(false);
    setForm({ decision_date: new Date().toISOString().slice(0, 10), title: "", description: "" });
    qc.invalidateQueries({ queryKey: ["case-decisions", caseId] });
  };

  const del = async (id: string) => {
    if (!confirm("Ta bort beslut?")) return;
    const { error } = await supabase.from("case_decisions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["case-decisions", caseId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nytt beslut</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nytt beslut</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Datum</Label><Input type="date" value={form.decision_date} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} /></div>
              <div><Label>Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Beskrivning</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <Button onClick={save}>Spara</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {decisions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga beslut registrerade.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {decisions.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{d.title}</div>
                  {d.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{d.description}</p>}
                  <div className="text-xs text-muted-foreground mt-1">{fmtDT(d.decision_date)}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => del(d.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
