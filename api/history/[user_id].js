import { createClient } from '@supabase/supabase-js';
import { json, setCorsHeaders } from '../_utils.js';

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
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  const { user_id } = req.query;
  if (!user_id) return json(res, 400, { error: 'user_id requis' });

  const { data, error } = await supabase
    .from('scan_history')
    .select('id, site_url, score, security_score, performance_score, seo_score, ux_score, scan_date, scan_type, failles_critiques, failles_majeures')
    .eq('user_id', user_id)
    .order('scan_date', { ascending: false })
    .limit(6);

  if (error) return json(res, 500, { error: 'Erreur récupération historique' });

  return json(res, 200, { success: true, history: data || [] });
}
