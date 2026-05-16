import { mergePaymentRequests } from './paymentRequestsCache';
import { supabase } from '../lib/supabaseClient';

const PAYMENT_REQUESTS_CACHE_KEY = 'webisafe_payment_requests_cache';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readCachedPaymentRequests() {
  if (!canUseLocalStorage()) return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(PAYMENT_REQUESTS_CACHE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedPaymentRequests(rows) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(PAYMENT_REQUESTS_CACHE_KEY, JSON.stringify(rows));
}

function upsertCachedPaymentRequest(row) {
  if (!row) return row;
  const current = readCachedPaymentRequests();
  const next = mergePaymentRequests([row], current.filter((item) => item.id !== row.id));
  writeCachedPaymentRequests(next);
  return row;
}

async function getApiErrorMessage(response, fallback) {
  const text = await response.text();
  if (!text) return fallback || `Erreur ${response.status}`;

  try {
    const err = JSON.parse(text);
    return err.error || err.message || fallback || `Erreur ${response.status}`;
  } catch {
    return text;
  }
}

export async function persistScanRecord(scan) {
  return scan || null;
}

export async function fetchRemoteScan(scanId) {
  const response = await fetch(`/api/scan-record?id=${encodeURIComponent(scanId)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.scan || null;
}

export async function createPaymentRequest(payload) {
  return reportPayment(payload);
}

export async function updatePaymentRequest(id, payload) {
  return reportPayment({ ...payload, id });
}

export async function fetchLatestPaymentRequest(scanId) {
  const localRows = readCachedPaymentRequests().filter((row) => row.scan_id === scanId);

  try {
    const response = await fetch(`/api/payment-status?scan_id=${encodeURIComponent(scanId)}`);
    if (!response.ok) throw new Error('Chargement statut paiement impossible');
    const data = await response.json();
    const rows = data.payment ? [data.payment] : [];
    const merged = mergePaymentRequests(rows || [], localRows);
    writeCachedPaymentRequests(mergePaymentRequests(rows || [], readCachedPaymentRequests()));
    return merged[0] || null;
  } catch {
    return mergePaymentRequests([], localRows)[0] || null;
  }
}

export async function fetchPaymentRequests(limit = 20) {
  const localRows = readCachedPaymentRequests();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/payment-admin?limit=${encodeURIComponent(limit)}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Chargement paiements impossible'));
    }

    const data = await response.json();
    const remoteRows = data.payments || [];
    const merged = mergePaymentRequests(remoteRows || [], localRows).slice(0, limit);
    writeCachedPaymentRequests(mergePaymentRequests(remoteRows || [], localRows));
    return merged;
  } catch {
    return mergePaymentRequests([], localRows).slice(0, limit);
  }
}

export async function fetchPaymentRequestsByEmail(email, limit = 50) {
  if (!email) return [];

  const localRows = readCachedPaymentRequests().filter((row) => row.user_email === email);
  return mergePaymentRequests([], localRows).slice(0, limit);
}

async function postApi(path, payload, options = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (options.auth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Erreur API'));
  }

  return response.json().catch(() => ({}));
}

export function notifyAdmin(payload) {
  return postApi('/api/notify-admin', payload);
}

export async function reportPayment(payload) {
  const response = await postApi('/api/report-payment', payload);
  const payment = response?.payment || response;
  upsertCachedPaymentRequest(payment);
  return payment;
}

export function sendConfirmPayment(payload) {
  return postApi('/api/payment-admin', { ...payload, action: 'confirm' }, { auth: true });
}

export function sendRejectPayment(payload) {
  return postApi('/api/payment-admin', { ...payload, action: 'reject' }, { auth: true });
}

export function unlockScanAsAdmin(payload) {
  return postApi('/api/unlock-scan', payload, { auth: true });
}

export function markScanPaid(scanId) {
  return unlockScanAsAdmin({ scan_id: scanId });
}

export async function fetchScans(limit = 50) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`/api/admin-scans?limit=${encodeURIComponent(limit)}`, {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Chargement scans impossible'));
  }

  const data = await response.json();
  return data.scans || [];
}