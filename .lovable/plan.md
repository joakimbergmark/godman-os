# Åtgärda RLS-policyer: `public` → `authenticated`

## 1. Varför det blev så från början

Tabellerna `principal`, `contacts`, `activities`, `documents`, `tasks`, `cases`, `case_decisions` och `obligations` skapades tidigt i projektet med policyn skriven som:

```sql
CREATE POLICY "own tasks" ON public.tasks
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
```

När `TO`-klausulen utelämnas sätter Postgres den automatiskt till `public` (alla roller). Skyddet blev ändå korrekt eftersom `auth.uid()` är NULL för oinloggade, så jämförelsen aldrig matchar en rad. Senare tabeller (`accounts`, `transactions`, `transaction_categories`, `accounting_years`) skrevs med explicit `TO authenticated` — de äldre uppdaterades aldrig. Det är alltså inkonsekvens, inte ett medvetet val.

## 2. Föreslagen fix

En migrering som för varje av de åtta tabellerna tar bort den befintliga ägar-policyn och skapar den igen identiskt men med `TO authenticated`:

```sql
DROP POLICY "own tasks" ON public.tasks;
CREATE POLICY "own tasks" ON public.tasks
FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
```

Samma mönster för `principal`, `contacts`, `activities`, `documents`, `cases`, `case_decisions`, `obligations` (policynamnen behålls som de är i dag).

Samtidigt ses GRANT-rättigheterna över så att `authenticated` har läs/skriv och `anon` inte har onödig åtkomst till dessa tabeller.

## 3. Vad kan gå sönder

Kort svar: ingenting i praktiken för denna app, men här är riskerna att känna till:

- **Oinloggad åtkomst upphör helt** — i dag returnerar en anon-förfrågan tom lista; efter fixen ger den behörighetsfel. Appen har inga publika sidor som läser dessa tabeller (allt ligger under inloggat läge), så det påverkar inte användningen.
- **Serverfunktioner som kör som anon** — om någon server-funktion läser dessa tabeller med publik nyckel utan inloggad användare slutar den fungera. Verifieras innan migreringen körs.
- **Service role / admin-åtkomst** — påverkas inte, den kringgår RLS.
- **Inloggad användning** — oförändrad; samma villkor gäller, endast rollen begränsas.

Ingen data ändras och inga scheman ändras — bara åtkomstregler.
