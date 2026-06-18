import { createClient } from '@supabase/supabase-js';
import { json, readJsonBody, sendResendEmail, setCorsHeaders, escapeHtml, checkRateLimit, requireAdmin, requireAuthenticatedUser } from '../api_shared/_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

const PROTECT_BASIC_PRICE = 15000;

async function createUptimeMonitor(siteUrl, friendlyName) {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.uptimerobot.com/v2/newMonitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        format: 'json',
        type: 1,
        url: siteUrl,
        friendly_name: friendlyName,
        interval: 300,
      }),
    });
    const data = await res.json();
    return data?.monitor?.id || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET → liste des souscriptions (admin only) — fusionné depuis ex-subscriptions.js
  if (req.method === 'GET') {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
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

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  // Authentification obligatoire : on ne peut souscrire que pour son propre compte.
  const authUser = await requireAuthenticatedUser(req, res);
  if (!authUser) return;

  // Rate limit APRÈS auth pour éviter le brute-force de tokens
  const rateLimit = checkRateLimit(req, 5, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { error: `Trop de tentatives, réessayez dans ${rateLimit.retryAfter}s` });
  }

  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  let body;
  try { body = await readJsonBody(req); } catch { return json(res, 400, { error: 'Corps invalide' }); }

  const { user_id, user_email, site_url, wave_phone, payment_code } = body;

  if (!user_id || !user_email || !site_url) {
    return json(res, 400, { error: 'user_id, user_email et site_url sont requis' });
  }

  // Isolation : le user_id du body doit correspondre à la session authentifiée.
  // Empêche la création d'une souscription au nom d'un autre utilisateur.
  if (user_id !== authUser.id) {
    return json(res, 403, { error: 'Accès refusé : user_id ne correspond pas à la session' });
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user_id)
    .eq('status', 'active')
    .single();

  if (existing) {
    return json(res, 409, { error: 'Un abonnement actif existe déjà pour cet utilisateur' });
  }

  const monitorId = await createUptimeMonitor(site_url, `Webisafe - ${site_url}`);

  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id,
      plan: 'basic',
      status: 'pending',
      site_url,
      user_email: user_email || null,
      wave_phone: wave_phone || null,
      started_at: new Date().toISOString(),
      next_billing_date: nextBilling.toISOString(),
      uptimerobot_monitor_id: monitorId ? String(monitorId) : null,
      wave_subscription_id: payment_code || null,
    })
    .select()
    .single();

  if (subError) return json(res, 500, { error: 'Erreur création abonnement' });

  try {
    await sendResendEmail({
      to: 'webisafe@gmail.com',
      subject: `🆕 Nouveau Protect Basic — ${String(user_email).replace(/[\r\n]+/g, ' ')}`,
      html: `<p><strong>Nouveau Protect Basic</strong></p><p>User : ${escapeHtml(user_email)}</p><p>Site : ${escapeHtml(site_url)}</p><p>Montant : ${PROTECT_BASIC_PRICE.toLocaleString('fr-FR')} FCFA/mois</p><p>Wave : ${escapeHtml(wave_phone || 'N/A')}</p><p>Code : ${escapeHtml(payment_code || 'N/A')}</p>`,
    });
  } catch { /* non-bloquant */ }

  return json(res, 201, {
    success: true,
    subscription_id: sub.id,
    status: 'pending',
    message: 'Abonnement créé — en attente de validation du paiement Wave',
  });
}
