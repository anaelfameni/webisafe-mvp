/**
 * Composant SEO Head avec meta tags sociaux et JSON-LD
 * Utilisez ce composant pour optimiser le SEO de chaque page
 */

import React from 'react';
import { BRAND_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config/brand';

const defaultMeta = {
  title: 'Webisafe — Audit de sites web gratuit pour PME africaines',
  description: 'Analysez gratuitement votre site web : performance, sécurité, SEO et UX. Rapport détaillé avec recommandations actionnables en 60 secondes.',
  url: BRAND_URL,
  image: `${BRAND_URL}/og-image.png`,
  type: 'website',
};

export const SEOHead = ({ 
  title = defaultMeta.title,
  description = defaultMeta.description,
  url = defaultMeta.url,
  image = defaultMeta.image,
  type = defaultMeta.type,
  noindex = false,
  jsonLd = null,
}) => {
  // Meta tags de base
  document.title = title;
  
  React.useEffect(() => {
    // Meta tags standards
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', 'audit site web, performance, sécurité, SEO, UX, Afrique, PME');
    
    // Open Graph / Facebook
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', url);
    setMetaTag('property', 'og:image', image);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', 'Webisafe');
    setMetaTag('property', 'og:locale', 'fr_FR');
    
    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', image);
    setMetaTag('name', 'twitter:site', '@webisafe_ci');
    
    // Canonical URL
    setLinkTag('canonical', url);
    
    // Robots
    if (noindex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    }
    
    // JSON-LD
    if (jsonLd) {
      setJsonLd(jsonLd);
    }
  }, [title, description, url, image, type, noindex, jsonLd]);

  return null;
};

function setMetaTag(attribute, name, content) {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLinkTag(rel, href) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setJsonLd(data) {
  let element = document.getElementById('json-ld');
  if (!element) {
    element = document.createElement('script');
    element.id = 'json-ld';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

// Schémas JSON-LD prédéfinis
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Webisafe',
  url: BRAND_URL,
  logo: `${BRAND_URL}/logo.svg`,
  description: 'Plateforme d\'audit automatisé de sites web pour PME africaines : sécurité, performance, SEO et UX mobile.',
  foundingLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Abidjan',
      addressCountry: 'CI',
    },
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: SUPPORT_PHONE.replace(/\s/g, ''),
    contactType: 'customer service',
    email: SUPPORT_EMAIL,
    areaServed: ['CI', 'SN', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE', 'CM'],
    availableLanguage: ['French'],
  },
  sameAs: [],
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Webisafe',
  url: BRAND_URL,
  description: 'Audit de sites web pour PME africaines',
  inLanguage: 'fr',
  publisher: { '@type': 'Organization', name: 'Webisafe' },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BRAND_URL}/analyse?url={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Webisafe',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: BRAND_URL,
  description: 'Plateforme d\'audit automatisé de sites web pour PME africaines.',
  offers: [
    { '@type': 'Offer', name: 'Audit gratuit', price: '0', priceCurrency: 'XOF' },
    { '@type': 'Offer', name: 'Rapport Premium', price: '35000', priceCurrency: 'XOF' },
    {
      '@type': 'Offer',
      name: 'Webisafe Protect',
      price: '15000',
      priceCurrency: 'XOF',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '15000',
        priceCurrency: 'XOF',
        billingDuration: 'P1M',
      },
    },
  ],
};

export const breadcrumbJsonLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const articleJsonLd = ({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author = { name: 'Webisafe' },
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  image,
  url,
  datePublished,
  dateModified,
  author: {
    '@type': 'Person',
    ...author,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Webisafe',
    logo: {
      '@type': 'ImageObject',
      url: `${BRAND_URL}/logo.svg`,
    },
  },
});

// FAQ JSON-LD pour la home
export const faqJsonLd = (questions) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map((q) => ({
    '@type': 'Question',
    name: q.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: q.answer,
    },
  })),
});

