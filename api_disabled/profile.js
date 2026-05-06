import { checkRateLimit, getSupabaseAdminClient, json, requireAuthenticatedUser, setCorsHeaders } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  let { data: profile, error } = await supabase
    .from('users')
    .select('id,email,name,phone,phone_country,plan,scans_today,last_scan_date,role,created_at')
    .eq('id', user.id)
    .single();

  const isKnownAdmin = user.email?.toLowerCase?.() === 'admin@test.com';

  // Profil absent → création automatique (upsert) pour éviter les rôles null
  if ((error && error.code === 'PGRST116') || !profile) {
    const metadata = user.user_metadata || {};
    const insertPayload = {
      id: user.id,
      email: user.email,
      name: metadata.name || metadata.full_name || user.email,
      phone: metadata.phone || '',
      phone_country: metadata.phone_country || metadata.phoneCountry || '',
      plan: 'free',
      role: isKnownAdmin ? 'admin' : 'user',
      scans_today: 0,
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert(insertPayload)
      .select('id,email,name,phone,phone_country,plan,scans_today,last_scan_date,role,created_at')
      .single();

    if (insertError) {
      console.error('[PROFILE] Erreur création profil:', insertError.message);
      return json(res, 500, { success: false, error: 'Erreur création profil' });
    }

    profile = newProfile;
  } else if (profile && isKnownAdmin && profile.role !== 'admin') {
    // Corrige un profil admin existant qui aurait été créé avec role=user
    const { data: patched } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select('id,email,name,phone,phone_country,plan,scans_today,last_scan_date,role,created_at')
      .single();
    if (patched) profile = patched;
  } else if (error) {
    return json(res, 500, { success: false, error: 'Erreur chargement profil' });
  }

  return json(res, 200, { success: true, profile });
}
