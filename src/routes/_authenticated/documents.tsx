import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
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
import { Download, Pencil, Plus, Search, Trash2, ArrowUpDown, FileText } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";


export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
});

const CATEGORIES = ["Beslut", "Kvitto", "Faktura", "Läkarintyg", "Avtal", "Övrigt"] as const;

const metaSchema = z.object({
  title: z.string().trim().min(1, "Titel krävs").max(200),
  category: z.string().max(60).optional().or(z.literal("")),
  document_date: z.string().optional().or(z.literal("")),
  comment: z.string().max(2000).optional().or(z.literal("")),
  year_scope: z.enum(["current", "general"]),
});
type Meta = z.infer<typeof metaSchema>;
const empty: Meta = { title: "", category: "", document_date: "", comment: "", year_scope: "current" };


function DocumentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { selectedId: yearId, selected: selectedYear } = useAccountingYear();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"created_at" | "title" | "category" | "document_date">("created_at");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Meta>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data = [] } = useQuery({
    queryKey: ["documents", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      // Show documents for selected year OR general (accounting_year_id is null)
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .or(`accounting_year_id.eq.${yearId},accounting_year_id.is.null`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.filter((d) =>
          [d.title, d.category, d.comment, d.file_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
        )
      : data;
    return [...rows].sort((a, b) => {
      if (sortKey === "created_at" || sortKey === "document_date")
        return String(b[sortKey] ?? "").localeCompare(String(a[sortKey] ?? ""));
      return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "sv");
    });
  }, [data, search, sortKey]);

  const openNew = () => { setEditing(null); setForm(empty); setFile(null); setOpen(true); };
  const openEdit = (row: typeof data[number]) => {
    setEditing(row.id);
    setForm({
      title: row.title,
      category: row.category ?? "",
      document_date: row.document_date ?? "",
      comment: row.comment ?? "",
      year_scope: row.accounting_year_id ? "current" : "general",
    });

    setFile(null);
    setOpen(true);
  };

  const save = async () => {
    const parsed = metaSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: sessionRes } = await supabase.auth.getSession();
    const owner_id = sessionRes.session?.user?.id;
    if (!owner_id) {
      toast.error("Sessionen har gått ut, logga in igen");
      navigate({ to: "/auth" });
      return;
    }


    setUploading(true);
    try {
      const accounting_year_id = parsed.data.year_scope === "general" ? null : yearId;
      const base = {
        title: parsed.data.title,
        category: parsed.data.category || null,
        document_date: parsed.data.document_date || null,
        comment: parsed.data.comment || null,
        accounting_year_id,
      };

      if (editing) {
        let extra: Record<string, unknown> = {};
        if (file) {
          if (file.size > 20 * 1024 * 1024) throw new Error("Max 20 MB per fil");
          const path = `${owner_id}/${crypto.randomUUID()}-${file.name}`;
          const up = await supabase.storage.from("documents").upload(path, file);
          if (up.error) throw up.error;
          extra = { storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size };
        }
        const { error } = await supabase.from("documents").update({ ...base, ...extra }).eq("id", editing);
        if (error) throw error;
      } else {
        if (!file) throw new Error("Välj en fil att ladda upp");
        if (file.size > 20 * 1024 * 1024) throw new Error("Max 20 MB per fil");
        if (parsed.data.year_scope === "current" && !yearId) throw new Error("Välj redovisningsår först");
        const path = `${owner_id}/${crypto.randomUUID()}-${file.name}`;
        const up = await supabase.storage.from("documents").upload(path, file);
        if (up.error) throw up.error;
        const { error } = await supabase.from("documents").insert({
          owner_id, ...base,
          storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size,
        });
        if (error) throw error;
      }

      toast.success(editing ? "Sparat" : "Uppladdad");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fel vid uppladdning");
    } finally {
      setUploading(false);
    }
  };

  const del = async (row: typeof data[number]) => {
    if (!confirm("Ta bort dokumentet?")) return;
    if (row.storage_path) await supabase.storage.from("documents").remove([row.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Borttaget");
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const download = async (row: typeof data[number]) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(row.storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Kunde inte skapa länk");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Dokument</h1>
          <p className="text-sm text-muted-foreground">
            Ladda upp och organisera dokument{selectedYear ? ` · Redovisningsår ${selectedYear.year} + generella` : ""}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nytt dokument</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Redigera dokument" : "Ladda upp dokument"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Titel *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Datum</Label>
                <Input type="date" value={form.document_date ?? ""} onChange={(e) => setForm({ ...form, document_date: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Kommentar</Label>
                <Textarea rows={3} value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Fil {editing && "(valfritt – ersätter befintlig)"}</Label>
                <Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Max 20 MB.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={uploading}>{uploading ? "Sparar…" : editing ? "Spara" : "Ladda upp"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Sök…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
          <SelectTrigger className="w-[200px]"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Senast uppladdad</SelectItem>
            <SelectItem value="document_date">Dokumentdatum</SelectItem>
            <SelectItem value="title">Titel</SelectItem>
            <SelectItem value="category">Kategori</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga dokument.</CardContent></Card>
        )}
        {filtered.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
              <div className="min-w-0 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold truncate">{d.title}</div>
                    {d.category && <Badge variant="secondary">{d.category}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {d.file_name} · uppladdad {new Date(d.created_at).toLocaleDateString("sv-SE")}
                    {d.document_date && ` · datum ${new Date(d.document_date).toLocaleDateString("sv-SE")}`}
                  </div>
                  {d.comment && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{d.comment}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(d)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
