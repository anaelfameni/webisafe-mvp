import {
  getSupabaseAdminClient,
  requireCronSecret,
  sendResendEmail,
  json,
} from '../../api_shared/_utils.js';
import { buildRescanReminderEmail, resolveAppUrl } from '../../api_shared/_paymentEmails.js';

// Batch max pour ne pas dépasser le timeout Vercel (30s configuré dans vercel.json).
const BATCH_LIMIT = 50;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!requireCronSecret(req, res)) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return json(res, 500, { error: 'Configuration Supabase manquante' });
  }

  const appUrl = resolveAppUrl();
  const now = new Date().toISOString();

  // Scans payés sans notification de rescan déjà envoyée et rescan pas encore utilisé.
  // On récupère plus que nécessaire puis on filtre en JS pour gérer les deux cas :
  //   1. replay_eligible_at renseigné (chemin normal — set par payment-admin.js)
  //   2. replay_eligible_at null mais created_at >= 30j (anciens scans avant la feature)
  const { data: candidates, error: dbError } = await supabase
    .from('scans')
    .select('id, user_email, url, created_at, replay_eligible_at')
    .eq('paid', true)
    .is('replay_reminder_sent_at', null)
    .is('replay_used_at', null)
    .not('user_email', 'is', null)
    .neq('user_email', '')
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT * 3); // marge pour le filtre JS

  if (dbError) {
    return json(res, 500, { error: `Erreur lecture scans: ${dbError.message}` });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const eligible = (candidates || [])
    .filter((scan) => {
      if (scan.replay_eligible_at) {
        return new Date(scan.replay_eligible_at) <= new Date();
      }
      return new Date(scan.created_at) <= thirtyDaysAgo;
    })
    .slice(0, BATCH_LIMIT);

  const results = { sent: 0, failed: 0, skipped: 0, errors: [] };

  for (const scan of eligible) {
    try {
      const emailPayload = buildRescanReminderEmail({
        appUrl,
        scan_id: scan.id,
        user_email: scan.user_email,
        url_to_audit: scan.url,
      });

      await sendResendEmail(emailPayload);

      const { error: updateError } = await supabase
        .from('scans')
        .update({ replay_reminder_sent_at: now })
        .eq('id', scan.id);

      if (updateError) {
        // Email envoyé mais marquage échoué — on log sans comptabiliser comme échec email.
        results.errors.push({
          scan_id: scan.id,
          stage: 'db_update',
          error: updateError.message,
        });
      }

      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push({ scan_id: scan.id, stage: 'email', error: err.message });
    }
  }

  return json(res, 200, {
    processed: eligible.length,
    ...results,
    timestamp: now,
  });
}
