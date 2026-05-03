import { createClient } from '@supabase/supabase-js';
import { json, readJsonBody, sendResendEmail, setCorsHeaders } from './_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  let body;
  try { body = await readJsonBody(req); } catch { return json(res, 400, { error: 'Corps invalide' }); }

  const { subscription_id, rejection_reason } = body;
  if (!subscription_id) return json(res, 400, { error: 'subscription_id requis' });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_email, site_url')
    .eq('id', subscription_id)
    .single();

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'rejected', rejection_reason: rejection_reason || null, rejected_at: new Date().toISOString() })
    .eq('id', subscription_id);

  if (error) return json(res, 500, { error: 'Erreur rejet abonnement' });

  if (sub?.user_email) {
    try {
      await sendResendEmail({
        to: sub.user_email,
        subject: '❌ Votre demande d\'abonnement Protect n\'a pas pu être confirmée',
        html: `<!DOCTYPE html>
<html><body style="background:#0A0F1E;color:#fff;font-family:Arial,sans-serif;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#111827;border-radius:16px;padding:32px;border:1px solid #3B1515;">
    <p>Malheureusement, votre demande d'abonnement Protect Basic pour <strong>${sub.site_url}</strong> n'a pas pu être confirmée.</p>
    ${rejection_reason ? `<p style="color:#94A3B8;">Raison : ${rejection_reason}</p>` : ''}
    <p>Si vous avez effectué le virement Wave, contactez-nous à <a href="mailto:webisafe@gmail.com" style="color:#1566F0;">webisafe@gmail.com</a>.</p>
  </div>
</body></html>`,
      });
    } catch { /* non-bloquant */ }
  }

  return json(res, 200, { success: true, message: 'Abonnement rejeté' });
}
