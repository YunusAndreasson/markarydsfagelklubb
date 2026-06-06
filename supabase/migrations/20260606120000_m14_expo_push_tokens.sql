-- M14 — native (Expo) push tokens.
--
-- Separate from the web `push_subscriptions` table (Web Push / VAPID): Expo
-- delivers through its own push service using an ExponentPushToken, so it needs
-- its own store. Owner-scoped RLS — a member may only see/insert/update/delete
-- their own device tokens. The fan-out reads ALL tokens via the service role
-- inside the `send-bird-alert` edge function (RLS bypassed there), so no
-- cross-user SELECT policy is needed.
--
-- Apply to the shared project (MCP was read-only in M4):
--   supabase db query --linked < supabase/migrations/20260606120000_m14_expo_push_tokens.sql
-- then regenerate types:
--   supabase gen types typescript --project-id zgnmajovyqibgxlcomvb > src/lib/database.types.ts

create table if not exists public.expo_push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists expo_push_tokens_user_idx
  on public.expo_push_tokens (user_id);

alter table public.expo_push_tokens enable row level security;

-- A device may only be read by its owner.
create policy "expo_push_tokens_select_own"
  on public.expo_push_tokens for select
  using (auth.uid() = user_id);

-- Register only for yourself.
create policy "expo_push_tokens_insert_own"
  on public.expo_push_tokens for insert
  with check (auth.uid() = user_id);

-- Refresh (upsert) only your own rows.
create policy "expo_push_tokens_update_own"
  on public.expo_push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Remove only your own rows (drives "Stäng av notiser" + sign-out cleanup).
create policy "expo_push_tokens_delete_own"
  on public.expo_push_tokens for delete
  using (auth.uid() = user_id);
