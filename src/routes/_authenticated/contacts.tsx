import { createFileRoute } from "@tanstack/react-router";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

const CATEGORIES = ["Myndighet", "Vård", "Anhörig", "Bank", "Övrigt"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Namn krävs").max(120),
  category: z.string().max(60).optional().or(z.literal("")),
  organization: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Ogiltig e-post").max(255).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;
const empty: Form = { name: "", category: "", organization: "", phone: "", email: "", address: "", postal_code: "", city: "", notes: "" };


function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "category" | "organization">("name");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.filter((c) =>
          [c.name, c.category, c.organization, c.phone, c.email]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : data;
    return [...rows].sort((a, b) => String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "sv"));
  }, [data, search, sortKey]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (row: typeof data[number]) => {
    setEditing(row.id);
    setForm({
      name: row.name,
      category: row.category ?? "",
      organization: row.organization ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: userRes } = await supabase.auth.getUser();
    const owner_id = userRes.user?.id;
    if (!owner_id) return toast.error("Ej inloggad");

    const payload = {
      owner_id,
      name: parsed.data.name,
      category: parsed.data.category || null,
      organization: parsed.data.organization || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    };
    const res = editing
      ? await supabase.from("contacts").update(payload).eq("id", editing)
      : await supabase.from("contacts").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Sparad" : "Tillagd");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  const del = async (id: string) => {
    if (!confirm("Ta bort kontakten?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Kontakter</h1>
          <p className="text-sm text-muted-foreground">Myndigheter, vård, anhöriga och andra viktiga kontakter</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Ny kontakt</Button>
          </DialogTrigger>
          <ContactDialog form={form} setForm={setForm} save={save} editing={!!editing} />
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Sök…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sortera på namn</SelectItem>
            <SelectItem value="category">Sortera på kategori</SelectItem>
            <SelectItem value="organization">Sortera på organisation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga kontakter hittades.</CardContent></Card>
        )}
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold truncate">{c.name}</div>
                  {c.category && <Badge variant="secondary">{c.category}</Badge>}
                </div>
                {c.organization && <div className="text-sm text-muted-foreground truncate">{c.organization}</div>}
                <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.address && <span>📍 {c.address}</span>}
                </div>
                {c.notes && <p className="mt-2 text-sm whitespace-pre-wrap">{c.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContactDialog({
  form, setForm, save, editing,
}: { form: Form; setForm: (f: Form) => void; save: () => void; editing: boolean }) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Redigera kontakt" : "Ny kontakt"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Namn *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Organisation</Label>
          <Input value={form.organization ?? ""} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefon</Label>
          <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>E-post</Label>
          <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Adress</Label>
          <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Anteckningar</Label>
          <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save}>{editing ? "Spara" : "Lägg till"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
