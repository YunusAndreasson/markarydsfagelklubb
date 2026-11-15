import { sv } from '@/lib/i18n/sv';

/** Auth exposes status/code, but not a trustworthy quota-reset deadline. */
export function magicLinkFailure(error: unknown): { error: string; rateLimited?: boolean } {
  const value = error as { status?: number; code?: string } | null;
  return value?.status === 429 || value?.code === 'over_email_send_rate_limit' || value?.code === 'over_request_rate_limit'
    ? { error: sv.login.errors.rateLimited, rateLimited: true }
    : { error: sv.login.errors.sendFailed };
}
