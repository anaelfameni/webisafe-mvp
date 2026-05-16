// Endpoint admin paiements — fusionné pour respecter limite Vercel Hobby (12 fonctions max)
// Remplace : api/payment-requests.js, api/confirm-payment.js, api/reject-payment.js
//
// Usage :
//   GET  /api/payment-admin?limit=50         → liste demandes (auth admin)
//   POST /api/payment-admin { action: 'confirm', payment_id }                 → valide
//   POST /api/payment-admin { action: 'reject',  payment_id, rejection_reason } → rejette

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
  resolveAppUrl,
} from '../api_shared/_paymentEmails.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Toutes les routes sont admin-only
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  // ─────────────────────────────────────────────────────────
  // GET → Liste des demandes de paiement
  // ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const rl = checkRateLimit(req, 30, 60000);
    if (!rl.allowed) {
      return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rl.retryAfter}s.` });
    }

    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100);
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[payment-admin GET] DB error:', error);
      return json(res, 500, { success: false, error: 'Erreur chargement paiements' });
    }
    return json(res, 200, { success: true, payments: data || [] });
  }

  // ─────────────────────────────────────────────────────────
  // POST → action=confirm | action=reject
  // ─────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const rl = checkRateLimit(req, 10, 60000);
    if (!rl.allowed) {
      return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rl.retryAfter}s.` });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { success: false, error: 'Corps JSON invalide' });
    }

    const action = String(body?.action || '').trim().toLowerCase();
    const paymentId = body?.payment_id || body?.id;
    if (!paymentId) return json(res, 400, { success: false, error: 'payment_id requis' });

    // Récupérer la demande
    const { data: payment, error: fetchError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return json(res, 404, { success: false, error: 'Paiement introuvable' });
    }

    // ── ACTION : confirm ────────────────────────────────────
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
          const { error: scanError } = await supabase
            .from('scans')
            .update({ paid: true })
            .eq('id', payment.scan_id);
          if (scanError) {
            console.error('[payment-admin confirm] scan update error:', scanError);
            return json(res, 500, { success: false, error: 'Paiement validé, mais rapport non débloqué' });
          }
        }

        try {
          await sendResendEmail(
            buildPaymentConfirmedEmail({
              appUrl: resolveAppUrl(),
              payment_code: payment.payment_code,
              user_email: payment.user_email,
              scan_id: payment.scan_id,
              url_to_audit: payment.url_to_audit,
            })
          );
        } catch (mailErr) {
          console.error('[payment-admin confirm] mail error:', mailErr);
        }

        await logAdminAction({
          req,
          actor: admin,
          action: 'payment.confirm',
          targetType: 'payment_request',
          targetId: paymentId,
          metadata: {
            scan_id: payment.scan_id,
            payment_code: payment.payment_code,
            user_email: payment.user_email,
          },
        });

        return json(res, 200, { success: true, payment_id: paymentId, scan_id: payment.scan_id });
      } catch (error) {
        console.error('[payment-admin confirm] catch:', error);
        return json(res, 500, { success: false, error: error.message || 'Erreur interne' });
      }
    }

    // ── ACTION : reject ─────────────────────────────────────
    if (action === 'reject') {
      try {
        const rejectionReason = String(body?.rejection_reason || '').trim();
        if (!rejectionReason) {
          return json(res, 400, { success: false, error: 'rejection_reason requis' });
        }

        const { error: paymentError } = await supabase
          .from('payment_requests')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason,
            rejected_at: new Date().toISOString(),
            rejected_by: admin.email || admin.id,
          })
          .eq('id', paymentId);

        if (paymentError) {
          console.error('[payment-admin reject] update error:', paymentError);
          return json(res, 500, { success: false, error: 'Erreur rejet paiement' });
        }

        try {
          await sendResendEmail(
            buildPaymentRejectedEmail({
              user_email: payment.user_email,
              rejection_reason: rejectionReason,
            })
          );
        } catch (mailErr) {
          console.error('[payment-admin reject] mail error:', mailErr);
        }

        await logAdminAction({
          req,
          actor: admin,
          action: 'payment.reject',
          targetType: 'payment_request',
          targetId: paymentId,
          metadata: {
            scan_id: payment.scan_id,
            rejection_reason: rejectionReason,
            user_email: payment.user_email,
          },
        });

        return json(res, 200, { success: true, payment_id: paymentId });
      } catch (error) {
        console.error('[payment-admin reject] catch:', error);
        return json(res, 500, { success: false, error: error.message || 'Erreur interne' });
      }
    }

    return json(res, 400, { success: false, error: `Action inconnue : ${action}. Utilisez 'confirm' ou 'reject'.` });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
