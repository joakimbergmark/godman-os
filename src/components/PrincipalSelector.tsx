import { UserRound } from "lucide-react";
import { useAccountingYear } from "@/lib/accounting-year";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PrincipalSelector() {
  const { principals, principalId, setPrincipalId } = useAccountingYear();
  if (principals.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <UserRound className="h-4 w-4 text-primary hidden sm:block" />
      <Select value={principalId ?? undefined} onValueChange={setPrincipalId}>
        <SelectTrigger className="h-9 min-w-[150px] max-w-[220px] font-medium" aria-label="Aktiv huvudman">
          <SelectValue placeholder="Välj huvudman" />
        </SelectTrigger>
        <SelectContent>
          {principals.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
