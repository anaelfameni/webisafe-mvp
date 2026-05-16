/**
 * Configuration i18n pour l'internationalisation
 * - Q.1 : version anglaise via i18next
 * - Q.2 : détection auto langue (navigator.language) avec persistance localStorage
 * - Q.3 : helpers pour le sélecteur de langue (getLanguage / setLanguage)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = ['fr', 'en'];
const STORAGE_KEY = 'webisafe_lang';

// Traductions françaises (langue par défaut)
const fr = {
  translation: {
    nav: {
      home: 'Accueil',
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      protect: 'Protect',
      partners: 'Partenaires',
      affiliate: 'Affiliation',
      contact: 'Contact',
      login: 'Se connecter',
      signup: "S'inscrire",
      dashboard: 'Tableau de bord',
      adminPanel: 'Panel Admin',
      agencyConsole: 'Console Agence',
      logout: 'Se déconnecter',
      resources: 'Ressources',
      whiteLabel: 'White Label',
      status: 'Statut',
    },

    common: {
      submit: 'Envoyer',
      cancel: 'Annuler',
      back: 'Retour',
      next: 'Suivant',
      loading: 'Chargement...',
      copy: 'Copier',
      copied: 'Copié',
      download: 'Télécharger',
      share: 'Partager',
      retry: 'Réessayer',
    },

    home: {
      hero: {
        title: 'Analysez votre site web gratuitement',
        subtitle: 'Performance, Sécurité, SEO, UX Mobile — audit complet en 60 à 90 secondes',
        cta: 'Scanner mon site',
        inputPlaceholder: 'https://votre-site.ci',
      },
      stats: {
        scans: 'Sites scannés',
        issues: 'Problèmes détectés',
        countries: 'Pays couverts',
      },
    },

    analyse: {
      scanning: 'Analyse en cours...',
      completed: 'Analyse terminée',
      score: 'Score global',
      performance: 'Performance',
      security: 'Sécurité',
      seo: 'SEO',
      ux: 'UX Mobile',
    },

    dashboard: {
      overview: "Vue d'ensemble",
      myScans: 'Mes scans',
      reports: 'Rapports',
      subscription: 'Abonnement',
      newScan: 'Nouveau scan',
      exportCsv: 'Exporter CSV',
      exportJson: 'Exporter JSON',
    },

    payment: {
      title: 'Obtenir le rapport complet',
      instructions: 'Instructions de paiement Wave',
      promoCode: 'Code promo',
      apply: 'Appliquer',
      confirm: 'Confirmer le paiement',
    },

    error: {
      generic: 'Une erreur est survenue',
      retry: 'Réessayer',
      backHome: "Retour à l'accueil",
    },

    form: {
      required: 'Ce champ est requis',
      emailInvalid: 'Adresse email invalide',
      urlInvalid: 'URL invalide',
      submit: 'Envoyer',
      cancel: 'Annuler',
    },
  },
};

const en = {
  translation: {
    nav: {
      home: 'Home',
      features: 'Features',
      pricing: 'Pricing',
      protect: 'Protect',
      partners: 'Partners',
      affiliate: 'Affiliate',
      contact: 'Contact',
      login: 'Log in',
      signup: 'Sign up',
      dashboard: 'Dashboard',
      adminPanel: 'Admin Panel',
      agencyConsole: 'Agency Console',
      logout: 'Log out',
      resources: 'Resources',
      whiteLabel: 'White Label',
      status: 'Status',
    },

    common: {
      submit: 'Submit',
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      loading: 'Loading...',
      copy: 'Copy',
      copied: 'Copied',
      download: 'Download',
      share: 'Share',
      retry: 'Retry',
    },

    home: {
      hero: {
        title: 'Audit your website for free',
        subtitle: 'Performance, Security, SEO, Mobile UX — full audit in 60 to 90 seconds',
        cta: 'Scan my site',
        inputPlaceholder: 'https://your-site.com',
      },
      stats: {
        scans: 'Sites scanned',
        issues: 'Issues detected',
        countries: 'Countries covered',
      },
    },

    analyse: {
      scanning: 'Analysis in progress...',
      completed: 'Analysis complete',
      score: 'Overall score',
      performance: 'Performance',
      security: 'Security',
      seo: 'SEO',
      ux: 'Mobile UX',
    },

    dashboard: {
      overview: 'Overview',
      myScans: 'My scans',
      reports: 'Reports',
      subscription: 'Subscription',
      newScan: 'New scan',
      exportCsv: 'Export CSV',
      exportJson: 'Export JSON',
    },

    payment: {
      title: 'Get the full report',
      instructions: 'Wave payment instructions',
      promoCode: 'Promo code',
      apply: 'Apply',
      confirm: 'Confirm payment',
    },

    error: {
      generic: 'An error occurred',
      retry: 'Retry',
      backHome: 'Back to home',
    },

    form: {
      required: 'This field is required',
      emailInvalid: 'Invalid email address',
      urlInvalid: 'Invalid URL',
      submit: 'Submit',
      cancel: 'Cancel',
    },
  },
};

function detectInitialLanguage() {
  if (typeof window === 'undefined') return 'fr';
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }
    const navLang = (window.navigator?.language || 'fr').toLowerCase();
    if (navLang.startsWith('en')) return 'en';
  } catch {
    /* localStorage indisponible : on retombe sur fr */
  }
  return 'fr';
}

export function getLanguage() {
  return i18n.language || 'fr';
}

export function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    if (window.document?.documentElement) {
      window.document.documentElement.lang = lang;
    }
  }
}

const initialLang = detectInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: { fr, en },
    lng: initialLang,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

// Synchronise <html lang="…"> avec la langue détectée au démarrage.
if (typeof window !== 'undefined' && window.document?.documentElement) {
  window.document.documentElement.lang = initialLang;
}

export default i18n;
