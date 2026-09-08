# TFT Community App

Monorepo scaffold. Skeleton only — no business logic implemented yet.

## Project Structure

```
/mobile        Expo React Native app (TypeScript)
/admin-web     Next.js admin dashboard (TypeScript)
/supabase
  /migrations  SQL schema + RLS policies
```

### /mobile

- `app/` — Expo Router routes (index, home, checkin, messenger)
- `src/screens/` — placeholder screen components: Login, Home, CheckIn, Messenger
- `src/lib/supabase.ts` — Supabase client, reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### /admin-web

- `app/` — Next.js App Router routes: `/login`, `/dashboard`, `/members`, `/groups`
- `lib/supabase.ts` — Supabase client, reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### /supabase/migrations

- `20260908000000_init_schema.sql` — creates `profiles`, `attendance`, `groups`, `group_members`, `messages`, `shared_links`, a signup trigger to auto-create a `profiles` row, and RLS policies.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then from **Project Settings → API** copy:

- Project URL
- `anon` public API key

### 2. Apply the database migration

Run the SQL in `supabase/migrations/20260908000000_init_schema.sql` against your Supabase project (via the SQL editor or the Supabase CLI).

### 3. Configure environment variables

**mobile/.env** (or Expo env config):

```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**admin-web/.env.local**:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install dependencies

> Dependencies not yet installed — run `npm install` in `/mobile` and `/admin-web`.

```
cd mobile && npm install
cd admin-web && npm install
```

### 5. Run each app

```
cd mobile && npm start
cd admin-web && npm run dev
```
