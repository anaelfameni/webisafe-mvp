const HTTP_PROTOCOL_RE = /^https?:\/\//i;

function hostFromInput(input) {
  const hostPart = input.split(/[/?#]/, 1)[0];
  if (hostPart.startsWith('[')) {
    return hostPart.slice(1, hostPart.indexOf(']')).toLowerCase();
  }
  return hostPart.split(':', 1)[0].toLowerCase();
}

function isLocalHostname(hostname) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
}

function withDefaultProtocol(url) {
  const trimmed = String(url || '').trim();
  if (HTTP_PROTOCOL_RE.test(trimmed)) {
    return trimmed;
  }
  const protocol = isLocalHostname(hostFromInput(trimmed)) ? 'http://' : 'https://';
  return protocol + trimmed;
}

/**
 * Valide une URL simplement
 */
export function isValidURL(url) {
  try {
    const parsed = new URL(withDefaultProtocol(url));
    return ['http:', 'https:'].includes(parsed.protocol)
      && (parsed.hostname.includes('.') || isLocalHostname(parsed.hostname));
  } catch {
    return false;
  }
}

/**
 * Valide un email
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Normalise une URL (ajoute https:// si absent)
 */
export function normalizeURL(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    return '';
  }
  try {
    return new URL(withDefaultProtocol(trimmed)).href;
  } catch {
    return trimmed;
  }
}

/**
 * Valide et normalise une URL (version détaillée)
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL manquante ou invalide' };
  }

  const normalized = withDefaultProtocol(url);

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Protocole invalide, utilisez http ou https' };
    }
    if (!parsed.hostname.includes('.') && !isLocalHostname(parsed.hostname)) {
      return { valid: false, error: 'Nom de domaine invalide' };
    }
    return { valid: true, url: parsed.href };
  } catch {
    return { valid: false, error: "Format d'URL invalide" };
  }
}

/**
 * Vérifie si un site est accessible
 */
export async function checkUrlAccessible(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });

    clearTimeout(timeout);

    if (response.status >= 500) {
      return { accessible: false, error: 'Le site retourne une erreur serveur' };
    }

    return { accessible: true };
  } catch (err) {
    return {
      accessible: false,
      error: err.name === 'AbortError'
        ? 'Le site met trop de temps à répondre (timeout)'
        : "Ce site est inaccessible ou l'URL est incorrecte",
    };
  }
}
