import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/vidareutveckling")({
  component: () => (
    <>
      <h2>6. Vidareutveckling</h2>
      <h3>Teknisk arkitektur</h3>
      <ul>
        <li><strong>Frontend:</strong> React 19 + TanStack Start (Vite). Filbaserade rutter under
          <code>src/routes/</code>.</li>
        <li><strong>Skyddade sidor</strong> ligger under <code>src/routes/_authenticated/</code> —
          gaten hanteras centralt.</li>
        <li><strong>Backend:</strong> Lovable Cloud (Postgres + Auth + Storage). Klienten pratar
          direkt med databasen via <code>src/integrations/supabase/client</code>.</li>
        <li><strong>Åtkomstskydd:</strong> varje tabell är RLS-skyddad på <code>owner_id = auth.uid()</code>.</li>
        <li><strong>UI:</strong> shadcn/ui + Tailwind. Använd befintliga komponenter i
          <code>src/components/ui/</code>.</li>
      </ul>

      <h3>Referensdokument</h3>
      <ul>
        <li><code>docs/ARCHITECTURE.md</code> — vision, designprinciper, domänmodell och
          livsområden. <strong>All ny funktionalitet valideras mot detta dokument.</strong></li>
        <li><code>docs/DATA_MODEL.md</code> — läsbar beskrivning av alla tabeller och relationer.</li>
      </ul>

      <h3>Datamodell (kärnan)</h3>
      <ul>
        <li><code>principal</code> — huvudmannen.</li>
        <li><code>accounting_years</code> — ett år per huvudman.</li>
        <li><code>cases</code> — <strong>navet</strong>. Alla operativa objekt bör kopplas hit via
          <code>case_id</code>.</li>
        <li><code>obligations</code> + <code>case_decisions</code> — myndighetsbeslut, tillstånd
          och bidrag som levande objekt med giltighet och uppföljning.</li>
        <li><code>activities</code>, <code>tasks</code>, <code>documents</code>,
          <code>transactions</code> — årsbundna via <code>accounting_year_id</code>, kopplas till
          ärende via <code>case_id</code>.</li>
        <li><code>contacts</code> — årsoberoende adressbok.</li>
        <li><code>accounts</code>, <code>transaction_categories</code>,
          <code>transactions</code> — ekonomimodulen.</li>
      </ul>

      <h3>Så lägger du till en ny modul</h3>
      <ol>
        <li>Skapa tabellen via en migration (glöm inte GRANT + RLS-policy på
          <code>owner_id</code>).</li>
        <li>Lägg till en ny rutt under <code>src/routes/_authenticated/</code>.</li>
        <li>Kopiera mönstret från en befintlig sida (t.ex. <code>activities.tsx</code>): TanStack
          Query för läs, dialog+zod för skriv, sessionskontroll i <code>save()</code>.</li>
        <li>Filtrera alltid på <code>accounting_year_id</code> när det är relevant.</li>
        <li>Lägg till länken i <code>src/components/AppLayout.tsx</code>.</li>
        <li>Om posten ska synas i sökrutan — utöka <code>GlobalSearch.tsx</code>.</li>
      </ol>

      <h3>Naturliga nästa steg</h3>
      <ul>
        <li><strong>Årsräkning</strong> — generera underlag automatiskt från transaktioner.</li>
        <li><strong>Export</strong> till PDF/Excel per år (årsräkning, dagbok, transaktionslista).</li>
        <li><strong>AI-sammanfattning</strong> av året via Lovable AI Gateway.</li>
        <li><strong>Öppningsbalans → utgående</strong> — förbered nästa år från årsslutssaldot.</li>
        <li><strong>Påminnelser</strong> för uppgifter med deadline (e-post/notiser).</li>
        <li><strong>Flera huvudmän</strong> — appen är förberedd datamässigt men UI:t utgår idag
          från en huvudman.</li>
      </ul>

      <h3>Bra att veta</h3>
      <ul>
        <li>Alla mutationer läser sessionen via <code>supabase.auth.getSession()</code> och
          skickar tillbaka till <code>/auth</code> om sessionen är borta.</li>
        <li><code>owner_id</code> sätts endast vid INSERT — aldrig vid UPDATE (RLS skyddar
          raden).</li>
        <li>Dokument lagras i storage-bucketen <code>documents</code> med signerade URL:er.</li>
        <li>Belopp formateras alltid svenskt med två decimaler och "kr" (t.ex. 405,49 kr).</li>
        <li>Registrera inte data för datans skull — bara det som hjälper användaren utföra sitt
          uppdrag.</li>
      </ul>
    </>
  ),
});