// Pages metadata pre-defined for use in <SEOHead>
export const pageMeta = {
  home: {
    title: 'Webisafe — Audit web gratuit pour PME africaines | Résultats en 60s',
    description: 'Analysez gratuitement votre site : sécurité, performance, SEO, mobile. Rapport actionnable en 60 secondes pour PME africaines.',
    url: BRAND_URL,
  },
  protect: {
    title: 'Webisafe Protect — Surveillance web 24/7 pour 15 000 FCFA/mois',
    description: 'Surveillance uptime, scans hebdomadaires, alertes critiques en temps réel. Protection complète de votre site web pour seulement 15 000 FCFA/mois.',
    url: `${BRAND_URL}/protect`,
  },
  tarifs: {
    title: 'Tarifs Webisafe — Audit web pour PME africaines',
    description: 'Audit gratuit, rapport Premium 35 000 FCFA, abonnement Protect 15 000 FCFA/mois. Pas d\'abonnement caché, paiement Wave Money.',
    url: `${BRAND_URL}/tarifs`,
  },
  apropos: {
    title: 'À propos de Webisafe — Audit web pour l\'Afrique',
    description: 'Webisafe est une plateforme ivoirienne d\'audit automatisé de sites web. Découvrez notre mission, méthodologie et équipe.',
    url: `${BRAND_URL}/apropos`,
  },
  contact: {
    title: 'Contact Webisafe — Support audit web Afrique',
    description: 'Contactez l\'équipe Webisafe : support, partenariats, marque blanche. Réponse sous 24h.',
    url: `${BRAND_URL}/contact`,
  },
  cgu: {
    title: 'CGU — Conditions générales d\'utilisation Webisafe',
    description: 'Conditions générales d\'utilisation de la plateforme Webisafe : objet, tarification, droit de rétractation, garantie SLA, médiation.',
    url: `${BRAND_URL}/cgu`,
    noindex: false,
  },
  confidentialite: {
    title: 'Politique de confidentialité — Webisafe',
    description: 'Comment Webisafe collecte, utilise et protège vos données personnelles. Sous-traitants, transferts, droits, cookies.',
    url: `${BRAND_URL}/confidentialite`,
    noindex: false,
  },
  partenaire: {
    title: 'Programme partenaire Webisafe — Gagnez 30% de commissions',
    description: 'Devenez partenaire Webisafe : 30% de commissions sur chaque audit vendu, 20% sur chaque abonnement Protect. Inscription gratuite.',
    url: `${BRAND_URL}/partenaire`,
  },
  // M.4 / N.1 — SEO pour les ressources et les articles vérifiés
  ressources: {
    title: 'Ressources Webisafe — Articles vérifiés sur la performance web en Afrique',
    description: "Articles concrets sur la performance, la sécurité et le SEO des sites web en Afrique de l'Ouest. Sources publiques (Google, OWASP, ANSSI, Schema.org).",
    url: `${BRAND_URL}/ressources`,
  },
  // T.1 — Page publique White Label
  whiteLabel: {
    title: 'Webisafe White Label — Revendez l\'audit web sous votre marque',
    description: 'Offre White Label pour agences digitales : PDF rebrandé, sous-domaine dédié, console multi-clients et facturation agence. Devis sur mesure.',
    url: `${BRAND_URL}/white-label`,
  },
  // S.3 — Page publique de statut Protect
  protectStatus: {
    title: 'Statut plateforme — Webisafe',
    description: 'État en temps réel des services Webisafe : application, API de scan, génération PDF et monitoring Protect.',
    url: `${BRAND_URL}/protect/status`,
    noindex: false,
  },
};

// N.1 — Helper pour construire les meta d'un article individuel
export function getArticleMeta(article) {
  if (!article) return null;
  return {
    title: `${article.title} — Webisafe Ressources`,
    description: article.excerpt,
    url: `${BRAND_URL}/ressources/${article.slug}`,
    type: 'article',
  };
}
