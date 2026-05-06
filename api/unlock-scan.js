import { checkRateLimit, getSupabaseAdminClient, json, readJsonBody, requireAdmin, setCorsHeaders } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' });

  const rateLimit = checkRateLimit(req, 20, 60000);
  if (!rateLimit.allowed) {
    return json(res, 429, { success: false, error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { success: false, error: 'Corps invalide' });
  }

  if (!body.scan_id) {
    return json(res, 400, { success: false, error: 'scan_id requis' });
  }

  const { error } = await supabase
    .from('scans')
    .update({ paid: true })
    .eq('id', body.scan_id);

  if (error) {
    return json(res, 500, { success: false, error: 'Déblocage impossible' });
  }

  return json(res, 200, { success: true, scan_id: body.scan_id });
}
