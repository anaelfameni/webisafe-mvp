/**
 * Utilitaires de sanitization des entrées avec DOMPurify
 * Prévient les attaques XSS en nettoyant le HTML
 */

import DOMPurify from 'dompurify';

/**
 * Configuration par défaut de DOMPurify
 */
const defaultConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'class', 'id'],
  FORCE_BODY: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
  KEEP_CONTENT: true,
};

/**
 * Sanitize une chaîne HTML
 * @param {string} dirty - Le HTML potentiellement dangereux
 * @param {Object} config - Configuration personnalisée DOMPurify
 * @returns {string} Le HTML sécurisé
 */
export function sanitizeHTML(dirty, config = {}) {
  if (typeof dirty !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(dirty, { ...defaultConfig, ...config });
}

/**
 * Sanitize un texte (supprime tout le HTML)
 * @param {string} dirty - Le texte potentiellement dangereux
 * @returns {string} Le texte sécurisé sans HTML
 */
export function sanitizeText(dirty) {
  if (typeof dirty !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize un objet (sanitize toutes les propriétés string)
 * @param {Object} obj - L'objet à sanitize
 * @param {string[]} excludeKeys - Clés à exclure de la sanitization
 * @returns {Object} L'objet sanitized
 */
export function sanitizeObject(obj, excludeKeys = []) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (excludeKeys.includes(key)) {
      sanitized[key] = obj[key];
    } else if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeText(obj[key]);
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeObject(obj[key], excludeKeys);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

/**
 * Valide et sanitize une URL
 * @param {string} url - L'URL à valider
 * @returns {string|null} L'URL validée ou null si invalide
 */
export function sanitizeURL(url) {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);
    // N'autoriser que http et https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    // Retourner l'URL normalisée
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize un email (vérifie le format et le nettoie)
 * @param {string} email - L'email à sanitize
 * @returns {string|null} L'email validé ou null si invalide
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(cleaned) ? cleaned : null;
}

/**
 * Sanitize un numéro de téléphone
 * @param {string} phone - Le numéro à sanitize
 * @returns {string|null} Le numéro validé ou null si invalide
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }

  // Conserver uniquement les chiffres et le +
  const cleaned = phone.replace(/[^\d+]/g, '');
  const phoneRegex = /^\+?[\d\s-]{8,20}$/;

  return phoneRegex.test(cleaned) ? cleaned : null;
}
