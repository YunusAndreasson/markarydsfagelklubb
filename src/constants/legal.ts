/**
 * Outbound legal / contact endpoints, in one place.
 *
 * Both stores REQUIRE a privacy-policy URL in the listing, and Google expects it
 * reachable in-app; Apple's UGC rules (Guideline 1.2) require a way to report
 * objectionable content. These point at the club's web presence
 * (markarydsfagelklubb.nu).
 *
 * ⚠️ Before submitting to the App Store / Play Store, make sure
 * `PRIVACY_POLICY_URL` and `TERMS_URL` resolve to real, published pages — a
 * 404 here is itself a rejection cause. Confirm the exact paths with the club.
 */

/** Club website root. */
export const CLUB_WEBSITE_URL = 'https://www.markarydsfagelklubb.nu';

/** Published privacy policy (store-required). */
export const PRIVACY_POLICY_URL = `${CLUB_WEBSITE_URL}/integritetspolicy`;

/** Terms of use / EULA (Apple UGC apps need an agreement). */
export const TERMS_URL = `${CLUB_WEBSITE_URL}/anvandarvillkor`;

/**
 * Where user reports of objectionable content + abuse are sent. A mailto is an
 * accepted reporting mechanism for a small members-only app; the club must act
 * on reports (Apple wants action within 24h).
 */
export const ABUSE_CONTACT_EMAIL = 'webmaster@markarydsfagelklubb.nu';
