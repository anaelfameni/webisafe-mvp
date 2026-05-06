const HTTP_PROTOCOL_RE = /^https?:\/\//i;
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

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

export function buildAccessibilityProbeUrls(url) {
  const urls = [];
  try {
    const parsed = new URL(url);
    urls.push(parsed.href);
    if (!parsed.hostname.startsWith('www.') && parsed.hostname.includes('.')) {
      const wwwUrl = new URL(parsed.href);
      wwwUrl.hostname = `www.${parsed.hostname}`;
      urls.push(wwwUrl.href);
    }
  } catch {
    urls.push(url);
  }
  return Array.from(new Set(urls));
}

/**
 * Vérifie si un site est accessible
 */
export async function checkUrlAccessible(url) {
  let lastStatus = null;
  for (const probeUrl of buildAccessibilityProbeUrls(url)) {
    for (const method of ['HEAD', 'GET']) {
      try {
        const response = await fetch(probeUrl, {
          method,
          signal: AbortSignal.timeout(8000),
          redirect: 'follow',
          headers: BROWSER_HEADERS,
        });

        lastStatus = response.status;
        if (response.status < 500) {
          return { accessible: true, url: probeUrl, final_url: response.url || probeUrl };
        }
      } catch {
      }
    }
  }

  if (lastStatus >= 500) {
    return { accessible: false, error: 'Le site retourne une erreur serveur' };
  }

  return { accessible: false, error: "Impossible de joindre le site. Vérifiez l'URL." };
}
