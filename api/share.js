import crypto from 'node:crypto';
import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAuthenticatedUser,
  escapeHtml,
} from '../api_shared/_utils.js';

// R.2 — Partage de rapport via lien tokenisé
//
// GET    /api/share?token=xxx          -> récupère le rapport partagé (public)
// POST   /api/share                    -> crée un lien (auth requise)
// DELETE /api/share?token=xxx          -> révoque un lien (owner ou admin)

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function hashPassword(password) {
  if (!password) return null;
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function isExpired(share) {
  if (!share) return true;
  if (share.revoked_at) return true;
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) return true;
  return false;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  // ── GET : lecture publique d'un share ─────────────────────────────────────
  if (req.method === 'GET') {
    const rateLimit = checkRateLimit(req, 60, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const password = url.searchParams.get('password');

    if (!token) return json(res, 400, { success: false, error: 'Token requis' });

    const { data: share, error } = await supabase
      .from('report_shares')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !share) return json(res, 404, { success: false, error: 'Lien introuvable' });
    if (isExpired(share)) return json(res, 410, { success: false, error: 'Lien expiré ou révoqué' });

    if (share.password_hash && hashPassword(password) !== share.password_hash) {
      return json(res, 401, {
        success: false,
        error: 'Mot de passe requis',
        password_required: true,
      });
    }

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, url, scanned_at, scores, recommendations, metrics, status, raw, scan_type')
      .eq('id', share.scan_id)
      .single();

    if (scanError || !scan) return json(res, 404, { success: false, error: 'Rapport introuvable' });

    // Best-effort : incrémente views_count (ne bloque pas la lecture)
    supabase
      .from('report_shares')
      .update({ views_count: (share.views_count || 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq('token', token)
      .then(() => undefined, () => undefined);

    return json(res, 200, {
      success: true,
      share: {
        token: share.token,
        expires_at: share.expires_at,
        views_count: (share.views_count || 0) + 1,
        owner_email: share.owner_email ? escapeHtml(share.owner_email).slice(0, 3) + '***' : null,
      },
      scan,
    });
  }

  // ── POST : création d'un lien (auth) ──────────────────────────────────────
  if (req.method === 'POST') {
    const rateLimit = checkRateLimit(req, 10, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;

    const body = await readJsonBody(req);
    const scanId = String(body.scan_id || '').trim();
    const ttlDays = Math.min(Math.max(Number(body.ttl_days) || 30, 1), 365);
    const password = body.password ? String(body.password).slice(0, 100) : null;

    if (!scanId) return json(res, 400, { success: false, error: 'scan_id requis' });

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, user_id, user_email, paid')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) return json(res, 404, { success: false, error: 'Rapport introuvable' });

    // Seul l'owner du scan (ou un admin) peut créer un partage.
    const { data: publicUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    const isAdmin = publicUser?.role === 'admin';
    const isOwner =
      scan.user_id === user.id ||
      (scan.user_email && user.email && scan.user_email.toLowerCase() === user.email.toLowerCase());

    if (!isAdmin && !isOwner) {
      return json(res, 403, { success: false, error: 'Vous ne pouvez partager que vos propres rapports.' });
    }

    if (!scan.paid && !isAdmin) {
      return json(res, 402, { success: false, error: 'Le partage est réservé aux rapports premium.' });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('report_shares').insert({
      token,
      scan_id: scanId,
      owner_user_id: user.id,
      owner_email: user.email,
      expires_at: expiresAt,
      password_hash: hashPassword(password),
    });

    if (insertError) {
      return json(res, 500, { success: false, error: 'Erreur création du partage' });
    }

    return json(res, 200, {
      success: true,
      token,
      expires_at: expiresAt,
      password_protected: Boolean(password),
    });
  }

  // ── DELETE : révocation (owner ou admin) ──────────────────────────────────
  if (req.method === 'DELETE') {
    const user = await requireAuthenticatedUser(req, res);
    if (!user) return;

    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) return json(res, 400, { success: false, error: 'Token requis' });

    const { data: share } = await supabase
      .from('report_shares')
      .select('owner_user_id')
      .eq('token', token)
      .single();

    if (!share) return json(res, 404, { success: false, error: 'Lien introuvable' });

    const { data: publicUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    const isAdmin = publicUser?.role === 'admin';

    if (!isAdmin && share.owner_user_id !== user.id) {
      return json(res, 403, { success: false, error: 'Accès refusé' });
    }

    await supabase
      .from('report_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', token);

    return json(res, 200, { success: true });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
