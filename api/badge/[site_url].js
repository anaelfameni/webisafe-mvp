import { createClient } from '@supabase/supabase-js';
import { json } from '../_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const { site_url } = req.query;
  if (!site_url) return json(res, 400, { error: 'site_url requis' });

  const decodedUrl = decodeURIComponent(site_url);

  if (!supabase) {
    return json(res, 200, {
      score: null,
      last_scan: null,
      status: 'unknown',
      site_url: decodedUrl,
    });
  }

  const { data } = await supabase
    .from('scan_history')
    .select('score, scan_date, security_score, performance_score, seo_score')
    .eq('site_url', decodedUrl)
    .order('scan_date', { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return json(res, 200, { score: null, last_scan: null, status: 'unknown', site_url: decodedUrl });
  }

  const status = data.score >= 70 ? 'good' : data.score >= 50 ? 'warning' : 'critical';

  return json(res, 200, {
    score: data.score,
    last_scan: data.scan_date,
    status,
    site_url: decodedUrl,
    security_score: data.security_score,
    performance_score: data.performance_score,
    seo_score: data.seo_score,
  });
}
