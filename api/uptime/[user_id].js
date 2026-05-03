import { createClient } from '@supabase/supabase-js';
import { json, setCorsHeaders } from '../_utils.js';

const supabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
  : null;

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
  if (!supabase) return json(res, 503, { error: 'Service indisponible' });

  const { user_id } = req.query;
  if (!user_id) return json(res, 400, { error: 'user_id requis' });

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
