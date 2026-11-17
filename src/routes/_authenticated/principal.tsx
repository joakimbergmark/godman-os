import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAccountingYear } from "@/lib/accounting-year";
import { Badge } from "@/components/ui/badge";
import { Plus, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/principal")({
  component: PrincipalPage,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Namn krävs").max(120),
  personal_number: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Ogiltig e-post").max(255).optional().or(z.literal("")),
  notes: z.string().max(4000).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  full_name: "",
  personal_number: "",
  address: "",
  postal_code: "",
  city: "",
  phone: "",
  email: "",
  notes: "",
};


function PrincipalPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const { principals, principalId, setPrincipalId, refresh } = useAccountingYear();
  const [editId, setEditId] = useState<string | null | "new">(null);
  const currentId = editId === "new" ? null : (editId ?? principalId);


  const { data, isLoading } = useQuery({
    queryKey: ["principal", currentId],
    queryFn: async () => {
      if (!currentId) return null;
      const { data, error } = await supabase.from("principal").select("*").eq("id", currentId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!currentId) { setForm(empty); return; }
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        personal_number: data.personal_number ?? "",
        address: data.address ?? "",
        postal_code: data.postal_code ?? "",
        city: data.city ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        notes: data.notes ?? "",
      });
    }
  }, [data, currentId]);

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const owner_id = sessionRes.session?.user?.id;
      if (!owner_id) {
        toast.error("Sessionen har gått ut, logga in igen");
        navigate({ to: "/auth" });
        return;
      }

      const base = {
        full_name: parsed.data.full_name,
        personal_number: parsed.data.personal_number || null,
        address: parsed.data.address || null,
        postal_code: parsed.data.postal_code || null,
        city: parsed.data.city || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      };
      if (data?.id) {
        const { error } = await supabase.from("principal").update(base).eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("principal").insert({ owner_id, ...base }).select("id").single();
        if (error) throw error;
        setPrincipalId(created.id);
        setEditId(created.id);
      }
      refresh();

      toast.success("Sparat");
      qc.invalidateQueries({ queryKey: ["principal"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!data?.id) return;
    if (!confirm("Ta bort huvudmannen? All data kopplad till personen kan försvinna.")) return;
    const { error } = await supabase.from("principal").delete().eq("id", data.id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    setForm(empty);
    setEditId(null);
    refresh();
    qc.invalidateQueries({ queryKey: ["principal"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Huvudmän</h1>
        <p className="text-sm text-muted-foreground">Personer du är god man för. Välj vem du arbetar med i toppmenyn.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {principals.map((p) => (
          <Button
            key={p.id}
            variant={currentId === p.id ? "default" : "outline"}
            onClick={() => setEditId(p.id)}
            className="gap-2"
          >
            <UserRound className="h-4 w-4" />
            {p.full_name}
            {p.id === principalId && <Badge variant="secondary" className="ml-1">Aktiv</Badge>}
          </Button>
        ))}
        <Button variant={editId === "new" ? "default" : "ghost"} onClick={() => setEditId("new")}>
          <Plus className="h-4 w-4 mr-1" /> Ny huvudman
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{currentId ? "Uppgifter" : "Ny huvudman"}</CardTitle>
            {currentId && currentId !== principalId && (
              <Button size="sm" variant="outline" onClick={() => setPrincipalId(currentId)}>Arbeta med denna person</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Namn *" id="full_name">
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </Field>
                <Field label="Personnummer" id="pnr">
                  <Input
                    id="pnr"
                    value={form.personal_number ?? ""}
                    onChange={(e) => setForm({ ...form, personal_number: e.target.value })}
                    placeholder="ÅÅÅÅMMDD-XXXX"
                  />
                </Field>
                <Field label="Telefon" id="phone">
                  <Input
                    id="phone"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="E-post" id="email">
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Gatuadress" id="address">
                    <Input
                      id="address"
                      value={form.address ?? ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Postnummer" id="postal_code">
                  <Input
                    id="postal_code"
                    value={form.postal_code ?? ""}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  />
                </Field>
                <Field label="Ort" id="city">
                  <Input
                    id="city"
                    value={form.city ?? ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Anteckningar" id="notes">
                    <Textarea
                      id="notes"
                      rows={5}
                      value={form.notes ?? ""}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                {data?.id && (
                  <Button variant="destructive" onClick={del} disabled={saving}>
                    Ta bort
                  </Button>
                )}
                <Button onClick={save} disabled={saving}>
                  {saving ? "Sparar…" : "Spara"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
