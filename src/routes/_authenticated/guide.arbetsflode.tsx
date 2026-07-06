import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/arbetsflode")({
  component: () => (
    <>
      <h2>2. Dagligt arbetsflöde</h2>
      <p>Ett typiskt arbetspass kan se ut så här:</p>
      <ol>
        <li>
          <strong>Kontrollera Uppgifter</strong> — vilka deadlines närmar sig? Bocka av det som är
          klart.
        </li>
        <li>
          <strong>Registrera aktivitet</strong> när du gjort något: samtal, möte, ärende. Använd
          taggar för att kunna filtrera senare.
        </li>
        <li>
          <strong>Ladda upp dokument</strong> som kvitton, beslut och intyg. Koppla dokumentet till
          rätt redovisningsår — eller markera det som "Generellt" om det gäller alla år.
        </li>
        <li>
          <strong>Registrera ekonomi</strong> när det kommer inbetalningar eller när du betalat en
          faktura. Bifoga gärna dokumentet (kvitto/faktura) på transaktionen.
        </li>
        <li>
          <strong>Tidslinjen</strong> ger en samlad översikt över allt som hänt.
        </li>
      </ol>
      <h3>Söka snabbt</h3>
      <p>
        Använd sökrutan i toppen. Den söker i aktiviteter, dokument, kontakter, uppgifter och
        huvudmannens uppgifter samtidigt. Klicka på ett träffkort för att hoppa direkt in i posten.
      </p>
    </>
  ),
});
