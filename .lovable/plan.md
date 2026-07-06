Registrera 10 transaktioner från kontoutdraget på konto **Allkonto 6751-806325011** för redovisningsår 2026.

## Transaktioner som läggs in

Datum använder `Transaktionsdatum` från utdraget. Belopp lagras som positivt tal; typ styr tecknet.

| Datum | Text (kommentar) | Typ | Belopp |
|---|---|---|---|
| 2026-03-08 | SE0110 NORMAL | expense | 12,00 |
| 2026-03-01 | MCDHELSINGBORG | expense | 73,00 |
| 2026-03-01 | Oresundslinjen | expense | 59,00 |
| 2026-02-26 | Månadspeng | income | 300,00 |
| 2026-02-15 | SE01011 TZ-SHO | expense | 10,00 |
| 2026-02-15 | MCDHELSINGBORG | expense | 74,00 |
| 2026-02-08 | MCDHELSINGBORG | expense | 78,00 |
| 2026-01-24 | MCDMALMOHYLLIE | expense | 53,00 |
| 2026-01-26 | Månadspeng | income | 300,00 |
| 2026-01-10 | Överf Mobil | expense | 500,00 |

Netto: +600 inkomst − 932 utgift = **−332,00 kr** för perioden.

## Detaljer

- `account_id` = Allkonto (6751-806325011)
- `principal_id` och `owner_id` = huvudmannens/dina ID
- `accounting_year_id` = 2026
- `category_id` = null (inga kategorier finns ännu — kan sättas senare)
- `comment` = texten från utdraget
- "Överf Mobil" registreras som `expense` eftersom det bara finns ett konto i systemet (går att ändra till `transfer` senare när mottagarkontot finns)

Körs som en `INSERT` mot `transactions` via insert-verktyget — inga schema- eller kodändringar.
