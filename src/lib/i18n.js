/**
 * Configuration i18n pour l'internationalisation
 * Utilise react-i18next pour gérer les traductions
 * Préparé pour expansion future (anglais, portugais, etc.)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Traductions françaises (langue par défaut)
const fr = {
  translation: {
    // Navigation
    nav: {
      home: 'Accueil',
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      affiliate: 'Affiliation',
      contact: 'Contact',
      login: 'Se connecter',
      signup: "S'inscrire",
      dashboard: 'Tableau de bord',
      logout: 'Se déconnecter',
    },
    
    // Home page
    home: {
      hero: {
        title: 'Analysez votre site web gratuitement',
        subtitle: 'Performance, Sécurité, SEO, UX Mobile - Obtenez un audit complet en 2 minutes',
        cta: 'Scanner mon site',
        inputPlaceholder: 'https://votre-site.ci',
      },
      stats: {
        scans: 'Sites scannés',
        issues: 'Problèmes détectés',
        countries: 'Pays couverts',
      },
    },
    
    // Analyse page
    analyse: {
      scanning: 'Analyse en cours...',
      completed: 'Analyse terminée',
      score: 'Score global',
      performance: 'Performance',
      security: 'Sécurité',
      seo: 'SEO',
      ux: 'UX Mobile',
    },
    
    // Dashboard
    dashboard: {
      overview: 'Vue d\'ensemble',
      myScans: 'Mes scans',
      reports: 'Rapports',
      subscription: 'Abonnement',
      newScan: 'Nouveau scan',
    },
    
    // Payment
    payment: {
      title: 'Obtenir le rapport complet',
      amount: '35 000 FCFA',
      instructions: 'Instructions de paiement Wave',
      step1: 'Envoyez 35 000 FCFA au',
      step2: 'Entrez votre numéro Wave',
      step3: 'Entrez le code de paiement',
      confirm: 'Confirmer le paiement',
    },
    
    // Errors
    error: {
      generic: 'Une erreur est survenue',
      retry: 'Réessayer',
      backHome: 'Retour à l\'accueil',
    },
    
    // Forms
    form: {
      required: 'Ce champ est requis',
      emailInvalid: 'Adresse email invalide',
      urlInvalid: 'URL invalide',
      submit: 'Envoyer',
      cancel: 'Annuler',
    },
  },
};

// Traductions anglaises (pour future expansion)
const en = {
  translation: {
    nav: {
      home: 'Home',
      features: 'Features',
      pricing: 'Pricing',
      affiliate: 'Affiliate',
      contact: 'Contact',
      login: 'Login',
      signup: 'Sign Up',
      dashboard: 'Dashboard',
      logout: 'Logout',
    },
    home: {
      hero: {
        title: 'Analyze your website for free',
        subtitle: 'Performance, Security, SEO, UX Mobile - Get a complete audit in 2 minutes',
        cta: 'Scan my site',
        inputPlaceholder: 'https://your-site.ci',
      },
      stats: {
        scans: 'Sites scanned',
        issues: 'Issues detected',
        countries: 'Countries covered',
      },
    },
    // ... autres traductions
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr,
      en,
    },
    lng: 'fr', // Langue par défaut
    fallbackLng: 'fr',
    
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    
    react: {
      useSuspense: false, // Désactiver suspense pour éviter les problèmes de chargement
    },
  });

export default i18n;
