// GET /api/payment-status?scan_id=xxx
// Retourne la dernière demande de paiement pour un scan_id donné.
// Endpoint public (lectur seule) — utilisé par paymentApi.js côté client
// pour afficher l'état du paiement sur la page /payment et /rapport.

import { json, setCorsHeaders, checkRateLimit, getSupabaseAdminClient } from '../api_shared/_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkRateLimit(req, 30, 60000);
  if (!rl.allowed) return json(res, 429, { error: `Trop de requêtes. Réessayez dans ${rl.retryAfter}s.` });

  const scanId = req.query?.scan_id;
  if (!scanId) return json(res, 400, { error: 'scan_id requis' });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 200, { payment: null });

  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('id, scan_id, payment_code, user_email, status, amount, wave_phone, created_at, validated_at, rejected_at, rejection_reason')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return json(res, 200, { payment: null });
    return json(res, 200, { payment: data });
  } catch {
    return json(res, 200, { payment: null });
  }
}
