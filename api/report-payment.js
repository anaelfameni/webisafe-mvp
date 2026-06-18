import {
  checkRateLimit,
  getSupabaseAdminClient,
  json,
  readJsonBody,
  sendResendEmail,
  setCorsHeaders,
  requireAuthenticatedUser,
} from '../api_shared/_utils.js';
import {
  buildAdminPaymentNotificationEmail,
  buildPaymentReceivedEmail,
  formatPaymentTimestamp,
  resolveAppUrl,
} from '../api_shared/_paymentEmails.js';

// Inline (anciennement importe de /src/utils/wavePayment.js qui cassait le build Vercel)
const WAVE_PAYMENT_AMOUNT = 35000;

// Endpoint de signalement de paiement Wave.
// - Persiste la demande en base (payment_requests) avec statut "waiting_validation".
// - Notifie l'admin pour validation manuelle.
// - I.5 : envoie un email de confirmation au client à réception de sa demande.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  const rateLimit = checkRateLimit(req, 5, 60_000);
  if (!rateLimit.allowed) {
    return json(res, 429, {
      success: false,
      error: `Trop de notifications. Réessayez dans ${rateLimit.retryAfter}s.`,
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return json(res, 500, { success: false, error: 'Configuration serveur manquante' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { success: false, error: 'Corps invalide' });
  }

  const payload = {
    id: body?.id ? String(body.id).trim() : null,
    payment_code: String(body?.payment_code || '').trim(),
    scan_id: String(body?.scan_id || '').trim(),
    // user_id : toujours extrait de la session si un token est fourni.
    // Empêche d'associer un paiement au compte d'un autre utilisateur
    // en envoyant un user_id arbitraire dans le body.
    user_id: null,          // sera résolu ci-dessous
    user_email: String(body?.user_email || '').trim().toLowerCase(),
    url_to_audit: String(body?.url_to_audit || '').trim(),
    wave_phone: String(body?.wave_phone || '').trim(),
    amount: Number(body?.amount || WAVE_PAYMENT_AMOUNT),
    status: 'waiting_validation',
  };

  // Si un Bearer token est présent, on l'utilise comme source de vérité pour user_id.
  // Si pas de token (flux anonyme), user_id reste null — acceptable pour les scans gratuits.
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const supabaseForAuth = getSupabaseAdminClient();
    if (supabaseForAuth) {
      const { data: { user: sessionUser } } = await supabaseForAuth.auth.getUser(token).catch(() => ({ data: {} }));
      if (sessionUser?.id) {
        payload.user_id = sessionUser.id;
      }
      // Si le token est invalide (expiré, falsifié), on refuse plutôt que d'accepter
      // un user_id du body non vérifié.
      else {
        return json(res, 401, { success: false, error: 'Token invalide ou expiré' });
      }
    }
  } else {
    // Flux anonyme : user_id null autorisé, mais on ignore le user_id du body.
    payload.user_id = null;
  }

  const missingField = [
    'payment_code',
    'scan_id',
    'user_email',
    'url_to_audit',
    'wave_phone',
  ].find((field) => !payload[field]);
  if (missingField) {
    return json(res, 400, {
      success: false,
      error: `Champ requis manquant : ${missingField}`,
    });
  }
  if (!EMAIL_RE.test(payload.user_email)) {
    return json(res, 400, { success: false, error: 'Email invalide' });
  }

  const upsertPayload = {
    payment_code: payload.payment_code,
    scan_id: payload.scan_id,
    user_email: payload.user_email,
    url_to_audit: payload.url_to_audit,
    wave_phone: payload.wave_phone,
    amount:
      Number.isFinite(payload.amount) && payload.amount > 0
        ? payload.amount
        : WAVE_PAYMENT_AMOUNT,
    status: payload.status,
  };
  // user_id seulement si fourni (sinon laisser la DB gerer le default/null)
  if (payload.user_id) upsertPayload.user_id = payload.user_id;

  let request;
  let dbError;

  if (payload.id) {
    const { data, error } = await supabase
      .from('payment_requests')
      .update(upsertPayload)
      .eq('id', payload.id)
      .select()
      .single();
    request = data;
    dbError = error;
  } else {
    const { data, error } = await supabase
      .from('payment_requests')
      .insert({ ...upsertPayload, created_at: new Date().toISOString() })
      .select()
      .single();
    request = data;
    dbError = error;
  }

  if (dbError) {
    console.error('[report-payment] DB error:', dbError);
    const detail = [dbError.message, dbError.details, dbError.hint].filter(Boolean).join(' - ');
    return json(res, 500, {
      success: false,
      error: `Erreur enregistrement paiement: ${detail || dbError.code || 'inconnu'}`,
      debug: { code: dbError.code, message: dbError.message, details: dbError.details, hint: dbError.hint },
    });
  }

  const appUrl = resolveAppUrl();
  const timestamp = formatPaymentTimestamp();

  // Notification admin (manuelle, prioritaire)
  try {
    await sendResendEmail(
      buildAdminPaymentNotificationEmail({
        appUrl,
        payment_code: request.payment_code,
        user_email: request.user_email,
        url_to_audit: request.url_to_audit,
        wave_phone: request.wave_phone,
        scan_id: request.scan_id,
        timestamp,
      })
    );
  } catch (error) {
    console.error('[report-payment] admin email error:', error);
  }

  // I.5 — Confirmation client (best-effort, non bloquant)
  try {
    await sendResendEmail(
      buildPaymentReceivedEmail({
        appUrl,
        payment_code: request.payment_code,
        user_email: request.user_email,
        url_to_audit: request.url_to_audit,
        timestamp,
      })
    );
  } catch (error) {
    console.error('[report-payment] customer email error:', error);
  }

  return json(res, 200, { success: true, payment: request });
}
