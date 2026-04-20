// Validation URL
export function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // Try adding https:// prefix
    try {
      const url = new URL('https://' + string);
      return url.hostname.includes('.');
    } catch {
      return false;
    }
  }
}

// Normaliser l'URL (ajouter https:// si manquant)
export function normalizeURL(url) {
  if (!url) return '';
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

// Extraire le domaine d'une URL
export function extractDomain(url) {
  try {
    const normalized = normalizeURL(url);
    return new URL(normalized).hostname;
  } catch {
    return url;
  }
}

// Validation email
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Générer un UUID simple
export function generateUUID() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// Formater la date en français
export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
