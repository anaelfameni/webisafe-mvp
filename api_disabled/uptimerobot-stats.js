import { setCorsHeaders } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { monitorId } = req.query;
  if (!monitorId) return res.status(400).json({ error: 'monitorId requis' });

  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'UPTIMEROBOT_API_KEY manquante' });

  try {
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        monitors: monitorId,
        response_times: '1',
        logs: '1',
        custom_uptime_ratios: '7-30-90',
      }),
    });

    const data = await response.json();
    const monitor = data?.monitors?.[0];
    if (!monitor) return res.status(404).json({ error: 'Moniteur introuvable' });

    const ratios = (monitor.custom_uptime_ratio || '0-0-0').split('-');
    const statusMap = { 0: 'paused', 1: 'not checked', 2: 'up', 8: 'seems down', 9: 'down' };

    return res.json({
      status: monitor.status,
      statusLabel: statusMap[monitor.status] || 'unknown',
      uptimeRatio7d: ratios[0] ?? '0',
      uptimeRatio30d: ratios[1] ?? '0',
      uptimeRatio90d: ratios[2] ?? '0',
      avgResponseTime: monitor.average_response_time ?? null,
      logs: monitor.logs?.slice(0, 10) ?? [],
      allTimeUptime: monitor.all_time_uptime_ratio ?? null,
    });
  } catch (err) {
    console.error('[uptimerobot-stats] error:', err);
    return res.status(500).json({ error: 'Erreur UptimeRobot' });
  }
}
