// Endpoint admin paiements — fusionné pour respecter limite Vercel Hobby (12 fonctions max)
// Remplace : api/payment-requests.js, api/confirm-payment.js, api/reject-payment.js,
//            api/admin-scans.js, api/report-payment.js
//
// Usage :
//   GET  /api/payment-admin?limit=50              → liste demandes (auth admin)
//   GET  /api/payment-admin?resource=scans&limit=50 → liste scans (auth admin)
//   POST /api/payment-admin { action: 'report',  ...payload }              → signalement paiement (public)
//   POST /api/payment-admin { action: 'confirm', payment_id }              → valide (auth admin)
//   POST /api/payment-admin { action: 'reject',  payment_id, rejection_reason } → rejette (auth admin)

import {
  json,
  readJsonBody,
  sendResendEmail,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAdmin,
  logAdminAction,
} from '../api_shared/_utils.js';
import {
  buildPaymentConfirmedEmail,
  buildPaymentRejectedEmail,
  buildAdminPaymentNotificationEmail,
  buildPaymentReceivedEmail,
  formatPaymentTimestamp,
  resolveAppUrl,
} from '../api_shared/_paymentEmails.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WAVE_PAYMENT_AMOUNT = 35000;

// ── ACTION : report (public — pas d'auth admin requise) ────────────────────────
async function handleReport(req, res, body, supabase) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) {
    return json(res, 429, { success: false, error: `Trop de notifications. Réessayez dans ${rl.retryAfter}s.` });
  }

  const payload = {
    id: body?.id ? String(body.id).trim() : null,
    payment_code: String(body?.payment_code || '').trim(),
    scan_id: String(body?.scan_id || '').trim(),
    user_id: null,
    user_email: String(body?.user_email || '').trim().toLowerCase(),
    url_to_audit: String(body?.url_to_audit || '').trim(),
    wave_phone: String(body?.wave_phone || '').trim(),
    amount: Number(body?.amount || WAVE_PAYMENT_AMOUNT),
    status: 'waiting_validation',
  };

  // Résolution user_id depuis le token Bearer si présent
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const supabaseForAuth = getSupabaseAdminClient();
    if (supabaseForAuth) {
      const { data: { user: sessionUser } } = await supabaseForAuth.auth.getUser(token).catch(() => ({ data: {} }));
      if (sessionUser?.id) {
        payload.user_id = sessionUser.id;
      } else {
        return json(res, 401, { success: false, error: 'Token invalide ou expiré' });
      }
    }
  }

  const missingField = ['payment_code', 'scan_id', 'user_email', 'url_to_audit', 'wave_phone']
    .find((f) => !payload[f]);
  if (missingField) return json(res, 400, { success: false, error: `Champ requis manquant : ${missingField}` });
  if (!EMAIL_RE.test(payload.user_email)) return json(res, 400, { success: false, error: 'Email invalide' });

  const upsertPayload = {
    payment_code: payload.payment_code,
    scan_id: payload.scan_id,
    user_email: payload.user_email,
    url_to_audit: payload.url_to_audit,
    wave_phone: payload.wave_phone,
    amount: Number.isFinite(payload.amount) && payload.amount > 0 ? payload.amount : WAVE_PAYMENT_AMOUNT,
    status: payload.status,
  };
  if (payload.user_id) upsertPayload.user_id = payload.user_id;

  let request, dbError;
  if (payload.id) {
    const { data, error } = await supabase.from('payment_requests').update(upsertPayload).eq('id', payload.id).select().single();
    request = data; dbError = error;
  } else {
    const { data, error } = await supabase.from('payment_requests').insert({ ...upsertPayload, created_at: new Date().toISOString() }).select().single();
    request = data; dbError = error;
  }

  if (dbError) {
    console.error('[payment-admin report] DB error:', dbError);
    const detail = [dbError.message, dbError.details, dbError.hint].filter(Boolean).join(' - ');
    return json(res, 500, { success: false, error: `Erreur enregistrement paiement: ${detail || dbError.code || 'inconnu'}` });
  }

  const appUrl = resolveAppUrl();
  const timestamp = formatPaymentTimestamp();

  try {
    await sendResendEmail(buildAdminPaymentNotificationEmail({
      appUrl, payment_code: request.payment_code, user_email: request.user_email,
      url_to_audit: request.url_to_audit, wave_phone: request.wave_phone,
      scan_id: request.scan_id, timestamp,
    }));
  } catch (e) { console.error('[payment-admin report] admin email error:', e); }

  try {
    await sendResendEmail(buildPaymentReceivedEmail({
      appUrl, payment_code: request.payment_code,
      user_email: request.user_email, url_to_audit: request.url_to_audit, timestamp,
    }));
  } catch (e) { console.error('[payment-admin report] customer email error:', e); }

  return json(res, 200, { success: true, payment: request });
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  // ── POST : lire le body pour détecter action=report (public) avant l'auth admin
  if (req.method === 'POST') {
    let body;
    try { body = await readJsonBody(req); } catch {
      return json(res, 400, { success: false, error: 'Corps JSON invalide' });
    }

    const action = String(body?.action || '').trim().toLowerCase();

    // action=report est public (pas d'auth admin requise)
    if (action === 'report') return handleReport(req, res, body, supabase);

    // Toutes les autres actions POST sont admin-only
    const rl = checkRateLimit(req, 10, 60000);
    if (!rl.allowed) return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rl.retryAfter}s.` });

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const paymentId = body?.payment_id || body?.id;
    if (!paymentId) return json(res, 400, { success: false, error: 'payment_id requis' });

    const { data: payment, error: fetchError } = await supabase
      .from('payment_requests').select('*').eq('id', paymentId).single();
    if (fetchError || !payment) return json(res, 404, { success: false, error: 'Paiement introuvable' });

    // ── ACTION : confirm ──────────────────────────────────────────────────────
    if (action === 'confirm') {
      try {
        const now = new Date().toISOString();
        const { error: paymentError } = await supabase
          .from('payment_requests')
          .update({ status: 'validated', validated_at: now, validated_by: admin.email || admin.id })
          .eq('id', paymentId);
        if (paymentError) {
          console.error('[payment-admin confirm] update error:', paymentError);
          return json(res, 500, { success: false, error: 'Erreur validation paiement' });
        }

        if (payment.scan_id) {
          const { error: scanError } = await supabase.from('scans').update({ paid: true }).eq('id', payment.scan_id);
          if (scanError) {
            console.error('[payment-admin confirm] scan update error:', scanError);
            return json(res, 500, { success: false, error: 'Paiement validé, mais rapport non débloqué' });
          }
        }

        try {
          await sendResendEmail(buildPaymentConfirmedEmail({
            appUrl: resolveAppUrl(), payment_code: payment.payment_code,
            user_email: payment.user_email, scan_id: payment.scan_id, url_to_audit: payment.url_to_audit,
          }));
        } catch (mailErr) { console.error('[payment-admin confirm] mail error:', mailErr); }

        await logAdminAction({ req, actor: admin, action: 'payment.confirm', targetType: 'payment_request', targetId: paymentId,
          metadata: { scan_id: payment.scan_id, payment_code: payment.payment_code, user_email: payment.user_email } });

        return json(res, 200, { success: true, payment_id: paymentId, scan_id: payment.scan_id });
      } catch (error) {
        console.error('[payment-admin confirm] catch:', error);
        return json(res, 500, { success: false, error: error.message || 'Erreur interne' });
      }
    }

    // ── ACTION : reject ───────────────────────────────────────────────────────
    if (action === 'reject') {
      try {
        const rejectionReason = String(body?.rejection_reason || '').trim();
        if (!rejectionReason) return json(res, 400, { success: false, error: 'rejection_reason requis' });

        const { error: paymentError } = await supabase
          .from('payment_requests')
          .update({ status: 'rejected', rejection_reason: rejectionReason, rejected_at: new Date().toISOString(), rejected_by: admin.email || admin.id })
          .eq('id', paymentId);
        if (paymentError) {
          console.error('[payment-admin reject] update error:', paymentError);
          return json(res, 500, { success: false, error: 'Erreur rejet paiement' });
        }

        try {
          await sendResendEmail(buildPaymentRejectedEmail({ user_email: payment.user_email, rejection_reason: rejectionReason }));
        } catch (mailErr) { console.error('[payment-admin reject] mail error:', mailErr); }

        await logAdminAction({ req, actor: admin, action: 'payment.reject', targetType: 'payment_request', targetId: paymentId,
          metadata: { scan_id: payment.scan_id, rejection_reason: rejectionReason, user_email: payment.user_email } });

        return json(res, 200, { success: true, payment_id: paymentId });
      } catch (error) {
        console.error('[payment-admin reject] catch:', error);
        return json(res, 500, { success: false, error: error.message || 'Erreur interne' });
      }
    }

    return json(res, 400, { success: false, error: `Action inconnue : ${action}. Utilisez 'report', 'confirm' ou 'reject'.` });
  }

  // ── GET : liste paiements ou scans (admin-only) ────────────────────────────
  if (req.method === 'GET') {
    const rl = checkRateLimit(req, 30, 60000);
    if (!rl.allowed) return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rl.retryAfter}s.` });

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);

    // resource=scans : anciennement api/admin-scans.js
    if (req.query?.resource === 'scans') {
      const { data, error } = await supabase.from('scans').select('*').order('created_at', { ascending: false }).limit(limit);
      if (!error) return json(res, 200, { success: true, scans: data || [] });

      // Fallback sans tri
      const { data: data2, error: error2 } = await supabase.from('scans').select('*').limit(limit);
      if (!error2) return json(res, 200, { success: true, scans: data2 || [] });

      console.error('[payment-admin scans] Supabase error:', error2);
      return json(res, 500, { success: false, error: 'Erreur chargement scans: ' + (error2?.message || 'inconnue') });
    }

    // Défaut : liste des demandes de paiement
    const { data, error } = await supabase
      .from('payment_requests').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) {
      console.error('[payment-admin GET] DB error:', error);
      return json(res, 500, { success: false, error: 'Erreur chargement paiements' });
    }
    return json(res, 200, { success: true, payments: data || [] });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
