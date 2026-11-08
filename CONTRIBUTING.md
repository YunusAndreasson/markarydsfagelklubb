# Contributing

Bug reports and pull requests are welcome. For anything bigger than a fix,
open an issue first, so we can agree on the shape before you write the code.
The app is the club's, so a change to what members see may need the club's
say as well.

## Build and check

`npm ci`, then `npm run verify`: TypeScript, ESLint, the deprecated-API check
and Vitest, the same as CI. None of it needs a device or keys. Running the app
needs a development build; [AGENTS.md](AGENTS.md) has the setup and the
conventions.

Before a pull request:

- `npm run verify` passes.
- For anything on screen, try it on a device, emulator or simulator, and say
  which. A screenshot helps; leave real members' names and reports out of it.
- One change per pull request, with a commit message in the repository's
  style: a short sentence in the imperative, such as "Open a larm from the
  lokal sheet on iOS".

## What the app won't do

Some behaviour is deliberate and changes to it need a strong case:

- Every report alerts the club; there's no per-report switch.
- The UI is Swedish, with no English fallbacks.
- It's native only, for iPhone and Android, with no web build.
- Colours and sizes come from the tokens in `src/constants/`, never ad hoc.
- `app.config.ts` gives EAS an ASCII copy of the app's name until
  expo/eas-cli#4715 is fixed. Changing it breaks every iOS build.
- The database is shared with the website and the members using the app.
  Nothing in `auth` is touched, and schema changes are applied by hand, never
  by CI.

## Security issues

Not in issues or pull requests: see [SECURITY.md](SECURITY.md).

## Conduct and license

Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md). By
contributing, you agree your code is released under the
[MIT license](LICENSE); the club's texts and emblem are not part of that
grant.
