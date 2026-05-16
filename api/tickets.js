import {
  json,
  readJsonBody,
  setCorsHeaders,
  checkRateLimit,
  getSupabaseAdminClient,
  requireAuthenticatedUser,
  logAdminAction,
} from '../api_shared/_utils.js';

// R.5 — Système de tickets nominatifs
//
// GET    /api/tickets                       -> liste les tickets de l'utilisateur (ou tous si admin)
// GET    /api/tickets?id=xxx                -> récupère un ticket + ses messages
// POST   /api/tickets                       -> crée un nouveau ticket
// POST   /api/tickets?id=xxx&action=message -> ajoute un message à un ticket
// PATCH  /api/tickets?id=xxx                -> met à jour le statut/priorité/assigné (admin)

const ALLOWED_STATUS = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
const ALLOWED_PRIORITY = ['low', 'normal', 'high', 'urgent'];
const ALLOWED_CATEGORIES = ['payment', 'scan', 'protect', 'agency', 'other'];

async function getUserRole(supabase, userId) {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role || 'user';
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return json(res, 500, { success: false, error: 'Configuration serveur manquante' });

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === 'admin';
  const url = new URL(req.url, 'http://localhost');
  const ticketId = url.searchParams.get('id');
  const action = url.searchParams.get('action');

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // Détail d'un ticket précis
    if (ticketId) {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error || !ticket) return json(res, 404, { success: false, error: 'Ticket introuvable' });
      if (!isAdmin && ticket.user_id !== user.id) {
        return json(res, 403, { success: false, error: 'Accès refusé' });
      }

      let messagesQuery = supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (!isAdmin) messagesQuery = messagesQuery.eq('internal_note', false);

      const { data: messages } = await messagesQuery;

      return json(res, 200, { success: true, ticket, messages: messages || [] });
    }

    // Liste
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!isAdmin) query = query.eq('user_id', user.id);

    const status = url.searchParams.get('status');
    if (status && ALLOWED_STATUS.includes(status)) query = query.eq('status', status);

    const { data: tickets, error } = await query;
    if (error) return json(res, 500, { success: false, error: 'Erreur lookup tickets' });

    return json(res, 200, { success: true, tickets: tickets || [] });
  }

  // ── POST : créer un ticket OU ajouter un message ─────────────────────────
  if (req.method === 'POST') {
    const rateLimit = checkRateLimit(req, 10, 60000);
    if (!rateLimit.allowed) return json(res, 429, { success: false, error: 'Trop de requêtes.' });

    const body = await readJsonBody(req);

    // Ajout d'un message à un ticket existant
    if (ticketId && action === 'message') {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id, user_id, status')
        .eq('id', ticketId)
        .single();

      if (!ticket) return json(res, 404, { success: false, error: 'Ticket introuvable' });
      if (!isAdmin && ticket.user_id !== user.id) {
        return json(res, 403, { success: false, error: 'Accès refusé' });
      }

      const msgBody = String(body.body || '').trim().slice(0, 5000);
      if (!msgBody) return json(res, 400, { success: false, error: 'Message vide' });

      const internalNote = Boolean(body.internal_note) && isAdmin;

      const { data: message, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_type: isAdmin ? 'agent' : 'user',
          sender_id: user.id,
          sender_email: user.email,
          body: msgBody,
          internal_note: internalNote,
        })
        .select()
        .single();

      if (error) return json(res, 500, { success: false, error: 'Erreur création message' });

      // Met à jour le statut : user répond => waiting_user devient open
      const newStatus = isAdmin
        ? ticket.status === 'open' ? 'in_progress' : ticket.status
        : ticket.status === 'waiting_user' ? 'open' : ticket.status;

      await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      return json(res, 200, { success: true, message });
    }

    // Création d'un nouveau ticket
    const subject = String(body.subject || '').trim().slice(0, 200);
    const bodyText = String(body.body || '').trim().slice(0, 5000);
    const category = ALLOWED_CATEGORIES.includes(body.category) ? body.category : 'other';
    const priority = ALLOWED_PRIORITY.includes(body.priority) ? body.priority : 'normal';
    const scanId = body.scan_id ? String(body.scan_id) : null;

    if (!subject || !bodyText) {
      return json(res, 400, { success: false, error: 'subject et body requis' });
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        user_email: user.email,
        subject,
        body: bodyText,
        category,
        priority,
        scan_id: scanId,
      })
      .select()
      .single();

    if (error) return json(res, 500, { success: false, error: 'Erreur création ticket' });

    // Premier message = corps du ticket (pour l'historique)
    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'user',
      sender_id: user.id,
      sender_email: user.email,
      body: bodyText,
      internal_note: false,
    });

    return json(res, 200, { success: true, ticket });
  }

  // ── PATCH : update statut/priorité/assigné (admin uniquement) ────────────
  if (req.method === 'PATCH') {
    if (!isAdmin) return json(res, 403, { success: false, error: 'Admin requis' });
    if (!ticketId) return json(res, 400, { success: false, error: 'id requis' });

    const body = await readJsonBody(req);
    const patch = {};

    if (body.status && ALLOWED_STATUS.includes(body.status)) {
      patch.status = body.status;
      if (body.status === 'resolved') patch.resolved_at = new Date().toISOString();
      if (body.status === 'closed') patch.closed_at = new Date().toISOString();
    }
    if (body.priority && ALLOWED_PRIORITY.includes(body.priority)) patch.priority = body.priority;
    if (body.assigned_to_email !== undefined) {
      patch.assigned_to_email = body.assigned_to_email ? String(body.assigned_to_email).slice(0, 200) : null;
      patch.assigned_to = body.assigned_to || null;
    }

    if (Object.keys(patch).length === 0) {
      return json(res, 400, { success: false, error: 'Aucun champ à mettre à jour' });
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(patch)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) return json(res, 500, { success: false, error: 'Erreur update ticket' });

    await logAdminAction({
      req,
      actor: user,
      action: 'ticket.update',
      targetType: 'support_ticket',
      targetId: ticketId,
      metadata: patch,
    });

    return json(res, 200, { success: true, ticket });
  }

  return json(res, 405, { success: false, error: 'Method not allowed' });
}
