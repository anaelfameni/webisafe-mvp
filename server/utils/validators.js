/**
 * Valide une URL simplement
 */
export function isValidURL(url) {
  try {
    const normalized = url.startsWith('http') ? url : 'https://' + url;
    new URL(normalized);
    return true;
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
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

/**
 * Valide et normalise une URL (version détaillée)
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL manquante ou invalide' };
  }

  let normalized = url.trim();

  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Protocole invalide, utilisez http ou https' };
    }
    if (!parsed.hostname.includes('.')) {
      return { valid: false, error: 'Nom de domaine invalide' };
    }
    return { valid: true, url: normalized };
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