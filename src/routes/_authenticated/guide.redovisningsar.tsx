import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/guide/redovisningsar")({
  component: () => (
    <>
      <h2>4. Redovisningsår</h2>
      <p>
        Allt arbete organiseras per kalenderår. Det aktiva året väljs i toppmenyn och styr vad du ser
        på sidorna Aktiviteter, Dokument, Uppgifter, Ekonomi och Årsöversikt.
      </p>
      <h3>Vad hör till året?</h3>
      <ul>
        <li><strong>Aktiviteter, uppgifter, transaktioner</strong> — bundna till exakt ett år.</li>
        <li><strong>Dokument</strong> — kan antingen tillhöra ett år eller markeras som
          <em> Generella</em> (visas för alla år, t.ex. ett förordnandebeslut).</li>
        <li><strong>Kontakter och huvudman</strong> — årsoberoende.</li>
      </ul>
      <h3>Nytt år</h3>
      <p>
        Ett år för innevarande kalenderår skapas automatiskt när huvudmannen läggs in. Fler år kan
        skapas via årsväljaren i toppen. Byt aktivt år för att jobba med ett annat.
      </p>
    </>
  ),
});
