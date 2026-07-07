ions## Mål

Skapa `docs/DATA_MODEL.md` — en läsbar beskrivning av nuvarande datamodell (public-schemat) som du kan exportera/dela.

## Innehåll

1. **Översikt** — kort beskrivning + Mermaid ER-diagram över alla 12 tabeller och deras relationer.
2. **En sektion per tabell** (accounting_years, accounts, activities, case_decisions, cases, contacts, documents, obligations, principal, tasks, transaction_categories, transactions) med:
   - Kort beskrivning av entitetens roll (kopplad till ARCHITECTURE.md).
   - Kolumntabell: namn, typ, nullbar, default, kommentar (FK-referens där relevant).
3. **Relationsöversikt** — lista över främmande nycklar (härledda från kolumnnamn, t.ex. `principal_id → principal.id`, `case_id → cases.id`).

## Avgränsning

- Endast struktur (kolumner + relationer). RLS, policies, triggers, funktioner och index utelämnas enligt ditt val.
- Dokumentet genereras utifrån aktuell schemadata jag redan hämtat från databasen.

## Leverabel

- Ny fil: `docs/DATA_MODEL.md`

Du kan sedan öppna filen och kopiera/exportera vidare (Markdown renderas på GitHub, i editorer, eller kan konverteras till PDF).