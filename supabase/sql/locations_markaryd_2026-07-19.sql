-- Markaryd lokaler — batch import #2 (2026-07-19)
-- 24 birding sites supplied as grid coordinates in a MIX of two systems:
--   • RT90 2.5 gon V  (EPSG:3021) — the 7-digit eastings (~1 36x xxx)
--   • SWEREF 99 TM    (EPSG:3006) — the 6-digit eastings (~40x xxx–41x xxx)
-- Detected per-row by easting magnitude and reprojected to WGS84 (pyproj) at 6 dp
-- (~0.1 m). One row, "Åmot", arrived with its O/N labels swapped and was corrected
-- (E 411623, N 6259777) before converting. Conversion cross-checks against the
-- untouched 2026-07-18 batch confirm it: Reningsdammarna lands 19 m and
-- Södergårdsdammarna 10 m from the existing rows.
--
-- Apply (shared project — raw SQL, NOT `db push`; migration history is untracked):
--   supabase db query --linked -f supabase/sql/locations_markaryd_2026-07-19.sql
--
-- Idempotent: each row inserts only if no lokal with that exact name already
-- exists (WHERE NOT EXISTS on name), so re-running is safe. `created_by_user_id`
-- and `description` stay NULL to match the official register rows.
--
-- Dedup (6 of the 24 supplied rows are DELIBERATELY OMITTED below):
--   • Already in the DB by exact name — Örnafälla (104), Åmot (103),
--     Reningsdammarna (102), Skärsjön (101), Södergårdsdammarna (31),
--     Fjärholma (34). All converted to within ≤421 m of their existing rows —
--     same place, keeping the earlier coordinates.
-- Note: "Trösklen/Lillåns våtmarker" sits 52 m from the existing "Tröskeln"
--   (id 115) — first omitted as a likely duplicate, but the club confirmed it is
--   a separate spot (2026-07-19), so it is included below.
-- Kept despite a nearby neighbour (a distinct named spot, not a duplicate):
--   • Rallvägen — 173 m from Tröskeln (id 115).
-- Note: "Ribersdals ängar" is ~2 km from the existing "Ribersdals reningsdammar"
--   (id 6) despite the shared name-family — a separate spot per the supplied coords.
--
-- Legacy duplicates and incorrect seed coordinates are handled centrally by
-- locations_markaryd_2026-07-cleanup.sql. Keeping destructive cleanup out of a
-- batch insert makes this file safe to rerun after new observations exist.

insert into public.locations (name, latitude, longitude)
select v.name, v.lat, v.lng
from (values
  ('Hydroviken',                 56.466737, 13.601233),
  ('Kraxasjön/Smålandssidan',    56.418386, 13.600548),
  ('Vångens udde',               56.502524, 13.548151),
  ('Sjöstrands ängar',           56.480925, 13.590832),
  ('Agghult/Traryd',             56.579710, 13.762141),
  ('Ribersdals ängar',           56.477732, 13.583064),
  ('Holma raksträcka',           56.457812, 13.519745),
  ('Ulvsbäck',                   56.482521, 13.579663),
  ('Rallvägen',                  56.475227, 13.579789),
  ('Sjötorpet',                  56.462972, 13.601313),
  ('Nibedammen',                 56.446270, 13.578533),
  ('Kvantumdammen',              56.448948, 13.599071),
  ('Fagerdala bro/Vänneån',      56.556126, 13.455106),
  ('Grysshultasjö',              56.582328, 13.559999),
  ('Lillån/Kyrkbron',            56.470761, 13.569631),
  ('Hualtet',                    56.489737, 13.631756),
  ('Exhult',                     56.483388, 13.660906),
  ('Trösklen/Lillåns våtmarker', 56.475754, 13.577985)
) as v(name, lat, lng)
where not exists (
  select 1 from public.locations l where l.name = v.name
);
