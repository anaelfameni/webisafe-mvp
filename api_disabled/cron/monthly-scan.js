// Vercel Serverless Function — Scan mensuel Protect
// Schedule: 0 0 1 * * (1er du mois à minuit)

import { requireCronSecret } from '../_utils.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (!requireCronSecret(req, res)) return;

  try {
    // Récupérer les abonnements actifs depuis Supabase
    const subsRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?status=eq.active&select=*`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!subsRes.ok) throw new Error('Erreur fetch subscriptions');
    const subscriptions = await subsRes.json();

    const results = [];

    for (const sub of subscriptions) {
      const siteUrl = sub.site_url || sub.url;
      const userEmail = sub.user_email || sub.email;
      if (!siteUrl) continue;
      try {
        const appUrl = process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://webisafe.vercel.app');
        const scanRes = await fetch(`${appUrl}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: siteUrl, email: userEmail, source: 'cron_monthly' }),
        });
        results.push({ url: siteUrl, ok: scanRes.ok });
      } catch (e) {
        results.push({ url: siteUrl, ok: false, error: e.message });
      }
    }

    return res.status(200).json({ scanned: results.length, results });
  } catch (error) {
    console.error('Cron monthly-scan error:', error);
    return res.status(500).json({ error: error.message });
  }
}
