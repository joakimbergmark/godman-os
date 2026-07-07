import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Pencil, Plus, Search, Trash2, ShieldCheck, ChevronRight } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";
import { CaseSelector } from "@/components/CaseSelector";
import {
  OBLIGATION_TYPES, OBLIGATION_STATUS,
  obligationTypeLabel, obligationStatusLabel,
  expiryTier, expiryTierClass, expiryTierLabel, daysUntil,
} from "@/lib/obligations";

export const Route = createFileRoute("/_authenticated/obligations")({
  component: ObligationsPage,
});

const schema = z.object({
  title: z.string().trim().min(1, "Titel krävs").max(200),
  obligation_type: z.string().min(1),
  status: z.string().min(1),
  case_id: z.string().nullable().optional(),
  authority_contact_id: z.string().nullable().optional(),
  document_id: z.string().nullable().optional(),
  decision_date: z.string().optional().or(z.literal("")),
  valid_from: z.string().optional().or(z.literal("")),
  valid_until: z.string().optional().or(z.literal("")),
  renewal_date: z.string().optional().or(z.literal("")),
  reminder_days_before: z.string().refine((s) => Number(s) >= 0, "Ogiltigt"),
  notes: z.string().max(4000).optional().or(z.literal("")),
});
type Form = z.infer<typeof schema>;

const empty: Form = {
  title: "", obligation_type: "authority_decision", status: "active",
  case_id: null, authority_contact_id: null, document_id: null,
  decision_date: "", valid_from: "", valid_until: "", renewal_date: "",
  reminder_days_before: "30", notes: "",
};

function ObligationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { selectedId: yearId, selected: selectedYear, principalId } = useAccountingYear();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data: obligations = [] } = useQuery({
    queryKey: ["obligations", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obligations")
        .select("*")
        .eq("accounting_year_id", yearId!)
        .order("renewal_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents-lite-obl"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id,title").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Auto-skapa uppgift när renewal_date närmar sig
  useEffect(() => {
    if (!yearId || obligations.length === 0) return;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const owner_id = s.session?.user?.id;
      if (!owner_id) return;
      const today = new Date(new Date().toDateString()).getTime();
      const DAY = 24 * 60 * 60 * 1000;
      const candidates = obligations.filter((o) => {
        if (!o.renewal_date) return false;
        if (o.status !== "active" && o.status !== "pending_renewal") return false;
        const d = (new Date(o.renewal_date).getTime() - today) / DAY;
        return d >= 0 && d <= (o.reminder_days_before ?? 30);
      });
      if (candidates.length === 0) return;
      const titles = candidates.map((o) => `Förnya: ${o.title}`);
      const { data: existing } = await supabase
        .from("tasks")
        .select("title")
        .eq("accounting_year_id", yearId)
        .in("title", titles);
      const have = new Set((existing ?? []).map((t) => t.title));
      const toInsert = candidates
        .filter((o) => !have.has(`Förnya: ${o.title}`))
        .map((o) => ({
          owner_id,
          accounting_year_id: yearId,
          case_id: o.case_id,
          title: `Förnya: ${o.title}`,
          description: `Automatiskt skapad påminnelse för åtagande som förnyas ${new Date(o.renewal_date!).toLocaleDateString("sv-SE")}.`,
          deadline: o.renewal_date,
          priority: "high",
          status: "open",
        }));
      if (toInsert.length > 0) {
        await supabase.from("tasks").insert(toInsert);
        qc.invalidateQueries({ queryKey: ["tasks"] });
        toast.info(`${toInsert.length} förnyelseuppgift(er) skapade automatiskt`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obligations, yearId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return obligations.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.obligation_type !== typeFilter) return false;
      if (q && ![o.title, o.notes].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [obligations, search, statusFilter, typeFilter]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (row: typeof obligations[number]) => {
    setEditing(row.id);
    setForm({
      title: row.title,
      obligation_type: row.obligation_type,
      status: row.status,
      case_id: row.case_id ?? null,
      authority_contact_id: row.authority_contact_id ?? null,
      document_id: row.document_id ?? null,
      decision_date: row.decision_date ?? "",
      valid_from: row.valid_from ?? "",
      valid_until: row.valid_until ?? "",
      renewal_date: row.renewal_date ?? "",
      reminder_days_before: String(row.reminder_days_before ?? 30),
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!yearId || !principalId) return toast.error("Välj huvudman och redovisningsår");
    const { data: s } = await supabase.auth.getSession();
    const owner_id = s.session?.user?.id;
    if (!owner_id) { toast.error("Sessionen har gått ut"); navigate({ to: "/auth" }); return; }
    const base = {
      title: parsed.data.title,
      obligation_type: parsed.data.obligation_type,
      status: parsed.data.status,
      case_id: parsed.data.case_id || null,
      authority_contact_id: parsed.data.authority_contact_id || null,
      document_id: parsed.data.document_id || null,
      decision_date: parsed.data.decision_date || null,
      valid_from: parsed.data.valid_from || null,
      valid_until: parsed.data.valid_until || null,
      renewal_date: parsed.data.renewal_date || null,
      reminder_days_before: Number(parsed.data.reminder_days_before),
      notes: parsed.data.notes || null,
    };
    const res = editing
      ? await supabase.from("obligations").update(base).eq("id", editing)
      : await supabase.from("obligations").insert({ owner_id, principal_id: principalId, accounting_year_id: yearId, ...base });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Sparat" : "Skapat");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["obligations"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const del = async (id: string) => {
    if (!confirm("Ta bort åtagandet?")) return;
    const { error } = await supabase.from("obligations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttaget");
    qc.invalidateQueries({ queryKey: ["obligations"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Åtaganden</h1>
          <p className="text-sm text-muted-foreground">
            Beslut, tillstånd och skyldigheter som kräver uppföljning{selectedYear ? ` · Redovisningsår ${selectedYear.year}` : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} disabled={!principalId}><Plus className="h-4 w-4 mr-1" /> Nytt åtagande</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Redigera åtagande" : "Nytt åtagande"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Titel *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Typ *</Label>
                <Select value={form.obligation_type} onValueChange={(v) => setForm({ ...form, obligation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OBLIGATION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OBLIGATION_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Beslutsdatum</Label>
                <Input type="date" value={form.decision_date ?? ""} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gäller från</Label>
                <Input type="date" value={form.valid_from ?? ""} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gäller till</Label>
                <Input type="date" value={form.valid_until ?? ""} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Förnyelsedatum</Label>
                <Input type="date" value={form.renewal_date ?? ""} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Påminnelse (dagar innan förnyelse)</Label>
                <Input type="number" min={0} value={form.reminder_days_before} onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <CaseSelector value={form.case_id ?? null} onChange={(v) => setForm({ ...form, case_id: v })} yearId={yearId} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Myndighet/Kontakt</Label>
                <Select
                  value={form.authority_contact_id ?? "__none"}
                  onValueChange={(v) => setForm({ ...form, authority_contact_id: v === "__none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Ingen kontakt" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Ingen kontakt</SelectItem>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Kopplat dokument</Label>
                <Select
                  value={form.document_id ?? "__none"}
                  onValueChange={(v) => setForm({ ...form, document_id: v === "__none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Inget dokument" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Inget dokument</SelectItem>
                    {documents.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Anteckningar</Label>
                <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? "Spara" : "Skapa"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Sök…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla statusar</SelectItem>
            {OBLIGATION_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            {OBLIGATION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga åtaganden.</CardContent></Card>
        )}
        {filtered.map((o) => {
          const tier = expiryTier(o.renewal_date ?? o.valid_until, o.status);
          const days = daysUntil(o.renewal_date ?? o.valid_until);
          return (
            <Card key={o.id} className="border-l-4" style={{ borderLeftColor: tierBorder(tier) }}>
              <CardContent className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/obligations/$obligationId" params={{ obligationId: o.id }} className="font-semibold truncate hover:text-primary">
                      {o.title}
                    </Link>
                    <Badge variant="secondary">{obligationTypeLabel(o.obligation_type)}</Badge>
                    <Badge variant="outline">{obligationStatusLabel(o.status)}</Badge>
                    <Badge variant="outline" className={expiryTierClass[tier]}>{expiryTierLabel(tier, days)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                    {o.valid_until && <span>Gäller till {new Date(o.valid_until).toLocaleDateString("sv-SE")}</span>}
                    {o.renewal_date && <span>Förnyas {new Date(o.renewal_date).toLocaleDateString("sv-SE")}</span>}
                  </div>
                  {o.notes && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground line-clamp-2">{o.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(o.id)}><Trash2 className="h-4 w-4" /></Button>
                  <Link to="/obligations/$obligationId" params={{ obligationId: o.id }}>
                    <Button size="icon" variant="ghost"><ChevronRight className="h-4 w-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function tierBorder(t: "green" | "yellow" | "red" | "grey") {
  return t === "green" ? "hsl(var(--primary))"
    : t === "yellow" ? "rgb(245 158 11)"
    : t === "red" ? "hsl(var(--destructive))"
    : "hsl(var(--border))";
}
