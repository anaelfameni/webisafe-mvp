import { insertRow, selectRows, updateRows, upsertRow } from './supabaseRest';
import { WAVE_PAYMENT_AMOUNT } from './wavePayment';
import { mergePaymentRequests } from './paymentRequestsCache';

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

export async function persistScanRecord(scan) {
  try {
    return await upsertRow(
      'scans',
      {
        id: scan.id,
        url: scan.url,
        email: scan.email || null,
        scan_date: scan.scanDate || new Date().toISOString(),
        data: scan,
        paid: Boolean(scan.paid),
      },
      'id'
    );
  } catch {
    return null;
  }
}

export async function fetchRemoteScan(scanId) {
  const rows = await selectRows('scans', `select=*&id=eq.${encodeURIComponent(scanId)}&limit=1`);
  const row = rows?.[0];

  if (!row) {
    return null;
  }

  return {
    ...(row.data || {}),
    id: row.id,
    url: row.url || row.data?.url,
    email: row.email || row.data?.email,
    scanDate: row.scan_date || row.data?.scanDate,
    paid: Boolean(row.paid),
  };
}

export async function markScanPaid(scanId) {
  try {
    return await updateRows('scans', `id=eq.${encodeURIComponent(scanId)}`, {
      paid: true,
    });
  } catch {
    return null;
  }
}

export async function createPaymentRequest(payload) {
  const fallbackRow = upsertCachedPaymentRequest({
    id: payload.id || `local_${Date.now()}`,
    amount: WAVE_PAYMENT_AMOUNT,
    ...payload,
    created_at: payload.created_at || new Date().toISOString(),
  });

  try {
    const remoteRow = await insertRow('payment_requests', {
      amount: WAVE_PAYMENT_AMOUNT,
      ...payload,
    });
    return upsertCachedPaymentRequest(remoteRow);
  } catch {
    return fallbackRow;
  }
}

export async function updatePaymentRequest(id, payload) {
  const currentLocal = readCachedPaymentRequests().find((item) => item.id === id);
  const fallbackRow = upsertCachedPaymentRequest({
    ...(currentLocal || { id, created_at: new Date().toISOString() }),
    ...payload,
    id,
  });

  try {
    const remoteRow = await updateRows('payment_requests', `id=eq.${encodeURIComponent(id)}`, payload);
    return upsertCachedPaymentRequest(remoteRow || fallbackRow);
  } catch {
    return fallbackRow;
  }
}

export async function fetchLatestPaymentRequest(scanId) {
  const localRows = readCachedPaymentRequests().filter((row) => row.scan_id === scanId);

  try {
    const rows = await selectRows(
      'payment_requests',
      `select=*&scan_id=eq.${encodeURIComponent(scanId)}&order=created_at.desc&limit=1`
    );
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
    const remoteRows = await selectRows(
      'payment_requests',
      `select=*&order=created_at.desc&limit=${limit}`
    );
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

  try {
    const remoteRows = await selectRows(
      'payment_requests',
      `select=*&user_email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=${limit}`
    );
    const merged = mergePaymentRequests(remoteRows || [], localRows).slice(0, limit);
    writeCachedPaymentRequests(mergePaymentRequests(remoteRows || [], readCachedPaymentRequests()));
    return merged;
  } catch {
    return mergePaymentRequests([], localRows).slice(0, limit);
  }
}

async function postApi(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Erreur API');
  }

  return response.json().catch(() => ({}));
}

export function notifyAdmin(payload) {
  return postApi('/api/notify-admin', payload);
}

export function sendConfirmPayment(payload) {
  return postApi('/api/confirm-payment', payload);
}

export function sendRejectPayment(payload) {
  return postApi('/api/reject-payment', payload);
}