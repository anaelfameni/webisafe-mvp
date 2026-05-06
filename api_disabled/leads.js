import { checkRateLimit, getSupabaseAdminClient, readJsonBody, setCorsHeaders } from './_utils.js';

const ALLOWED_SOURCES = new Set(['agence_waitlist', 'scan_gratuit']);

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizePublicUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value).trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée' });

  const rateLimit = checkRateLimit(req, 10, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: `Trop de demandes. Réessayez dans ${rateLimit.retryAfter}s.` });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return res.status(503).json({ success: false, error: 'Base de données indisponible' });

  const body = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const source = ALLOWED_SOURCES.has(body.source) ? body.source : 'scan_gratuit';
  const urlScanned = normalizePublicUrl(body.url_scanned);

  if (!isEmail(email)) {
    return res.status(400).json({ success: false, error: 'Email invalide' });
  }

  const record = {
    email,
    source,
    created_at: new Date().toISOString(),
  };

  if (urlScanned) record.url_scanned = urlScanned;

  const { error } = await supabase
    .from('leads')
    .upsert(record, { onConflict: urlScanned ? 'email,url_scanned' : 'email' });

  if (error) return res.status(500).json({ success: false, error: 'Enregistrement impossible' });
  return res.status(200).json({ success: true });
}
