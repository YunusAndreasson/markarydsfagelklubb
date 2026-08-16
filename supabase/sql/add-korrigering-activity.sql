-- Lägg till aktiviteten 'korrigering' i observations_activity_valid.
--
-- ⚠️ KÖR INTE förrän alla installerade klienter är >= v1.0.2.
--
-- Byggen till och med v1.0.1 saknar activityLabel() och slår upp aktiviteten
-- direkt i i18n-mappen (v1.0.1:src/app/filter.tsx:77-78). Ett okänt värde ger
-- undefined, och sorteringen anropar undefined.localeCompare(...) → TypeError
-- mitt i renderingen. Aktivitetslistan byggs ur FLÖDET, så det räcker att EN
-- medlem rapporterar en Korrigering för att varje sådan klient ska krascha på
-- flödesskärmen — exakt samma krasch som 'svårsedd' orsakade i augusti 2026.
--
-- v1.0.2+ är säkra (activityLabel faller tillbaka på råsträngen).
-- Play Production ligger sannolikt kvar på v1.0.0 eftersom eas.json fortfarande
-- submittar Android till track: "internal" — kontrollera innan detta körs.
--
-- CHECK-villkoret delas av alla klienter mot samma prod-databas, så det måste
-- vidgas innan appen kan spara värdet. Körs som EN transaktion: mellan DROP och
-- ADD finns inget villkor alls, och den luckan ska inte vara observerbar.
--
-- Listan speglar ACTIVITIES + LEGACY_ACTIVITIES i
-- src/lib/validation/observation.ts. Ändras den ena måste den andra följa med.

begin;

alter table public.observations
  drop constraint if exists observations_activity_valid;

alter table public.observations
  add constraint observations_activity_valid check (
    activity is null
    or activity = any (
      array[
        'födosökande',
        'spelSång',
        'förbiflygande',
        'rastande',
        'häckningsbiotop',
        'lockläte',
        'övrigaLäten',
        'häckande',
        'sträckande',
        'stationär',
        'spelande',
        'drogIväg',
        'svårsedd',
        'korrigering'
      ]::text[]
    )
  );

commit;
