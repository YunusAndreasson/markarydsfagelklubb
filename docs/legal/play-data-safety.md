# Google Play – Data safety answers (Markaryds Fågelklubb)

How to fill **Play Console → App content → Data safety**. Values below reflect
what the app actually does (account via Supabase, observations with optional
photo + GPS, push tokens). Review before submitting.

> **Key definition:** In Play's Data safety, **"Shared"** = data transferred to a
> *third party / separate company*. Service providers that only process on your
> behalf (Supabase, Expo, Apple, Google) are **not** "sharing", and showing data
> to **other users of the same app** (other club members) is **not** third‑party
> sharing either. So everything below is **Collected: Yes, Shared: No**.

## Top‑level questions

1. **Does your app collect or share any of the required user data types?** → **Yes**
2. **Is all of the user data collected by your app encrypted in transit?** → **Yes**
   (all traffic to Supabase is HTTPS/TLS)
3. **Do you provide a way for users to request that their data is deleted?** → **Yes**
   (in‑app: Profil → Radera konto; also by email to webmaster@markarydsfagelklubb.nu)

## Data types

| Category → Type | Collected | Shared | Required/Optional | Purpose |
|---|---|---|---|---|
| **Personal info → Name** | Yes | No | Optional | App functionality |
| **Personal info → Email address** | Yes | No | Required | Account management |
| **Personal info → User IDs** | Yes | No | Required | App functionality, Account management |
| **Personal info → Phone number** | Yes | No | Optional | App functionality |
| **Location → Precise location** | Yes | No | Optional | App functionality |
| **Photos and videos → Photos** | Yes | No | Optional | App functionality |
| **App activity → Other user‑generated content** (observations: art, antal, kommentar) | Yes | No | Optional | App functionality |
| **Device or other IDs → Device or other IDs** (push token) | Yes | No | Optional | App functionality (notifications) |

For every row: **Processed ephemerally? → No** (it's stored). **Collected** (not
just processed on‑device).

## Things to leave OFF (not collected)

Financial info · Health & fitness · Messages · Contacts · Calendar · Browsing
history · Search history · Installed apps · Approximate location · Audio ·
Files/docs · Web activity · **No data collected for Advertising or Analytics.**

## Notes / rationale

- **Precise location** is only the coordinate of an observation the user chooses
  to create — no background/continuous tracking. Still counts as collected.
- **Push token** is only collected if the user enables notifications; it's a
  device identifier used solely to deliver alerts.
- If Play asks about **data deletion** specifics, point to the in‑app account
  deletion (an edge function removes the user's profile + auth) and the contact
  email.
