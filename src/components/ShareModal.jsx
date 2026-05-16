import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Share2, Copy, CheckCircle2, Lock, Calendar, AlertTriangle,
  Loader2, ExternalLink, Trash2, Eye, Link2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * R.2 — Modal de partage de rapport via lien tokenisé
 *
 * Permet à un utilisateur authentifié de :
 * - Générer un lien public temporaire pour son rapport premium
 * - Choisir une durée d'expiration (7, 30, 90 ou 365 jours)
 * - Optionnellement protéger le lien par mot de passe
 * - Voir et révoquer ses partages existants
 */

const TTL_OPTIONS = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
  { days: 365, label: '1 an' },
];

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ShareModal({ isOpen, onClose, scanId, scanUrl }) {
  const [ttlDays, setTtlDays] = useState(30);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setCreatedLink(null);
      setPassword('');
      setUsePassword(false);
      setTtlDays(30);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCreate = useCallback(async () => {
    if (!scanId) return;
    setCreating(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          scan_id: scanId,
          ttl_days: ttlDays,
          password: usePassword && password ? password : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur lors de la création du lien');
      }
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setCreatedLink({
        token: data.token,
        url: `${baseUrl}/share/${data.token}`,
        expires_at: data.expires_at,
        password_protected: data.password_protected,
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  }, [scanId, ttlDays, usePassword, password]);

  const handleCopy = useCallback(() => {
    if (!createdLink?.url) return;
    navigator.clipboard.writeText(createdLink.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [createdLink]);

  const handleRevoke = useCallback(async () => {
    if (!createdLink?.token) return;
    const ok = window.confirm('Révoquer ce lien ? Il deviendra immédiatement inaccessible.');
    if (!ok) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/share?token=${encodeURIComponent(createdLink.token)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setCreatedLink(null);
        setError('Lien révoqué.');
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Erreur lors de la révocation');
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }, [createdLink]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0B1727] shadow-[0_30px_120px_rgba(2,6,23,0.7)]"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>

          <div className="p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Share2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Partager ce rapport</h2>
                <p className="text-xs text-white/50">{scanUrl}</p>
              </div>
            </div>

            {!createdLink ? (
              <>
                {/* Durée */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                    <Calendar size={12} /> Durée de validité
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {TTL_OPTIONS.map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setTtlDays(opt.days)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          ttlDays === opt.days
                            ? 'border-primary bg-primary/15 text-white'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="mb-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary"
                    />
                    <span className="flex items-center gap-2 text-sm text-white/80">
                      <Lock size={14} className="text-primary" /> Protéger par mot de passe
                    </span>
                  </label>
                  {usePassword && (
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value.slice(0, 100))}
                      placeholder="Mot de passe (à communiquer séparément)"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
                    />
                  )}
                </div>

                {/* Note légale */}
                <div className="mb-5 flex gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <p className="leading-5">
                    Toute personne ayant ce lien (et le mot de passe) pourra consulter votre rapport
                    pendant la durée choisie. Vous pouvez le révoquer à tout moment.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating || (usePassword && !password)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                  {creating ? 'Création...' : 'Générer le lien de partage'}
                </button>
              </>
            ) : (
              <>
                <div className="mb-5 rounded-xl border border-success/30 bg-success/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-success">
                    <CheckCircle2 size={16} /> Lien créé avec succès
                  </div>
                  <p className="text-xs text-white/60">
                    Expire le{' '}
                    <strong className="text-white">
                      {new Date(createdLink.expires_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </p>
                  {createdLink.password_protected && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                      <Lock size={12} /> Protégé par mot de passe
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                    Lien à partager
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdLink.url}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                        copied
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-white/10 bg-white/5 text-white hover:border-primary/50'
                      }`}
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <a
                    href={createdLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:border-primary/50"
                  >
                    <ExternalLink size={14} /> Aperçu
                  </a>
                  <button
                    onClick={handleRevoke}
                    className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/10"
                  >
                    <Trash2 size={14} /> Révoquer
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
