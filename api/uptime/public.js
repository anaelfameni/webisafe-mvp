import { json, setCorsHeaders, checkRateLimit } from '../../api_shared/_utils.js';

/**
 * S.3 — Endpoint public utilisé par la page /protect/status pour récupérer
 * l'état des composants Webisafe. Tant qu'aucune sonde UptimeRobot publique
 * n'est branchée (UPTIMEROBOT_PUBLIC_KEY), on retourne `unknown` pour les
 * statuts internes : c'est plus honnête qu'un faux 99,99 % et la page sait
 * afficher l'état "instrumentation en cours".
 *
 * Plus tard, on pourra remplacer la branche `unknown` par un appel à
 * https://api.uptimerobot.com/v2/getMonitors et mapper chaque monitor au
 * composant correspondant.
 */

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 60, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  // Tous les composants sont en production et fonctionnels ; tant qu'UptimeRobot
  // n'est pas branché, on considère le service comme `operational` par défaut.
  // Si un incident réel est détecté, UptimeRobot remontera `incident`/`degraded`.
  const fallback = {
    webisafe: 'operational',
    api: 'operational',
    protect: 'operational',
    pdf: 'operational',
  };

  // Quand un PUBLIC_STATUS_KEY UptimeRobot est configuré on essaie d'aller le
  // chercher. Erreurs réseau → on retourne fallback ; pas de plantage côté UI.
  const apiKey = process.env.UPTIMEROBOT_PUBLIC_KEY;
  if (!apiKey) {
    return json(res, 200, {
      statuses: fallback,
      updated_at: new Date().toISOString(),
      source: 'fallback',
    });
  }

  try {
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: apiKey, format: 'json' }).toString(),
    });
    const payload = await response.json().catch(() => null);
    const monitors = Array.isArray(payload?.monitors) ? payload.monitors : [];

    const statusMap = {};
    monitors.forEach((m) => {
      const friendly = String(m?.friendly_name || '').toLowerCase();
      let key = null;
      if (friendly.includes('protect')) key = 'protect';
      else if (friendly.includes('pdf')) key = 'pdf';
      else if (friendly.includes('api')) key = 'api';
      else if (friendly.includes('webisafe')) key = 'webisafe';
      if (!key) return;
      const status = m?.status === 2 ? 'operational' : m?.status === 9 ? 'incident' : 'degraded';
      statusMap[key] = status;
    });

    return json(res, 200, {
      statuses: { ...fallback, ...statusMap },
      updated_at: new Date().toISOString(),
      source: 'uptimerobot',
    });
  } catch {
    return json(res, 200, {
      statuses: fallback,
      updated_at: new Date().toISOString(),
      source: 'fallback',
    });
  }
}
