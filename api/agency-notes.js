import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAuthenticatedUser,
} from '../api_shared/_utils.js';

// R.7 — Notes/commentaires internes (agence ou admin sur un client/scan).
//
// GET    /api/agency-notes?scan_id=xxx    -> liste des notes pour un scan
// GET    /api/agency-notes?target=email   -> liste des notes pour un client (par email)
// POST   /api/agency-notes                -> crée une note
// PATCH  /api/agency-notes?id=xxx         -> met à jour (body, pinned)
// DELETE /api/agency-notes?id=xxx         -> supprime

async function isAgencyOrAdmin(supabase, user) {
  if (!user) return false;
  const { data } = await supabase
    .from('users')
    .select('role, plan')
    .eq('id', user.id)
    .single();

  if (!data) {
    // fallback : profile public
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, plan, email')
      .eq('id', user.id)
      .single();
    return Boolean(
      profile && (profile.role === 'admin' || profile.role === 'agence' || profile.plan === 'agency')
    );
  }
  return data.role === 'admin' || data.role === 'agence' || data.plan === 'agency';
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  const allowed = await isAgencyOrAdmin(supabase, user);
  if (!allowed) return json(res, 403, { success: false, error: 'Réservé aux agences/admins.' });

  const url = new URL(req.url, 'http://localhost');
  const noteId = url.searchParams.get('id');

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const scanId = url.searchParams.get('scan_id');
    const targetEmail = url.searchParams.get('target');

    let query = supabase
      .from('agency_client_notes')
      .select('*')
      .eq('author_id', user.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (scanId) query = query.eq('scan_id', scanId);
    if (targetEmail) query = query.eq('target_email', targetEmail.toLowerCase());

    const { data, error } = await query;
    if (error) return json(res, 500, { success: false, error: 'Erreur lookup' });
    return json(res, 200, { success: true, notes: data || [] });
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const rateLimit = checkRateLimit(req, 30, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const body = await readJsonBody(req);
    const noteBody = String(body.body || '').trim().slice(0, 5000);
    const scanId = body.scan_id ? String(body.scan_id) : null;
    const targetEmail = body.target_email
      ? String(body.target_email).toLowerCase().slice(0, 200)
      : null;
    const targetUserId = body.target_user_id || null;
    const pinned = Boolean(body.pinned);

    if (!noteBody) return json(res, 400, { success: false, error: 'body requis' });
    if (!scanId && !targetEmail && !targetUserId) {
      return json(res, 400, {
        success: false,
        error: 'Au moins une cible requise (scan_id, target_email ou target_user_id)',
      });
    }

    const { data, error } = await supabase
      .from('agency_client_notes')
      .insert({
        author_id: user.id,
        author_email: user.email,
        target_user_id: targetUserId,
        target_email: targetEmail,
        scan_id: scanId,
        body: noteBody,
        pinned,
      })
      .select()
      .single();

    if (error) return json(res, 500, { success: false, error: 'Erreur création' });
    return json(res, 200, { success: true, note: data });
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (!noteId) return json(res, 400, { success: false, error: 'id requis' });

    const body = await readJsonBody(req);
    const patch = {};
    if (body.body !== undefined) patch.body = String(body.body).trim().slice(0, 5000);
    if (body.pinned !== undefined) patch.pinned = Boolean(body.pinned);

    if (Object.keys(patch).length === 0) {
      return json(res, 400, { success: false, error: 'Aucun champ à mettre à jour' });
    }

    const { data, error } = await supabase
      .from('agency_client_notes')
      .update(patch)
      .eq('id', noteId)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error || !data) return json(res, 404, { success: false, error: 'Note introuvable' });
    return json(res, 200, { success: true, note: data });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!noteId) return json(res, 400, { success: false, error: 'id requis' });

    const { error } = await supabase
      .from('agency_client_notes')
      .delete()
      .eq('id', noteId)
      .eq('author_id', user.id);

    if (error) return json(res, 500, { success: false, error: 'Erreur suppression' });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
