import { json, readJsonBody, sendResendEmail, setCorsHeaders, checkRateLimit, getSupabaseAdminClient, requireAdmin } from './_utils.js';
import { buildPaymentRejectedEmail } from '../src/utils/paymentEmails.js';

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
    const requiredFields = ['rejection_reason'];
    const missingField = requiredFields.find((field) => !body?.[field]);

    if (missingField) {
      return json(res, 400, { success: false, error: `Champ requis manquant : ${missingField}` });
    }

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

    const { error: paymentError } = await supabase
      .from('payment_requests')
      .update({ status: 'rejected', rejection_reason: body.rejection_reason, rejected_at: new Date().toISOString(), rejected_by: admin.email || admin.id })
      .eq('id', paymentId);

    if (paymentError) {
      return json(res, 500, { success: false, error: 'Erreur rejet paiement' });
    }

    await sendResendEmail(
      buildPaymentRejectedEmail({
        user_email: payment.user_email,
        rejection_reason: body.rejection_reason,
      })
    );

    return json(res, 200, { success: true, payment_id: paymentId });
  } catch (error) {
    return json(res, 500, { success: false, error: error.message });
  }
}
