Inga kodändringar krävs.

## Aktuellt beteende

Fältet **Totala inkomster** på Ekonomi-sidan beräknas i `src/routes/_authenticated/economy.tsx` (komponenten `Overview`) som summan av alla transaktioner där `type = 'income'` för det valda redovisningsåret.

- Ingen filtrering görs på konto, kontotyp eller kontonamn.
- Sparkonto inkluderas därmed automatiskt om det har inkomsttransaktioner.
- Nya konton inkluderas automatiskt så fort de får inkomsttransaktioner registrerade, eftersom beräkningen utgår från transaktionerna och inte från en fördefinierad kontolista.

Detta överensstämmer med användarens krav: "Alla inkomster ska inkluderas i Totala inkomster".
