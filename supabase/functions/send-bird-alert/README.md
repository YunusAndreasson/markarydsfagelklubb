# send-bird-alert — M14 push fan-out (hand-off)

Sends an Expo push to every member's device **except the reporter's** when a
native client creates an observation with `alert_requested = true`. The client
calls it fire-and-forget after the insert (`supabase.functions.invoke`), so it
never touches the `observations` insert path the web app depends on.

This is **authored, not deployed** — deploying it (plus the projectId + FCM
credentials below) is the M14 hand-off, consistent with how M5 OAuth creds and
M8's Maps key were deferred.

## Bring it live

1. **EAS project id** (also needed for M16). The native client can't get a push
   token without it:
   ```sh
   eas init           # writes extra.eas.projectId into app.json
   ```

2. **Android FCM credentials** (Expo → FCM v1). Without these Android delivery
   silently fails:
   ```sh
   eas credentials    # Android → set up a Google service-account key (FCM v1)
   ```
   (Create a Firebase project for the package `nu.markarydsfagelklubb.mafk`, add
   the Android app, upload the service-account JSON to EAS.)

3. **Database table** — apply the migration to the shared project:
   ```sh
   supabase db query --linked < supabase/migrations/20260606120000_m14_expo_push_tokens.sql
   supabase gen types typescript --project-id zgnmajovyqibgxlcomvb > src/lib/database.types.ts
   ```
   (The table type is hand-added in `database.types.ts` ahead of this; the
   regen confirms parity.)

4. **Deploy the function:**
   ```sh
   supabase functions deploy send-bird-alert --project-ref zgnmajovyqibgxlcomvb
   ```
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Set
   `EXPO_ACCESS_TOKEN` only if you turn on Expo "push security":
   ```sh
   supabase secrets set EXPO_ACCESS_TOKEN=... --project-ref zgnmajovyqibgxlcomvb
   ```

5. **Rebuild the dev/standalone app** (new native modules: expo-notifications,
   expo-device) and verify on two real devices: enable notiser in Profil on both,
   create an observation on A → B gets the push, tap → opens the observation; the
   reporter doesn't self-notify; sign-out stops delivery.

## Notes

- Web Push (`push_subscriptions`) and Expo (`expo_push_tokens`) are independent.
  A future unification could have this function also fan out to web subscribers
  (needs VAPID secrets) so native-created fynd reach web users too; out of M14
  scope.
- The function prunes `DeviceNotRegistered` tokens returned by Expo.
