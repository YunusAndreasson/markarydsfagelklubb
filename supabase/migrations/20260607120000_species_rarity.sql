-- Species rarity — the MaFk larmlista "prefix" (0–5: 0 = rarest, 5 = most
-- common). Source: "Mafk larmlista" xlsx, sheet Blad2 (the curated larmlista,
-- chosen over Blad1's raw report-count basis). Drives the Obsar card + detail
-- rarity badge through src/lib/rarity.ts (rarityFor), replacing the hardcoded 5.
--
-- Additive + nullable, so the web app simply ignores it. Populated by matching
-- swedish_name || scientific_name; the 4 species whose scientific name was later
-- revised in this DB (Duvhök, Järpe, Mindre strandpipare, Tamduva) are set by
-- their (unique) Swedish name. "Olistad art" has no prefix and stays null.
--
-- MCP is read-only, so apply to the shared project via the linked CLI:
--   supabase db query --linked -f supabase/migrations/20260607120000_species_rarity.sql
-- then regenerate types if used:
--   supabase gen types typescript --project-id zgnmajovyqibgxlcomvb > src/lib/database.types.ts

alter table public.species
  add column if not exists rarity smallint
  check (rarity is null or rarity between 0 and 5);

-- Bulk: exact match on the concatenated Swedish + scientific name.
update public.species s set rarity = v.prefix
from (values
  ('AlfågelClangula hyemalis',2),
  ('AlkekungAlle alle',2),
  ('BacksvalaRiparia riparia',5),
  ('BergandAythya marila',2),
  ('BergfinkFringilla montifringilla',5),
  ('BerguvBubo bubo',1),
  ('BivråkPernis apivorus',5),
  ('BjörktrastTurdus pilaris',5),
  ('Blå kärrhökCircus cyaneus',5),
  ('BlåhakeLuscinia svecica',2),
  ('BlåmesCyanistes caeruleus',5),
  ('BläsandMareca penelope',5),
  ('BläsgåsAnser albifrons',4),
  ('BofinkFringilla coelebs',5),
  ('Brandkronad kungsfågelRegulus ignicapilla',2),
  ('Brun gladaMilvus migrans',2),
  ('Brun kärrhökCircus aeruginosus',5),
  ('BrunandAythya ferina',3),
  ('BrushaneCalidris pugnax',2),
  ('BuskskvättaSaxicola rubetra',5),
  ('BändelkorsnäbbLoxia leucoptera',3),
  ('DomherrePyrrhula pyrrhula',5),
  ('DrillsnäppaActitis hypoleucos',5),
  ('DubbeltrastTurdus viscivorus',5),
  ('DuvhökAstur gentilis',4),
  ('DvärgbeckasinLymnocryptes minimus',2),
  ('DvärgmåsHydrocoloeus minutus',2),
  ('EjderSomateria mollissima',4),
  ('EnkelbeckasinGallinago gallinago',5),
  ('EntitaPoecile palustris',5),
  ('EremitibisGeronticus eremita',1),
  ('FasanPhasianus colchicus',4),
  ('FiskgjusePandion haliaetus',5),
  ('FiskmåsLarus canus',5),
  ('FisktärnaSterna hirundo',5),
  ('FjällvråkButeo lagopus',5),
  ('ForsärlaMotacilla cinerea',5),
  ('GluttsnäppaTringa nebularia',4),
  ('GransångarePhylloscopus collybita',5),
  ('GravandTadorna tadorna',3),
  ('Grå flugsnappareMuscicapa striata',5),
  ('GrågåsAnser anser',5),
  ('GråhakedoppingPodiceps grisegena',2),
  ('GråhägerArdea cinerea',5),
  ('GråsiskaAcanthis flammea',5),
  ('GråsparvPasser domesticus',5),
  ('GråtrutLarus argentatus',5),
  ('GräsandAnas platyrhynchos',5),
  ('GräshoppsångareLocustella naevia',2),
  ('GrönbenaTringa glareola',5),
  ('GrönfinkChloris chloris',5),
  ('GröngölingPicus viridis',5),
  ('GrönsiskaSpinus spinus',5),
  ('GrönsångarePhylloscopus sibilatrix',5),
  ('GulhämplingSerinus serinus',1),
  ('GulsparvEmberiza citrinella',5),
  ('GulärlaMotacilla flava',5),
  ('GärdsmygTroglodytes troglodytes',5),
  ('GökCuculus canorus',5),
  ('GöktytaJynx torquilla',5),
  ('HavstrutLarus marinus',4),
  ('HavsörnHaliaeetus albicilla',4),
  ('HornugglaAsio otus',4),
  ('HussvalaDelichon urbicum',5),
  ('HämplingLinaria cannabina',5),
  ('HärfågelUpupa epops',2),
  ('HärmsångareHippolais icterina',5),
  ('HökugglaSurnia ulula',2),
  ('JaktfalkFalco rusticolus',1),
  ('JordugglaAsio flammeus',2),
  ('JärnsparvPrunella modularis',5),
  ('JärpeTetrastes bonasia',2),
  ('KajaColoeus monedula',5),
  ('KanadagåsBranta canadensis',5),
  ('KattugglaStrix aluco',5),
  ('KnipaBucephala clangula',5),
  ('KnölsvanCygnus olor',5),
  ('KoltrastTurdus merula',5),
  ('KornknarrCrex crex',2),
  ('KorpCorvus corax',5),
  ('KrickaAnas crecca',5),
  ('KråkaCorvus corone',5),
  ('KungsfiskareAlcedo atthis',5),
  ('KungsfågelRegulus regulus',4),
  ('KungsörnAquila chrysaetos',4),
  ('KustlabbStercorarius parasiticus',1),
  ('KustpiparePluvialis squatarola',2),
  ('KustsnäppaCalidris canutus',1),
  ('KärrsnäppaCalidris alpina',4),
  ('KärrsångareAcrocephalus palustris',3),
  ('LadusvalaHirundo rustica',5),
  ('LappsparvCalcarius lapponicus',2),
  ('LappugglaStrix nebulosa',3),
  ('LjungpiparePluvialis apricaria',5),
  ('LärkfalkFalco subbuteo',5),
  ('LövsångarePhylloscopus trochilus',5),
  ('MandarinandAix galericulata',2),
  ('Mindre flugsnappareFicedula parva',2),
  ('Mindre hackspettDryobates minor',4),
  ('Mindre korsnäbbLoxia curvirostra',5),
  ('Mindre strandpipareThinornis dubius',5),
  ('Mindre sångsvanCygnus columbianus',4),
  ('MorkullaScolopax rusticola',5),
  ('MosnäppaCalidris temminckii',2),
  ('MyrspovLimosa lapponica',2),
  ('NattskärraCaprimulgus europaeus',5),
  ('NäktergalLuscinia luscinia',4),
  ('NötkråkaNucifraga caryocatactes',5),
  ('NötskrikaGarrulus glandarius',5),
  ('NötväckaSitta europaea',5),
  ('OrmvråkButeo buteo',5),
  ('OrreLyrurus tetrix',5),
  ('OrtolansparvEmberiza hortulana',2),
  ('PilfinkPasser montanus',5),
  ('PilgrimsfalkFalco peregrinus',2),
  ('PrutgåsBranta bernicla',4),
  ('PärlugglaAegolius funereus',3),
  ('RapphönaPerdix perdix',2),
  ('RingduvaColumba palumbus',5),
  ('RingtrastTurdus torquatus',4),
  ('RosenfinkCarpodacus erythrinus',2),
  ('RostgumpsvalaCecropis rufula',1),
  ('RåkaCorvus frugilegus',3),
  ('Röd gladaMilvus milvus',5),
  ('RödbenaTringa totanus',2),
  ('RödhakeErithacus rubecula',5),
  ('RödstjärtPhoenicurus phoenicurus',5),
  ('Rödstrupig piplärkaAnthus cervinus',2),
  ('RödvingetrastTurdus iliacus',5),
  ('RördromBotaurus stellaris',2),
  ('RörhönaGallinula chloropus',5),
  ('RörsångareAcrocephalus scirpaceus',5),
  ('SalskrakeMergellus albellus',5),
  ('SidensvansBombycilla garrulus',5),
  ('SilltrutLarus fuscus',2),
  ('SilvertärnaSterna paradisaea',2),
  ('SjöorreMelanitta nigra',5),
  ('SkataPica pica',5),
  ('SkedandSpatula clypeata',3),
  ('SkogsduvaColumba oenas',4),
  ('SkogsgåsAnser fabalis',4),
  ('SkogssnäppaTringa ochropus',5),
  ('SkrattmåsChroicocephalus ridibundus',5),
  ('SkräntärnaHydroprogne caspia',1),
  ('SkäggdoppingPodiceps cristatus',4),
  ('SkäggmesPanurus biarmicus',3),
  ('SkärfläckaRecurvirostra avosetta',2),
  ('SmådoppingTachybaptus ruficollis',4),
  ('Småfläckig sumphönaPorzana porzana',2),
  ('SmålomGavia stellata',2),
  ('SmåskrakeMergus serrator',3),
  ('SmåspovNumenius phaeopus',2),
  ('SnatterandMareca strepera',3),
  ('SnösparvPlectrophenax nivalis',4),
  ('SommargyllingOriolus oriolus',1),
  ('SothönaFulica atra',4),
  ('SparvhökAccipiter nisus',5),
  ('SparvugglaGlaucidium passerinum',5),
  ('SpetsbergsgåsAnser brachyrhynchus',2),
  ('SpillkråkaDryocopus martius',5),
  ('SpovsnäppaCalidris ferruginea',2),
  ('StareSturnus vulgaris',5),
  ('SteglitsCarduelis carduelis',5),
  ('StenfalkFalco columbarius',4),
  ('StenknäckCoccothraustes coccothraustes',5),
  ('StenskvättaOenanthe oenanthe',5),
  ('StjärtandAnas acuta',4),
  ('StjärtmesAegithalos caudatus',5),
  ('StorlomGavia arctica',5),
  ('StorskarvPhalacrocorax carbo',5),
  ('StorskrakeMergus merganser',5),
  ('StorspovNumenius arquata',3),
  ('StrandskataHaematopus ostralegus',3),
  ('StripgåsAnser indicus',1),
  ('StrömstareCinclus cinclus',1),
  ('Större hackspettDendrocopos major',1),
  ('Större korsnäbbLoxia pytyopsittacus',5),
  ('Större strandpipareCharadrius hiaticula',3),
  ('Svart rödstjärtPhoenicurus ochruros',5),
  ('Svarthakad buskskvättaSaxicola rubicola',2),
  ('SvarthakedoppingPodiceps auritus',2),
  ('SvarthättaSylvia atricapilla',5),
  ('SvartmesPeriparus ater',5),
  ('SvartsnäppaTringa erythropus',3),
  ('SvarttärnaChlidonias niger',2),
  ('Svartvit flugsnappareFicedula hypoleuca',5),
  ('SvärtaMelanitta fusca',2),
  ('SånglärkaAlauda arvensis',5),
  ('SångsvanCygnus cygnus',5),
  ('SädesärlaMotacilla alba',5),
  ('SävsparvEmberiza schoeniclus',5),
  ('SävsångareAcrocephalus schoenobaenus',4),
  ('TalgoxeParus major',5),
  ('TallbitPinicola enucleator',2),
  ('TalltitaPoecile montanus',4),
  ('TaltrastTurdus philomelos',5),
  ('TamduvaColumba livia',5),
  ('TjäderTetrao urogallus',4),
  ('TofslärkaGalerida cristata',1),
  ('TofsmesLophophanes cristatus',4),
  ('TofsvipaVanellus vanellus',5),
  ('TordmuleAlca torda',1),
  ('TornfalkFalco tinnunculus',4),
  ('TornseglareApus apus',5),
  ('TranaGrus grus',5),
  ('TrastsångareAcrocephalus arundinaceus',1),
  ('Tretåig måsRissa tridactyla',2),
  ('TrädgårdssångareSylvia borin',5),
  ('TrädkrypareCerthia familiaris',5),
  ('TrädlärkaLullula arborea',4),
  ('TrädpiplärkaAnthus trivialis',5),
  ('TundragåsAnser serrirostris',1),
  ('TurkduvaStreptopelia decaocto',3),
  ('TurturduvaStreptopelia turtur',1),
  ('TörnskataLanius collurio',5),
  ('TörnsångareCurruca communis',5),
  ('VaktelCoturnix coturnix',2),
  ('VarfågelLanius excubitor',5),
  ('VassångareLocustella luscinioides',1),
  ('VattenrallRallus aquaticus',5),
  ('ViggAythya fuligula',4),
  ('VinterhämplingLinaria flavirostris',4),
  ('Vit storkCiconia ciconia',3),
  ('Vitkindad gåsBranta leucopsis',5),
  ('ÅrtaSpatula querquedula',3),
  ('ÄgretthägerArdea alba',3),
  ('ÄngshökCircus pygargus',1),
  ('ÄngspiplärkaAnthus pratensis',5),
  ('ÄrtsångareCurruca curruca',5)
) as v(key, prefix)
where s.swedish_name || s.scientific_name = v.key;

-- Genus-revised in this DB → match on the (unique) Swedish name instead.
update public.species set rarity = 4 where swedish_name = 'Duvhök';
update public.species set rarity = 2 where swedish_name = 'Järpe';
update public.species set rarity = 5 where swedish_name = 'Mindre strandpipare';
update public.species set rarity = 5 where swedish_name = 'Tamduva';

-- Sheet anomalies corrected: both have very high report counts (855 / 468) but
-- were prefixed 1, while every other 400+-report species is 5. Set to 5 to match
-- (otherwise a common woodpecker/dipper shows as the rarest tier on the card).
update public.species set rarity = 5 where swedish_name = 'Större hackspett';
update public.species set rarity = 5 where swedish_name = 'Strömstare';

-- Markaryd kommun calibration (2026-07-18): the bulk prefixes above come from the
-- general MaFk larmlista. These nine are scarcer in Markaryd — a small inland
-- kommun (no coast) — than that list implies, so each is lowered one step (rarer
-- = lower number) to make it more alert-worthy locally. Kept as overrides here,
-- not edited into the bulk list, so the xlsx transcription stays intact — same
-- pattern as the anomaly corrections above. Swedish names are unique → matched on
-- swedish_name.
update public.species set rarity = 4 where swedish_name = 'Salskrake';    -- 5 → 4
update public.species set rarity = 3 where swedish_name = 'Fasan';        -- 4 → 3
update public.species set rarity = 4 where swedish_name = 'Ljungpipare';  -- 5 → 4
update public.species set rarity = 4 where swedish_name = 'Grönbena';     -- 5 → 4
update public.species set rarity = 4 where swedish_name = 'Backsvala';    -- 5 → 4
update public.species set rarity = 3 where swedish_name = 'Näktergal';    -- 4 → 3
update public.species set rarity = 3 where swedish_name = 'Stenfalk';     -- 4 → 3
update public.species set rarity = 4 where swedish_name = 'Kungsfiskare'; -- 5 → 4
update public.species set rarity = 4 where swedish_name = 'Härmsångare';  -- 5 → 4

-- Markaryd kommun calibration, pass 2 (2026-07-18): the coastal/marine species
-- the general larmlista still rated common, plus one upward tweak. Markaryd has
-- no coast, so seaducks, coastal gulls and passage waders are genuinely notable
-- inland and are stepped down to be more alert-worthy; Sjöorre joins its congener
-- Svärta at 2. Järpe — an elusive but genuine local conifer resident (its earlier
-- prefix 2 is set by the genus-revised block above) — is nudged up one step.
update public.species set rarity = 2 where swedish_name = 'Sjöorre';         -- 5 → 2 (marine scoter; parity with Svärta)
update public.species set rarity = 2 where swedish_name = 'Ejder';           -- 4 → 2 (marine seaduck)
update public.species set rarity = 2 where swedish_name = 'Prutgås';         -- 4 → 2 (coastal goose)
update public.species set rarity = 3 where swedish_name = 'Kärrsnäppa';      -- 4 → 3 (coastal/passage wader)
update public.species set rarity = 3 where swedish_name = 'Havstrut';        -- 4 → 3 (coastal gull)
update public.species set rarity = 3 where swedish_name = 'Vinterhämpling';  -- 4 → 3 (coastal winter finch)
update public.species set rarity = 4 where swedish_name = 'Gråtrut';         -- 5 → 4 (coastal gull)
update public.species set rarity = 4 where swedish_name = 'Storskarv';       -- 5 → 4 (coastal / big-lake)
update public.species set rarity = 4 where swedish_name = 'Svart rödstjärt'; -- 5 → 4 (local inland)
update public.species set rarity = 4 where swedish_name = 'Nötkråka';        -- 5 → 4 (scarce conifer resident)
update public.species set rarity = 4 where swedish_name = 'Vattenrall';      -- 5 → 4 (local reedbed skulker)
update public.species set rarity = 3 where swedish_name = 'Järpe';           -- 2 → 3 (regular local conifer resident)
