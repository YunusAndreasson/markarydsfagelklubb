-- Markaryd lokaler — batch import (2026-07-18)
-- 18 birding sites the club supplied as coordinates (a mix of DMS and decimal).
-- Normalised here to one homogeneous shape: sentence-case Swedish names +
-- decimal lat/lng at 6 dp (~0.1 m). `created_by_user_id` is left NULL to match
-- every existing club lokal (an "official" register entry, not a user's private
-- pin); `description` stays NULL.
--
-- Apply (shared project — raw SQL, NOT `db push`; migration history is untracked):
--   supabase db query --linked -f supabase/sql/locations_markaryd_2026-07.sql
--
-- Idempotent: each row inserts only if no lokal with that exact name already
-- exists, so re-running is safe and never duplicates.
--
-- Spelling / collision notes (all confirmed by the club 2026-07-18):
--   • "Klintbadet" — de-typo of the supplied "klntbadet".
--   • "Hammarsjön" — the real lake by Strömsnäsbruk. The old seed row with this
--     name inside Markaryd tätort was an erroneous duplicate and is removed by
--     locations_markaryd_2026-07-cleanup.sql.
--   • "Ridbanan Strömsnäsbruk" — fixes the supplied "strämnsnäsbruk".
--   • "Altaböke sjö torn" — the exact tower point within the Altaböke sjö area,
--     ~146 m from the club map's general location coordinate.

insert into public.locations (name, latitude, longitude)
select v.name, v.lat, v.lng
from (values
  ('FBU-stugan',                 56.451417, 13.582556),
  ('Västra industriområdet',     56.450111, 13.584972),
  ('Skärsjön',                   56.466389, 13.583056),
  ('Reningsdammarna',            56.473444, 13.581194),
  ('Åmot',                       56.473694, 13.566194),
  ('Örnafälla',                  56.487417, 13.554722),
  ('Ängabäcks ängar',            56.490306, 13.497556),
  ('Anderslöv',                  56.473944, 13.608778),
  ('Hultasjön rastplats',        56.541472, 13.612917),
  ('Hammarsjön',                 56.542611, 13.724667),
  ('Klintbadet',                 56.546963, 13.724527),
  ('Ridbanan Strömsnäsbruk',     56.555806, 13.737444),
  ('Bruksområdet',               56.554721, 13.730190),
  ('Luhrpasset',                 56.560500, 13.724639),
  ('Drakamyr',                   56.539189, 13.750177),
  ('Altaböke sjö torn',          56.531796, 13.643456),
  ('Tröskeln',                   56.475764, 13.577144),
  ('Spången',                    56.460513, 13.573964)
) as v(name, lat, lng)
where not exists (
  select 1 from public.locations l where l.name = v.name
);
