## Problem
På `Ekonomi → Konton` beräknas saldo i frontend genom att lägga ihop `opening_balance` med samtliga transaktioners belopp (`src/routes/_authenticated/economy.tsx`, rad 157–179 och 296). Kortet visar `NaN kr` när något led i den kedjan blir `NaN`, eftersom:

1. `fmt(NaN)` returnerar strängen `"NaN kr"`.
2. Fallbacken `balances[a.id] ?? Number(a.opening_balance)` skyddar bara mot `null/undefined` — inte mot `NaN`. Så fort saldo‑map:en får ett `NaN` in fastnar det.
3. `Number(x)` blir `NaN` om värdet råkar vara en sträng med komma‑decimal (`"705,49"`), tom sträng, eller ett annat oväntat format. Äldre rader eller AI‑importerade transaktioner kan innehålla sådana värden.
4. I `transfer`‑grenen används `map[counter] + amt` utan `?? 0`‑skydd. Om `counter_account_id` pekar på ett konto utanför listan får vi tyst en NaN‑spridning vid framtida transfers.

När man öppnar `Redigera` läses saldot inte från `balances`‑beräkningen utan från `row.opening_balance` direkt (`String(row.opening_balance)` i formuläret) — därför ser man alltid ett korrekt värde där även när kortet visar NaN.

## Åtgärd

Alla ändringar sker i `src/routes/_authenticated/economy.tsx`, i `Accounts`‑komponenten.

1. Inför en liten hjälpare `toNum(v)` som gör robust parsing:
   - accepterar `number`, `string` (både `.` och `,` som decimaltecken, trimmar mellanslag),
   - returnerar `0` om resultatet inte är `Number.isFinite`.
2. Använd `toNum` för både `a.opening_balance` och `t.amount` när saldot byggs upp.
3. Härda `transfer`‑grenen: `map[counter] = (map[counter] ?? 0) + amt` (och kör toNum där också).
4. Byt visningsraden till en NaN‑säker fallback:
   ```ts
   const bal = balances[a.id];
   const shown = Number.isFinite(bal) ? bal : toNum(a.opening_balance);
   ```
   och rendera `fmt(shown)`.
5. Låt saldokortet visa `0,00 kr` istället för `NaN kr` som yttersta skyddsnät (faller ut naturligt av toNum).

## Verifiering

- Typecheck.
- Öppna `Ekonomi → Konton` i preview och bekräfta att kortet visar korrekt saldo (t ex `405,43 kr` för Allkonto: 705,49 + 1 900,00 − 2 200,06).
- Skapa en ny transaktion via `Ny transaktion` och via `Ladda upp transaktioner` och verifiera att saldot uppdateras utan NaN.

Ingen ändring av databasschema, RLS eller andra vyer behövs.
