import { createClient } from '@supabase/supabase-js';
import { json, setCorsHeaders, requireAuthenticatedUser, checkRateLimit } from '../../api_shared/_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

// ── S.3 — Statut public plateforme (anciennement api/uptime/public.js) ─────────
async function handlePublicStatus(req, res) {
  const rl = checkRateLimit(req, 60, 60000);
  if (!rl.allowed) return json(res, 429, { error: `Trop de requêtes. Réessayez dans ${rl.retryAfter}s.` });

  const fallback = { webisafe: 'operational', api: 'operational', protect: 'operational', pdf: 'operational' };
  const apiKey = process.env.UPTIMEROBOT_PUBLIC_KEY;

  if (!apiKey) {
    return json(res, 200, { statuses: fallback, updated_at: new Date().toISOString(), source: 'fallback' });
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
      statusMap[key] = m?.status === 2 ? 'operational' : m?.status === 9 ? 'incident' : 'degraded';
    });
    return json(res, 200, { statuses: { ...fallback, ...statusMap }, updated_at: new Date().toISOString(), source: 'uptimerobot' });
  } catch {
    return json(res, 200, { statuses: fallback, updated_at: new Date().toISOString(), source: 'fallback' });
  }
}

async function getUptimeRobotStatus(monitorId) {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey || !monitorId) return null;

  try {
    const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        format: 'json',
        monitors: String(monitorId),
        response_times: 1,
        response_times_limit: 1,
        custom_uptime_ratios: '30',
      }),
    });
    const data = await res.json();
    const monitor = data?.monitors?.[0];
    if (!monitor) return null;

    const statusMap = { 0: 'paused', 1: 'not_checked', 2: 'up', 8: 'seems_down', 9: 'down' };

    return {
      status: statusMap[monitor.status] ?? 'unknown',
      uptime_ratio: parseFloat(monitor.custom_uptime_ratio) || null,
      response_time: monitor.response_times?.[0]?.value || null,
      last_checked: monitor.response_times?.[0]?.datetime
        ? new Date(monitor.response_times[0].datetime * 1000).toISOString()
        : null,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const { user_id } = req.query;
  if (!user_id) return json(res, 400, { error: 'user_id requis' });

  // Route publique — aucune auth requise (anciennement api/uptime/public.js)
  if (user_id === 'public') return handlePublicStatus(req, res);

  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  if (user.id !== user_id) {
    return json(res, 403, { error: 'Accès refusé' });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('uptimerobot_monitor_id, site_url, status')
    .eq('user_id', user_id)
    .eq('status', 'active')
    .single();

  if (!sub) {
    return json(res, 200, { success: true, status: 'unknown', message: 'Aucun abonnement actif' });
  }

  const uptimeData = await getUptimeRobotStatus(sub.uptimerobot_monitor_id);

  return json(res, 200, {
    success: true,
    site_url: sub.site_url,
    status: uptimeData?.status ?? 'unknown',
    uptime_ratio: uptimeData?.uptime_ratio ?? null,
    response_time: uptimeData?.response_time ?? null,
    last_checked: uptimeData?.last_checked ?? null,
  });
}
