import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/")({
  component: () => (
    <>
      <h2>Välkommen</h2>
      <p>
        Den här appen är ett stöd för dig som är <strong>god man eller förvaltare</strong>. Den hjälper
        dig att hålla ordning på huvudman, kontakter, aktiviteter, dokument, uppgifter och ekonomi —
        allt organiserat per <strong>redovisningsår</strong>.
      </p>
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
        Tips: sökrutan i toppen söker i aktiviteter, dokument, kontakter, uppgifter och huvudman
        samtidigt.
      </p>
    </>
  ),
});
