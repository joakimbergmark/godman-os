# Ladda upp transaktioner via bild

Ny knapp **"Ladda upp transaktioner"** till vänster om *Ny transaktion* på fliken *Transaktioner*. Öppnar dialog där huvudmannen väljer konto, laddar upp en skärmbild från internetbanken, får raderna tolkade av Lovable AI, granskar och sparar. Dubbletter blockeras.

## Flöde

1. Användaren klickar knappen → dialog öppnas.
2. Väljer **konto** (obligatoriskt) och laddar upp en bild (PNG/JPG/WebP, max ~8 MB).
3. Klick **Tolka bild** → bilden skickas som base64 till server function `parseBankScreenshot` som kallar Lovable AI (`google/gemini-2.5-flash`, multimodal) och får tillbaka strukturerad JSON: `{ rows: [{ date, description, amount, type: "income"|"expense" }] }`.
4. Raderna visas i en tabell där varje rad kan redigeras (datum, typ, belopp, kommentar, kategori) eller avmarkeras. En dubblettflagga visas för rader som matchar befintlig transaktion.
5. Klick **Spara valda** → infogar markerade, ej dubbletter, transaktioner. Toast med antal sparade + antal hoppade över.

## Dubbletthantering

En transaktion räknas som dubblett om det redan finns en rad för samma `principal_id`, `account_id`, `transaction_date`, `type` och `amount` (belopp i öre). Kontrollen görs i två lager:

- **Klientvarning** vid granskning: hämtar befintliga transaktioner för kontot ± 7 dagar och flaggar matchning i UI så användaren ser vad som hoppas över.
- **Server-side guard** i server function före insert: filtrerar bort rader som redan matchar i databasen (skydd mot race/omtolkad bild).

Ingen unik index-ändring görs — matchningen bygger på identiska värden och håller strategin flexibel om t ex kommentar skiljer.

## Filer

- **Ny**: `src/lib/parse-bank-screenshot.functions.ts` — `createServerFn` med `requireSupabaseAuth`. Tar `{ imageBase64, mimeType }`, kallar Lovable AI Gateway (via helper från `ai-sdk-lovable-gateway`), returnerar `{ rows }`. Strikt Zod-schema; om AI returnerar tomt/ogiltigt → tomt resultat + felmeddelande.
- **Ny**: `src/lib/ai-gateway.server.ts` (om saknas) — provider-helper enligt kunskapsdokument.
- **Ny**: `src/components/economy/ImportTransactionsDialog.tsx` — dialogen (uppladdning, tolkning, granskningstabell, spara).
- **Redigerad**: `src/routes/_authenticated/economy.tsx` — importera dialogen och lägg knappen till vänster om *Ny transaktion*.

## AI-prompt (sammanfattning)

System: "Du tolkar svenska bankkontoutdrag från skärmbilder. Extrahera varje synlig transaktionsrad. Returnera JSON enligt schemat. Datum i ISO (YYYY-MM-DD). Belopp positivt tal. `type` = `expense` om uttag/betalning, `income` om insättning. Ignorera saldorader och rubriker."

Structured output via `generateText({ output: Output.object({ schema }) })` med `{ structuredOutputs: true }` på providern.

## Avgränsningar

- Endast bilder i denna iteration (ingen PDF/CSV).
- Kategori sätts inte automatiskt — användaren kan välja per rad i granskningen.
- Dokumentkoppling (bilaga) ingår inte — kan läggas till senare.
- Ingen ny databasändring krävs.
