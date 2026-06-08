// Supabase Edge Function (Deno) — delete-account
//
// Permanently deletes the *calling* user's account and all personal data, so the
// app can offer the in-app "Radera konto" that Apple (App Store Review Guideline
// 5.1.1(v)) and Google Play (Data deletion policy) require of any app that lets
// users create an account.
//
// The caller authenticates with their own JWT (the app calls
// `supabase.functions.invoke('delete-account')`, which forwards the session's
// access token). We verify that token, derive the user id from it — never from
// the request body — and then use the service role to remove:
//
//   1. storage objects under `user-uploads/${userId}/…` (avatar + fynd photos)
//   2. their rows in observations, expo_push_tokens, push_subscriptions, profiles
//   3. the auth.users row itself (admin.auth.admin.deleteUser)
//
// There are NO foreign keys onto auth.users in this project (observer↔profile is
// merged client-side), so the row deletes MUST be explicit — deleting the auth
// user does not cascade. Each table delete tolerates a missing relation so a
// partially-migrated environment (e.g. expo_push_tokens not yet created) still
// completes rather than 500-ing.
//
// NOTE on observations: this HARD-DELETES the member's sightings. If the club
// would rather keep them in the shared dataset, replace the observations delete
// with an anonymisation step (e.g. reassign user_id to a "deleted member"
// sentinel) — see README.md. Deleting is the most defensible default for store
// review ("your data is gone").
//
// Deploy:
//   supabase functions deploy delete-account --project-ref zgnmajovyqibgxlcomvb
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//
// NB: this file is Deno, excluded from the app's tsc/eslint (see tsconfig
// `exclude` + eslint `ignores`).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const STORAGE_BUCKET = 'user-uploads';
// Tables holding rows keyed by the user's auth id. Order doesn't matter (no FKs),
// and a missing table is ignored so this survives partial migrations.
const USER_SCOPED_TABLES = ['observations', 'expo_push_tokens', 'push_subscriptions', 'profiles'];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// supabase-js storage has no recursive delete: list each folder level and gather
// every object path under the user's namespace before removing in one call.
async function collectObjectPaths(
  admin: ReturnType<typeof createClient>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1000 });
  if (error || !data) return paths;
  for (const entry of data) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    // A folder entry has no `id`; recurse. A file entry is a leaf object.
    if (entry.id === null || entry.id === undefined) {
      paths.push(...(await collectObjectPaths(admin, full)));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Authenticate the caller from their own bearer token, NOT the body.
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'saknar auktorisering' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (userErr || !userId) return json({ error: 'ogiltig session' }, 401);

  try {
    // 2. Storage: remove every object under the user's prefix.
    const objects = await collectObjectPaths(admin, userId);
    if (objects.length > 0) {
      await admin.storage.from(STORAGE_BUCKET).remove(objects);
    }

    // 3. Database rows. Tolerate a missing relation (undefined_table = 42P01).
    for (const table of USER_SCOPED_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error && error.code !== '42P01') throw error;
    }

    // 4. The identity itself. After this the access token is dead.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return json({ deleted: true }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
