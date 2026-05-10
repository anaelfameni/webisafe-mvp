// H.8 — Logger centralisé. En production les erreurs sont remontées à Sentry,
// en développement on garde un console.error pour le debug local.
//
// Usage :
//   import { logError, logWarn } from '../utils/logger';
//   logError('Rescan failed', error, { scanId });
//
// Ne jamais loguer de secrets, tokens ou PII brute.

import { captureError, captureMessage } from '../lib/sentry';

const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

function asError(value) {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

export function logError(label, error, context = {}) {
  const err = asError(error);
  if (IS_DEV) {
    // En dev on conserve console.error pour la DX (stack lisible dans le navigateur).
    // eslint-disable-next-line no-console
    console.error(`[${label}]`, err, context);
    return;
  }
  captureError(err, { label, ...context });
}

export function logWarn(label, message, context = {}) {
  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[${label}]`, message, context);
    return;
  }
  captureMessage(`${label}: ${message}`, 'warning', context);
}

export function logInfo(label, message, context = {}) {
  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.info(`[${label}]`, message, context);
    return;
  }
  captureMessage(`${label}: ${message}`, 'info', context);
}
