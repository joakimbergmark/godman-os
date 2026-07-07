import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, ShieldCheck, FileText, Activity as ActivityIcon, Briefcase, Clock } from "lucide-react";
import {
  obligationTypeLabel, obligationStatusLabel,
  expiryTier, expiryTierClass, expiryTierLabel, daysUntil,
} from "@/lib/obligations";

export const Route = createFileRoute("/_authenticated/obligations/$obligationId")({
  component: ObligationDetailPage,
});

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");
const fmtDT = (d?: string | null) => (d ? new Date(d).toLocaleString("sv-SE") : "—");

function ObligationDetailPage() {
  const { obligationId } = Route.useParams();
  const navigate = useNavigate();

  const { data: o, isLoading } = useQuery({
    queryKey: ["obligation", obligationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("obligations").select("*").eq("id", obligationId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedCase } = useQuery({
    queryKey: ["obligation-case", o?.case_id],
    enabled: !!o?.case_id,
    queryFn: async () => (await supabase.from("cases").select("id,title,life_area,status").eq("id", o!.case_id!).maybeSingle()).data,
  });

  const { data: contact } = useQuery({
    queryKey: ["obligation-contact", o?.authority_contact_id],
    enabled: !!o?.authority_contact_id,
    queryFn: async () => (await supabase.from("contacts").select("id,name,email,phone,organization").eq("id", o!.authority_contact_id!).maybeSingle()).data,
  });

  const { data: primaryDoc } = useQuery({
    queryKey: ["obligation-doc", o?.document_id],
    enabled: !!o?.document_id,
    queryFn: async () => (await supabase.from("documents").select("id,title,file_name,created_at").eq("id", o!.document_id!).maybeSingle()).data,
  });

  // Related documents/activities via the linked case (om finns)
  const { data: caseDocs = [] } = useQuery({
    queryKey: ["obligation-case-docs", o?.case_id],
    enabled: !!o?.case_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id,title,file_name,created_at,category").eq("case_id", o!.case_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: caseActs = [] } = useQuery({
    queryKey: ["obligation-case-acts", o?.case_id],
    enabled: !!o?.case_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("id,title,activity_date,category").eq("case_id", o!.case_id!).order("activity_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Läser in…</p>;
  if (!o) return <p className="text-sm text-muted-foreground">Åtagandet hittades inte.</p>;

  const refDate = o.renewal_date ?? o.valid_until;
  const tier = expiryTier(refDate, o.status);
  const days = daysUntil(refDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/obligations" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Åtaganden
        </Button>
      </div>

      <Card className="border-l-4" style={{ borderLeftColor: tier === "green" ? "hsl(var(--primary))" : tier === "yellow" ? "rgb(245 158 11)" : tier === "red" ? "hsl(var(--destructive))" : "hsl(var(--border))" }}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold truncate">{o.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{obligationTypeLabel(o.obligation_type)}</Badge>
                <Badge variant="outline">{obligationStatusLabel(o.status)}</Badge>
                <Badge variant="outline" className={expiryTierClass[tier]}>{expiryTierLabel(tier, days)}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Grundinformation</TabsTrigger>
          <TabsTrigger value="case">Ärende</TabsTrigger>
          <TabsTrigger value="documents">Dokument</TabsTrigger>
          <TabsTrigger value="activities">Aktiviteter</TabsTrigger>
          <TabsTrigger value="notes">Anteckningar</TabsTrigger>
          <TabsTrigger value="history">Historik</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card><CardContent className="p-5 grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Beslutsdatum" value={fmt(o.decision_date)} />
            <Field label="Gäller från" value={fmt(o.valid_from)} />
            <Field label="Gäller till" value={fmt(o.valid_until)} />
            <Field label="Förnyelsedatum" value={fmt(o.renewal_date)} />
            <Field label="Påminnelse" value={`${o.reminder_days_before} dagar innan`} />
            <Field label="Myndighet/Kontakt" value={
              contact ? (
                <div>
                  <div>{contact.name}</div>
                  <div className="text-xs text-muted-foreground">{[contact.organization, contact.email, contact.phone].filter(Boolean).join(" · ")}</div>
                </div>
              ) : "—"
            } />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="case">
          <Card><CardContent className="p-5 text-sm">
            {relatedCase ? (
              <Link to="/cases/$caseId" params={{ caseId: relatedCase.id }} className="flex items-center gap-2 hover:text-primary">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">{relatedCase.title}</span>
                <Badge variant="outline">{relatedCase.status}</Badge>
              </Link>
            ) : (
              <p className="text-muted-foreground">Inget ärende kopplat.</p>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card><CardContent className="p-5 text-sm space-y-2">
            {primaryDoc && (
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{primaryDoc.title}</span>
                <Badge variant="outline" className="text-[10px]">Kopplat huvuddokument</Badge>
              </div>
            )}
            {caseDocs.length === 0 && !primaryDoc && (
              <p className="text-muted-foreground">Inga dokument.</p>
            )}
            {caseDocs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 py-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{d.title}</span>
                {d.category && <Badge variant="secondary">{d.category}</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{fmt(d.created_at)}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card><CardContent className="p-5 text-sm space-y-2">
            {caseActs.length === 0 ? (
              <p className="text-muted-foreground">Inga aktiviteter via kopplat ärende.</p>
            ) : caseActs.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{a.title}</span>
                {a.category && <Badge variant="secondary">{a.category}</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{fmt(a.activity_date)}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card><CardContent className="p-5 text-sm">
            {o.notes ? <p className="whitespace-pre-wrap">{o.notes}</p> : <p className="text-muted-foreground">Inga anteckningar.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardContent className="p-5 text-sm space-y-1">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Skapat: {fmtDT(o.created_at)}</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Senast ändrat: {fmtDT(o.updated_at)}</div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
