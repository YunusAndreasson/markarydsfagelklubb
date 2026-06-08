import { sv } from '@/lib/i18n/sv';

/**
 * Heuristic: does this error look like a connectivity failure rather than a
 * server/RLS error? supabase-js / fetch surface network drops as a `TypeError`
 * with a recognizable message ("Network request failed", "Failed to fetch",
 * timeouts, aborts). Used to pick connection-specific error copy on bad networks.
 */
export function isNetworkError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted') ||
    message.includes('connection')
  );
}

/** The right error-state title + help for a thrown query error (network-aware). */
export function errorCopy(error: unknown): { title: string; message: string } {
  return isNetworkError(error)
    ? { title: sv.errors.offline, message: sv.errors.offlineHelp }
    : { title: sv.errors.somethingWrong, message: sv.errors.somethingWrongHelp };
}
