
## Tillägg 1 – Global sökfunktion

**Placering:** Sökruta i `AppLayout` topbar, alltid synlig. Cmd/Ctrl+K öppnar också.

**Beteende:**
- Debounced input (250 ms), minst 2 tecken.
- Klientsidig parallell fråga mot fem tabeller via Supabase (`.or(...ilike...)`). RLS filtrerar redan per användare, så inga extra restriktioner behövs. Ingen backend-endpoint krävs för MVP.
- Case-insensitive "contains" via `ilike '%q%'`. Limit 10 per tabell.
- Resultat i en dropdown/popover under sökrutan, grupperade per kategori med antal träffar.

**Sökta fält:**
- activities: `title`, `description`, `category`, `tags`
- documents: `title`, `category`, `comment`, `file_name`
- contacts: `name`, `organization`, `email`, `phone`, `address`, `city`, `notes`
- tasks: `title`, `description`, `status`, `priority`
- principal: `full_name`, `personal_number`, `email`, `phone`, `address`, `city`, `notes`

**Klickbeteende:**
- Aktivitet → `/activities?highlight=<id>` (öppnar redigera-dialog)
- Kontakt → `/contacts?highlight=<id>` (öppnar redigera-dialog)
- Uppgift → `/tasks?highlight=<id>` (öppnar redigera-dialog)
- Huvudman → `/principal`
- Dokument → hämtar signerad URL från storage och öppnar i ny flik

**Resultatvisning:** Varje rad visar de fält som specats (datum + rubrik + utdrag för aktiviteter, titel/kategori/datum för dokument, osv.).

## Tillägg 2 – Tidslinjevy

**Ny route:** `/_authenticated/timeline.tsx`. Menypost "Tidslinje" i sidomenyn.

**Datakälla:** Parallella queries mot `activities`, `documents`, `tasks`. Normaliseras till gemensamt format:

```text
{ type, title, description, created_at, ref_id, meta }
```

- Aktivitet: title = `title`, description = `description`, meta.date = `activity_date`
- Dokument: title = `title`, description = `Kategori: X`, meta.file_name / storage_path
- Uppgift: title = `title`, description = status, meta.status/deadline

Slås samman och sorteras på `created_at` desc, klientsidigt. Ingen databasvy krävs för MVP (dataset litet).

**UI:**
- En scrollvy, vertikal tidslinje med ikon per typ (📌 aktivitet, 📎 dokument, ✅/⏳ uppgift).
- Varje kort visar datum, titel, kort beskrivning.
- Klick öppnar motsvarande detaljvy (samma highlight-mönster som sök).
- Append-only: ingen redigering här.
- Filter lämnas till senare.

## Teknisk implementation

**Nya/ändrade filer:**
- `src/components/GlobalSearch.tsx` – input, debounce, popover, gruppresultat, navigation.
- `src/components/AppLayout.tsx` – montera `<GlobalSearch />` i topbar.
- `src/routes/_authenticated/timeline.tsx` – ny route.
- `src/routes/_authenticated/activities.tsx`, `contacts.tsx`, `tasks.tsx` – läs `?highlight=<id>` via `validateSearch` och auto-öppna edit-dialog för den raden.
- `src/routeTree.gen.ts` regenereras automatiskt.

**Ingen databasmigration** – befintliga kolumner räcker. Datasetet förväntas litet (privat användare), så klientsidig fan-out är tillräckligt snabbt. Om det växer kan vi senare lägga till Postgres `pg_trgm`-index eller en SQL-vy `activity_timeline_view`.

## Öppna frågor

Inga — jag går på ovanstående defaults om du inte säger annat.
