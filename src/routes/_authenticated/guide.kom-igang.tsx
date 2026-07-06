import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/kom-igang")({
  component: () => (
    <>
      <h2>1. Kom igång</h2>
      <ol>
        <li>
          <strong>Skapa huvudmannen</strong> under <em>Huvudman</em>. Fyll i namn, personnummer och
          kontaktuppgifter. Ett redovisningsår för innevarande år skapas automatiskt.
        </li>
        <li>
          <strong>Välj redovisningsår</strong> uppe i toppmenyn. Valet sparas och gäller på alla
          sidor.
        </li>
        <li>
          <strong>Lägg in kontakter</strong> — vårdpersonal, myndigheter, anhöriga. Kategorisera dem
          så blir de lätta att hitta senare.
        </li>
        <li>
          <strong>Skapa konton</strong> under <em>Ekonomi → Konton</em> med ingående saldo per
          årsstart.
        </li>
        <li>
          <strong>Registrera löpande</strong> aktiviteter, dokument och transaktioner allt eftersom
          året går.
        </li>
      </ol>
    </>
  ),
});
