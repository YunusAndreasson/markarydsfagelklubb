-- Markaryd lokaler — open-map coordinate audit (2026-07-19)
--
-- Corrects three legacy coordinates that can be matched unambiguously against
-- open map data. The updates are deliberately guarded by the old coordinates:
-- rerunning this file is safe and a later manual correction is never overwritten.
-- Also removes the erroneous Ribersdals reningsdammar row. Its point is on
-- Kartvägen, about 2.2 km south of Ribersdal, and no matching site could be
-- identified in the open map data.
--
-- Sources checked:
--   * OpenStreetMap/Nominatim lake geometry for Hannabadssjön and Lokasjön
--   * Länsstyrelsen Kronoberg's lake register for Köphultasjön (RT90 2.5 gon V
--     N 6256990, E 1359100), transformed to WGS84 with EPSG:3021 -> EPSG:4326
--
-- Apply (shared project — raw SQL, NOT `db push`):
--   supabase db query --linked -f \
--     supabase/sql/locations_markaryd_2026-07-open-map-audit.sql

begin;

-- The old point was about 11 km north-east of Köphultasjön, near Vekaboda.
update public.locations
set
  latitude = 56.419577,
  longitude = 13.521950
where name = 'Köphultasjön'
  and abs(latitude - 56.471700) < 0.00001
  and abs(longitude - 13.678300) < 0.00001;

-- The old longitude put Lokasjöområdet about 3.7 km west of Lokasjön. Use the
-- centre of the mapped lake geometry for this area-level marker.
update public.locations
set
  latitude = 56.454058,
  longitude = 13.570102
where name = 'Lokasjöområdet'
  and abs(latitude - 56.453300) < 0.00001
  and abs(longitude - 13.510600) < 0.00001;

-- Both Hannabad rows had the nature reserve's coordinate. Keep the reserve
-- where it is and move only the lake row to the lake geometry's centre.
update public.locations
set
  latitude = 56.436358,
  longitude = 13.553986
where name = 'Hannabadssjön'
  and abs(latitude - 56.432000) < 0.00001
  and abs(longitude - 13.538700) < 0.00001;

-- This row had no observation or alert references when audited. Keep the
-- deletion guarded so an unexpectedly used row cannot be removed later.
delete from public.locations l
where l.name = 'Ribersdals reningsdammar'
  and abs(l.latitude - 56.458300) < 0.00001
  and abs(l.longitude - 13.603300) < 0.00001
  and not exists (
    select 1 from public.observations o where o.location_id = l.id
  )
  and not exists (
    select 1 from public.alerts a where a.location_id = l.id
  );

commit;
