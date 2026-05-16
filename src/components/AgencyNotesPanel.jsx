import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote, Plus, Pin, Trash2, Edit2, Check, X, Loader2,
  AlertTriangle, User, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * R.7 — Panneau de notes internes pour les agences/admins.
 *
 * Permet d'attacher des notes à :
 * - Un scan particulier (props.scanId)
 * - Un client (props.targetEmail)
 * - Les deux
 *
 * Visible uniquement dans la console agence/admin. Les notes ne sont jamais
 * exposées aux clients finaux.
 *
 * Props :
 *  - scanId     : string (optionnel) — filtre par scan
 *  - targetEmail: string (optionnel) — filtre par client (email)
 *  - compact    : boolean (optionnel) — version compacte (3 dernières notes)
 */

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

export default function AgencyNotesPanel({ scanId, targetEmail, compact = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newBody, setNewBody] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const url = new URL('/api/agency-notes', window.location.origin);
      if (scanId) url.searchParams.set('scan_id', scanId);
      if (targetEmail) url.searchParams.set('target', targetEmail);
      const res = await fetch(url.toString(), { headers });

      // Si l'endpoint n'est pas dispo (404 / proxy renvoie le SPA HTML / 403),
      // on masque silencieusement le panel : pas d'erreur côté client.
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 403 || res.status === 404 || !contentType.includes('application/json')) {
        setNotes([]);
        setError('FORBIDDEN');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erreur chargement');
      }
      setNotes(data?.notes || []);
    } catch (err) {
      // Si le JSON parse échoue (réponse HTML inattendue), on traite comme indisponible
      if (err instanceof SyntaxError) {
        setNotes([]);
        setError('FORBIDDEN');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scanId, targetEmail]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = useCallback(async () => {
    const body = newBody.trim();
    if (!body || creating) return;
    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/agency-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          body,
          scan_id: scanId || null,
          target_email: targetEmail || null,
          pinned: newPinned,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Endpoint indisponible (déployez l’API).');
      }
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Erreur');
      setNewBody('');
      setNewPinned(false);
      setShowForm(false);
      await fetchNotes();
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Endpoint indisponible.' : err.message);
    } finally {
      setCreating(false);
    }
  }, [newBody, newPinned, scanId, targetEmail, creating, fetchNotes]);

  const handleTogglePin = useCallback(async (note) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/agency-notes?id=${encodeURIComponent(note.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      await fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchNotes]);

  const handleDelete = useCallback(async (note) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/agency-notes?id=${encodeURIComponent(note.id)}`, {
        method: 'DELETE',
        headers,
      });
      await fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchNotes]);

  const handleSaveEdit = useCallback(async (noteId) => {
    const body = editBody.trim();
    if (!body) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/agency-notes?id=${encodeURIComponent(noteId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ body }),
      });
      setEditingId(null);
      setEditBody('');
      await fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  }, [editBody, fetchNotes]);

  // Forbidden = on n'est pas agence/admin → on n'affiche pas le panel
  if (error === 'FORBIDDEN') return null;

  const visible = compact ? notes.slice(0, 3) : notes;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <StickyNote size={14} className="text-warning" /> Notes internes
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">
            {notes.length}
          </span>
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white/70 transition hover:bg-white/10"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      <p className="mb-3 text-[11px] leading-5 text-white/40">
        Visibles uniquement par votre équipe (agence/admin). Jamais exposées aux clients.
      </p>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value.slice(0, 5000))}
              rows={3}
              autoFocus
              placeholder="Note interne (visible uniquement par votre équipe)..."
              className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="h-3 w-3 rounded border-white/20 bg-transparent"
                />
                <Pin size={10} /> Épingler en tête
              </label>
              <button
                onClick={handleCreate}
                disabled={!newBody.trim() || creating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
              >
                {creating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Enregistrer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && error !== 'FORBIDDEN' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-2 text-xs text-danger">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center">
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-white/40" />
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center text-xs text-white/40">
          Aucune note pour ce contexte.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl border p-3 ${
                note.pinned
                  ? 'border-warning/30 bg-warning/5'
                  : 'border-white/10 bg-slate-950/40'
              }`}
            >
              {note.pinned && (
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning">
                  <Pin size={9} /> Épinglée
                </div>
              )}
              {editingId === note.id ? (
                <>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value.slice(0, 5000))}
                    rows={3}
                    autoFocus
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-white focus:border-primary focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 text-[11px] font-bold text-success transition hover:bg-success/25"
                    >
                      <Check size={10} /> Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditBody('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10"
                    >
                      <X size={10} /> Annuler
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <span className="flex items-center gap-1">
                        <User size={9} /> {note.author_email?.split('@')[0] || 'Vous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={9} /> {relativeTime(note.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note)}
                        title={note.pinned ? 'Désépingler' : 'Épingler'}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white"
                      >
                        <Pin size={10} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body || '');
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white"
                        title="Modifier"
                      >
                        <Edit2 size={10} />
                      </button>
                      <button
                        onClick={() => handleDelete(note)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-danger/10 hover:text-danger"
                        title="Supprimer"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          {compact && notes.length > 3 && (
            <p className="text-center text-[11px] text-white/30">
              + {notes.length - 3} autre{notes.length > 4 ? 's' : ''} note{notes.length > 4 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
