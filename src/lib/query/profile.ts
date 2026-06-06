import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';
import { requireUserId } from '@/lib/query/session';
import { signedUrlFor } from '@/lib/query/storage';
import { supabase } from '@/lib/supabase';
import { upsertProfileInput, type UpsertProfileInput } from '@/lib/validation/profile';

export type MyProfile = {
  displayName: string;
  isAdmin: boolean;
  avatarPath: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

type RawMyProfileRow = {
  display_name: string;
  is_admin: boolean;
  avatar_path: string | null;
  phone: string | null;
};

async function toMyProfile(row: RawMyProfileRow): Promise<MyProfile> {
  return {
    displayName: row.display_name,
    isAdmin: row.is_admin,
    avatarPath: row.avatar_path,
    avatarUrl: await signedUrlFor(row.avatar_path),
    phone: row.phone,
  };
}

/** The signed-in user's profile (`fetchMyProfileFn`). null if not yet created. */
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name,is_admin,avatar_path,phone')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toMyProfile(data as RawMyProfileRow);
}

export function myProfileQueryOptions() {
  return queryOptions({ queryKey: queryKeys.profile, queryFn: fetchMyProfile });
}

/**
 * Create/update the user's own profile (`upsertMyProfileFn`). `is_admin` is
 * never set here (kept on conflict, defaults false on insert). Old-avatar
 * cleanup on replace is wired with the avatar picker in M10.
 */
export async function upsertMyProfile(input: UpsertProfileInput): Promise<MyProfile> {
  const parsed = upsertProfileInput.parse(input);
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        display_name: parsed.displayName,
        avatar_path: parsed.avatarPath ?? null,
        phone: parsed.phone ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('display_name,is_admin,avatar_path,phone')
    .single();
  if (error) throw error;
  return toMyProfile(data as RawMyProfileRow);
}
