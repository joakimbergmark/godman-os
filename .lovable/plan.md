# Importera transaktioner från Excel

## Vad du får

I dialogen "Ladda upp transaktioner" (Ekonomi → Transaktioner) läggs ett val till: **Skärmbild (AI)** eller **Excel-fil**. Excel-läget läser filer i Handelsbankens format (som den du bifogade) och visar samma granskningslista som idag innan något sparas.

Filens rader tolkas så här:
- Rubrikraden hittas automatiskt (raden med `Reskontradatum / Transaktionsdatum / Text / Belopp / Saldo`), så all metadata överst i filen ignoreras.
- `Transaktionsdatum` blir transaktionens datum, `Text` blir kommentar, `Belopp` blir belopp (negativt = utgift, positivt = inkomst).
- `Reskontradatum` används enbart för dubblettmatchning (se nedan).

## Dubblettkontroll

Ingen befintlig transaktion ändras någonsin — importen skapar bara nya rader. Redan importerade rader markeras som "Dubblett" och är avmarkerade i granskningslistan.

En rad räknas som redan importerad om det finns en transaktion på samma konto och huvudman med samma belopp (avrundat till öre) och samma typ, och där något av följande stämmer:

1. samma transaktionsdatum, eller
2. datumet ligger inom ±4 dagar och texten matchar (jämförelse på normaliserad text: gemener, borttagna mellanslag/specialtecken, och prefixmatchning eftersom banktexten är trunkerad till 15 tecken).

Reskontradatum ingår i steg 2 som extra datumkandidat, eftersom befintliga rader i GodManOS kan ha sparats med bokföringsdatumet istället för transaktionsdatumet.

Kontrollen körs både när filen tolkas och en gång till precis före sparande, plus internt i filen så att två identiska rader i samma fil inte båda sparas.

## Teknisk plan

- Ny beroende: `xlsx` (SheetJS) för att läsa .xlsx i webbläsaren.
- `src/components/economy/ImportTransactionsDialog.tsx`: lägg till läges-toggle (bild/Excel), Excel-parsning till samma `Row`-typ som idag, och utöka `Row` med `bookingDate` (Reskontradatum, endast för matchning).
- Bryt ut dubblettlogiken till en hjälpfunktion (`src/lib/import-duplicates.ts`) med textnormalisering + datumtolerans, och använd den i både tolkning och sparande. Filtret hämtar befintliga transaktioner i ett datumintervall som täcker filens rader ±4 dagar.
- Inga ändringar i databasschema, RLS eller övriga vyer. Belopp sparas som positivt tal med `type` som idag.
- Sparandet fortsätter använda valt konto (t ex Allkonto) och aktuellt redovisningsår.

## Verifiering

- Typecheck.
- Ladda upp den bifogade filen i preview mot Allkonto: alla rader som redan finns ska visas som dubbletter och vara avmarkerade; endast nya rader förvalda.
- Spara och kontrollera att saldot per konto stämmer med filens saldo (432,43 kr).
