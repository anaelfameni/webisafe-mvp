// Vercel Serverless Function — Scan mensuel Protect
// Schedule: 0 0 1 * * (1er du mois à minuit)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  // Sécurité : vérifier le secret ou la méthode GET depuis Vercel Cron
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
      if (!sub.url) continue;
      try {
        const scanRes = await fetch(`${process.env.VERCEL_URL || 'https://webisafe.vercel.app'}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sub.url, email: sub.email, source: 'cron_monthly' }),
        });
        results.push({ url: sub.url, ok: scanRes.ok });
      } catch (e) {
        results.push({ url: sub.url, ok: false, error: e.message });
      }
    }

    return res.status(200).json({ scanned: results.length, results });
  } catch (error) {
    console.error('Cron monthly-scan error:', error);
    return res.status(500).json({ error: error.message });
  }
}
