// H.8 — Erreurs routées vers le logger centralisé (Sentry en prod, console.error en dev).
import { logError } from '../utils/logger';

const API_URL = '/api';

export async function performScan(url) {
  try {
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    logError('scanService.performScan', error, { url });
    throw error;
  }
}