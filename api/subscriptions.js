import { createClient } from '@supabase/supabase-js';
import { json } from './_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  const limit = parseInt(req.query?.limit || '50', 10);

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan, status, site_url, started_at, next_billing_date, wave_subscription_id, created_at, user_email, wave_phone')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return json(res, 500, { error: 'Erreur récupération abonnements' });

  return json(res, 200, { success: true, subscriptions: data || [] });
}
