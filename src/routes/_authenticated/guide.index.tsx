import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/")({
  component: () => (
    <>
      <h2>Välkommen till God man OS</h2>
      <p>
        Det här är ett <strong>operativt arbetsverktyg</strong> för dig som är god man eller
        förvaltare — inte ett ekonomisystem. Målet är att hjälpa dig <em>komma ihåg, planera,
        följa upp, dokumentera och redovisa</em> så att inga beslut eller deadlines missas.
      </p>
      <h3>Bärande idéer</h3>
      <ul>
        <li>
          <strong>Ärenden (Cases) är navet.</strong> Allt arbete organiseras som ärenden inom ett
          livsområde (Ekonomi, Myndigheter, Hälsa, Boende, Juridik m.fl.). Aktiviteter, uppgifter,
          dokument, transaktioner och åtaganden kopplas till rätt ärende.
        </li>
        <li>
          <strong>Åtaganden (Obligations) är levande objekt.</strong> Myndighetsbeslut, tillstånd
          och bidrag har giltighetstid, uppföljning och påminnelser — inte bara ett dokument i en
          mapp.
        </li>
        <li>
          <strong>Översikt = cockpit.</strong> Startsidan svarar på "Vad behöver jag göra idag?" —
          inte "hur mycket data finns".
        </li>
        <li>
          <strong>Redovisningsår</strong> ramar in ekonomi och årsbundna aktiviteter.
        </li>
      </ul>
      <h3>Så är guiden upplagd</h3>
      <ul>
        <li><strong>Kom igång</strong> — vad du gör första gången.</li>
        <li><strong>Dagligt arbetsflöde</strong> — hur en typisk arbetsdag ser ut.</li>
        <li><strong>Moduler</strong> — översikt över alla sidor i menyn.</li>
        <li><strong>Redovisningsår</strong> — hur årsstrukturen fungerar.</li>
        <li><strong>Ekonomimodulen</strong> — konton, transaktioner och sammanställning.</li>
        <li><strong>Vidareutveckling</strong> — hur appen är byggd och vad som kan byggas härnäst.</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Tips: sökrutan i toppen söker i ärenden, åtaganden, aktiviteter, dokument, kontakter,
        uppgifter och huvudman samtidigt.
      </p>
    </>
  ),
});
