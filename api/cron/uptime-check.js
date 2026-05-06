// Vercel Serverless Function — Uptime check toutes les 6h
// Schedule: 0 */6 * * *

import { requireCronSecret } from '../_utils.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (!requireCronSecret(req, res)) return;

  try {
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
      if (!siteUrl) continue;
      try {
        const start = Date.now();
        const response = await fetch(siteUrl, { method: 'HEAD', redirect: 'follow' });
        const latency = Date.now() - start;
        results.push({
          url: siteUrl,
          status: response.status,
          up: response.ok,
          latency_ms: latency,
        });
      } catch (e) {
        results.push({ url: siteUrl, up: false, error: e.message });
      }
    }

    // Optionnel : persister les résultats dans Supabase (table uptime_logs)
    return res.status(200).json({ checked: results.length, results });
  } catch (error) {
    console.error('Cron uptime-check error:', error);
    return res.status(500).json({ error: error.message });
  }
}
