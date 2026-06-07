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
    comingSoon: 'Kommer snart',
  },
  nav: {
    home: 'Hem',
    dashboard: 'Översikt',
    logIn: 'Logga in',
    logOut: 'Logga ut',
  },
  bottomNav: {
    feed: 'Obsar',
    newObservation: 'Larm',
    locations: 'Lokaler',
    profile: 'Profil',
  },
  home: {
    title: 'Markaryds Fågelklubb',
    subtitle: 'Rapportera och följ fågelobservationer i Markaryd.',
    cta: 'Logga in för att rapportera',
  },
  login: {
    title: 'Logga in',
    description: 'Vi mejlar en inloggningslänk.',
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
    sentDescription: 'Vi har skickat en inloggningslänk.',
    sentTo: (email: string) => `Vi har skickat en inloggningslänk till ${email}.`,
    sentHelp: 'Öppna länken på den här enheten. Du kan stänga sidan.',
    sentSpamHint: 'Hittar du inget mejl? Kolla skräpposten — det kan ta någon minut.',
    useDifferentEmail: 'Använd en annan e-post',
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
  dashboard: {
    welcome: (email: string) => `Välkommen, ${email}.`,
    placeholder:
      'Här kommer du snart kunna rapportera fågelobservationer och se klubbens senaste fynd.',
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
    title: 'Obsar',
    empty: 'Inga observationer ännu. Bli den första att larma!',
    today: 'Idag',
    yesterday: 'Igår',
    thisWeek: 'Denna vecka',
    earlier: 'Tidigare',
    newObservation: 'Larm',
    mine: 'Min',
    locationOnMap: 'På karta',
    refreshed: 'Observationerna uppdaterade',
    count: (n: number) => (n === 1 ? '1 individ' : `${n} individer`),
    timeOnly: (d: Date) => d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
    // Ultrakort relativ tid (X-stil) för kortens hörn: "nu", "5m", "2h", "3d",
    // "8v", "1år". Kompakt så artnamnet (kortets hjälte) får plats; exakt tid
    // finns kvar via `title`/håll på <time> samt `fullDateTime`.
    timeAgo: (d: Date, now: Date = new Date()) => {
      const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))
      if (sec < 60) return 'nu'
      const min = Math.floor(sec / 60)
      if (min < 60) return `${min}m`
      const hr = Math.floor(min / 60)
      if (hr < 24) return `${hr}h`
      const day = Math.floor(hr / 24)
      if (day < 7) return `${day}d`
      if (day < 365) return `${Math.floor(day / 7)}v`
      return `${Math.floor(day / 365)}år`
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
    title: 'Filtrera',
    scopeAll: 'Alla',
    scopeMine: 'Mina',
    scopeLabel: 'Visning',
    clear: 'Rensa filter',
    clearShort: 'Rensa',
    apply: (n: number) => (n === 1 ? 'Visa 1 träff' : `Visa ${n} träffar`),
    emptyTitle: 'Inga obsar matchar filtret.',
    emptyAction: 'Rensa filter',
    removeChip: (label: string) => `Ta bort filter: ${label}`,
  },
  member: {
    title: 'Medlem',
    reportedHeading: 'Rapporterat',
    empty: 'Inga rapporter de senaste 14 dagarna.',
    notFound: 'Medlemmen hittades inte.',
  },
  observation: {
    titleNew: 'Larm',
    titleEdit: 'Redigera',
    titleDetail: 'Observation',
    speciesLabel: 'Art',
    speciesPlaceholder: 'Välj art',
    speciesSearch: 'Sök art…',
    speciesEmpty: 'Inga arter matchar.',
    speciesUnlisted: 'Olistad art',
    speciesUnlistedHint: 'Art som saknas i listan – beskriv den i kommentaren',
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
    locationCurrent: 'Använd min position',
    locationCurrentDetecting: 'Hämtar position…',
    locationUpdate: 'Uppdatera position',
    locationRemove: 'Ta bort position',
    locationNone: 'Ingen plats angiven',
    locationPickHint: 'Tryck på kartan för att markera fyndplatsen — eller använd din position.',
    locationDragHint: 'Dra nålen för att finjustera platsen.',
    locationAccuracy: (m: number) => `Noggrannhet ±${Math.round(m)} m`,
    locationCleared: 'Plats borttagen',
    mapExpand: 'Förstora kartan',
    mapClose: 'Stäng karta',
    locationGpsError: 'Kunde inte hämta din position.',
    locationBlockedHelp:
      'Platsdelning är blockerad för den här sidan. Tillåt Plats i webbläsarens sidoinställningar (lås-/AA-ikonen i adressfältet) och ladda om — eller markera fyndplatsen direkt på kartan.',
    // Native (app) ordalydelse — OS:et frågar inte igen efter ett blockat
    // medgivande, så vi hänvisar till enhetens inställningar i stället för en
    // sidomladdning.
    locationBlockedHelpNative:
      'Platsdelning är avstängd. Slå på den i enhetens inställningar — eller markera fyndplatsen direkt på kartan.',
    commentLabel: 'Kommentar',
    commentPlaceholder: 'T.ex. beteende, miljö, antal hanar/honor…',
    submitNew: 'Skicka',
    submitEdit: 'Spara ändringar',
    submitting: 'Sparar…',
    deleteButton: 'Radera',
    deleteTitle: 'Radera observationen?',
    deleteConfirm: 'Detta går inte att ångra.',
    deleting: 'Raderar…',
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
    activityLabel: 'Aktivitet',
    activityNone: 'Ej angiven',
    activityPlaceholder: 'Välj aktivitet',
    activityPickTitle: 'Välj aktivitet',
    activity: {
      // Nuvarande val i pickern
      födosökande: 'Födosökande',
      spelSång: 'Spel/sång',
      förbiflygande: 'Förbiflygande',
      rastande: 'Rastande',
      häckningsbiotop: 'Lämplig häckningsbiotop',
      lockläte: 'Lockläte',
      övrigaLäten: 'Övriga läten',
      häckande: 'Häckande',
      // Äldre nycklar — visas inte i pickern men renderas på gamla observationer
      sträckande: 'Sträckande',
      stationär: 'Stationär',
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
  },
  profile: {
    title: 'Profil',
    avatarLabel: 'Profilbild',
    nameLabel: 'Namn',
    namePlaceholder: 'Ditt namn',
    phoneLabel: 'Telefonnummer',
    phoneOptional: 'Valfritt',
    phonePlaceholder: '070-123 45 67',
    phoneHelp: 'Andra medlemmar kan ringa dig direkt från en observation.',
    phoneInvalid: 'Telefonnumret ser inte rätt ut.',
    save: 'Spara',
    saving: 'Sparar…',
    saved: 'Profilen uppdaterades.',
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
    installSection: 'Lägg till på hemskärm',
    installPrompt: 'Öppna appen direkt från hemskärmen.',
    installButton: 'Lägg till',
    installIosHint: 'På iPhone: tryck på dela-knappen i Safari och välj "Lägg till på hemskärmen".',
    notifications: {
      title: 'Fågelnotiser',
      description: 'Få en pushnotis när någon rapporterar ett fynd.',
      enableButton: 'Aktivera notiser',
      enabling: 'Aktiverar…',
      disableButton: 'Stäng av notiser',
      disabling: 'Stänger av…',
      enabledLabel: 'Notiser är på',
      enabled: 'Notiser aktiverade.',
      disabled: 'Notiser avstängda.',
      enableFailed: 'Kunde inte aktivera notiser.',
      disableFailed: 'Kunde inte stänga av notiser.',
      unsupported: 'Din webbläsare stöder inte pushnotiser.',
      denied:
        'Notiser är blockerade. Tillåt dem i webbläsarens inställningar för den här sidan och försök igen.',
      iosNeedsPwa:
        'På iPhone måste du först lägga till mafk på hemskärmen (se ovan) — öppna sedan appen därifrån för att kunna aktivera notiser.',
      // Native (app) additions (M14) — the OS won't re-prompt after a block, so we
      // point at the device settings. The web-only keys above stay for parity.
      blockedLabel: 'Notiser är blockerade',
      blockedHelpNative:
        'Notiser är avstängda för appen. Slå på dem i enhetens inställningar och försök igen.',
      openSettings: 'Öppna inställningar',
    },
    location: {
      title: 'Platsdelning',
      description: 'Används för att fylla i fyndplatsen automatiskt när du rapporterar.',
      grantedLabel: 'Platsdelning är tillåten',
      promptLabel: 'Inte aktiverad än',
      enableButton: 'Aktivera platsdelning',
      enabling: 'Aktiverar…',
      enabled: 'Platsdelning aktiverad.',
      blockedLabel: 'Platsdelning är blockerad',
      blockedHelp:
        'Webbläsaren har blockerat platsdelning för den här sidan och appen kan inte fråga igen. Öppna sidans inställningar (lås-/AA-ikonen i adressfältet), tillåt Plats och ladda om sidan.',
      // Native (app) equivalents — the OS won't re-prompt after a block, so we
      // point the user at the device settings instead of a page reload.
      blockedHelpNative:
        'Platsdelning är avstängd. Slå på den i enhetens inställningar för att fylla i fyndplatsen automatiskt när du rapporterar.',
      openSettings: 'Öppna inställningar',
      reload: 'Ladda om sidan',
      unsupported: 'Platsdelning stöds inte i den här webbläsaren.',
    },
  },
  pwa: {
    installed: 'mafk är installerad.',
  },
  errors: {
    pageNotFound: 'Sidan kunde inte hittas',
    goHome: 'Tillbaka till start',
    tryAgain: 'Försök igen',
    goBack: 'Gå tillbaka',
    somethingWrong: 'Något gick fel',
    somethingWrongHelp:
      'Vi kunde inte visa sidan just nu. Försök igen — funkar det inte, gå tillbaka till start.',
  },
  theme: {
    toggle: 'Växla tema',
    sectionTitle: 'Utseende',
    sectionDescription: 'System, ljust eller mörkt utseende.',
    system: 'System',
    light: 'Ljust',
    dark: 'Mörkt',
  },
} as const
