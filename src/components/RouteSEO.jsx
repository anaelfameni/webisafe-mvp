/**
 * RouteSEO — applique les meta tags SEO selon la route active
 * À insérer une fois dans App.jsx, après <Router>.
 *
 * Mappe automatiquement chaque pathname à un objet pageMeta
 * et appelle <SEOHead> avec les bons title/description/canonical/OG.
 */

import { useLocation } from 'react-router-dom';
import { SEOHead, pageMeta, organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd } from './SEOHead';
import { BRAND_URL } from '../config/brand';

// Mapping route → clé pageMeta
function getMetaForPath(pathname) {
  if (pathname === '/') return { ...pageMeta.home, jsonLd: { '@context': 'https://schema.org', '@graph': [organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd] } };
  if (pathname === '/protect') return pageMeta.protect;
  if (pathname === '/tarifs') return pageMeta.tarifs;
  if (pathname === '/a-propos') return pageMeta.apropos;
  if (pathname === '/contact') return pageMeta.contact;
  if (pathname === '/cgu') return pageMeta.cgu;
  if (pathname === '/confidentialite') return pageMeta.confidentialite;
  if (pathname === '/partenaire') return pageMeta.partenaire;

  // Pages privées : noindex
  if (pathname.startsWith('/admin')) return { title: 'Administration — Webisafe', noindex: true };
  if (pathname.startsWith('/agence')) return { title: 'Console agence — Webisafe', noindex: true };
  if (pathname.startsWith('/dashboard')) return { title: 'Tableau de bord — Webisafe', noindex: true };
  if (pathname.startsWith('/payment')) return { title: 'Paiement — Webisafe', noindex: true };
  if (pathname.startsWith('/reinitialiser')) return { title: 'Réinitialisation du mot de passe — Webisafe', noindex: true };
  if (pathname.startsWith('/rapport')) return { title: 'Rapport d\'audit — Webisafe', noindex: true };
  if (pathname.startsWith('/analyse')) return { title: 'Analyse en cours — Webisafe', noindex: true };
  if (pathname.startsWith('/corrections')) return { title: 'Plan de correction — Webisafe', noindex: true };
  if (pathname.startsWith('/affiliate')) return { title: 'Espace affilié — Webisafe', noindex: true };
  if (pathname.startsWith('/partenaire/confirmation')) return { title: 'Confirmation — Webisafe', noindex: true };

  // Fallback
  return {
    title: 'Webisafe — Audit web pour PME africaines',
    description: 'Plateforme d\'audit automatisé de sites web : sécurité, performance, SEO et UX mobile.',
    url: `${BRAND_URL}${pathname}`,
  };
}

export default function RouteSEO() {
  const { pathname } = useLocation();
  const meta = getMetaForPath(pathname);

  return (
    <SEOHead
      title={meta.title}
      description={meta.description}
      url={meta.url || `${BRAND_URL}${pathname}`}
      noindex={meta.noindex || false}
      jsonLd={meta.jsonLd || null}
    />
  );
}
