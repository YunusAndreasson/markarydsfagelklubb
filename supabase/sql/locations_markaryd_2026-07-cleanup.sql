-- Markaryd lokaler — corrective cleanup (2026-07-19)
--
-- Fixes legacy seed/import mistakes without changing location ids that should
-- survive:
--   * remove the erroneous Tånnerydsdammen duplicate; Hydroviken is canonical
--   * remove the erroneous Hammarsjön row inside Markaryd tätort, then rename
--     the correct Strömsnäsbruk row while preserving its id
--   * move the general Altaböke sjö point to the club map coordinate; the nearby
--     tower remains a distinct, precise reporting point
--   * correct Hulstasjön -> Hultasjön
--
-- Safety: abort the whole transaction if either replacement is missing. Because
-- the club has confirmed both legacy rows are erroneous duplicates, any existing
-- observation/alert references are moved to the canonical row before deletion.
--
-- Apply (shared project — raw SQL, NOT `db push`):
--   supabase db query --linked -f supabase/sql/locations_markaryd_2026-07-cleanup.sql

begin;

do $$
begin
  if not exists (
    select 1
    from public.locations
    where name = 'Hydroviken'
      and abs(latitude - 56.466737) < 0.00001
      and abs(longitude - 13.601233) < 0.00001
  ) then
    raise exception 'Hydroviken saknas eller har oväntade koordinater; avbryter rensningen';
  end if;

  if not exists (
    select 1
    from public.locations
    where name in ('Hammarsjön', 'Hammarsjön (Strömsnäsbruk)')
      and abs(latitude - 56.542611) < 0.00001
      and abs(longitude - 13.724667) < 0.00001
  ) then
    raise exception 'Den korrekta Hammarsjön-posten saknas; avbryter rensningen';
  end if;
end
$$;

-- Tånnerydsdammen was a duplicate name for the Hydroviken site. Preserve any
-- references if a stale seed has recreated it, then remove the duplicate row.
update public.observations o
set location_id = canonical.id
from public.locations legacy, public.locations canonical
where legacy.name = 'Tånnerydsdammen'
  and canonical.name = 'Hydroviken'
  and o.location_id = legacy.id;

update public.alerts a
set location_id = canonical.id
from public.locations legacy, public.locations canonical
where legacy.name = 'Tånnerydsdammen'
  and canonical.name = 'Hydroviken'
  and a.location_id = legacy.id;

delete from public.locations
where name = 'Tånnerydsdammen';

-- The old seed placed Hammarsjön inside Markaryd tätort. Merge it into the real
-- lake by Strömsnäsbruk, preserving every observation/alert before removing id 4.
update public.observations o
set location_id = canonical.id
from public.locations legacy, public.locations canonical
where legacy.name = 'Hammarsjön'
  and abs(legacy.latitude - 56.463300) < 0.00001
  and abs(legacy.longitude - 13.571700) < 0.00001
  and canonical.name in ('Hammarsjön', 'Hammarsjön (Strömsnäsbruk)')
  and abs(canonical.latitude - 56.542611) < 0.00001
  and abs(canonical.longitude - 13.724667) < 0.00001
  and o.location_id = legacy.id;

update public.alerts a
set location_id = canonical.id
from public.locations legacy, public.locations canonical
where legacy.name = 'Hammarsjön'
  and abs(legacy.latitude - 56.463300) < 0.00001
  and abs(legacy.longitude - 13.571700) < 0.00001
  and canonical.name in ('Hammarsjön', 'Hammarsjön (Strömsnäsbruk)')
  and abs(canonical.latitude - 56.542611) < 0.00001
  and abs(canonical.longitude - 13.724667) < 0.00001
  and a.location_id = legacy.id;

delete from public.locations
where name = 'Hammarsjön'
  and abs(latitude - 56.463300) < 0.00001
  and abs(longitude - 13.571700) < 0.00001;

update public.locations
set name = 'Hammarsjön'
where name = 'Hammarsjön (Strömsnäsbruk)'
  and abs(latitude - 56.542611) < 0.00001
  and abs(longitude - 13.724667) < 0.00001;

update public.locations
set
  latitude = 56.533045,
  longitude = 13.642745,
  description = 'Våtmarksområde vid Altaböke med fågeltorn.'
where name = 'Altaböke sjö';

-- If the corrected batch import was rerun before this cleanup, both spellings
-- may exist. Merge the new id into the original row first so the rename cannot
-- hit the unique name constraint and no observation/alert loses its location.
update public.observations o
set location_id = legacy.id
from public.locations legacy, public.locations canonical
where legacy.name = 'Hulstasjön rastplats'
  and canonical.name = 'Hultasjön rastplats'
  and o.location_id = canonical.id;

update public.alerts a
set location_id = legacy.id
from public.locations legacy, public.locations canonical
where legacy.name = 'Hulstasjön rastplats'
  and canonical.name = 'Hultasjön rastplats'
  and a.location_id = canonical.id;

delete from public.locations canonical
using public.locations legacy
where canonical.name = 'Hultasjön rastplats'
  and legacy.name = 'Hulstasjön rastplats';

update public.locations
set name = 'Hultasjön rastplats'
where name = 'Hulstasjön rastplats';

commit;
