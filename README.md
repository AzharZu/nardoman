# Backgammon Rush

Warm, cozy backgammon with AI coaching, bot opponents, profile persistence, and shareable friend rooms.

## What’s Included

- Play vs Bot with Chill, Tactical, and Aggressive personalities
- Friend room links with localStorage/BroadcastChannel preview sync
- Supabase-backed auth, profile storage, and match persistence
- Pro access starts as a 2-hour trial and persists in Supabase
- AI Coach move explanations with quality, risk, and aggression scores
- Cozy picnic-style game board and fullscreen mode

## Setup

### Install

```bash
npm install
```

### Environment Variables

Create `.env.local` from `.env.example` and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# Optional fallback for older setups
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

If the public Supabase keys are missing, auth and live sync are disabled.

## Supabase

1. Create a new Supabase project.
2. Open the SQL editor.
3. For the quickest setup, run `supabase/schema.sql` in the SQL editor.
4. If you prefer migration-based setup, use the files in `supabase/migrations/`.
5. Make sure Email auth is enabled.
6. In Auth settings, set the Site URL to your production domain and add redirect URL patterns for localhost and Vercel preview deployments.

The schema includes:

- `profiles`
- `matches`
- `moves`
- `leaderboard_entries`
- `statistics`
- `achievements`
- `rooms`
- `purchases`

`supabase/schema.sql` is the canonical quick-start file. The `supabase/migrations/` folder mirrors the same schema for migration-first workflows and GitHub demos.

## Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
```

## Deploy to Vercel

1. Import the GitHub repo into Vercel.
2. Keep `main` as the Production Branch.
3. Add these Environment Variables in Vercel for Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional fallback: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. If you want local development through Vercel CLI, add the same values to Development or run `vercel env pull`.
5. In Supabase Auth URL Configuration, allow:
   - your production domain
   - `http://localhost:3000/**`
   - your Vercel preview domain pattern
6. Deploy from `main`.

Suggested Supabase URL setup:

- Site URL: `https://your-production-domain.com`
- Additional redirect URLs:
  - `http://localhost:3000/**`
  - `https://*-<team-or-account-slug>.vercel.app/**`

## Notes

- Login and signup go through backend auth routes and redirect into the dashboard.
- Dashboard and profile pages use real profile data when logged in.
- Pro page activates a 2-hour trial instead of collecting payment yet.
- Guests can still browse public sample data where it makes sense.
- Friend rooms are preview-ready now and can be replaced with realtime later without changing the route shape.
