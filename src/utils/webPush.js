import { supabase } from '../lib/supabaseClient';

/**
 * R.6 — Helpers Web Push (côté client).
 *
 * Fournit :
 * - `pushSupported()` : true si le navigateur supporte les push notifications
 * - `getPushPermission()` : "default" | "granted" | "denied"
 * - `subscribeToPush(scope)` : enregistre le SW + crée la subscription côté navigateur
 *   et l'envoie à `/api/push`
 * - `unsubscribeFromPush()` : désinscrit localement et côté serveur
 * - `getCurrentSubscription()` : retourne la subscription active (ou null)
 *
 * VAPID public key : provient de `import.meta.env.VITE_VAPID_PUBLIC_KEY`. Si absente,
 * `subscribeToPush` retourne une erreur explicite (la subscription ne peut pas
 * être créée sans clé VAPID publique).
 */

/**
 * Le SW principal est généré par Workbox (`/sw.js`) et inclut, via
 * `workbox.importScripts: ['/webpush-handler.js']`, les listeners `push` et
 * `notificationclick`. On s'attache à ce SW (déjà enregistré par
 * `vite-plugin-pwa`) plutôt que d'en enregistrer un second qui le remplacerait.
 */
const SW_PATH = '/sw.js';

export function pushSupported() {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission || 'default';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function ensureRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker non supporté');
  // Le SW Workbox est déjà enregistré par vite-plugin-pwa (registerType: 'autoUpdate').
  // On utilise `ready` pour attendre qu'il soit actif avant de créer la subscription.
  const ready = await navigator.serviceWorker.ready;
  if (ready) return ready;
  // Fallback : enregistrement manuel (au cas où la PWA est désactivée).
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPush(scope = 'general') {
  if (!pushSupported()) {
    throw new Error('Votre navigateur ne supporte pas les notifications push.');
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('Notifications push non configurées (VAPID public key manquante).');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission de notification refusée.');
  }

  const reg = await ensureRegistration();
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // Convertit la subscription au format attendu par /api/push
  const json = subscription.toJSON();
  const payload = {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth_secret: json.keys?.auth,
    user_agent: navigator.userAgent.slice(0, 500),
    scope,
  };

  const headers = await getAuthHeaders();
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Erreur enregistrement subscription');
  }
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  // Supprime côté serveur
  try {
    const headers = await getAuthHeaders();
    await fetch('/api/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    /* on continue même si serveur down : on désinscrit côté client */
  }

  await sub.unsubscribe();
  return true;
}
