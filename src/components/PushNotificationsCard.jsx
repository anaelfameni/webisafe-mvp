import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  pushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from '../utils/webPush';

/**
 * R.6 — Carte UI pour gérer les push notifications dans le Dashboard.
 *
 * S'affiche dans la section "Paramètres" du Dashboard et propose à l'utilisateur
 * d'activer / désactiver les notifications. Détecte les cas non supportés
 * (navigateur incompatible, permission refusée, VAPID non configurée).
 */

export default function PushNotificationsCard({ scope = 'general' }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(pushSupported());
    setPermission(getPushPermission());

    if (pushSupported()) {
      getCurrentSubscription()
        .then((sub) => setSubscribed(Boolean(sub)))
        .catch(() => setSubscribed(false));
    }
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await subscribeToPush(scope);
      setSubscribed(true);
      setPermission(getPushPermission());
      setSuccess('Notifications activées. Vous serez averti(e) des alertes critiques.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const handleUnsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      setSuccess('Notifications désactivées.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <BellOff size={18} className="text-white/40" />
          <h3 className="font-bold text-white">Notifications push</h3>
        </div>
        <p className="text-sm leading-6 text-white/50">
          Votre navigateur ne supporte pas les notifications push. Utilisez un
          navigateur récent (Chrome, Edge, Firefox, Safari 16+) pour les activer.
        </p>
      </div>
    );
  }

  const isDenied = permission === 'denied';
  const Icon = subscribed ? Bell : BellOff;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              subscribed ? 'bg-success/15 text-success' : 'bg-white/5 text-white/40'
            }`}
          >
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white">Notifications push</h3>
            <p className="text-xs text-white/50">
              Recevez les alertes critiques (Protect, support) directement sur votre appareil.
            </p>
          </div>
        </div>
        {subscribed && (
          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            <CheckCircle2 size={10} /> Actif
          </span>
        )}
      </div>

      {isDenied && (
        <div className="mb-3 flex gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <p className="leading-5">
            Vous avez refusé l'accès aux notifications. Pour les réactiver, ouvrez les paramètres
            de votre navigateur pour ce site et autorisez les notifications.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 flex gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="mb-3 flex gap-2 rounded-xl border border-success/20 bg-success/5 p-3 text-xs text-success">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="flex gap-2">
        {!subscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={loading || isDenied}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {loading ? 'Activation...' : 'Activer les notifications'}
          </button>
        ) : (
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />}
            {loading ? 'Désactivation...' : 'Désactiver les notifications'}
          </button>
        )}
        <span className="flex items-center gap-1 text-[10px] text-white/30">
          <ShieldCheck size={10} /> Vos données sont chiffrées (TLS).
        </span>
      </div>
    </div>
  );
}
