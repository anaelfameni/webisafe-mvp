import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAuthenticatedUser,
  requireCronSecret,
  sendResendEmail,
} from '../api_shared/_utils.js';
import { resolveAppUrl } from '../src/utils/paymentEmails.js';

// R.4 — Replay J+30 (rescan gratuit 30 jours après l'audit premium)
//
// GET  /api/replay?cron=1   -> cron quotidien : envoie les rappels J+30 (nécessite CRON_SECRET)
// GET  /api/replay          -> vérifie l'éligibilité de l'utilisateur connecté
// POST /api/replay          -> déclenche le rescan gratuit

function buildReplayEmail({ appUrl, user_email, url_to_audit, scan_id }) {
  return {
    to: user_email,
    subject: 'Votre rescan gratuit Webisafe est disponible',
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0F172A;color:#fff;padding:24px;border-radius:16px;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 12px">Votre rescan gratuit est prêt</h1>
        <p style="color:#cbd5e1;line-height:1.6;font-size:14px">
          Cela fait 30 jours que vous avez reçu votre rapport Webisafe premium pour
          <strong style="color:#fff">${url_to_audit}</strong>. Vous bénéficiez maintenant
          d'un rescan gratuit pour mesurer les progrès depuis l'audit initial.
        </p>
        <p style="margin-top:24px;text-align:center">
          <a href="${appUrl}/dashboard?replay=${scan_id}"
             style="display:inline-block;background:#1566F0;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700">
            Lancer mon rescan gratuit
          </a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          Ce rescan est valable 30 jours. Au-delà, un nouveau rapport premium sera nécessaire.
        </p>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const url = new URL(req.url, 'http://localhost');

  // ── Cron : envoie les rappels J+30 ────────────────────────────────────────
  if (req.method === 'GET' && url.searchParams.get('cron') === '1') {
    if (!requireCronSecret(req, res)) return;

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: scans, error } = await supabase
      .from('scans')
      .select('id, user_email, url, paid, created_at, replay_used_at, replay_reminder_sent_at')
      .eq('paid', true)
      .is('replay_reminder_sent_at', null)
      .is('replay_used_at', null)
      .lte('created_at', cutoff)
      .limit(50);

    if (error) return json(res, 500, { success: false, error: 'Lookup error' });

    let sent = 0;
    let failed = 0;

    for (const scan of scans || []) {
      if (!scan.user_email) continue;
      try {
        await sendResendEmail(
          buildReplayEmail({
            appUrl: resolveAppUrl(),
            user_email: scan.user_email,
            url_to_audit: scan.url,
            scan_id: scan.id,
          })
        );
        await supabase
          .from('scans')
          .update({
            replay_reminder_sent_at: new Date().toISOString(),
            replay_eligible_at: new Date().toISOString(),
          })
          .eq('id', scan.id);
        sent++;
      } catch (err) {
        failed++;
      }
    }

    return json(res, 200, { success: true, sent, failed, candidates: scans?.length || 0 });
  }

  // ── GET utilisateur : vérifie éligibilité ─────────────────────────────────
  if (req.method === 'GET') {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: scans } = await supabase
      .from('scans')
      .select('id, url, created_at, replay_used_at, replay_reminder_sent_at')
      .eq('paid', true)
      .eq('user_email', user.email)
      .is('replay_used_at', null)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(5);

    return json(res, 200, { success: true, eligible: scans || [] });
  }

  // ── POST : déclenche le rescan gratuit ────────────────────────────────────
  if (req.method === 'POST') {
    const rateLimit = checkRateLimit(req, 5, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;

    const body = await readJsonBody(req);
    const scanId = String(body.scan_id || '').trim();
    if (!scanId) return json(res, 400, { success: false, error: 'scan_id requis' });

    const { data: scan } = await supabase
      .from('scans')
      .select('id, url, user_email, paid, created_at, replay_used_at')
      .eq('id', scanId)
      .single();

    if (!scan) return json(res, 404, { success: false, error: 'Rapport introuvable' });
    if (!scan.paid) return json(res, 402, { success: false, error: 'Rapport non premium' });
    if (scan.replay_used_at) {
      return json(res, 409, { success: false, error: 'Rescan déjà utilisé pour ce rapport.' });
    }

    const isOwner = scan.user_email?.toLowerCase() === user.email?.toLowerCase();
    if (!isOwner) return json(res, 403, { success: false, error: 'Accès refusé' });

    const elapsedDays = (Date.now() - new Date(scan.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (elapsedDays < 30) {
      return json(res, 425, {
        success: false,
        error: `Rescan disponible dans ${Math.ceil(30 - elapsedDays)} jours.`,
        unlocks_in_days: Math.ceil(30 - elapsedDays),
      });
    }

    // Marque le scan comme replay utilisé (le rescan effectif passe par /api/scan classique).
    await supabase
      .from('scans')
      .update({ replay_used_at: new Date().toISOString() })
      .eq('id', scanId);

    return json(res, 200, {
      success: true,
      message: 'Rescan déclenché. Lancez un nouveau scan depuis votre dashboard.',
      scan_url: scan.url,
    });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
