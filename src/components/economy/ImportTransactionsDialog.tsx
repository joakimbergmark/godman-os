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
import { isDuplicate, shiftDate, DAY_TOLERANCE, type ExistingTx } from "@/lib/import-duplicates";

type Account = { id: string; name: string };

type Row = {
  key: string;
  selected: boolean;
  date: string;
  bookingDate: string | null;
  description: string;
  amount: string; // string for editable input
  type: "income" | "expense";
  duplicate: boolean;
};

type Mode = "image" | "excel";

function toIsoDate(v: unknown): string {
  if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return "";
}

function toAmount(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/\s|\u00a0/g, "").replace(/kr/i, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function cellValue(v: unknown): unknown {
  if (v && typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("");
    if (o.text !== undefined) return o.text;
    if (o.result !== undefined) return o.result;
  }
  return v;
}

async function parseExcelFile(file: File): Promise<Omit<Row, "key" | "selected" | "duplicate">[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const grid: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    grid.push(values.map(cellValue));
  });

  const headerIdx = grid.findIndex((r) =>
    (r ?? []).some((c) => /transaktionsdatum/i.test(String(c ?? ""))),
  );
  if (headerIdx === -1) throw new Error("Hittade ingen rubrikrad med \"Transaktionsdatum\" i filen.");

  const header = (grid[headerIdx] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const iBooking = col(/reskontra/);
  const iDate = col(/transaktionsdatum/);
  const iText = col(/^text|beskrivning/);
  const iAmount = col(/belopp/);
  if (iDate === -1 || iAmount === -1) throw new Error("Kolumnerna Transaktionsdatum och Belopp krävs.");

  const out: Omit<Row, "key" | "selected" | "duplicate">[] = [];
  for (const r of grid.slice(headerIdx + 1)) {
    if (!r) continue;
    const date = toIsoDate(r[iDate]);
    const amt = toAmount(r[iAmount]);
    if (!date || !Number.isFinite(amt) || amt === 0) continue;
    out.push({
      date,
      bookingDate: iBooking >= 0 ? (toIsoDate(r[iBooking]) || null) : null,
      description: iText >= 0 ? String(r[iText] ?? "").trim() : "",
      amount: Math.abs(amt).toFixed(2).replace(".", ","),
      type: amt < 0 ? "expense" : "income",
    });
  }
  return out;
}

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
  const [mode, setMode] = useState<Mode>("excel");
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
    if (mode === "image" && !/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      toast.error("Endast PNG, JPG eller WebP"); return;
    }
    if (mode === "excel" && !/\.(xlsx|xls)$/i.test(f.name)) {
      toast.error("Endast .xlsx eller .xls"); return;
    }
    setFile(f);
    setRows([]);
    if (mode === "image") {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const fetchExisting = async (dates: string[]): Promise<ExistingTx[]> => {
    const sorted = [...dates].filter(Boolean).sort();
    if (sorted.length === 0) return [];
    const { data } = await supabase
      .from("transactions")
      .select("transaction_date,type,amount,comment")
      .eq("principal_id", principalId)
      .eq("account_id", accountId)
      .gte("transaction_date", shiftDate(sorted[0]!, -DAY_TOLERANCE))
      .lte("transaction_date", shiftDate(sorted[sorted.length - 1]!, DAY_TOLERANCE));
    return (data ?? []) as ExistingTx[];
  };

  const markDuplicates = (
    parsed: Omit<Row, "key" | "selected" | "duplicate">[],
    existing: ExistingTx[],
  ): Row[] => {
    const seen: ExistingTx[] = [];
    return parsed.map((r, i) => {
      const cand = {
        date: r.date,
        bookingDate: r.bookingDate,
        description: r.description,
        amount: Number(r.amount.replace(",", ".")),
        type: r.type,
      };
      const duplicate = isDuplicate(cand, existing) || isDuplicate(cand, seen);
      seen.push({
        transaction_date: r.date,
        type: r.type,
        amount: cand.amount,
        comment: r.description,
      });
      return { ...r, key: `${i}-${r.date}-${r.amount}-${r.type}`, selected: !duplicate, duplicate };
    });
  };

  const parse = async () => {
    if (!file || !accountId) { toast.error("Välj konto och fil"); return; }
    setParsing(true);
    try {
      let parsed: Omit<Row, "key" | "selected" | "duplicate">[];

      if (mode === "excel") {
        parsed = await parseExcelFile(file);
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(file);
        });
        const base64 = dataUrl.split(",")[1] ?? "";
        const result = await parseFn({ data: { imageBase64: base64, mimeType: file.type } });
        parsed = result.rows.map((r) => ({
          date: r.date,
          bookingDate: null,
          description: r.description,
          amount: r.amount.toFixed(2).replace(".", ","),
          type: r.type,
        }));
      }

      if (!parsed.length) {
        toast.warning("Inga transaktioner kunde tolkas från filen.");
        setRows([]);
        return;
      }

      const existing = await fetchExisting(parsed.flatMap((r) => [r.date, r.bookingDate ?? ""]));
      const newRows = markDuplicates(parsed, existing);
      setRows(newRows);
      const dupCount = newRows.filter((r) => r.duplicate).length;
      toast.success(`${newRows.length} rader tolkade` + (dupCount ? ` (${dupCount} redan importerade)` : ""));
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

      const existing = await fetchExisting(selectedRows.flatMap((r) => [r.date, r.bookingDate ?? ""]));

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
      const accepted: ExistingTx[] = [];
      let skipped = 0;
      for (const r of selectedRows) {
        const amt = Number(String(r.amount).replace(",", "."));
        if (!Number.isFinite(amt) || amt <= 0) { skipped++; continue; }
        const cand = {
          date: r.date, bookingDate: r.bookingDate, description: r.description,
          amount: amt, type: r.type,
        };
        if (isDuplicate(cand, existing) || isDuplicate(cand, accepted)) { skipped++; continue; }
        accepted.push({ transaction_date: r.date, type: r.type, amount: amt, comment: r.description });
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Källa *</Label>
              <Select value={mode} onValueChange={(v) => { setMode(v as Mode); reset(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel-fil (.xlsx)</SelectItem>
                  <SelectItem value="image">Skärmbild (AI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Label>{mode === "excel" ? "Excel-fil (max 8 MB)" : "Skärmbild (PNG/JPG/WebP)"}</Label>
              <Input
                type="file"
                accept={mode === "excel"
                  ? ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  : "image/png,image/jpeg,image/webp"}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {preview && (
            <div className="border rounded p-2 bg-muted/30 max-h-64 overflow-auto">
              <img src={preview} alt="Förhandsgranskning" className="max-h-60 mx-auto" />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={parse} disabled={!file || !accountId || parsing}>
              {parsing
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tolkar…</>
                : <>{mode === "excel" ? "Läs fil" : "Tolka bild"}</>}
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {rows.length} tolkade rader · {selectedRows.length} valda
                {rows.some((r) => r.duplicate) && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> redan importerade rader är avmarkerade
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
