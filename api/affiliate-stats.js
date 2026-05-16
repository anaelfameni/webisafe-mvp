import { checkRateLimit, getSupabaseAdminClient, requireAuthenticatedUser, setCorsHeaders, json } from '../api_shared/_utils.js';

/**
 * V.1 — Dashboard Affiliation protégé via auth Supabase.
 * L'ancien endpoint exposait les stats à toute personne connaissant le ref_code
 * (URL `?code=ABC`). On retourne désormais uniquement les stats de l'affilié
 * propriétaire de l'utilisateur authentifié (lookup par user_id ou email).
 *
 * V.3 — On expose un breakdown quotidien (30 derniers jours) pour le dashboard.
 */

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://webisafe.vercel.app';

function startOfDayIso(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Méthode non autorisée' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de demandes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 503, { success: false, error: 'Base de données indisponible' });

  // Recherche de l'affilié associé au user authentifié (user_id ou email).
  let affiliate = null;
  const byUserId = await supabase
    .from('affiliates')
    .select('ref_code, name, email, created_at, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (byUserId.data) {
    affiliate = byUserId.data;
  } else if (user.email) {
    const byEmail = await supabase
      .from('affiliates')
      .select('ref_code, name, email, created_at, user_id')
      .eq('email', user.email)
      .maybeSingle();
    if (byEmail.data) affiliate = byEmail.data;
  }

  if (!affiliate) {
    return json(res, 404, { success: false, error: 'Aucun compte affilié associé à cet utilisateur.' });
  }

  const refCode = affiliate.ref_code;

  const since30d = startOfDayIso(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [clicksRes, conversionsRes, recentClicksRes] = await Promise.all([
    supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('ref_code', refCode),
    supabase.from('affiliate_conversions').select('commission_fcfa, paid, created_at').eq('ref_code', refCode),
    supabase.from('affiliate_clicks').select('created_at').eq('ref_code', refCode).gte('created_at', since30d),
  ]);

  const conversions = conversionsRes.data || [];
  const totalClicks = clicksRes.count || 0;
  const conversionsCount = conversions.length;
  const totalCommission = conversions.reduce((sum, c) => sum + (c.commission_fcfa || 0), 0);
  const pendingPayout = conversions
    .filter((c) => !c.paid)
    .reduce((sum, c) => sum + (c.commission_fcfa || 0), 0);

  // V.3 — Breakdown quotidien sur 30 jours.
  const dailyBuckets = new Map();
  (recentClicksRes.data || []).forEach((row) => {
    const dayKey = String(row.created_at).slice(0, 10);
    dailyBuckets.set(dayKey, (dailyBuckets.get(dayKey) || 0) + 1);
  });
  const dailyClicks = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyClicks.push({ date: day, clicks: dailyBuckets.get(day) || 0 });
  }

  return json(res, 200, {
    success: true,
    stats: {
      name: affiliate.name || 'Affilié',
      refCode,
      link: `${APP_BASE_URL}/?ref=${refCode}`,
      clicks: totalClicks,
      conversions: conversionsCount,
      totalCommission,
      pendingPayout,
      conversionRate: totalClicks > 0 ? Number(((conversionsCount / totalClicks) * 100).toFixed(1)) : 0,
      since: affiliate.created_at,
      dailyClicks,
    },
  });
}
