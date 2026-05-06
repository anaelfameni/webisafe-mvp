import { checkRateLimit, getSupabaseAdminClient, json, requireAdmin, setCorsHeaders } from '../api_shared/_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);

  // Essayer avec created_at (colonne la plus courante)
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) return json(res, 200, { success: true, scans: data || [] });

  // Fallback sans tri si la colonne n'existe pas
  const { data: data2, error: error2 } = await supabase
    .from('scans')
    .select('*')
    .limit(limit);

  if (!error2) return json(res, 200, { success: true, scans: data2 || [] });

  console.error('[admin-scans] Supabase error:', error2);
  return json(res, 500, { success: false, error: 'Erreur chargement scans: ' + (error2?.message || 'inconnue') });
}
