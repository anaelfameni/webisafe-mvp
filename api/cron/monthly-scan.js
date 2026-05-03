import { createClient } from '@supabase/supabase-js';
import { json, sendResendEmail } from '../_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return json(res, 401, { error: 'Non autorisé' });
  }

  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('user_id, site_url')
    .eq('status', 'active');

  if (subsError) return json(res, 500, { error: 'Erreur récupération abonnements' });

  const results = [];

  for (const sub of (subs || [])) {
    try {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { data: existingScan } = await supabase
        .from('scan_history')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('site_url', sub.site_url)
        .eq('scan_type', 'auto_monthly')
        .gte('scan_date', thisMonth.toISOString())
        .single();

      if (existingScan) {
        results.push({ user_id: sub.user_id, status: 'skipped', reason: 'already_scanned_this_month' });
        continue;
      }

      const origin = req.headers.host ? `https://${req.headers.host}` : 'https://webisafe.vercel.app';
      const scanRes = await fetch(`${origin}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sub.site_url, force_refresh: true }),
      });

      if (!scanRes.ok) {
        await supabase.from('scan_errors').insert({
          user_id: sub.user_id,
          site_url: sub.site_url,
          error: `HTTP ${scanRes.status}`,
          created_at: new Date().toISOString(),
        });
        results.push({ user_id: sub.user_id, status: 'error', reason: `scan_http_${scanRes.status}` });
        continue;
      }

      const scanData = await scanRes.json();

      const { data: prevScan } = await supabase
        .from('scan_history')
        .select('score')
        .eq('user_id', sub.user_id)
        .eq('site_url', sub.site_url)
        .order('scan_date', { ascending: false })
        .limit(1)
        .single();

      const newScore = scanData.global_score ?? scanData.scores?.global ?? null;

      await supabase.from('scan_history').insert({
        user_id: sub.user_id,
        site_url: sub.site_url,
        score: newScore,
        security_score: scanData.scores?.security ?? null,
        performance_score: scanData.scores?.performance ?? null,
        seo_score: scanData.scores?.seo ?? null,
        ux_score: scanData.scores?.ux_mobile ?? scanData.scores?.ux ?? null,
        failles_critiques: scanData.critical_alerts ?? null,
        failles_majeures: null,
        failles_mineures: null,
        ssl_expiry_date: scanData.metrics?.security?.ssl_expiry_date ?? null,
        scan_type: 'auto_monthly',
        scan_date: new Date().toISOString(),
      });

      if (prevScan && newScore !== null && newScore < prevScan.score - 15) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', sub.user_id)
          .single();

        if (userProfile?.email) {
          await sendResendEmail({
            to: userProfile.email,
            subject: `📉 Score Webisafe en baisse : ${prevScan.score} → ${newScore}`,
            html: buildScoreDropEmail(sub.site_url, prevScan.score, newScore, scanData),
          }).catch(() => {});
        }
      }

      results.push({ user_id: sub.user_id, status: 'success', score: newScore });
    } catch (err) {
      await supabase.from('scan_errors').insert({
        user_id: sub.user_id,
        site_url: sub.site_url,
        error: String(err?.message || err),
        created_at: new Date().toISOString(),
      }).catch(() => {});
      results.push({ user_id: sub.user_id, status: 'error', reason: String(err?.message || err) });
    }
  }

  return json(res, 200, { success: true, processed: results.length, results });
}

function buildScoreDropEmail(siteUrl, oldScore, newScore, scanData) {
  const causes = (scanData?.critical_alerts ?? []).slice(0, 3)
    .map(a => `<li>${a.title || a.message}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<body style="background:#0A0F1E;color:#ffffff;font-family:Arial,sans-serif;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#111827;border-radius:16px;padding:32px;border:1px solid #1E3A5F;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:#1566F0;color:#fff;padding:8px 16px;border-radius:8px;font-weight:bold;font-size:18px;">Webi<span style="color:#93C5FD">safe</span></span>
    </div>
    <h2 style="color:#FF6B6B;margin:0 0 16px;">📉 Baisse de score détectée</h2>
    <p>Votre site <strong>${siteUrl}</strong> a enregistré une baisse significative :</p>
    <div style="display:flex;gap:16px;margin:24px 0;">
      <div style="flex:1;background:#1E3A5F;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#94A3B8;margin:0 0 8px;font-size:12px;">AVANT</p>
        <p style="color:#ffffff;font-size:32px;font-weight:bold;margin:0;">${oldScore}</p>
      </div>
      <div style="flex:1;background:#3B1515;border-radius:12px;padding:16px;text-align:center;border:2px solid #FF6B6B;">
        <p style="color:#FF6B6B;margin:0 0 8px;font-size:12px;">MAINTENANT</p>
        <p style="color:#FF6B6B;font-size:32px;font-weight:bold;margin:0;">${newScore}</p>
      </div>
    </div>
    ${causes ? `<div style="background:#1E293B;border-radius:8px;padding:16px;margin:16px 0;"><p style="color:#94A3B8;margin:0 0 8px;font-size:12px;">CAUSES PRINCIPALES</p><ul style="color:#CBD5E1;margin:0;padding-left:20px;">${causes}</ul></div>` : ''}
    <div style="text-align:center;margin-top:24px;">
      <a href="https://webisafe.ci/dashboard" style="background:#1566F0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Voir le rapport complet →</a>
    </div>
    <p style="color:#4B5563;font-size:12px;text-align:center;margin-top:24px;">Webisafe Protect Basic · <a href="https://webisafe.ci" style="color:#1566F0;">webisafe.ci</a></p>
  </div>
</body>
</html>`;
}
