# delete-account

In-app account deletion for the mafk mobile app. Required by **Apple App Store
Review Guideline 5.1.1(v)** and **Google Play's account/data deletion policy**:
any app that lets a user create an account must let them delete it (and their
data) from within the app.

The native client calls it after a double confirmation in **Profil → Radera
konto**:

```ts
await supabase.functions.invoke('delete-account'); // forwards the user's JWT
```

## What it deletes

For the **calling** user (id taken from the verified JWT, never the body):

1. Every storage object under `user-uploads/<userId>/…` — avatar + fynd photos.
2. Rows keyed by `user_id` in `observations`, `expo_push_tokens`,
   `push_subscriptions`, `profiles` (a missing table is ignored).
3. The `auth.users` row (`admin.auth.admin.deleteUser`).

There are no foreign keys onto `auth.users` in this project, so the row deletes
are explicit — deleting the auth user does **not** cascade.

### Observations: delete vs. anonymise

The default **hard-deletes** the member's observations — the clearest "your data
is gone" semantic for store review. If the club would rather keep the sightings
in the shared dataset, drop `'observations'` from `USER_SCOPED_TABLES` and instead
reassign them to a sentinel user, e.g.:

```ts
await admin.from('observations')
  .update({ user_id: DELETED_MEMBER_ID })
  .eq('user_id', userId);
```

This is a **shared-backend product decision** — confirm with the club before
deploying.

## Deploy

```sh
supabase functions deploy delete-account --project-ref zgnmajovyqibgxlcomvb
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — no
extra secrets needed.

## Follow-up: Sign in with Apple token revocation

Apple asks apps that offer Sign in with Apple to **revoke** the Apple token on
account deletion (POST to `https://appleid.apple.com/auth/revoke`). Supabase does
not do this automatically. It needs the user's Apple refresh token (not currently
stored) plus the Apple client secret JWT. Track as a follow-up; the core deletion
above is what unblocks submission.
