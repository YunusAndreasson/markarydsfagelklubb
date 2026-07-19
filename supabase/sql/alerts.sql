-- alerts — a durable, denormalized log of every larm (bird alert) that has been
-- sent. Today a "larm" is only the boolean `observations.alert_requested`; if the
-- observation is later deleted its larm history is lost. This table preserves it.
--
-- Denormalized on purpose: species/location/observer names + coordinates are
-- snapshotted so a row stays meaningful even after the observation, lokal, or
-- species it came from is deleted (the FKs are ON DELETE SET NULL, not the source
-- of the display text).
--
-- Populated from the mobile side only: the `send-bird-alert` edge function
-- (service role) INSERTs one row per fan-out. There is deliberately NO trigger on
-- `observations` — the shared insert path the live web app depends on stays
-- untouched (consistent with the edge function's existing no-trigger design).
-- Web-originated larms are intentionally not logged.
--
-- Apply (shared project — raw SQL, NOT `db push`; migration history is untracked):
--   supabase db query --linked -f supabase/sql/alerts.sql
--
-- Idempotent: safe to re-run (IF NOT EXISTS + de-duped backfill).

create table if not exists public.alerts (
  id               uuid primary key default gen_random_uuid(),
  -- Live links while the source rows exist; SET NULL keeps the log row on delete.
  observation_id   uuid    references public.observations(id) on delete set null,
  location_id      integer references public.locations(id)    on delete set null,
  species_id       integer references public.species(id)      on delete set null,
  -- Denormalized snapshots (survive deletion / rename of the source rows).
  location_name    text,
  species_name     text,
  observer_user_id uuid,          -- plain value (no FK) so it survives user deletion
  observer_name    text,
  latitude         double precision,
  longitude        double precision,
  count            integer,
  observed_at      timestamptz,   -- when the bird was seen
  sent_at          timestamptz not null default now(),  -- when the larm went out
  recipient_count  integer        -- devices targeted (known only in the edge fn)
);

comment on table public.alerts is
  'Durable denormalized log of sent bird alerts (larm). Written by the send-bird-alert edge function; read-only to clients.';

create index if not exists alerts_location_id_idx on public.alerts (location_id);
create index if not exists alerts_sent_at_idx     on public.alerts (sent_at desc);

-- RLS: mirror `observations` — every authenticated member may read all larms
-- (club-wide announcements; no new exposure vs the already world-readable
-- observations). No insert/update/delete policies → immutable from clients; only
-- the service-role edge function writes.
alter table public.alerts enable row level security;

drop policy if exists alerts_select_authenticated on public.alerts;
create policy alerts_select_authenticated on public.alerts
  for select to authenticated using (true);

-- One-time backfill so the Lokaler screen has history from day one. De-duped on
-- observation_id, so re-running the whole file never doubles rows.
insert into public.alerts (
  observation_id, location_id, species_id,
  location_name, species_name, observer_user_id, observer_name,
  latitude, longitude, count, observed_at, sent_at, recipient_count
)
select
  o.id, o.location_id, o.species_id,
  l.name, s.swedish_name, o.user_id, p.display_name,
  coalesce(o.latitude, l.latitude), coalesce(o.longitude, l.longitude),
  o.count, o.observed_at, o.observed_at, null
from public.observations o
left join public.locations l on l.id = o.location_id
left join public.species   s on s.id = o.species_id
left join public.profiles  p on p.user_id = o.user_id
where o.alert_requested = true
  and not exists (select 1 from public.alerts a where a.observation_id = o.id);
