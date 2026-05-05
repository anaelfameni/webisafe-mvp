/**
 * Composant SEO Head avec meta tags sociaux et JSON-LD
 * Utilisez ce composant pour optimiser le SEO de chaque page
 */

import React from 'react';

const defaultMeta = {
  title: 'Webisafe - Audit de sites web pour les PME africaines',
  description: 'Analysez gratuitement votre site web : performance, sécurité, SEO et UX. Rapport détaillé avec recommandations actionnables pour améliorer votre présence en ligne.',
  url: 'https://webisafe.vercel.app',
  image: 'https://webisafe.vercel.app/og-image.png',
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
  url: 'https://webisafe.vercel.app',
  logo: 'https://webisafe.vercel.app/logo.png',
  description: 'Audit de sites web pour les PME africaines',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+225-01-70-90-77-80',
    contactType: 'customer service',
    email: 'support@webisafe.ci',
    areaServed: ['CI', 'SN', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE', 'CM', 'GH', 'NG'],
    availableLanguage: ['French'],
  },
  sameAs: [
    'https://twitter.com/webisafe_ci',
    'https://linkedin.com/company/webisafe',
  ],
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Webisafe',
  url: 'https://webisafe.vercel.app',
  description: 'Audit de sites web pour les PME africaines',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://webisafe.vercel.app/analyse?url={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Webisafe',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '35000',
    priceCurrency: 'XOF',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '150',
  },
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
  author = { name: 'Webisafe Team' },
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
      url: 'https://webisafe.vercel.app/logo.png',
    },
  },
});
