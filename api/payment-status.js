import { checkRateLimit, getSupabaseAdminClient, json, setCorsHeaders } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const scanId = String(req.query?.scan_id || '').trim();
  if (!scanId) return json(res, 400, { success: false, error: 'scan_id requis' });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const { data, error } = await supabase
    .from('payment_requests')
    .select('id,scan_id,payment_code,amount,status,created_at,validated_at,rejected_at')
    .eq('scan_id', scanId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return json(res, 500, { success: false, error: 'Erreur chargement paiement' });

  return json(res, 200, { success: true, payment: data || null });
}
