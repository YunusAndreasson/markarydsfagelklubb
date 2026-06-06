import { supabase } from '@/lib/supabase';

/**
 * The current authed user's id, or throw. Direct-client writes need it for the
 * NOT NULL `user_id` and the `${userId}/...` storage path scheme. RLS (M4)
 * independently enforces ownership — this is for building the payload, not for
 * security. Reads the locally persisted session (no network round-trip).
 */
export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (error || !userId) throw new Error('Inte inloggad');
  return userId;
}
