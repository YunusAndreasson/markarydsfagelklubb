import { supabase } from '@/lib/supabase';
import { requireUserId } from '@/lib/query/session';
import { MIME_TO_EXT, STORAGE_BUCKET, type CreateUploadUrlInput } from '@/lib/validation/storage';

export { STORAGE_BUCKET } from '@/lib/validation/storage';

/** Signed-download URL lifetime (matches the web: 1 hour). */
export const SIGNED_DOWNLOAD_TTL_SECONDS = 3600;

export type UploadTarget = { path: string; signedUrl: string; token: string };

/** A single signed download URL for a stored object path (null-safe). */
export async function signedUrlFor(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_DOWNLOAD_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Batch-mint signed download URLs. The feed/member screens (M11/M13) call this
 * once per page load so each image isn't a separate round-trip. Returns a
 * path → URL map; missing/failed paths are simply absent.
 */
export async function signedUrlMap(
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(unique, SIGNED_DOWNLOAD_TTL_SECONDS);
  if (error || !data) return map;
  for (const item of data) {
    if (item.signedUrl && !item.error && item.path) {
      map.set(item.path, item.signedUrl);
    }
  }
  return map;
}

/**
 * Create a signed UPLOAD url for the current user, mirroring the web
 * `createUploadUrlFn` path scheme `${userId}/avatar.ext` or
 * `${userId}/observations/${draftId}.ext`. The full upload flow (pick →
 * compress → PUT) lands in M10; this is the data-access primitive.
 *
 * For observation uploads the caller supplies `draftId` (the M10 image picker
 * generates it). The web minted one server-side with a UUID generator; we defer
 * that dependency (expo-crypto) to M10.
 */
export async function createUploadUrl(input: CreateUploadUrlInput): Promise<UploadTarget> {
  const userId = await requireUserId();
  const ext = MIME_TO_EXT[input.mimeType];
  let path: string;
  if (input.purpose === 'avatar') {
    path = `${userId}/avatar.${ext}`;
  } else {
    if (!input.draftId) throw new Error('draftId krävs för observationsuppladdning');
    path = `${userId}/observations/${input.draftId}.${ext}`;
  }
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message ?? 'Kunde inte skapa uppladdningslänk');
  return { path, signedUrl: data.signedUrl, token: data.token };
}

/**
 * Upload bytes to a target minted by {@link createUploadUrl} (M10). Wraps
 * supabase-js `uploadToSignedUrl`, which authenticates with the one-shot `token`
 * — so the byte upload reuses the configured client (no raw `fetch` PUT) and no
 * second round-trip. The web did a direct PUT to `signedUrl`; the token path is
 * the supabase-js-idiomatic equivalent.
 */
export async function uploadSignedImage(
  target: UploadTarget,
  bytes: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .uploadToSignedUrl(target.path, target.token, bytes, { contentType });
  if (error) throw error;
}

/** Delete a stored object, refusing paths outside the user's own namespace. */
export async function deleteUpload(path: string): Promise<void> {
  const userId = await requireUserId();
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('Sökvägen tillhör inte den inloggade användaren');
  }
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
