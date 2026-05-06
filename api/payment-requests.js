import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, json, requireAdmin, setCorsHeaders } from '../api_shared/_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const admin = await requireAdmin(req, res, supabase);
  if (!admin) return;

  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return json(res, 500, { success: false, error: 'Erreur chargement paiements' });
  }

  return json(res, 200, { success: true, payments: data || [] });
}
