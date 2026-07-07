import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/arbetsflode")({
  component: () => (
    <>
      <h2>2. Dagligt arbetsflöde</h2>
      <p>Ett typiskt arbetspass kan se ut så här:</p>
      <ol>
        <li>
          <strong>Öppna Översikt (cockpit).</strong> Sidan svarar på <em>"Vad behöver jag göra
          idag?"</em> — deadlines som närmar sig, åtaganden som håller på att löpa ut, uppgifter
          som väntar på svar och det som behöver redovisas.
        </li>
        <li>
          <strong>Gå in i berört ärende.</strong> All löpande registrering (aktivitet, uppgift,
          dokument, transaktion) sker helst från ärendekortet så allt kopplas ihop automatiskt.
        </li>
        <li>
          <strong>Bocka av uppgifter</strong> som är klara och sätt nya deadlines på det som väntar
          på svar.
        </li>
        <li>
          <strong>Registrera aktivitet</strong> när du gjort något: samtal, möte, hembesök. Koppla
          till ärendet och använd taggar för att kunna filtrera senare.
        </li>
        <li>
          <strong>Ladda upp dokument</strong> som kvitton, beslut och intyg. Koppla dokumentet till
          rätt redovisningsår — eller markera det som "Generellt" om det gäller alla år. Är det ett
          myndighetsbeslut med giltighetstid: registrera det som ett <em>åtagande</em>.
        </li>
        <li>
          <strong>Registrera ekonomi</strong> när det kommer inbetalningar eller när du betalat en
          faktura. Bifoga gärna dokumentet (kvitto/faktura) på transaktionen. Belopp visas alltid i
          formatet <code>405,49 kr</code>.
        </li>
        <li>
          <strong>Tidslinjen</strong> ger en samlad kronologisk översikt över allt som hänt —
          aktiviteter, dokument, transaktioner, uppgifter och beslut.
        </li>
      </ol>
      <h3>Söka snabbt</h3>
      <p>
        Använd sökrutan i toppen. Den söker i ärenden, åtaganden, aktiviteter, dokument, kontakter,
        uppgifter och huvudmannens uppgifter samtidigt. Klicka på ett träffkort för att hoppa
        direkt in i posten.
      </p>
    </>
  ),
});
