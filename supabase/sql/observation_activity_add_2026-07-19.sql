-- Add two activity values (2026-07-19): 'drogIväg' ("Drog iväg/ej kvar") and
-- 'svårsedd' ("Svårsedd"), requested by the club.
--
-- `observations.activity` is a free-text column guarded by the CHECK constraint
-- `observations_activity_valid`, which whitelists the allowed keys. Adding the
-- keys to the app enum is not enough — the DB rejects any value outside this list
-- — so the constraint must be widened here too, or a mobile report with the new
-- activity fails with a constraint violation.
--
-- The new list is a SUPERSET of the old one, so re-validating existing rows always
-- passes. Drop + re-add in one transaction so there's never a window with no
-- constraint. Postgres can't modify a CHECK in place.
--
-- Apply (shared project — raw SQL, NOT `db push`; migration history is untracked):
--   supabase db query --linked -f supabase/sql/observation_activity_add_2026-07-19.sql
--
-- ⚠️ WEB PARITY: the same constraint is DEFINED in the web app's Drizzle schema
-- (`../mafk/src/lib/db/schema.ts`, `observations_activity_valid`) with the OLD
-- list. Update that definition + the web `ACTIVITIES`/i18n to match, or (a) the
-- new activities render blank in the web feed and (b) a future web migration could
-- revert this constraint and start rejecting the mobile-created rows.

begin;

alter table public.observations drop constraint observations_activity_valid;

alter table public.observations add constraint observations_activity_valid
  check (
    activity is null or activity = any (array[
      'födosökande', 'spelSång', 'förbiflygande', 'rastande', 'häckningsbiotop',
      'lockläte', 'övrigaLäten', 'häckande', 'sträckande', 'stationär', 'spelande',
      'drogIväg', 'svårsedd'
    ]::text[])
  );

commit;
