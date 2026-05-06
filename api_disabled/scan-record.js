import { checkRateLimit, getSupabaseAdminClient, json, setCorsHeaders } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const scanId = String(req.query?.id || '').trim();
  if (!scanId) return json(res, 400, { success: false, error: 'id requis' });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const { data: row, error } = await supabase
    .from('scans')
    .select('id,url,email,user_email,scan_date,scanned_at,created_at,paid,data,results_json')
    .eq('id', scanId)
    .single();

  if (error || !row) return json(res, 404, { success: false, error: 'Scan introuvable' });

  const scanData = row.data || row.results_json || {};
  const sanitizedScanData = { ...scanData };
  delete sanitizedScanData.email;
  delete sanitizedScanData.user_email;
  const unlocked = Boolean(row.paid);
  const publicScan = unlocked
    ? sanitizedScanData
    : {
        id: row.id,
        url: row.url || scanData?.url,
        scanDate: row.scan_date || row.scanned_at || row.created_at || scanData?.scanDate || scanData?.scanned_at,
        scanned_at: row.scanned_at || row.scan_date || row.created_at || scanData?.scanned_at,
        scores: scanData?.scores,
        global_score: scanData?.global_score,
        score: scanData?.score,
        grade: scanData?.grade,
      };

  return json(res, 200, {
    success: true,
    scan: {
      ...publicScan,
      id: row.id,
      url: row.url || publicScan?.url,
      scanDate: row.scan_date || row.scanned_at || row.created_at || publicScan?.scanDate || publicScan?.scanned_at,
      paid: unlocked,
    },
  });
}
