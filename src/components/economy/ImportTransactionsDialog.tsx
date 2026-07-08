import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { parseBankScreenshot } from "@/lib/parse-bank-screenshot.functions";

type Account = { id: string; name: string };

type Row = {
  key: string;
  selected: boolean;
  date: string;
  description: string;
  amount: string; // string for editable input
  type: "income" | "expense";
  duplicate: boolean;
};

export function ImportTransactionsDialog({
  open, onOpenChange, accounts, principalId, accountingYearId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Account[];
  principalId: string;
  accountingYearId: string | null;
}) {
  const qc = useQueryClient();
  const parseFn = useServerFn(parseBankScreenshot);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const reset = () => {
    setFile(null); setPreview(null); setRows([]);
  };

  const handleFile = (f: File | null) => {
    if (!f) { reset(); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { toast.error("Endast PNG, JPG eller WebP"); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(f);
    setRows([]);
  };

  const parse = async () => {
    if (!file || !accountId) { toast.error("Välj konto och bild"); return; }
    setParsing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const result = await parseFn({ data: { imageBase64: base64, mimeType: file.type } });
      if (!result.rows.length) {
        toast.warning("Inga transaktioner kunde tolkas från bilden.");
        setRows([]);
        return;
      }

      // Duplicate check: fetch existing tx for this account in a broad date range
      const dates = result.rows.map((r) => r.date).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const { data: existing = [] } = await supabase
        .from("transactions")
        .select("transaction_date,type,amount")
        .eq("principal_id", principalId)
        .eq("account_id", accountId)
        .gte("transaction_date", minDate)
        .lte("transaction_date", maxDate);

      const existSet = new Set(
        (existing ?? []).map((e) => `${e.transaction_date}|${e.type}|${Math.round(Number(e.amount) * 100)}`),
      );

      const seenInBatch = new Set<string>();
      const newRows: Row[] = result.rows.map((r, i) => {
        const key = `${r.date}|${r.type}|${Math.round(r.amount * 100)}`;
        const dupInDb = existSet.has(key);
        const dupInBatch = seenInBatch.has(key);
        seenInBatch.add(key);
        const duplicate = dupInDb || dupInBatch;
        return {
          key: `${i}-${key}`,
          selected: !duplicate,
          date: r.date,
          description: r.description,
          amount: r.amount.toFixed(2).replace(".", ","),
          type: r.type,
          duplicate,
        };
      });
      setRows(newRows);
      const dupCount = newRows.filter((r) => r.duplicate).length;
      toast.success(`${newRows.length} rader tolkade` + (dupCount ? ` (${dupCount} möjliga dubbletter)` : ""));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tolkning misslyckades";
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);

  const save = async () => {
    if (!accountingYearId) { toast.error("Välj redovisningsår först"); return; }
    if (selectedRows.length === 0) { toast.error("Inga rader valda"); return; }
    setSaving(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const owner_id = s.session?.user?.id;
      if (!owner_id) { toast.error("Sessionen har gått ut"); return; }

      // Server-side duplicate re-check (broad window covering rows)
      const dates = selectedRows.map((r) => r.date).sort();
      const { data: existing = [] } = await supabase
        .from("transactions")
        .select("transaction_date,type,amount")
        .eq("principal_id", principalId)
        .eq("account_id", accountId)
        .gte("transaction_date", dates[0])
        .lte("transaction_date", dates[dates.length - 1]);
      const existSet = new Set(
        (existing ?? []).map((e) => `${e.transaction_date}|${e.type}|${Math.round(Number(e.amount) * 100)}`),
      );

      type InsertRow = {
        owner_id: string;
        principal_id: string;
        accounting_year_id: string;
        account_id: string;
        transaction_date: string;
        type: "income" | "expense";
        amount: number;
        comment: string | null;
      };
      const toInsert: InsertRow[] = [];
      let skipped = 0;
      const batchSet = new Set<string>();
      for (const r of selectedRows) {
        const amt = Number(String(r.amount).replace(",", "."));
        if (!Number.isFinite(amt) || amt <= 0) { skipped++; continue; }
        const key = `${r.date}|${r.type}|${Math.round(amt * 100)}`;
        if (existSet.has(key) || batchSet.has(key)) { skipped++; continue; }
        batchSet.add(key);
        toInsert.push({
          owner_id,
          principal_id: principalId,
          accounting_year_id: accountingYearId,
          account_id: accountId,
          transaction_date: r.date,
          type: r.type,
          amount: amt,
          comment: r.description || null,
        });
      }

      if (toInsert.length === 0) {
        toast.warning(`Inga nya transaktioner (${skipped} hoppade över som dubbletter).`);
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("transactions").insert(toInsert);
      if (error) { toast.error(error.message); return; }
      toast.success(`${toInsert.length} sparade` + (skipped ? `, ${skipped} hoppade över` : ""));
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["account-balances"] });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ladda upp transaktioner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Konto *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Välj konto…" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Skärmbild (PNG/JPG/WebP, max 8 MB)</Label>
              <Input type="file" accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {preview && (
            <div className="border rounded p-2 bg-muted/30 max-h-64 overflow-auto">
              <img src={preview} alt="Förhandsgranskning" className="max-h-60 mx-auto" />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={parse} disabled={!file || !accountId || parsing}>
              {parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tolkar…</> : <>Tolka bild</>}
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {rows.length} tolkade rader · {selectedRows.length} valda
                {rows.some((r) => r.duplicate) && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> möjliga dubbletter är avmarkerade
                  </span>
                )}
              </div>
              <div className="border rounded divide-y">
                <div className="grid grid-cols-[auto_110px_1fr_120px_110px_auto] gap-2 p-2 text-xs font-medium text-muted-foreground">
                  <div></div>
                  <div>Datum</div>
                  <div>Beskrivning</div>
                  <div>Belopp</div>
                  <div>Typ</div>
                  <div></div>
                </div>
                {rows.map((r) => (
                  <div key={r.key} className="grid grid-cols-[auto_110px_1fr_120px_110px_auto] gap-2 p-2 items-center">
                    <Checkbox
                      checked={r.selected}
                      onCheckedChange={(v) => updateRow(r.key, { selected: !!v })}
                    />
                    <Input type="date" value={r.date}
                      onChange={(e) => updateRow(r.key, { date: e.target.value })} className="h-8" />
                    <Input value={r.description}
                      onChange={(e) => updateRow(r.key, { description: e.target.value })} className="h-8" />
                    <Input inputMode="decimal" value={r.amount}
                      onChange={(e) => updateRow(r.key, { amount: e.target.value })} className="h-8" />
                    <Select value={r.type}
                      onValueChange={(v) => updateRow(r.key, { type: v as "income" | "expense" })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Utgift</SelectItem>
                        <SelectItem value="income">Inkomst</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="w-16 text-right">
                      {r.duplicate && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600">Dubblett</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Avbryt</Button>
          <Button onClick={save} disabled={saving || selectedRows.length === 0}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sparar…</> : <><Upload className="h-4 w-4 mr-2" /> Spara valda ({selectedRows.length})</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
