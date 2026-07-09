import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Upload } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";
import { CaseSelector } from "@/components/CaseSelector";
import { ImportTransactionsDialog } from "@/components/economy/ImportTransactionsDialog";

export const Route = createFileRoute("/_authenticated/economy")({
  component: EconomyPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const toNum = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);

// ---------- schemas ----------
const accountSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs").max(120),
  bank_name: z.string().max(120).optional().or(z.literal("")),
  account_number: z.string().max(60).optional().or(z.literal("")),
  account_type: z.string().max(40),
  opening_balance: z.string().refine((s) => !isNaN(Number(s.replace(",", "."))), "Ogiltigt belopp"),
  opening_balance_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
type AccountForm = z.infer<typeof accountSchema>;
const emptyAccount: AccountForm = {
  name: "", bank_name: "", account_number: "", account_type: "bank",
  opening_balance: "0", opening_balance_date: "", notes: "",
};

const txSchema = z.object({
  transaction_date: z.string().min(1, "Datum krävs"),
  type: z.enum(["income", "expense", "transfer"]),
  category_id: z.string().optional().or(z.literal("")),
  amount: z.string().refine((s) => Number(s.replace(",", ".")) > 0, "Belopp krävs"),
  account_id: z.string().min(1, "Konto krävs"),
  counter_account_id: z.string().optional().or(z.literal("")),
  document_id: z.string().optional().or(z.literal("")),
  case_id: z.string().nullable().optional(),
  comment: z.string().max(2000).optional().or(z.literal("")),
});
type TxForm = z.infer<typeof txSchema>;
const emptyTx: TxForm = {
  transaction_date: today(), type: "expense", category_id: "", amount: "",
  account_id: "", counter_account_id: "", document_id: "", case_id: null, comment: "",
};

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bankkonto" },
  { value: "savings", label: "Sparkonto" },
  { value: "cash", label: "Kontanter" },
  { value: "other", label: "Övrigt" },
];

