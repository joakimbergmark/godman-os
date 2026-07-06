
## Problem

När du klickar "Spara" på en befintlig aktivitet visas toasten **"Ej inloggad"** trots att du är inloggad. Samma mönster finns i flera formulär.

## Rotorsak

I `src/routes/_authenticated/activities.tsx` (rad 96–114) gör `save()` följande vid varje sparning:

```ts
const { data: userRes } = await supabase.auth.getUser();
const owner_id = userRes.user?.id;
if (!owner_id) return toast.error("Ej inloggad");
```

Två problem:

1. **`getUser()` gör ett nätverksanrop** till Supabase Auth vid varje spar-klick. Om anropet returnerar fel eller är långsamt/avbrutet (nätverkshick, token-refresh pågår, dialog stängs och avbryter fetch, etc.) tolkas det som "inte inloggad" – trots giltig session. Auth-loggarna visar återkommande `/user`-anrop; ett enda som misslyckas ger detta fel.
2. **`owner_id` skickas med i UPDATE-payloaden** även vid redigering. Det behövs inte – RLS-policyn `auth.uid() = owner_id` skyddar redan raden, och `owner_id` sattes vid insert. Att skicka med den vid update ökar bara ytan för fel.

Samma mönster finns även i `contacts.tsx`, `tasks.tsx`, `principal.tsx`, `documents.tsx` – alla har samma potentiella brist.

## Åtgärd

### 1. Använd cached session istället för getUser() vid mutation

Ersätt `supabase.auth.getUser()` med `supabase.auth.getSession()` som läser cachad session lokalt utan nätverksanrop. Snabbare, mer robust, samma säkerhet (RLS validerar bearer-token på servern).

### 2. Skicka inte `owner_id` vid UPDATE

Vid redigering: skicka bara de faktiskt ändrade fälten. `owner_id` sätts endast vid INSERT.

```ts
const res = editing
  ? await supabase.from("activities").update({
      activity_date, title, description, category, tags,
    }).eq("id", editing)
  : await supabase.from("activities").insert({ owner_id, ...rest });
```

### 3. Applicera samma mönster på övriga formulär

Uppdatera `contacts.tsx`, `tasks.tsx`, `principal.tsx`, `documents.tsx` med samma två fix så att felet inte kan uppstå någon annanstans.

### 4. Om sessionen faktiskt saknas → redirect till /auth

Istället för bara en toast: om `getSession()` returnerar `null` betyder det att gate:n missat något – redirect till `/auth` med `navigate({ to: "/auth" })` så användaren kan logga in igen.

## Filer som ändras

- `src/routes/_authenticated/activities.tsx`
- `src/routes/_authenticated/contacts.tsx`
- `src/routes/_authenticated/tasks.tsx`
- `src/routes/_authenticated/principal.tsx`
- `src/routes/_authenticated/documents.tsx`

Inga databasändringar behövs – RLS-policyerna är redan korrekta.
