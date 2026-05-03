import { createClient } from '@supabase/supabase-js';
import { json, readJsonBody, sendResendEmail } from './_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  let body;
  try { body = await readJsonBody(req); } catch { return json(res, 400, { error: 'Corps invalide' }); }

  const { subscription_id, validated_by = 'admin' } = body;
  if (!subscription_id) return json(res, 400, { error: 'subscription_id requis' });

  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('user_id, site_url, user_email, plan')
    .eq('id', subscription_id)
    .single();

  if (fetchErr || !sub) return json(res, 404, { error: 'Abonnement introuvable' });

  const { error: updateErr } = await supabase
    .from('subscriptions')
    .update({ status: 'active', validated_at: new Date().toISOString(), validated_by })
    .eq('id', subscription_id);

  if (updateErr) return json(res, 500, { error: 'Erreur activation abonnement' });

  if (sub.user_email) {
    try {
      await sendResendEmail({
        to: sub.user_email,
        subject: '✅ Votre abonnement Protect Basic est activé !',
        html: `<!DOCTYPE html>
<html><body style="background:#0A0F1E;color:#fff;font-family:Arial,sans-serif;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#111827;border-radius:16px;padding:32px;border:1px solid #1E3A5F;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:#1566F0;color:#fff;padding:8px 16px;border-radius:8px;font-weight:bold;font-size:18px;">Webi<span style="color:#93C5FD">safe</span></span>
    </div>
    <h2 style="color:#22C55E;">✅ Abonnement activé !</h2>
    <p>Votre abonnement <strong>Webisafe Protect Basic</strong> pour <strong>${sub.site_url}</strong> est maintenant actif.</p>
    <ul style="color:#CBD5E1;">
      <li>✓ Monitoring uptime 24h/24 activé</li>
      <li>✓ Scan mensuel automatique programmé</li>
      <li>✓ Alertes SSL proactives activées</li>
    </ul>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://webisafe.ci/dashboard" style="background:#1566F0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Voir mon tableau de bord →</a>
    </div>
  </div>
</body></html>`,
      });
    } catch { /* non-bloquant */ }
  }

  return json(res, 200, { success: true, message: 'Abonnement activé' });
}
