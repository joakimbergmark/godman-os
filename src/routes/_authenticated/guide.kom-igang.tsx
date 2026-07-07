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
          <strong>Lägg upp dina första ärenden</strong> under <em>Ärenden</em>. Välj livsområde
          (Ekonomi, Myndigheter, Hälsa, Boende, Juridik…), sätt prioritet och deadline. Ett ärende
          samlar allt arbete kring en fråga.
        </li>
        <li>
          <strong>Registrera åtaganden</strong> under <em>Åtaganden</em> för myndighetsbeslut,
          tillstånd och bidrag som har giltighetstid — så påminner appen dig när de närmar sig
          slutdatum.
        </li>
        <li>
          <strong>Registrera löpande</strong> aktiviteter, dokument, uppgifter och transaktioner —
          koppla dem till rätt ärende när det finns ett.
        </li>
      </ol>
    </>
  ),
});
