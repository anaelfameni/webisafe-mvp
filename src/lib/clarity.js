// ── Microsoft Clarity Custom Events ──────────────────────────────────────────
// Utilise `window.clarity` si disponible (injecté via le script dans index.html)

/**
 * Envoie un événement custom à Microsoft Clarity
 * @param {string} eventName - Nom de l'événement (ex: 'scan_initiated')
 * @param {string} [value] - Valeur optionnelle associée
 */
export function trackClarityEvent(eventName, value = null) {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('event', eventName, value ? { value } : undefined);
    } catch (e) {
      // Silencieux — ne pas bloquer l'expérience utilisateur
    }
  }
}

/**
 * Définit un custom tag utilisateur dans Clarity
 * @param {string} key - Clé du tag
 * @param {string} value - Valeur du tag
 */
export function setClarityTag(key, value) {
  if (typeof window !== 'undefined' && window.clarity) {
    try {
      window.clarity('set', key, value);
    } catch (e) {
      // Silencieux
    }
  }
}
