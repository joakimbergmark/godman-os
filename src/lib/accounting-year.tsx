import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountingYear = {
  id: string;
  year: number;
  status: string;
  principal_id: string;
  notes: string | null;
};

type Ctx = {
  years: AccountingYear[];
  selected: AccountingYear | null;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  principalId: string | null;
  isLoading: boolean;
  refresh: () => void;
};

const AccountingYearContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "godman.selectedAccountingYearId";

export function AccountingYearProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const { data: principalId = null } = useQuery({
    queryKey: ["principal-id"],
    queryFn: async () => {
      const { data, error } = await supabase.from("principal").select("id").limit(1).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });

  const { data: years = [], isLoading } = useQuery({
    queryKey: ["accounting-years", principalId],
    enabled: !!principalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_years")
        .select("id,year,status,principal_id,notes")
        .eq("principal_id", principalId!)
        .order("year", { ascending: false });
      if (error) throw error;
      return data as AccountingYear[];
    },
  });

  // Ensure a valid selection
  useEffect(() => {
    if (years.length === 0) return;
    const has = selectedId && years.find((y) => y.id === selectedId);
    if (has) return;
    const currentYear = new Date().getFullYear();
    const preferred = years.find((y) => y.year === currentYear) ?? years[0];
    setSelectedIdState(preferred.id);
    localStorage.setItem(STORAGE_KEY, preferred.id);
  }, [years, selectedId]);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const selected = useMemo(
    () => years.find((y) => y.id === selectedId) ?? null,
    [years, selectedId],
  );

  const value: Ctx = {
    years,
    selected,
    selectedId,
    setSelectedId,
    principalId,
    isLoading,
    refresh: () => {
      qc.invalidateQueries({ queryKey: ["accounting-years"] });
      qc.invalidateQueries({ queryKey: ["principal-id"] });
    },
  };

  return <AccountingYearContext.Provider value={value}>{children}</AccountingYearContext.Provider>;
}

export function useAccountingYear() {
  const ctx = useContext(AccountingYearContext);
  if (!ctx) throw new Error("useAccountingYear must be used inside AccountingYearProvider");
  return ctx;
}

export const YEAR_STATUS_LABELS: Record<string, string> = {
  active: "Pågående",
  in_progress: "Årsräkning förbereds",
  submitted: "Inskickad",
  completed: "Avslutad",
  archived: "Arkiverad",
};