// ---------- page ----------
function EconomyPage() {
  const { selectedId: yearId, years, principalId } = useAccountingYear();
  // Local view year: overrides the global year on this page only.
  // `null` means "Alla år".
  const [viewYearId, setViewYearId] = useState<string | null>(yearId);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setViewYearId(yearId);
  }, [yearId, touched]);

  const viewYear = years.find((y) => y.id === viewYearId) ?? null;
  const subtitle = viewYearId === null
    ? "Alla redovisningsår"
    : viewYear ? `Redovisningsår ${viewYear.year}` : "Inget år valt";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ekonomi</h1>
          <p className="text-sm text-muted-foreground">
            Konton, transaktioner och sammanställning · {subtitle}
          </p>
        </div>
        {principalId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Visar år:</span>
            <Select
              value={viewYearId ?? "__all"}
              onValueChange={(v) => { setTouched(true); setViewYearId(v === "__all" ? null : v); }}
            >
              <SelectTrigger className="min-w-[200px] w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Alla år</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>Redovisningsår {y.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!principalId ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Lägg till en huvudman först för att kunna registrera ekonomi.
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="transactions">Transaktioner</TabsTrigger>
            <TabsTrigger value="accounts">Konton</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Overview viewYearId={viewYearId} /></TabsContent>
          <TabsContent value="transactions"><Transactions viewYearId={viewYearId} defaultYearId={yearId} principalId={principalId} /></TabsContent>
          <TabsContent value="accounts"><Accounts principalId={principalId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---------- Accounts ----------
function Accounts({ principalId }: { principalId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyAccount);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", principalId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*")
        .eq("principal_id", principalId).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: balances = {} } = useQuery({
    queryKey: ["account-balances", principalId, accounts.map((a) => a.id).join(",")],
    enabled: accounts.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions")
        .select("account_id,counter_account_id,type,amount")
        .in("account_id", accounts.map((a) => a.id));
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const a of accounts) map[a.id] = Number(a.opening_balance);
      for (const t of data) {
        const amt = Number(t.amount);
        if (t.type === "income") map[t.account_id] = (map[t.account_id] ?? 0) + amt;
        else if (t.type === "expense") map[t.account_id] = (map[t.account_id] ?? 0) - amt;
        else if (t.type === "transfer") {
          map[t.account_id] = (map[t.account_id] ?? 0) - amt;
          if (t.counter_account_id && map[t.counter_account_id] !== undefined)
            map[t.counter_account_id] = map[t.counter_account_id] + amt;
        }
      }
      return map;
    },
  });

  const openNew = () => { setEditing(null); setForm(emptyAccount); setOpen(true); };
  const openEdit = (row: typeof accounts[number]) => {
    setEditing(row.id);
    setForm({
      name: row.name,
      bank_name: row.bank_name ?? "",
      account_number: row.account_number ?? "",
      account_type: row.account_type,
      opening_balance: String(row.opening_balance),
      opening_balance_date: row.opening_balance_date ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = accountSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: s } = await supabase.auth.getSession();
    const owner_id = s.session?.user?.id;
    if (!owner_id) { toast.error("Sessionen har gått ut"); navigate({ to: "/auth" }); return; }
    const base = {
      name: parsed.data.name,
      bank_name: parsed.data.bank_name || null,
      account_number: parsed.data.account_number || null,
      account_type: parsed.data.account_type,
      opening_balance: Number(parsed.data.opening_balance.replace(",", ".")),
      opening_balance_date: parsed.data.opening_balance_date || null,
      notes: parsed.data.notes || null,
    };
    const res = editing
      ? await supabase.from("accounts").update(base).eq("id", editing)
      : await supabase.from("accounts").insert({ owner_id, principal_id: principalId, ...base });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Sparat" : "Konto skapat");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["account-balances"] });
  };

  const del = async (id: string) => {
    if (!confirm("Ta bort kontot? Alla transaktioner måste först vara borttagna.")) return;
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttaget");
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nytt konto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Redigera konto" : "Nytt konto"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Namn *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank</Label>
                <Input value={form.bank_name ?? ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Kontonummer</Label>
                <Input value={form.account_number ?? ""} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Typ</Label>
                <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ingående saldo</Label>
                <Input inputMode="decimal" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Ingående datum</Label>
                <Input type="date" value={form.opening_balance_date ?? ""} onChange={(e) => setForm({ ...form, opening_balance_date: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Anteckningar</Label>
                <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? "Spara" : "Skapa"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.length === 0 && (
          <Card className="sm:col-span-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga konton ännu.</CardContent></Card>
        )}
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Wallet className="h-4 w-4" /></div>
                    <div>
                      <div className="font-semibold truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[a.bank_name, a.account_number].filter(Boolean).join(" · ") || ACCOUNT_TYPES.find((t) => t.value === a.account_type)?.label}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground">Saldo</div>
                    <div className="text-xl font-semibold">{fmt(balances[a.id] ?? Number(a.opening_balance))}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Categories helper ----------
function useCategories() {
  return useQuery({
    queryKey: ["transaction-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transaction_categories")
        .select("*").order("kind").order("name");
      if (error) throw error;
      return data;
    },
  });
}

// ---------- Transactions ----------
function Transactions({
  viewYearId, defaultYearId, principalId,
}: {
  viewYearId: string | null;
  defaultYearId: string | null;
  principalId: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TxForm>(emptyTx);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCat, setNewCat] = useState<{ name: string; kind: "income" | "expense" }>({ name: "", kind: "expense" });
  const [importOpen, setImportOpen] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", principalId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("id,name")
        .eq("principal_id", principalId).order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: categories = [] } = useCategories();
  const { data: documents = [] } = useQuery({
    queryKey: ["documents-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id,title").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const { data: cases = [] } = useQuery({
    queryKey: ["cases-lite", principalId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("id,title").eq("principal_id", principalId).order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", viewYearId ?? "all", principalId],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").eq("principal_id", principalId);
      if (viewYearId) q = q.eq("accounting_year_id", viewYearId);
      const { data, error } = await q.order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const rows = txs.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
      return true;
    });
    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "date_desc") return String(b.transaction_date).localeCompare(String(a.transaction_date));
      if (sortKey === "date_asc") return String(a.transaction_date).localeCompare(String(b.transaction_date));
      const av = Number(a.amount), bv = Number(b.amount);
      return sortKey === "amount_desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [txs, filterType, filterCategory, sortKey]);

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "";
  const docTitle = (id: string | null) => documents.find((d) => d.id === id)?.title ?? "";
  const caseTitle = (id: string | null) => cases.find((k) => k.id === id)?.title ?? "";

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyTx, account_id: accounts[0]?.id ?? "" });
    setOpen(true);
  };
  const openEdit = (t: typeof txs[number]) => {
    setEditing(t.id);
    setForm({
      transaction_date: t.transaction_date,
      type: t.type as TxForm["type"],
      category_id: t.category_id ?? "",
      amount: String(t.amount),
      account_id: t.account_id,
      counter_account_id: t.counter_account_id ?? "",
      document_id: t.document_id ?? "",
      case_id: t.case_id ?? null,
      comment: t.comment ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = txSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const targetYearId = viewYearId ?? defaultYearId;
    if (!targetYearId) return toast.error("Välj redovisningsår först");
    if (parsed.data.type === "transfer" && !parsed.data.counter_account_id)
      return toast.error("Välj motkonto för överföring");
    const { data: s } = await supabase.auth.getSession();
    const owner_id = s.session?.user?.id;
    if (!owner_id) { toast.error("Sessionen har gått ut"); navigate({ to: "/auth" }); return; }
    const base = {
      transaction_date: parsed.data.transaction_date,
      type: parsed.data.type,
      category_id: parsed.data.type === "transfer" ? null : (parsed.data.category_id || null),
      amount: Number(parsed.data.amount.replace(",", ".")),
      account_id: parsed.data.account_id,
      counter_account_id: parsed.data.type === "transfer" ? parsed.data.counter_account_id : null,
      document_id: parsed.data.document_id || null,
      case_id: parsed.data.case_id || null,
      comment: parsed.data.comment || null,
    };
    const res = editing
      ? await supabase.from("transactions").update(base).eq("id", editing)
      : await supabase.from("transactions").insert({ owner_id, principal_id: principalId, accounting_year_id: targetYearId, ...base });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Sparad" : "Registrerad");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["account-balances"] });
  };

  const del = async (id: string) => {
    if (!confirm("Ta bort transaktionen?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["account-balances"] });
  };

  const saveCategory = async () => {
    if (!newCat.name.trim()) return toast.error("Namn krävs");
    const { data: s } = await supabase.auth.getSession();
    const owner_id = s.session?.user?.id;
    if (!owner_id) return toast.error("Ej inloggad");
    const { data, error } = await supabase.from("transaction_categories")
      .insert({ owner_id, name: newCat.name.trim(), kind: newCat.kind }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Kategori skapad");
    setNewCatOpen(false);
    setNewCat({ name: "", kind: newCat.kind });
    qc.invalidateQueries({ queryKey: ["transaction-categories"] });
    setForm((f) => ({ ...f, category_id: data.id }));
  };

  const relevantCats = categories.filter((c) =>
    form.type === "transfer" ? false : c.kind === (form.type === "income" ? "income" : "expense")
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="income">Inkomster</SelectItem>
              <SelectItem value="expense">Utgifter</SelectItem>
              <SelectItem value="transfer">Överföringar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kategorier</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.kind === "income" ? "inkomst" : "utgift"})</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Datum, nyast först</SelectItem>
              <SelectItem value="date_asc">Datum, äldst först</SelectItem>
              <SelectItem value="amount_desc">Belopp, störst först</SelectItem>
              <SelectItem value="amount_asc">Belopp, minst först</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={accounts.length === 0}>
            <Upload className="h-4 w-4 mr-1" /> Ladda upp transaktioner
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} disabled={accounts.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Ny transaktion
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Redigera transaktion" : "Ny transaktion"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Datum *</Label>
                <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Typ *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TxForm["type"], category_id: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Inkomst</SelectItem>
                    <SelectItem value="expense">Utgift</SelectItem>
                    <SelectItem value="transfer">Överföring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Belopp *</Label>
                <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Konto *</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.type === "transfer" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Motkonto *</Label>
                  <Select value={form.counter_account_id ?? ""} onValueChange={(v) => setForm({ ...form, counter_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter((a) => a.id !== form.account_id).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.type !== "transfer" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Kategori</Label>
                    <Button type="button" variant="link" size="sm" className="h-auto p-0"
                      onClick={() => { setNewCat({ name: "", kind: form.type === "income" ? "income" : "expense" }); setNewCatOpen(true); }}>
                      + Ny kategori
                    </Button>
                  </div>
                  <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
                    <SelectContent>{relevantCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bilaga (dokument)</Label>
                <Select value={form.document_id ?? "__none"} onValueChange={(v) => setForm({ ...form, document_id: v === "__none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Inget dokument" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Inget dokument</SelectItem>
                    {documents.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <CaseSelector value={form.case_id ?? null} onChange={(v) => setForm({ ...form, case_id: v })} yearId={viewYearId ?? defaultYearId} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Kommentar</Label>
                <Textarea rows={3} value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? "Spara" : "Registrera"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <ImportTransactionsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accounts}
        principalId={principalId}
        accountingYearId={viewYearId ?? defaultYearId}
      />

      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ny kategori</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Namn</Label>
              <Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={newCat.kind} onValueChange={(v) => setNewCat({ ...newCat, kind: v as "income" | "expense" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Inkomst</SelectItem>
                  <SelectItem value="expense">Utgift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={saveCategory}>Skapa</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-2">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inga transaktioner.</CardContent></Card>
        )}
        {filtered.map((t) => {
          const amt = Number(t.amount);
          const Icon = t.type === "income" ? ArrowDownCircle : t.type === "expense" ? ArrowUpCircle : ArrowLeftRight;
          const color = t.type === "income" ? "text-emerald-600" : t.type === "expense" ? "text-rose-600" : "text-sky-600";
          const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
          return (
            <Card key={t.id}>
              <CardContent className="p-3 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-3 items-center">
                <Icon className={`h-5 w-5 ${color}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString("sv-SE")}</span>
                    {t.category_id && <Badge variant="secondary">{categoryName(t.category_id)}</Badge>}
                    {t.document_id && <Badge variant="outline" className="text-[10px]">📎 {docTitle(t.document_id)}</Badge>}
                    {t.case_id && (
                      <Link to="/cases/$caseId" params={{ caseId: t.case_id }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <Badge variant="outline" className="text-[10px] hover:bg-accent">🗂 {caseTitle(t.case_id) || "Ärende"}</Badge>
                      </Link>
                    )}
                  </div>
                  <div className="text-sm mt-0.5 truncate">
                    {t.type === "transfer"
                      ? <>Överföring {accountName(t.account_id)} → {accountName(t.counter_account_id)}</>
                      : <>{accountName(t.account_id)}</>}
                    {t.comment && <span className="text-muted-foreground"> · {t.comment}</span>}
                  </div>
                </div>
                <div className={`font-semibold whitespace-nowrap ${color}`}>{sign}{fmt(amt)}</div>
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

// ---------- Overview ----------
function Overview({ viewYearId }: { viewYearId: string | null }) {
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions-overview", viewYearId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*");
      if (viewYearId) q = q.eq("accounting_year_id", viewYearId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  const { data: categories = [] } = useCategories();

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    const byCat: Record<string, { name: string; kind: string; total: number }> = {};
    for (const t of txs) {
      const amt = Number(t.amount);
      if (t.type === "income") income += amt;
      else if (t.type === "expense") expense += amt;
      if (t.type !== "transfer" && t.category_id) {
        const c = categories.find((x) => x.id === t.category_id);
        const key = t.category_id;
        if (!byCat[key]) byCat[key] = { name: c?.name ?? "Okänd", kind: c?.kind ?? t.type, total: 0 };
        byCat[key].total += amt;
      }
    }
    const cats = Object.values(byCat).sort((a, b) => b.total - a.total);
    return { income, expense, net: income - expense, cats };
  }, [txs, categories]);


  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Totala inkomster</div>
          <div className="text-2xl font-semibold text-emerald-600 mt-1">{fmt(stats.income)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Totala utgifter</div>
          <div className="text-2xl font-semibold text-rose-600 mt-1">{fmt(stats.expense)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Nettoförändring</div>
          <div className={`text-2xl font-semibold mt-1 ${stats.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(stats.net)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Fördelning per kategori</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stats.cats.length === 0 && <p className="text-sm text-muted-foreground">Inga transaktioner med kategori.</p>}
          {stats.cats.map((c) => {
            const base = c.kind === "income" ? stats.income : stats.expense;
            const pct = base > 0 ? (c.total / base) * 100 : 0;
            return (
              <div key={c.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{c.name} <span className="text-muted-foreground text-xs">({c.kind === "income" ? "inkomst" : "utgift"})</span></span>
                  <span className="font-medium">{fmt(c.total)} <span className="text-muted-foreground text-xs">· {pct.toFixed(0)}%</span></span>
                </div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div className={c.kind === "income" ? "h-full bg-emerald-500" : "h-full bg-rose-500"} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
