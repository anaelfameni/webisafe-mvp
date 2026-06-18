// api/checkout/create-session.js
//
// Crée une session Wave Checkout et retourne l'URL de paiement.
// Le client est redirigé vers pay.wave.com ; Wave rappelle notre webhook
// dès que le paiement est confirmé.
//
// POST /api/checkout/create-session
// Body : { scan_id, amount, currency?, success_url?, error_url? }
// Auth : Bearer token requis (utilisateur connecté)

import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  requireAuthenticatedUser,
  getSupabaseAdminClient,
} from '../../api_shared/_utils.js';
import { createHmac } from 'node:crypto';

const WAVE_API_URL = 'https://api.wave.com/v1/checkout/sessions';
const DEFAULT_CURRENCY = 'XOF';

// Construit et signe la requête vers l'API Wave Checkout.
// La signature HMAC-SHA256 est requise si le signing secret est configuré.
async function createWaveCheckoutSession({ scan_id, amount, currency, success_url, error_url, waveApiKey, waveSigningSecret }) {
  const body = JSON.stringify({
    amount: String(amount),
    currency: currency || DEFAULT_CURRENCY,
    client_reference: scan_id,   // lien entre la session Wave et le scan Webisafe
    success_url,
    error_url,
  });

  const headers = {
    'Authorization': `Bearer ${waveApiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': scan_id,  // garantit qu'un double appel ne crée pas 2 sessions
  };

  // Signature Wave-Signature (HMAC-SHA256) si le signing secret est configuré.
  // Format : t={unix_timestamp},v1={hex_digest}
  // Payload signé : `${timestamp}${body}` (timestamp + corps brut, sans séparateur)
  if (waveSigningSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}${body}`;
    const signature = createHmac('sha256', waveSigningSecret).update(payload).digest('hex');
    headers['Wave-Signature'] = `t=${timestamp},v1=${signature}`;
  }

  const res = await fetch(WAVE_API_URL, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Wave API ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  // Rate limit : 5 créations de session / 10 min / IP
  const rl = checkRateLimit(req, 5, 600_000);
  if (!rl.allowed) return json(res, 429, { error: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s` });

  // Auth requise : évite la création de sessions orphelines
  const authUser = await requireAuthenticatedUser(req, res);
  if (!authUser) return;

  const waveApiKey = process.env.WAVE_API_KEY;
  if (!waveApiKey) return json(res, 503, { error: 'Paiement Wave non configuré' });

  let body;
  try { body = await readJsonBody(req); } catch { return json(res, 400, { error: 'Corps JSON invalide' }); }

  const { scan_id, amount } = body;
  if (!scan_id || !amount) return json(res, 400, { error: 'scan_id et amount sont requis' });

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return json(res, 400, { error: 'amount invalide' });
  }

  const appUrl = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || 'https://webisafe.vercel.app';

  const supabase = getSupabaseAdminClient();

  // Vérifier que le scan appartient bien à l'utilisateur authentifié
  if (supabase) {
    const { data: scan } = await supabase
      .from('scans')
      .select('id, user_email, paid')
      .eq('id', scan_id)
      .single();

    if (!scan) return json(res, 404, { error: 'Scan introuvable' });
    if (scan.paid) return json(res, 409, { error: 'Ce scan est déjà payé' });

    const sessionEmail = authUser.email?.toLowerCase();
    const scanEmail = scan.user_email?.toLowerCase();
    if (sessionEmail && scanEmail && sessionEmail !== scanEmail) {
      return json(res, 403, { error: 'Accès refusé : ce scan ne vous appartient pas' });
    }
  }

  try {
    const session = await createWaveCheckoutSession({
      scan_id,
      amount: numAmount,
      currency: DEFAULT_CURRENCY,
      success_url: `${appUrl}/rapport/${scan_id}?wave_status=success&session_id={CHECKOUT_SESSION_ID}`,
      error_url: `${appUrl}/rapport/${scan_id}?wave_status=error&session_id={CHECKOUT_SESSION_ID}`,
      waveApiKey,
      waveSigningSecret: process.env.WAVE_SIGNING_SECRET || null,
    });

    // Stocker le session_id Wave en base pour la réconciliation manuelle si nécessaire
    if (supabase && session.id) {
      await supabase
        .from('payment_requests')
        .upsert({
          scan_id,
          user_id: authUser.id,
          user_email: authUser.email,
          amount: numAmount,
          wave_session_id: session.id,
          status: 'waiting_webhook',
          created_at: new Date().toISOString(),
        }, { onConflict: 'scan_id' })
        .catch(err => console.warn('[checkout] upsert payment_requests:', err.message));
    }

    return json(res, 200, {
      success: true,
      wave_launch_url: session.wave_launch_url,
      session_id: session.id,
    });
  } catch (err) {
    console.error('[checkout/create-session] Wave API error:', err.message);
    return json(res, 502, { error: 'Impossible de créer la session de paiement Wave. Réessayez.' });
  }
}
