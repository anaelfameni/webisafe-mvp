import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { extractDomain } from '../utils/validators';

/**
 * R.4 — Bandeau "Replay J+30" affiché sur le Dashboard quand l'utilisateur a
 * un rapport premium éligible à un rescan gratuit (≥ 30 jours après l'audit).
 *
 * - Charge la liste depuis GET /api/replay
 * - Le clic sur "Lancer le rescan gratuit" appelle POST /api/replay puis
 *   redirige vers /analyse?url=... pour relancer le scan effectif
 * - Mémorise la fermeture en localStorage par scan_id (24h)
 */

const DISMISS_KEY = 'webisafe_replay_dismissed';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function loadDismissed() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, ts]) => typeof ts === 'number' && now - ts < DISMISS_TTL_MS)
    );
  } catch {
    return {};
  }
}

function saveDismissed(map) {
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ReplayBanner({ user }) {
  const navigate = useNavigate();
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(() => loadDismissed());

  const fetchEligible = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/replay', { headers });
      if (!res.ok) {
        setEligible([]);
        return;
      }
      const data = await res.json();
      setEligible(data?.eligible || []);
    } catch {
      setEligible([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEligible();
  }, [fetchEligible]);

  const visible = eligible.filter((s) => !dismissed[s.id]);
  const target = visible[0];

  const handleDismiss = useCallback((scanId) => {
    setDismissed((prev) => {
      const next = { ...prev, [scanId]: Date.now() };
      saveDismissed(next);
      return next;
    });
  }, []);

  const handleReplay = useCallback(async () => {
    if (!target || triggering) return;
    setTriggering(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ scan_id: target.id }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Erreur lors du déclenchement du rescan');
      }
      // Redirige vers /analyse pour le scan réel
      const redirectUrl = payload.scan_url || target.url;
      navigate(`/analyse?url=${encodeURIComponent(redirectUrl)}&replay=${target.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setTriggering(false);
    }
  }, [target, triggering, navigate]);

  if (loading || !target) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={target.id}
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        className="relative overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-500/15 via-primary/10 to-emerald-400/10 p-5"
      >
        <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-[shimmer_3s_infinite]" />
        <button
          onClick={() => handleDismiss(target.id)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          <X size={12} />
        </button>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-purple-400/15 text-purple-300">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300/80">
                Replay gratuit · J+30
              </p>
              <h3 className="mt-1 text-base font-black text-white">
                Votre rescan est offert pour <span className="text-purple-300">{extractDomain(target.url)}</span>
              </h3>
              <p className="mt-1 text-sm leading-6 text-white/60">
                Cela fait 30 jours que vous avez reçu votre rapport premium. Mesurez vos progrès
                avec un nouveau scan complet — sans payer à nouveau.
              </p>
            </div>
          </div>

          <button
            onClick={handleReplay}
            disabled={triggering}
            className="flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-400 disabled:opacity-60"
          >
            {triggering ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {triggering ? 'Lancement...' : 'Lancer mon rescan gratuit'}
          </button>
        </div>

        {error && (
          <div className="relative mt-3 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-2.5 text-xs text-danger">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {visible.length > 1 && (
          <p className="relative mt-3 text-[11px] text-white/40">
            + {visible.length - 1} autre{visible.length > 2 ? 's' : ''} rescan disponible{visible.length > 2 ? 's' : ''}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
