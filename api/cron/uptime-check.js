// Vercel Serverless Function — Uptime check toutes les 6h
// Schedule: 0 */6 * * *

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
      if (!sub.url) continue;
      try {
        const start = Date.now();
        const response = await fetch(sub.url, { method: 'HEAD', redirect: 'follow' });
        const latency = Date.now() - start;
        results.push({
          url: sub.url,
          status: response.status,
          up: response.ok,
          latency_ms: latency,
        });
      } catch (e) {
        results.push({ url: sub.url, up: false, error: e.message });
      }
    }

    // Optionnel : persister les résultats dans Supabase (table uptime_logs)
    return res.status(200).json({ checked: results.length, results });
  } catch (error) {
    console.error('Cron uptime-check error:', error);
    return res.status(500).json({ error: error.message });
  }
}
