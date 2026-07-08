## Problem

`src/routes/_authenticated/cases.tsx` är både lista OCH förälder till `cases.$caseId.tsx`. Eftersom `CasesPage` inte renderar `<Outlet />` mountas aldrig detaljsidan — klick på ett kort verkar bara ladda om listan. Redigera/ta bort finns redan i detaljsidan (`CaseHeader`), men blir onåbar.

Detta är den dokumenterade fallgropen i TanStack Start: när en route har barn måste dess komponent rendera `<Outlet />`, annars visas ingenting.

## Åtgärd

1. **Byt namn** `src/routes/_authenticated/cases.tsx` → `src/routes/_authenticated/cases.index.tsx` (URL `/cases` — listan flyttas hit oförändrad).
2. **Skapa** `src/routes/_authenticated/cases.tsx` som en tunn layout:
   ```tsx
   export const Route = createFileRoute("/_authenticated/cases")({
     component: () => <Outlet />,
   });
   ```
3. Detaljsidan `cases.$caseId.tsx` lämnas orörd — den innehåller redan:
   - Alla relationer (aktiviteter, uppgifter, dokument, transaktioner, beslut, tidslinje).
   - Redigera-dialog via `CaseHeader` med alla fält (titel, status, prioritet, datum, myndighetskontakt, anteckningar).
   - Ta bort-knapp.

Ingen datamodell, ingen RLS, inget UI utöver detta ändras. Efter fixen fungerar både "öppna ärende" och "redigera ärende".