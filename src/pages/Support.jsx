import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, Send, ChevronRight, Loader2, AlertTriangle,
  CheckCircle2, Clock, ArrowLeft, Mail, Tag, AlertCircle, ShieldCheck,
  User, FileText, Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * R.5 — Centre de support / tickets nominatifs
 *
 * /support              -> liste des tickets de l'utilisateur
 * /support/:ticketId    -> détail d'un ticket avec messages
 * /support?new=1        -> ouvre la modale de création
 *
 * Les utilisateurs peuvent : créer un ticket, répondre aux messages.
 * Les admins voient tous les tickets et peuvent changer le statut/priorité.
 */

const STATUS_LABELS = {
  open: { label: 'Ouvert', color: 'bg-primary/10 text-primary border-primary/20' },
  in_progress: { label: 'En cours', color: 'bg-warning/10 text-warning border-warning/20' },
  waiting_user: { label: 'En attente client', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  resolved: { label: 'Résolu', color: 'bg-success/10 text-success border-success/20' },
  closed: { label: 'Clôturé', color: 'bg-white/5 text-white/40 border-white/10' },
};

const PRIORITY_LABELS = {
  low: { label: 'Basse', color: 'text-white/50' },
  normal: { label: 'Normale', color: 'text-primary' },
  high: { label: 'Haute', color: 'text-warning' },
  urgent: { label: 'Urgente', color: 'text-danger' },
};

const CATEGORY_LABELS = {
  payment: 'Paiement',
  scan: 'Scan / Audit',
  protect: 'Webisafe Protect',
  agency: 'Agence / B2B',
  other: 'Autre',
};

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function Support({ user, authLoading = false }) {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/tickets', { headers });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Erreur de chargement');
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user?.id) fetchTickets();
  }, [authLoading, user?.id, fetchTickets]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Connexion requise</h2>
          <p className="text-white/60 mb-5">Connectez-vous pour accéder à votre centre de support.</p>
          <Link to="/?auth=login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (ticketId) {
    return (
      <TicketDetail
        ticketId={ticketId}
        user={user}
        onBack={() => navigate('/support')}
        onUpdated={fetchTickets}
      />
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="mb-2 inline-flex items-center gap-1 text-xs text-white/50 transition hover:text-white"
            >
              <ArrowLeft size={12} /> Retour au tableau de bord
            </Link>
            <h1 className="text-3xl font-black text-white">Centre de support</h1>
            <p className="mt-1 text-sm text-white/60">
              Posez vos questions, signalez un problème et suivez vos demandes.
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            <Plus size={14} /> Nouveau ticket
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-white/50">Chargement de vos tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <MessageSquare size={42} className="mx-auto mb-3 text-white/20" />
            <p className="text-base font-bold text-white">Aucun ticket pour l'instant</p>
            <p className="mt-1 text-sm text-white/50">
              Lancez votre première demande quand vous avez besoin d'aide.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover"
            >
              <Plus size={14} /> Créer un ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/support/${t.id}`)}
                className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-primary/30 hover:bg-white/[0.06]"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      STATUS_LABELS[t.status]?.color || 'bg-white/5 text-white/50 border-white/10'
                    }`}
                  >
                    {STATUS_LABELS[t.status]?.label || t.status}
                  </span>
                  {t.priority && t.priority !== 'normal' && (
                    <span
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                        PRIORITY_LABELS[t.priority]?.color || ''
                      }`}
                    >
                      <AlertCircle size={10} /> {PRIORITY_LABELS[t.priority]?.label || t.priority}
                    </span>
                  )}
                  {t.category && (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
                      <Tag size={10} /> {CATEGORY_LABELS[t.category] || t.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{t.subject}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/50">{t.body}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Clock size={12} /> {relativeTime(t.updated_at || t.created_at)}
                    <ChevronRight size={14} className="text-white/30" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewModal && (
          <NewTicketModal
            onClose={() => setShowNewModal(false)}
            onCreated={(t) => {
              setShowNewModal(false);
              fetchTickets();
              navigate(`/support/${t.id}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Détail d'un ticket ────────────────────────────────────────────────────────
function TicketDetail({ ticketId, user, onBack, onUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/tickets?id=${encodeURIComponent(ticketId)}`, { headers });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Erreur');
      setData(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages?.length]);

  const handleSendReply = useCallback(async () => {
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/tickets?id=${encodeURIComponent(ticketId)}&action=message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ body }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Erreur');
      setReply('');
      await fetchTicket();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [reply, sending, ticketId, fetchTicket, onUpdated]);

  if (loading) return <LoadingScreen />;

  if (error || !data?.ticket) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-danger/20 bg-danger/5 p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-danger" />
          <p className="text-base font-bold text-white">{error || 'Ticket introuvable'}</p>
          <button onClick={onBack} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
            Retour aux tickets
          </button>
        </div>
      </div>
    );
  }

  const { ticket, messages = [] } = data;
  const isAdminOrAgent = ticket.user_id !== user.id; // si on voit un ticket non-nôtre, c'est qu'on est admin/agent
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-xs text-white/50 transition hover:text-white"
        >
          <ArrowLeft size={12} /> Tous les tickets
        </button>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                STATUS_LABELS[ticket.status]?.color || 'bg-white/5 text-white/50 border-white/10'
              }`}
            >
              {STATUS_LABELS[ticket.status]?.label || ticket.status}
            </span>
            {ticket.priority && ticket.priority !== 'normal' && (
              <span
                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                  PRIORITY_LABELS[ticket.priority]?.color || ''
                }`}
              >
                <AlertCircle size={10} /> {PRIORITY_LABELS[ticket.priority]?.label || ticket.priority}
              </span>
            )}
            {ticket.category && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                <Tag size={9} className="mr-1 inline" />
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </span>
            )}
            {ticket.assigned_to_email && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
                <ShieldCheck size={9} className="mr-1 inline" /> Assigné à {ticket.assigned_to_email}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-white">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-white/40">
            <Clock size={10} className="mr-1 inline" />
            Créé {relativeTime(ticket.created_at)} · Dernière maj {relativeTime(ticket.updated_at)}
          </p>

          {/* Messages */}
          <div className="mt-6 space-y-3">
            {messages.map((m) => (
              <Message key={m.id} message={m} isMe={m.sender_id === user.id} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Réponse */}
          {!isClosed && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                Votre réponse
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Tapez votre message..."
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-white/30">{reply.length}/5000</p>
                <button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Envoyer
                </button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white/60">
              <CheckCircle2 size={16} className="text-success" />
              Ce ticket est <strong>{STATUS_LABELS[ticket.status]?.label?.toLowerCase()}</strong>. Pour
              une nouvelle question, créez un autre ticket.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Message({ message, isMe }) {
  const isAgent = message.sender_type === 'agent';
  const isSystem = message.sender_type === 'system';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl border p-4 ${
          isMe
            ? 'border-primary/30 bg-primary/10'
            : isAgent
            ? 'border-success/30 bg-success/5'
            : isSystem
            ? 'border-white/10 bg-white/5'
            : 'border-white/10 bg-white/5'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider">
          {isAgent ? (
            <span className="flex items-center gap-1 text-success">
              <ShieldCheck size={10} /> Webisafe Support
            </span>
          ) : isSystem ? (
            <span className="flex items-center gap-1 text-white/40">
              <Sparkles size={10} /> Système
            </span>
          ) : (
            <span className="flex items-center gap-1 text-white/40">
              <User size={10} /> {isMe ? 'Moi' : message.sender_email || 'Client'}
            </span>
          )}
          {message.internal_note && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
              Note interne
            </span>
          )}
          <span className="text-white/30">· {relativeTime(message.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{message.body}</p>
      </div>
    </div>
  );
}

// ── Modale création ticket ────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreated }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('normal');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ subject, body, category, priority }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Erreur');
      onCreated?.(payload.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }, [subject, body, category, priority, creating, onCreated]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0B1727] p-6"
      >
        <h2 className="mb-1 text-lg font-black text-white">Nouveau ticket</h2>
        <p className="mb-5 text-xs text-white/50">Notre équipe vous répond sous 24h ouvrées.</p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
              Objet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              required
              maxLength={200}
              placeholder="Ex : Problème lors du paiement de mon rapport"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#0B1727]">{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
                Priorité
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#0B1727]">{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 5000))}
              required
              rows={6}
              maxLength={5000}
              placeholder="Détaillez votre demande, ce que vous avez tenté, le résultat obtenu..."
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-white/30">{body.length}/5000</p>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!subject.trim() || !body.trim() || creating}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Envoyer le ticket
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
