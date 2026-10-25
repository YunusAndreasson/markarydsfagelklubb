/**
 * All svenska UI-strängar för mafk samlade här. Använd den här filen som enda
 * källa när texter behövs i komponenter — så blir det enkelt att lägga till
 * fler språk om vi någon gång ska göra det.
 */
export const sv = {
  app: {
    name: 'Markaryds Fågelklubb',
    tagline: 'Fågelrapportering för medlemmar',
  },
  common: {
    cancel: 'Avbryt',
    close: 'Stäng',
    done: 'Klar',
    // Skärmläsaretikett för kryssrutan i sökfältet i pickerbladen (Android, där
    // `clearButtonMode` inte finns). Inte "Rensa filter" — det är ett annat fält.
    clearSearch: 'Rensa sökningen',
    comingSoon: 'Kommer snart',
    refreshFailed: 'Kunde inte uppdatera. Försök igen.',
    // Marker efter etiketten på fält man kan hoppa över (t.ex. bild, kommentar).
    // Bara valfria fält märks — övriga är underförstått obligatoriska (Jakobs lag).
    optional: '(valfritt)',
  },
  // Appens navigation ÄR `bottomNav` nedan. Kvar här ligger bara den etikett som
  // auth-callbackens felläge behöver; webbappens toppnavigering (Hem / Översikt)
  // har aldrig funnits på en flik-yta.
  nav: {
    logIn: 'Logga in',
  },
  bottomNav: {
    feed: 'Larm',
    locations: 'Lokaler',
    profile: 'Profil',
  },
  // Rubriken över inloggningsskärmen (`(auth)/sign-in`).
  home: {
    title: 'Markaryds Fågelklubb',
    subtitle: 'Rapportera och följ fågelobservationer i Markaryd.',
  },
  login: {
    title: 'Logga in',
    // Social sign-in (M5) — Apple/Google are primary, e-post är reservväg.
    continueWithApple: 'Fortsätt med Apple',
    continueWithGoogle: 'Fortsätt med Google',
    withEmail: 'Logga in med e-post',
    or: 'eller',
    emailLabel: 'E-postadress',
    emailPlaceholder: 'du@example.com',
    emailHelp: 'Vi använder den bara för inloggning.',
    sendLink: 'Skicka inloggningslänk',
    sending: 'Skickar…',
    sentTitle: 'Kolla din e-post',
    sentTo: (email: string) => `Vi har skickat en inloggningslänk till ${email}.`,
    // "Du kan stänga sidan" var webbtext — här finns ingen sida att stänga, och
    // länken öppnar appen igen via djuplänken `mafk:///auth/callback`.
    sentHelp: 'Öppna länken på den här enheten så loggas du in i appen.',
    sentSpamHint: 'Hittar du inget mejl? Kolla skräpposten — det kan ta någon minut.',
    openMail: 'Öppna e-post',
    useDifferentEmail: 'Använd en annan e-post',
    // Liten samtyckesrad (App Store kräver villkor/integritetspolicy för appar med
    // innehåll som användare skapar). Delarna sätts ihop till klickbara länkar.
    legalPrefix: 'Genom att logga in godkänner du våra ',
    legalTerms: 'användarvillkor',
    legalAnd: ' och ',
    legalPrivacy: 'integritetspolicy',
    legalSuffix: '.',
    signedIn: 'Inloggad.',
    verifying: 'Verifierar inloggningslänk…',
    tryAgain: 'Försök igen',
    errors: {
      invalidEmail: 'Ogiltig e-postadress.',
      sendFailed: 'Kunde inte skicka e-post. Försök igen om en stund.',
      verifyFailed: 'Länken är ogiltig eller har gått ut. Försök igen.',
      callbackMissingCode: 'Inloggningslänken är ofullständig.',
      callbackFailed: 'Kunde inte slutföra inloggningen.',
      appleFailed: 'Kunde inte logga in med Apple. Försök igen.',
      googleFailed: 'Kunde inte logga in med Google. Försök igen.',
    },
  },
  onboarding: {
    title: 'Välkommen!',
    description: 'Vad ska andra medlemmar kalla dig?',
    nameLabel: 'Ditt namn',
    namePlaceholder: 'T.ex. Anna Andersson',
    save: 'Fortsätt',
    saving: 'Sparar…',
    error: 'Kunde inte spara. Försök igen.',
  },
  feed: {
    title: 'Larm',
    empty: 'Inga observationer ännu. Bli den första att larma!',
    // Flödet är ett rullande 14-dagarsfönster (samma fönster som lokalernas
    // aktivitet). Visas sist i listan och som förklaring i det tomma läget, så
    // att slutet på "Tidigare" inte läses som "det här är allt klubben har
    // rapporterat".
    windowNote: 'Visar observationer från de senaste 14 dagarna.',
    today: 'Idag',
    yesterday: 'Igår',
    thisWeek: 'Senaste veckan',
    windowLabel: 'Senaste 14 dagarna',
    earlier: 'Tidigare',
    newObservation: 'Larma',
    mine: 'Min',
    locationOnMap: 'På karta',
    refreshed: 'Observationerna uppdaterade',
    count: (n: number) => (n === 1 ? '1 individ' : `${n} individer`),
    timeOnly: (d: Date) => d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
    // Kort relativ tid för kortens hörn: "nu", "5m sedan", "2h sedan", "3d sedan",
    // "8v sedan", "1år sedan". "sedan" gör det tydligare att det är förfluten tid;
    // exakt tid finns kvar via `timeFriendly` / `fullDateTime`.
    timeAgo: (d: Date, now: Date = new Date()) => {
      const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))
      if (sec < 60) return 'nu'
      const min = Math.floor(sec / 60)
      if (min < 60) return `${min}m sedan`
      const hr = Math.floor(min / 60)
      if (hr < 24) return `${hr}h sedan`
      const day = Math.floor(hr / 24)
      if (day < 7) return `${day}d sedan`
      if (day < 365) return `${Math.floor(day / 7)}v sedan`
      return `${Math.floor(day / 365)}år sedan`
    },
    weekday: (d: Date) =>
      d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }),
    fullDateTime: (d: Date) =>
      d.toLocaleString('sv-SE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    observerDialogTitle: 'Kontakta observatören',
    callButton: (name: string) => `Ring ${name}`,
    callButtonGeneric: 'Ring',
    phoneMissing: 'Den här medlemmen har inte lagt till något telefonnummer.',
    close: 'Stäng',
    unknownObserver: 'Okänd observatör',
    reportedBy: (name: string) => `Rapporterad av ${name}`,
  },
  // Filtrering av obsar-flödet (klient-sidan; art/aktivitet/plats + endast mina).
  // Sektionsrubrikerna återanvänder `observation.*Label`; här ligger bara det nya.
  filter: {
    button: 'Filter',
    buttonActive: (n: number) => `Filter · ${n}`,
    title: 'Filtrera larm',
    scopeAll: 'Alla',
    scopeMine: 'Mina',
    scopeLabel: 'Visning',
    clear: 'Rensa filter',
    clearShort: 'Rensa',
    // Hela frasen, inte "Visa 51" — ett verb och ett löst tal säger inte vad de
    // 51 är. Den klipptes tidigare för att båda knapparna delade bredden lika;
    // nu tar "Rensa filter" bara sin egen bredd och den här får resten (se
    // `filter.tsx`), så frasen får plats. `applyA11y` böjer singularen.
    apply: (n: number) => (n === 1 ? 'Visa 1 träff' : `Visa ${n} träffar`),
    applyA11y: (n: number) => (n === 1 ? 'Visa 1 träff' : `Visa ${n} träffar`),
    emptyTitle: 'Inga obsar matchar filtret.',
    emptyAction: 'Rensa filter',
    removeChip: (label: string) => `Ta bort filter: ${label}`,
  },
  member: {
    title: 'Medlem',
    reportedHeading: 'Rapporterat',
    empty: 'Inga rapporter de senaste 14 dagarna.',
    notFound: 'Medlemmen hittades inte.',
    blockedTitle: 'Du har dolt den här medlemmens fynd',
    blockedMessage: 'Du ser inte deras fynd just nu. Tryck för att visa igen.',
  },
  // Mjukt formulerad moderering (App Store kräver att man kan dölja innehåll och
  // höra av sig om olämpligt innehåll — även i en liten klubb). "Dölj" göms
  // lokalt på enheten; "Meddela klubben" öppnar e-post till klubben.
  moderation: {
    actionsLabel: 'Fler val',
    report: 'Meddela klubben',
    block: (name: string) => `Dölj fynd från ${name}`,
    unblock: 'Visa igen',
    blockConfirmTitle: (name: string) => `Dölj fynd från ${name}?`,
    blockConfirmMessage:
      'Du slutar se den här medlemmens fynd i flödet. Du kan visa dem igen när som helst under Profil → Dolda medlemmar.',
    blockConfirm: 'Dölj',
    blocked: 'Medlemmens fynd döljs nu.',
    unblocked: 'Medlemmens fynd visas igen.',
    reportSubject: (ref: string) => `Synpunkt på innehåll (${ref})`,
    reportBody: (ref: string) =>
      `Jag vill uppmärksamma klubben på följande innehåll i appen: ${ref}\n\nVad gäller det?\n`,
    reportFailed: 'Kunde inte öppna e-post.',
    reportObservationRef: (id: string) => `observation ${id}`,
    reportMemberRef: (name: string) => `medlem ${name}`,
  },
  blockedMembers: {
    title: 'Dolda medlemmar',
    empty: 'Du har inte dolt någon.',
    help: 'Dolda medlemmars fynd visas inte i flödet. Tryck på en medlem för att visa igen.',
    unblock: 'Visa igen',
  },
  // Rariteten visas som en färgad sifferbricka (0–5, där 0 = mest sällsynt och
  // 5 = allmän). `a11y` annonserar nivån för skärmläsare; `levelLabel` ger
  // sifferbrickan ett ord i flödesfiltret (annars vore en färgad siffra kryptisk).
  rarity: {
    label: 'Raritet',
    a11y: (level: number) => `Raritetsnivå ${level}`,
    levelLabel: (level: number) =>
      (
        [
          'Mycket sällsynt',
          'Sällsynt',
          'Ovanlig',
          'Mindre allmän',
          'Ganska allmän',
          'Allmän',
        ] as const
      )[level] ?? `Nivå ${level}`,
  },
  observation: {
    titleNew: 'Nytt larm',
    titleEdit: 'Redigera',
    titleDetail: 'Observation',
    speciesLabel: 'Art',
    speciesPlaceholder: 'Välj art',
    speciesSearch: 'Sök art…',
    speciesEmpty: 'Inga arter matchar.',
    // MATCH KEY — must equal the species row's `swedish_name` in the DB (used to
    // find the unlisted row). The visible label is `speciesUnlistedLabel`, so don't
    // repurpose this for display.
    speciesUnlisted: 'Olistad art',
    speciesUnlistedLabel: 'Olistad fågelart',
    speciesUnlistedHint: 'Art som saknas i listan – beskriv den i kommentaren',
    speciesOther: 'Övrigt (ej fågel)',
    speciesOtherHint: 'Något annat än en fågel – beskriv det i kommentaren',
    required: 'Obligatoriskt',
    optional: 'Valfritt',
    errors: {
      speciesMissing: 'Välj en art.',
      countTooLow: 'Antal måste vara minst 1.',
      locationMissing: 'Markera platsen på kartan.',
      activityMissing: 'Välj vad fågeln gjorde.',
      // Sammanfattande toast vid ofullständig rapport — så att felet inte bara är
      // en vibration när det röda fältet ligger utanför skärmen.
      fillRequired: (fields: readonly string[]) => `Komplettera: ${fields.join(', ')}`,
    },
    countLabel: 'Antal',
    countDecrease: 'Minska antal',
    countIncrease: 'Öka antal',
    countEditHint: 'Tryck för att skriva antal',
    activityClear: 'Inget valt',
    timeLabel: 'Tid',
    timeNow: 'Nu',
    // Läsvänlig svensk tid utan årtals-brus: "Idag 14:30", "Igår 09:15",
    // "fre 31 maj 14:30". Årtal visas bara om det inte är innevarande år.
    timeFriendly: (d: Date, now: Date = new Date()) => {
      const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      if (d.toDateString() === now.toDateString()) return `Idag ${time}`
      if (d.toDateString() === yesterday.toDateString()) return `Igår ${time}`
      const dateOpts: Intl.DateTimeFormatOptions =
        d.getFullYear() === now.getFullYear()
          ? { weekday: 'short', day: 'numeric', month: 'short' }
          : { day: 'numeric', month: 'short', year: 'numeric' }
      return `${d.toLocaleDateString('sv-SE', dateOpts)} ${time}`
    },
    locationLabel: 'Plats',
    locationPlaceholder: 'Välj plats',
    locationFromList: 'Välj från lista',
    locationListHeader: 'Lokaler',
    locationMapPick: 'Välj på karta',
    locationCurrent: 'Använd min position',
    locationCurrentDetecting: 'Hämtar position…',
    // Snap: din GPS-position ligger nära en namngiven lokal → föreslå den.
    locationNearby: (name: string) => `Du verkar vara vid ${name}`,
    locationUseNearby: (name: string) => `Använd ${name}`,
    locationUseExact: 'Använd exakt plats',
    locationUpdate: 'Uppdatera position',
    locationRemove: 'Ta bort position',
    locationNone: 'Ingen plats angiven',
    locationPickHint: 'Tryck på kartan för att markera fyndplatsen — eller använd din position.',
    locationDragHint: 'Dra nålen för att finjustera platsen.',
    locationAccuracy: (m: number) => `Noggrannhet ±${Math.round(m)} m`,
    locationCleared: 'Plats borttagen',
    mapExpand: 'Förstora kartan',
    mapClose: 'Stäng karta',
    photoExpand: 'Förstora bilden',
    photoClose: 'Stäng bild',
    locationGpsError: 'Kunde inte hämta din position.',
    // OS:et frågar inte igen efter ett blockat medgivande, så vi hänvisar till
    // enhetens inställningar.
    locationBlockedHelpNative:
      'Platsdelning är avstängd. Slå på den i enhetens inställningar — eller markera fyndplatsen direkt på kartan.',
    commentLabel: 'Kommentar',
    commentPlaceholder: 'T.ex. beteende, miljö, antal hanar/honor, andrahandsuppgift…',
    submitNew: 'Larma',
    submitEdit: 'Spara ändringar',
    submitting: 'Sparar…',
    deleteButton: 'Radera',
    deleteTitle: 'Radera observationen?',
    deleteConfirm: 'Detta går inte att ångra.',
    deleting: 'Raderar…',
    // Skydd mot att av misstag stänga formuläret (svep eller Avbryt) med ifyllda
    // uppgifter — samma "Kasta ändringar?"-vana som Mail/Kalender.
    discard: {
      createTitle: 'Avbryt rapporten?',
      createMessage: 'Det du har fyllt i sparas inte.',
      createConfirm: 'Avbryt rapport',
      editTitle: 'Kasta ändringar?',
      editMessage: 'Dina ändringar sparas inte.',
      editConfirm: 'Kasta ändringar',
      keepEditing: 'Fortsätt',
    },
    alertLabel: 'Skicka notis till klubben',
    alertHint: 'Andra medlemmar som aktiverat fågelnotiser får ett pling om detta fynd.',
    // Visas vid rapportknappen så att utskicket inte sker tyst.
    alertCaption: 'Medlemmar med fågelnotiser på får ett pling om det här fyndet.',
    reported: 'Rapporterad.',
    detailTitle: 'Observation',
    editButton: 'Redigera',
    backToFeed: 'Till observationerna',
    saved: 'Sparad.',
    updated: 'Uppdaterad.',
    deleted: 'Raderad.',
    saveFailed: 'Kunde inte spara observationen.',
    notFound: 'Observationen hittades inte.',
    notYours: 'Du kan bara redigera dina egna observationer.',
    imageLabel: 'Bild',
    addComment: 'Lägg till kommentar',
    activityLabel: 'Aktivitet',
    activityNone: 'Ej angiven',
    activityPlaceholder: 'Välj aktivitet',
    activityPickTitle: 'Välj aktivitet',
    activity: {
      // Nuvarande val i pickern
      stationär: 'Stationär',
      födosökande: 'Födosökande',
      spelSång: 'Spel/sång',
      förbiflygande: 'Förbiflygande',
      rastande: 'Rastande',
      häckningsbiotop: 'Lämplig häckningsbiotop',
      lockläte: 'Lockläte',
      övrigaLäten: 'Övriga läten',
      häckande: 'Häckande',
      sträckande: 'Sträckande',
      drogIväg: 'Drog iväg/ej kvar',
      svårsedd: 'Svårsedd',
      korrigering: 'Korrigering',
      // Äldre nycklar — visas inte i pickern men renderas på gamla observationer
      spelande: 'Spel/sång',
    } as const,
  },
  image: {
    add: 'Lägg till bild',
    replace: 'Byt bild',
    remove: 'Ta bort bild',
    compressing: 'Förbereder bild…',
    uploading: 'Laddar upp bild…',
    loading: 'Laddar bild…',
    tooLarge: 'Bilden är för stor (max 8 MB).',
    unsupportedType: 'Bildformat stöds inte (JPEG, PNG, WebP, HEIC).',
    uploadFailed: 'Kunde inte ladda upp bild.',
    removeFailed: 'Kunde inte ta bort bild.',
    // Source chooser (M10) — opened from the empty placeholder / "Byt bild".
    chooseSource: 'Lägg till bild',
    takePhoto: 'Ta foto',
    chooseFromLibrary: 'Välj från galleri',
    permissionBlocked:
      'Appen saknar behörighet till kameran eller dina bilder. Slå på den i enhetens inställningar.',
    openSettings: 'Öppna inställningar',
  },
  locations: {
    title: 'Lokaler i Markaryd',
    empty: 'Inga lokaler ännu.',
    addButton: 'Lägg till lokal',
    addTitle: 'Ny lokal',
    nameLabel: 'Namn',
    namePlaceholder: 'T.ex. Hörlinge ängar',
    descriptionLabel: 'Beskrivning',
    descriptionPlaceholder: 'Valfritt',
    latitudeLabel: 'Latitud',
    longitudeLabel: 'Longitud',
    useMyPosition: 'Använd min position',
    save: 'Spara lokal',
    saving: 'Sparar…',
    saved: 'Lokal sparad.',
    saveFailed: 'Kunde inte spara lokalen.',
    forbidden: 'Bara administratörer kan lägga till lokaler.',
    onMapLink: 'Visa på karta',
    // Lokaler-skärmen (kart-vy). Grön pin = aktiv (obs senaste 14 dagarna),
    // grå = inga nya. Tryck på en pin → panel med lokalens larm.
    loadError: 'Kunde inte hämta lokaler.',
    // Visas som en liten pill över kartan medan registret hämtas — kartan är
    // redan uppe, så en tom karta utan pins såg ut som "här finns inga lokaler".
    loading: 'Hämtar lokaler…',
    noCoords: 'Inga lokaler med koordinater ännu.',
    // Sök-fältet (native) i kart-headern + "visa alla"-knappen.
    searchPlaceholder: 'Sök lokal',
    searchEmpty: 'Inga lokaler matchar sökningen.',
    showAll: 'Visa alla lokaler',
    legendActive: 'Aktiv',
    legendQuiet: 'Inga nya',
    legendWindow: 'senaste 14 dagarna',
    activityRecent: (n: number) =>
      `${n} ${n === 1 ? 'observation' : 'observationer'} senaste 14 dagarna`,
    activityNone: 'Inga observationer senaste 14 dagarna',
    larmsHeader: 'Larm härifrån',
    larmsEmpty: 'Inga larm härifrån ännu.',
    larmsError: 'Kunde inte hämta larm.',
  },
  profile: {
    title: 'Profil',
    avatarLabel: 'Profilbild',
    nameLabel: 'Namn',
    namePlaceholder: 'Ditt namn',
    phoneLabel: 'Telefonnummer',
    phoneOptional: 'Valfritt',
    // INTE ett exempelnummer. Ett nummerformat som platshållare ("070-123 45 67")
    // läses som ett redan sparat värde — man ser inte att fältet är tomt, och
    // numret tillhör dessutom en riktig abonnent. En uppmaning istället, som
    // `namePlaceholder`. Bär även "(valfritt)" eftersom etiketten saknar markör.
    phonePlaceholder: 'Ditt mobilnummer (valfritt)',
    phoneHelp: 'Andra medlemmar kan ringa dig direkt från en observation.',
    phoneInvalid: 'Telefonnumret ser inte rätt ut.',
    save: 'Spara',
    saving: 'Sparar…',
    saved: 'Profilen uppdaterades.',
    savedLabel: 'Sparat',
    unsavedLabel: 'Inte sparat',
    saveFailed: 'Kunde inte spara profilen.',
    emailLabel: 'E-postadress',
    adminBadge: 'Administratör',
    signOut: 'Logga ut',
    // Grupperad profil/inställningssida (2026): rubriker + statusord för raderna.
    detailsSection: 'Dina uppgifter',
    deviceSection: 'Aviseringar och plats',
    deviceFooter: 'Få ett pling vid nya fynd och fyll i fyndplatsen automatiskt när du rapporterar.',
    accountSection: 'Konto',
    changePhoto: 'Tryck för att byta bild',
    status: { on: 'På', off: 'Av', blocked: 'Blockerad' },
    signOutConfirmTitle: 'Logga ut?',
    signOutConfirmMessage: 'Du kan logga in igen när som helst.',
    // Permanent account deletion (krävs av App Store / Google Play).
    deleteAccount: {
      row: 'Radera konto',
      confirmTitle: 'Radera ditt konto?',
      confirmMessage:
        'Det här går inte att ångra. Ditt konto, din profil, dina fynd och dina foton raderas permanent.',
      confirm: 'Radera permanent',
      working: 'Raderar konto…',
      failed: 'Kunde inte radera kontot. Försök igen.',
    },
    // "Om appen" — raderna öppnar policy/villkor i systemets webbläsare.
    aboutSection: 'Om appen',
    blockedMembers: 'Dolda medlemmar',
    privacyPolicy: 'Integritetspolicy',
    termsOfService: 'Användarvillkor',
    appVersion: 'Version',
    // Behörighetsraderna i "Aviseringar och plats" är `SettingsRow`:ar: etiketten
    // här plus ett statusord ur `status` ovan. Själva hjälptexterna är borta —
    // de var skrivna för webben ("tillåt i webbläsarens sidoinställningar",
    // "ladda om sidan"), och i appen skickar raden användaren till enhetens
    // inställningar via `Linking.openSettings()` i stället för att förklara.
    notifications: {
      title: 'Fågelnotiser',
      enabled: 'Notiser aktiverade.',
      disabled: 'Notiser avstängda.',
    },
    location: {
      title: 'Platsdelning',
      enabled: 'Platsdelning aktiverad.',
      openSettings: 'Öppna inställningar',
    },
  },
  errors: {
    tryAgain: 'Försök igen',
    goBack: 'Gå tillbaka',
    somethingWrong: 'Något gick fel',
    // Ingen "sida" och ingen "start" i en app — det här är webbappens 404-text som
    // följde med. `ErrorBlock` visar den under en rubrik med en "Försök igen"-knapp
    // bredvid, så texten ska bara säga vad som gäller för just den vyn.
    somethingWrongHelp: 'Vi kunde inte hämta det här just nu. Försök igen om en stund.',
    // Visas när felet ser ut att bero på nätverket (vanligast vid dålig täckning).
    offline: 'Ingen anslutning',
    offlineHelp:
      'Vi når inte servern just nu. Kontrollera din uppkoppling och försök igen.',
  },
  theme: {
    toggle: 'Växla tema',
    sectionTitle: 'Utseende',
    system: 'System',
    light: 'Ljust',
    dark: 'Mörkt',
  },
} as const

/**
 * Aktivitetsetikett som ALLTID ger en sträng.
 *
 * `observations.activity` är fritext med ett CHECK-villkor i den DELADE databasen,
 * så en klient kan möta ett värde den är äldre än — nya värden läggs till i
 * databasen medan gamla appar fortfarande används. En direkt uppslagning
 * (`sv.observation.activity[x]`) ger då `undefined`, vilket har kraschat appen på
 * riktigt: filterarket sorterar på etiketten (`label.localeCompare(...)`), och
 * `undefined.localeCompare` kastar mitt i renderingen.
 *
 * Slå därför ALLTID upp etiketten här, aldrig direkt i objektet. Okända värden
 * faller tillbaka på nyckeln — fult men läsbart, och framför allt aldrig `undefined`.
 */
export function activityLabel(activity: string): string {
  const labels: Record<string, string | undefined> = sv.observation.activity
  return labels[activity] ?? activity
}
