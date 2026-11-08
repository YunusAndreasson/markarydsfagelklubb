<p align="center">
  <a href="https://apps.apple.com/se/app/id6778564624">
    <img src=".github/readme/emblem.png" alt="The club's emblem: a dipper, drawn like an old engraving, inside a white circle lettered Markaryds Fågelklubb, with the year 1986 at its feet." width="200">
  </a>
</p>

<p align="center">
  The app of Markaryds Fågelklubb, the bird club of Markaryds kommun, for iPhone and Android.<br>
  Expo and React Native, on the Supabase database it shares with the club's website.
</p>

<p align="center">
  <a href="https://apps.apple.com/se/app/id6778564624"><b>App Store</b></a> ·
  <a href="https://play.google.com/store/apps/details?id=nu.markarydsfagelklubb.mafk"><b>Google Play</b></a> ·
  <a href="https://github.com/YunusAndreasson/markarydsfagelklubb-web">The website</a> ·
  <a href="#development">Development</a> ·
  <a href="AGENTS.md">Conventions</a>
</p>

<p align="center">
  <a href="https://github.com/YunusAndreasson/markarydsfagelklubb/actions/workflows/ci.yml"><img src="https://github.com/YunusAndreasson/markarydsfagelklubb/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
  <a href="https://apps.apple.com/se/app/id6778564624"><img src="https://img.shields.io/itunes/v/6778564624?label=App%20Store" alt="App Store version"></a>
  <a href="https://play.google.com/store/apps/details?id=nu.markarydsfagelklubb.mafk"><img src="https://img.shields.io/badge/Google%20Play-available-green" alt="On Google Play"></a>
</p>

<br>

Members report the birds they see, and every report reaches the rest of the
club as a push. The same reports appear on the club's
[website](https://github.com/YunusAndreasson/markarydsfagelklubb-web), with
the place coarsened to a nearby lokal or the kommun. The app is in Swedish,
like the club, and signing in takes an Apple or Google account.

## Features

- **Larma.** A report is a species, a count, a place and a time, with a photo
  if you have one. The place is your position or a pin on the map; within
  300 m of a lokal the report is offered that lokal and counted under it, a
  radius measured against the club's own 158 pin-drop reports.
- **Fågelnotiser.** Every report sends a push to every other member who has
  notifications on, never to the reporter, so there's time to get out before
  the bird moves on.
- **Larm.** The club's reports, newest first, each with its rarity from the
  club's larmlista, 0 for the rarest and 5 for the common. Filter by rarity,
  activity or lokal.
- **Lokaler.** The club's birding sites on a map, each with the larm reported
  from it.
- **Medlemmar.** A member's page lists their reports, and their phone number if
  they've added one, so others can call from a sighting. Hiding a member
  takes them out of your own feed and changes nothing for anyone else.
- **Offline.** What you last saw stays on the phone between launches, and a
  list without a connection says so instead of claiming to be empty.
- **Radera konto.** Deleting your account in Profil removes your profile,
  reports and photos from the database, as both stores require.

There's no web version and no iPad version, and it won't run in Expo Go. The
store listings have screenshots.

## Development

```sh
npm ci
npm run verify   # tsc, ESLint, the deprecated-API check and Vitest
```

That's what CI runs, and it needs no device or keys. Running the app takes a
development build on an Android emulator or iOS simulator, a `.env` made from
[`.env.example`](.env.example) with the database's publishable key (it's
public, and in the website's `wrangler.jsonc`), and for maps on Android a
Google Maps key. [AGENTS.md](AGENTS.md) has the setup it's developed with: Linux, Android,
JDK 17.

The database is shared with the live website and the members using the app,
so schema changes in `supabase/` are applied by hand, never by CI.

## Docs

- [AGENTS.md](AGENTS.md): conventions and the decisions that stay put
- [MILESTONES.md](MILESTONES.md): the plan the app was built in, M1 to M16
- [docs/legal/](docs/legal/): the privacy policy and terms of use, and the
  answers to Google Play's data safety form
- The edge functions: [send-bird-alert](supabase/functions/send-bird-alert/README.md)
  and [delete-account](supabase/functions/delete-account/README.md)

## Under the hood

- [Expo](https://expo.dev) SDK 58 with
  [Expo Router](https://docs.expo.dev/router/introduction/), on
  [React Native](https://reactnative.dev); builds, store submission and
  over-the-air updates through [EAS](https://expo.dev/eas)
- [Supabase](https://supabase.com) for Postgres, auth, storage and the edge
  functions, shared with the website
- [TanStack Query](https://tanstack.com/query), persisted to the phone, for
  the offline cache
- [react-native-maps](https://github.com/react-native-maps/react-native-maps)
  for the maps
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
  for the pushes
- [Zod](https://zod.dev) for validation, and [Vitest](https://vitest.dev) for
  the tests

## License

The code is [MIT](LICENSE). The club's name, emblem and texts belong to
Markaryds Fågelklubb, and the reports and photos members send belong to them;
[NOTICE.md](NOTICE.md) lists the paths.
