import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/ekonomi")({
  component: () => (
    <>
      <h2>5. Ekonomimodulen</h2>
      <p>Sidan <em>Ekonomi</em> har tre flikar:</p>
      <h3>Översikt</h3>
      <ul>
        <li>Totala inkomster, utgifter och nettoförändring för valt år.</li>
        <li>Fördelning per kategori med staplar.</li>
      </ul>
      <h3>Transaktioner</h3>
      <ul>
        <li>Filtrera på typ (inkomst, utgift, överföring) och kategori.</li>
        <li>Skapa ny transaktion med datum, belopp, konto, kategori, bilaga och kommentar.</li>
        <li>Överföring flyttar pengar mellan två egna konton och påverkar inte inkomst/utgift.</li>
        <li>Nya kategorier kan skapas direkt från transaktionsformuläret.</li>
      </ul>
      <h3>Konton</h3>
      <ul>
        <li>Skapa konton med ingående saldo och datum.</li>
        <li>Saldot räknas som ingående saldo + alla transaktioner på kontot.</li>
      </ul>
      <h3>Bilagor</h3>
      <p>
        Ladda först upp kvittot/fakturan under <em>Dokument</em>. Koppla sedan dokumentet till
        transaktionen i transaktionsformuläret.
      </p>
    </>
  ),
});
