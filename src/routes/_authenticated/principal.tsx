import { createFileRoute } from "@tanstack/react-router";
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
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["principal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("principal").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
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
  }, [data]);

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const owner_id = userRes.user?.id;
      if (!owner_id) throw new Error("Ej inloggad");

      const payload = {
        owner_id,
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
        const { error } = await supabase.from("principal").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("principal").insert(payload);
        if (error) throw error;
      }
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
    if (!confirm("Ta bort huvudmannens uppgifter?")) return;
    const { error } = await supabase.from("principal").delete().eq("id", data.id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["principal"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Huvudman</h1>
        <p className="text-sm text-muted-foreground">Personuppgifter och anteckningar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uppgifter</CardTitle>
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
