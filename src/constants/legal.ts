/**
 * Outbound legal / contact endpoints, in one place.
 *
 * Both stores REQUIRE a privacy-policy URL in the listing, and Google expects it
 * reachable in-app; Apple's UGC rules (Guideline 1.2) require a way to report
 * objectionable content. These point at the club's web presence
 * (markarydsfagelklubb.nu).
 *
 * These point at the club's published pages (verified live 2026-06-09). If the
 * club moves them, update the slugs below — a 404 here is itself a store
 * rejection cause.
 */

/** Club website root. */
export const CLUB_WEBSITE_URL = 'https://markarydsfagelklubb.nu';

/** Published privacy policy (store-required). */
export const PRIVACY_POLICY_URL = `${CLUB_WEBSITE_URL}/integritetspolicy-markaryds-fagelklubb-appen/`;

/** Terms of use / EULA (Apple UGC apps need an agreement). */
export const TERMS_URL = `${CLUB_WEBSITE_URL}/anvandarvillkor-markaryds-fagelklubb-appen/`;

/**
 * Where user reports of objectionable content + abuse are sent. A mailto is an
 * accepted reporting mechanism for a small members-only app; the club must act
 * on reports (Apple wants action within 24h).
 */
export const ABUSE_CONTACT_EMAIL = 'webmaster@markarydsfagelklubb.nu';
