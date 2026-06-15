/**
 * The display name a social provider (Apple / Google) supplies at sign-in.
 *
 * Sign in with Apple returns the user's `fullName` ONLY on the very first
 * authorization, so we must capture it at that moment and persist it ourselves.
 * App Store Guideline 4 forbids re-asking for a name the Authentication Services
 * framework already provided; we therefore stash the provider name here at
 * sign-in and let first-run onboarding create the profile from it, without ever
 * showing a name form.
 *
 * This is a plain module-level value rather than React state on purpose: it is
 * written synchronously *before* the auth session flips, so by the time the
 * onboarding screen mounts it is already set — the flow never depends on the
 * order in which the Supabase session listener and React's renders happen to
 * fire.
 */
let pendingDisplayName: string | null = null;

/** Stash the provider-supplied name (or clear it by passing `null`). */
export function setPendingDisplayName(name: string | null): void {
  pendingDisplayName = name;
}

/** Read the pending name without consuming it (for a first-render decision). */
export function peekPendingDisplayName(): string | null {
  return pendingDisplayName;
}

/** Read and clear the pending name — call once when consuming it. */
export function takePendingDisplayName(): string | null {
  const name = pendingDisplayName;
  pendingDisplayName = null;
  return name;
}

/**
 * Build a display name from a provider's name parts (Apple's
 * `[givenName, familyName]` or Google's `[name]`). Trims each part, joins with a
 * single space, clamps to the 60-char profile limit, and returns `null` when
 * nothing usable remains — the signal to fall back to the manual onboarding form.
 */
export function composeDisplayName(parts: (string | null | undefined)[]): string | null {
  const name = parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join(' ')
    .trim();
  return name.length > 0 ? name.slice(0, 60) : null;
}
