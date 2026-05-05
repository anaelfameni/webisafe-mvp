/**
 * Correction API — soumission et suivi des demandes de correction
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function submitCorrectionRequest(payload) {
  const res = await fetch(`${API_BASE}/api/correction-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({ error: 'Réponse invalide' }));

  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }

  return data;
}

export async function fetchCorrectionRequests(token) {
  const res = await fetch(`${API_BASE}/api/correction-request`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({ error: 'Réponse invalide' }));

  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }

  return data.data || [];
}
