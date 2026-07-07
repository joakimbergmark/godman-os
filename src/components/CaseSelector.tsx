import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { lifeAreaLabel } from "@/lib/cases";

const NONE = "__none";

export function CaseSelector({
  value,
  onChange,
  yearId,
  label = "Ärende",
  placeholder = "Inget ärende",
  className,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  yearId?: string | null;
  label?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const { data = [] } = useQuery({
    queryKey: ["cases-lite", yearId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("cases")
        .select("id,title,life_area,status,accounting_year_id")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (yearId) q = q.eq("accounting_year_id", yearId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className={className ?? "space-y-1.5"}>
      {label && <Label>{label}</Label>}
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
      >
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {data.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title} <span className="text-muted-foreground">· {lifeAreaLabel(c.life_area)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
