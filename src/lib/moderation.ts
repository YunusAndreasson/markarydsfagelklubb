/**
 * Reporting objectionable user-generated content. Apple's UGC rules (App Store
 * Review Guideline 1.2) require a way to flag content for moderation; a mailto to
 * the club is an accepted mechanism for a small members-only app. The club acts
 * on the report (Apple expects action within 24h). Blocking lives in `blocks.ts`.
 */
import { ABUSE_CONTACT_EMAIL } from '@/constants/legal';

/** Build the `mailto:` that pre-fills a content report to the club. */
export function reportMailtoUrl(subject: string, body: string): string {
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${ABUSE_CONTACT_EMAIL}?${query}`;
}
