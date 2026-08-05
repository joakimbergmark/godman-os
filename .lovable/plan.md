# Kontofilter på Ekonomi

## Hur jag tänker

Idag summerar Ekonomi-sidan alla konton tillsammans (filtrerar bara på redovisningsår). Det gör siffrorna svårlästa när du har både Allkonto och Sparkonto — "Totala inkomster" är summan av båda, utan att det syns.

Bästa lösningen: en **kontoväljare vid sidan av årsväljaren i sidhuvudet**, som gäller både fliken Översikt och fliken Transaktioner. Ett val, samma filter överallt — inte två separata väljare som kan hamna i otakt.

## Så fungerar det

Kontoväljare uppe till höger, intill "Visar år":

- **Alla konton** (standard, som idag)
- ett val per konto (Allkonto, Sparkonto, …)

När ett konto är valt:

**Översikt**
- Totala inkomster / utgifter / nettoförändring räknas bara på det kontots transaktioner
- "Saldo per konto" visar bara det valda kontot
- Fördelning per kategori räknas bara på det kontot
- Rubriktexten visar vilket konto som gäller, t ex "Redovisningsår 2026 · Allkonto"

**Transaktioner**
- Listan visar bara transaktioner på det kontot
- Befintliga filter (typ, kategori) och sortering fungerar som idag ovanpå kontofiltret

## Hantering av överföringar

En överföring mellan Allkonto och Sparkonto berör två konton. Vid valt konto tas transaktionen med om kontot är antingen från- eller till-konto, så att en flytt mellan konton inte försvinner ur bilden. Överföringar räknas fortsatt inte som inkomst eller utgift.

## Tekniskt

- `src/routes/_authenticated/economy.tsx`: nytt state `viewAccountId` i huvudkomponenten, skickas som prop till `Overview` och `Transactions` (samma mönster som `viewYearId`).
- Kontolistan hämtas redan i huvudkomponentens barnkomponenter; lyft en `accounts`-query till toppnivå för väljaren, eller återanvänd samma query-key så cachen delas.
- Filtrering görs klientsidigt på hämtade rader (`account_id === valt || counter_account_id === valt`), så inga nya databasfrågor behövs.
- Valet nollställs inte vid flikbyte, eftersom det ligger i huvudkomponenten.
- Inga databasändringar.
