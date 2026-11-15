import { describe, expect, it } from 'vitest';
import { magicLinkFailure } from './magic-link-error';
import { sv } from '@/lib/i18n/sv';

describe('magic link failure recovery', () => {
  it.each([{ status: 429 }, { code: 'over_email_send_rate_limit' }, { code: 'over_request_rate_limit' }])(
    'explains rate limiting without inventing a reset deadline', (error) => {
      expect(magicLinkFailure(error)).toEqual({ error: sv.login.errors.rateLimited, rateLimited: true });
    },
  );
  it('uses safe Swedish copy for other failures', () => {
    expect(magicLinkFailure({ status: 500, message: 'internal details' })).toEqual({ error: sv.login.errors.sendFailed });
  });
});
