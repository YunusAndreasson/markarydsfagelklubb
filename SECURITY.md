# Security policy

The app talks to the club's Supabase database directly, with a key that ships
inside it, so row-level security is the only thing between one member and
another's data: their account, their reports with exact positions, their
photos and their phone number. A hole here exposes members. Please report one
privately.

## Reporting a vulnerability

Use GitHub's private reporting:
[report a vulnerability](https://github.com/YunusAndreasson/markarydsfagelklubb/security/advisories/new).
Please don't open a public issue.

Include the app version (Profil, at the bottom), your device and OS, what you
did, what happened, and what an attacker would gain. Real members' data is on
the other side, so stop at the first proof: don't read more of it than you
need to show the problem, and don't change or delete anything that isn't
yours. A fix is coordinated with you before anything is published, and you're
credited in the advisory unless you'd rather not be.

## Supported versions

Only the latest release in the App Store and on Google Play gets fixes. They
ship as a new store release, or as an over-the-air update when no native code
changes.

## Scope

In scope:

- the app for iPhone and Android, built from this repository
- the edge functions in `supabase/functions/` (the bird-alert push and account
  deletion)
- the tables, policies and storage rules in `supabase/migrations/` and
  `supabase/sql/`
- this repository's workflows

Out of scope: the
[website](https://github.com/YunusAndreasson/markarydsfagelklubb-web/security/advisories/new),
which has its own reporting, and Supabase, Expo, Apple and Google themselves.
Report those to their owners.
