import { createClient } from '@supabase/supabase-js';
import { json, sendResendEmail } from '../_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return json(res, 401, { error: 'Non autorisé' });
  }

  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, site_url')
    .eq('status', 'active');

  const results = [];

  for (const sub of (subs || [])) {
    try {
      const { data: latestScan } = await supabase
        .from('scan_history')
        .select('ssl_expiry_date')
        .eq('user_id', sub.user_id)
        .eq('site_url', sub.site_url)
        .not('ssl_expiry_date', 'is', null)
        .order('scan_date', { ascending: false })
        .limit(1)
        .single();

      if (!latestScan?.ssl_expiry_date) continue;

      const expiry = new Date(latestScan.ssl_expiry_date);
      const now = new Date();
      const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

      if (![14, 7, 1].includes(daysLeft)) continue;

      const today = new Date().toDateString();
      const { data: alreadySent } = await supabase
        .from('email_logs')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('template', `ssl_expiry_${daysLeft}d`)
        .gte('sent_at', new Date(now.toDateString()).toISOString())
        .single();

      if (alreadySent) continue;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', sub.user_id)
        .single();

      if (!profile?.email) continue;

      const urgency = daysLeft === 1 ? 'URGENT — ' : daysLeft === 7 ? '⚠️ ' : '';

      await sendResendEmail({
        to: profile.email,
        subject: `${urgency}⚠️ Votre certificat SSL expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
        html: buildSslEmail(sub.site_url, daysLeft, expiry.toLocaleDateString('fr-FR')),
      });

      await supabase.from('email_logs').insert({
        user_id: sub.user_id,
        template: `ssl_expiry_${daysLeft}d`,
        sent_at: new Date().toISOString(),
        status: 'sent',
        metadata: { site_url: sub.site_url, days_left: daysLeft },
      });

      results.push({ user_id: sub.user_id, days_left: daysLeft, status: 'email_sent' });
    } catch (err) {
      results.push({ user_id: sub.user_id, status: 'error', reason: String(err?.message || err) });
    }
  }

  return json(res, 200, { success: true, processed: results.length, results });
}

function buildSslEmail(siteUrl, daysLeft, expiryDate) {
  const urgencyColor = daysLeft === 1 ? '#FF3B3B' : daysLeft === 7 ? '#FF6B35' : '#FFB800';
  const urgencyText = daysLeft === 1
    ? 'DEMAIN — Renouvellement critique !'
    : daysLeft === 7
    ? '7 jours restants — Agissez maintenant'
    : '14 jours restants — Planifiez le renouvellement';

  return `
<!DOCTYPE html>
<html>
<body style="background:#0A0F1E;color:#ffffff;font-family:Arial,sans-serif;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#111827;border-radius:16px;padding:32px;border:1px solid #1E3A5F;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:#1566F0;color:#fff;padding:8px 16px;border-radius:8px;font-weight:bold;font-size:18px;">Webi<span style="color:#93C5FD">safe</span></span>
    </div>
    <div style="background:${urgencyColor}20;border:1px solid ${urgencyColor};border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="color:${urgencyColor};font-weight:bold;font-size:18px;margin:0;">🔒 ${urgencyText}</p>
    </div>
    <h2 style="color:#ffffff;margin:0 0 16px;">Votre certificat SSL expire bientôt</h2>
    <p>Le certificat SSL de <strong>${siteUrl}</strong> expire le <strong style="color:${urgencyColor};">${expiryDate}</strong>, soit dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.</p>
    <p style="color:#94A3B8;">Sans SSL valide, votre site affichera "Site non sécurisé" dans Chrome et vos visiteurs partiront immédiatement.</p>
    <div style="background:#1E293B;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="color:#00D4FF;font-weight:bold;margin:0 0 12px;">Comment renouveler :</p>
      <ol style="color:#CBD5E1;margin:0;padding-left:20px;line-height:2;">
        <li>Connectez-vous à votre hébergeur (cPanel / Plesk)</li>
        <li>Allez dans SSL/TLS → Let's Encrypt</li>
        <li>Cliquez sur "Renouveler" ou "Installer"</li>
        <li>Vérifiez que le renouvellement auto est activé</li>
      </ol>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://webisafe.ci/dashboard" style="background:#1566F0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Voir mon tableau de bord →</a>
    </div>
    <p style="color:#4B5563;font-size:12px;text-align:center;margin-top:24px;">Webisafe Protect Basic · <a href="https://webisafe.ci" style="color:#1566F0;">webisafe.ci</a></p>
  </div>
</body>
</html>`;
}
