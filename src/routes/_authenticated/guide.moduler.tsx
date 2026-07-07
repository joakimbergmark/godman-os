import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/moduler")({
  component: () => (
    <>
      <h2>3. Moduler i appen</h2>
      <ul>
        <li><strong>Översikt</strong> — cockpit. Svarar på "Vad behöver jag göra idag?", "Vad
          håller på att löpa ut?", "Vad väntar på svar?" och "Vad behöver redovisas?".</li>
        <li><strong>Tidslinje</strong> — kronologisk vy över aktiviteter, dokument, uppgifter,
          transaktioner och beslut.</li>
        <li><strong>Ärenden</strong> — navet i appen. Varje ärende har livsområde (Ekonomi,
          Myndigheter, Hälsa, Transport, Boende, Daglig verksamhet, Familj &amp; nätverk, Juridik,
          Övrigt), status, prioritet, deadline och myndighetskontakt. Ärendevyn samlar aktiviteter,
          uppgifter, dokument, transaktioner och åtaganden för just det ärendet.</li>
        <li><strong>Åtaganden</strong> — levande myndighetsbeslut, tillstånd, bidrag, dom- och
          vårdbeslut. Har typ, status, giltighetstid och färgkodad varning när slutdatum närmar sig
          (grön &gt; 90 dagar, gul 30–90, röd &lt; 30, grå utgånget).</li>
        <li><strong>Huvudman</strong> — personuppgifter för den du företräder.</li>
        <li><strong>Kontakter</strong> — adressbok med kategorier (vård, myndighet, anhörig m.m.).</li>
        <li><strong>Aktiviteter</strong> — händelselogg. Varje aktivitet har datum, rubrik,
          kategori, beskrivning, taggar och kan kopplas till ett ärende.</li>
        <li><strong>Ekonomi</strong> — konton, transaktioner (inkomst, utgift, överföring) och
          sammanställning. Belopp visas med två decimaler och "kr".</li>
        <li><strong>Dokument</strong> — filuppladdning med metadata och koppling till år, ärende
          eller transaktion.</li>
        <li><strong>Uppgifter</strong> — att göra-lista med deadlines och prioritet, kan kopplas
          till ärende.</li>
        <li><strong>Årsöversikt</strong> — status för valt redovisningsår.</li>
      </ul>
    </>
  ),
});
