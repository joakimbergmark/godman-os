import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/moduler")({
  component: () => (
    <>
      <h2>3. Moduler i appen</h2>
      <ul>
        <li><strong>Översikt</strong> — startsida med nyckeltal.</li>
        <li><strong>Tidslinje</strong> — kronologisk vy över aktiviteter, dokument och uppgifter.</li>
        <li><strong>Huvudman</strong> — personuppgifter för den du företräder.</li>
        <li><strong>Kontakter</strong> — adressbok med kategorier (vård, myndighet, anhörig m.m.).</li>
        <li><strong>Aktiviteter</strong> — händelselogg. Varje aktivitet har datum, rubrik, kategori,
          beskrivning och taggar.</li>
        <li><strong>Ekonomi</strong> — konton, transaktioner (inkomst, utgift, överföring) och
          sammanställning.</li>
        <li><strong>Dokument</strong> — filuppladdning med metadata och koppling till år eller
          transaktion.</li>
        <li><strong>Uppgifter</strong> — att göra-lista med deadlines och prioritet.</li>
        <li><strong>Årsöversikt</strong> — status för valt redovisningsår.</li>
      </ul>
    </>
  ),
});
