import { json, readJsonBody, sendResendEmail, setCorsHeaders, checkRateLimit, getSupabaseAdminClient, requireAdmin } from '../api_shared/_utils.js';
import { buildPaymentConfirmedEmail, resolveAppUrl } from '../src/utils/paymentEmails.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  const rateLimit = checkRateLimit(req, 10, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

    const body = await readJsonBody(req);
    const paymentId = body.payment_id || body.id;

    if (!paymentId) {
      return json(res, 400, { success: false, error: 'payment_id requis' });
    }

    const { data: payment, error: fetchError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return json(res, 404, { success: false, error: 'Paiement introuvable' });
    }

    const now = new Date().toISOString();
    const { error: paymentError } = await supabase
      .from('payment_requests')
      .update({ status: 'validated', validated_at: now, validated_by: admin.email || admin.id })
      .eq('id', paymentId);

    if (paymentError) {
      return json(res, 500, { success: false, error: 'Erreur validation paiement' });
    }

    if (payment.scan_id) {
      const { error: scanError } = await supabase
        .from('scans')
        .update({ paid: true })
        .eq('id', payment.scan_id);

      if (scanError) {
        return json(res, 500, { success: false, error: 'Paiement validé, mais rapport non débloqué' });
      }
    }

    await sendResendEmail(
      buildPaymentConfirmedEmail({
        appUrl: resolveAppUrl(),
        payment_code: payment.payment_code,
        user_email: payment.user_email,
        scan_id: payment.scan_id,
        url_to_audit: payment.url_to_audit,
      })
    );

    return json(res, 200, { success: true, payment_id: paymentId, scan_id: payment.scan_id });
  } catch (error) {
    return json(res, 500, { success: false, error: error.message });
  }
}
