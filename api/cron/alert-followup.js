import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY;
const FROM_EMAIL = 'Webisafe <onboarding@resend.dev>';
const CRON_SECRET = process.env.CRON_SECRET;

async function sendFollowUpEmail({ to, url }) {
  if (!RESEND_API_KEY) return { success: false, error: 'Clé Resend manquante' };

  const subject = `Webisafe — Votre alerte pour ${url}`;
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#0F172A;background:#F8FAFC;padding:32px;border-radius:12px;">
      <h2 style="color:#1566F0;margin-top:0;">Votre site est de nouveau en ligne</h2>
      <p>Bonjour,</p>
      <p>Notre système a détecté un incident sur <strong>${url}</strong> hier et vous a alerté immédiatement.</p>
      <p>Votre site est maintenant de nouveau accessible.</p>
      <p style="margin-top:24px;"><strong>L'alerte vous a-t-elle été utile ?</strong> Un mot de retour nous aiderait beaucoup à améliorer le service.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="https://wa.me/2250595335662?text=Bonjour%2C%20l'alerte%20de%20hier%20m'a%20été%20utile."
           style="display:inline-block;background:#1566F0;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">
           Donner mon avis sur WhatsApp
        </a>
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">
        Merci de faire confiance à Webisafe Protect.
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erreur Resend');
  }
  return { success: true };
}

export default async function handler(req, res) {
  // Sécurité : vérifier le secret cron
  const auth = req.headers.authorization || '';
  if (!auth.includes(CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Chercher les alertes envoyées entre 23h et 25h qui n'ont pas encore de follow-up
    // NOTE : adaptez le nom de table et les colonnes selon votre schéma Supabase
    const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const until = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('id, subscription_id, sent_at, subscriptions(user_email, site_url)')
      .gte('sent_at', since)
      .lte('sent_at', until)
      .is('follow_up_sent', null)
      .limit(50);

    if (error) throw error;
    if (!alerts || alerts.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Aucune alerte à suivre' });
    }

    let sent = 0;
    for (const alert of alerts) {
      const email = alert.subscriptions?.user_email;
      const url = alert.subscriptions?.site_url;
      if (!email || !url) continue;

      try {
        await sendFollowUpEmail({ to: email, url });
        sent++;
        // Marquer comme envoyé
        await supabase.from('alerts').update({ follow_up_sent: new Date().toISOString() }).eq('id', alert.id);
      } catch (e) {
        console.error('Erreur follow-up alerte', alert.id, e.message);
      }
    }

    return res.status(200).json({ sent, total: alerts.length });
  } catch (err) {
    console.error('Cron alert-followup error:', err);
    return res.status(500).json({ error: err.message });
  }
}
