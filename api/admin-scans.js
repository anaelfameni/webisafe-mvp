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
  const queries = [
    (client) => client.from('scans').select('*').order('scanned_at', { ascending: false }).limit(limit),
    (client) => client.from('scans').select('*').order('created_at', { ascending: false }).limit(limit),
    (client) => client.from('scans').select('*').order('scan_date', { ascending: false }).limit(limit),
    (client) => client.from('scans').select('*').limit(limit),
  ];

  let lastError = null;
  for (const runQuery of queries) {
    const { data, error } = await runQuery(supabase);
    if (!error) return json(res, 200, { success: true, scans: data || [] });
    lastError = error;
  }

  console.error('[admin-scans] error:', lastError);
  return json(res, 500, { success: false, error: 'Erreur chargement scans' });
}
