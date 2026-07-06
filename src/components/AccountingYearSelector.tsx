import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function AccountingYearSelector() {
  const { years, selectedId, setSelectedId, principalId, refresh } = useAccountingYear();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  if (!principalId) {
    return (
      <div className="hidden md:flex items-center text-xs text-muted-foreground gap-1.5">
        <Calendar className="h-4 w-4" />
        <span>Ingen huvudman</span>
      </div>
    );
  }

  const addYear = async () => {
    if (!year || year < 1900 || year > 2999) return toast.error("Ogiltigt år");
    const { data: sessionRes } = await supabase.auth.getSession();
    const owner_id = sessionRes.session?.user?.id;
    if (!owner_id) return toast.error("Ej inloggad");
    setSaving(true);
    const { data, error } = await supabase
      .from("accounting_years")
      .insert({ owner_id, principal_id: principalId, year, status: "active" })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      if (error.code === "23505") return toast.error(`Redovisningsåret ${year} finns redan`);
      return toast.error(error.message);
    }
    toast.success(`Redovisningsår ${year} skapat`);
    refresh();
    qc.invalidateQueries();
    if (data?.id) setSelectedId(data.id);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <span className="text-xs text-muted-foreground hidden md:inline">Redovisningsår</span>
      <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
        <SelectTrigger className="h-9 w-[110px]">
          <SelectValue placeholder="Välj år" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
          ))}
          {years.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Inga år ännu</div>
          )}
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-9 w-9" title="Nytt redovisningsår">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nytt redovisningsår</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Kalenderår</Label>
            <Input
              type="number"
              min={1900}
              max={2999}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button onClick={addYear} disabled={saving}>Lägg till</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
