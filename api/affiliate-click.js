import { checkRateLimit, getSupabaseAdminClient, readJsonBody, setCorsHeaders } from '../api_shared/_utils.js';

function normalizeRefCode(value) {
  const refCode = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9_-]{2,64}$/.test(refCode) ? refCode : null;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée' });

  const rateLimit = checkRateLimit(req, 30, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: `Trop de demandes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return res.status(503).json({ success: false, error: 'Base de données indisponible' });

  const body = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
  const refCode = normalizeRefCode(body.ref_code);
  const page = String(body.page || '/').slice(0, 200);

  if (!refCode) return res.status(400).json({ success: false, error: 'Code affilié invalide' });

  const { error } = await supabase.from('affiliate_clicks').insert({
    ref_code: refCode,
    page,
    created_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ success: false, error: 'Enregistrement impossible' });
  return res.status(200).json({ success: true });
}
