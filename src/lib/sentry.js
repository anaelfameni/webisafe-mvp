/**
 * Configuration Sentry pour le tracking d'erreurs
 * Capture automatiquement les erreurs JavaScript et les exceptions
 */

import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry avec la configuration appropriée
 * @param {Object} options - Options de configuration
 */
export function initSentry(options = {}) {
  const dsn = import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️  Sentry DSN non configuré - Tracking d\'erreurs désactivé');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || import.meta.env.NODE_ENV || 'development',
    
    // Échantillonnage des erreurs (100% en prod, 10% en dev)
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
    
    // Échantillonnage des sessions (100% en prod)
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
    
    // Échantillonnage des replays en cas d'erreur
    replaysOnErrorSampleRate: 1.0,
    
    // Filtre pour ignorer certaines erreurs
    beforeSend(event, hint) {
      // Ignorer les erreurs de développement
      if (event.environment === 'development') {
        console.error('[Sentry Dev]', hint.originalException);
        return null;
      }
      
      // Ignorer les erreurs spécifiques (ex: erreurs de navigateur)
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      
      return event;
    },
    
    // Intégrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Tags personnalisés
    initialScope: {
      tags: {
        app: 'webisafe',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    },
    
    ...options,
  });

  console.log('✅ Sentry initialisé - Tracking d\'erreurs actif');
}

/**
 * Capture une erreur manuellement
 * @param {Error} error - L'erreur à capturer
 * @param {Object} context - Contexte additionnel
 */
export function captureError(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture un message manuellement
 * @param {string} message - Le message à capturer
 * @param {string} level - Niveau de sévérité (info, warning, error)
 * @param {Object} context - Contexte additionnel
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Définit l'utilisateur courant pour Sentry
 * @param {Object} user - Informations utilisateur
 */
export function setUser(user) {
  Sentry.setUser(user);
}

/**
 * Efface l'utilisateur courant
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Ajoute un breadcrumb (trace d'événement)
 * @param {Object} breadcrumb - Breadcrumb à ajouter
 */
export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}
