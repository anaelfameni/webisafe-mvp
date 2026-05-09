import { checkRateLimit, getSupabaseAdminClient, setCorsHeaders } from './_utils.js';

function normalizeRefCode(value) {
  const refCode = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9_-]{2,64}$/.test(refCode) ? refCode : null;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Méthode non autorisée' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: `Trop de demandes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return res.status(503).json({ success: false, error: 'Base de données indisponible' });

  const refCode = normalizeRefCode(req.query?.code);
  if (!refCode) return res.status(400).json({ success: false, error: 'Code affilié invalide' });

  const [clicksRes, conversionsRes, affiliateRes] = await Promise.all([
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('ref_code', refCode),
    supabase.from('affiliate_conversions').select('commission_fcfa, paid').eq('ref_code', refCode),
    supabase.from('affiliates').select('name, created_at').eq('ref_code', refCode).single(),
  ]);

  if (affiliateRes.error && affiliateRes.error.code !== 'PGRST116') {
    return res.status(500).json({ success: false, error: 'Chargement impossible' });
  }

  if (!affiliateRes.data) {
    return res.status(404).json({ success: false, error: 'Affilié introuvable' });
  }

  const conversions = conversionsRes.data || [];
  const clicks = clicksRes.count || 0;
  const conversionsCount = conversions.length;
  const totalCommission = conversions.reduce((sum, conversion) => sum + (conversion.commission_fcfa || 0), 0);
  const pendingPayout = conversions.filter((conversion) => !conversion.paid).reduce((sum, conversion) => sum + (conversion.commission_fcfa || 0), 0);

  return res.status(200).json({
    success: true,
    stats: {
      name: affiliateRes.data.name || 'Affilié',
      link: `https://webisafe.vercel.app/?ref=${refCode}`,
      clicks,
      conversions: conversionsCount,
      totalCommission,
      pendingPayout,
      conversionRate: clicks > 0 ? ((conversionsCount / clicks) * 100).toFixed(1) : 0,
      since: affiliateRes.data.created_at,
    },
  });
}
