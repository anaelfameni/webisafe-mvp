/**
 * RouteSEO — applique les meta tags SEO selon la route active
 * À insérer une fois dans App.jsx, après <Router>.
 *
 * Mappe automatiquement chaque pathname à un objet pageMeta
 * et appelle <SEOHead> avec les bons title/description/canonical/OG.
 */

import { useLocation } from 'react-router-dom';
import {
  SEOHead,
  pageMeta,
  organizationJsonLd,
  websiteJsonLd,
  softwareApplicationJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  getArticleMeta,
} from './SEOHead';
import { BRAND_URL } from '../config/brand';
import { getArticleBySlug } from '../data/articles';

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

  // T.1 / S.3 — Pages publiques agences & statut
  if (pathname === '/white-label') {
    return {
      ...pageMeta.whiteLabel,
      jsonLd: breadcrumbJsonLd([
        { name: 'Accueil', url: BRAND_URL },
        { name: 'White Label', url: `${BRAND_URL}/white-label` },
      ]),
    };
  }
  if (pathname === '/protect/status') {
    return {
      ...pageMeta.protectStatus,
      jsonLd: breadcrumbJsonLd([
        { name: 'Accueil', url: BRAND_URL },
        { name: 'Protect', url: `${BRAND_URL}/protect` },
        { name: 'Statut', url: `${BRAND_URL}/protect/status` },
      ]),
    };
  }

  // M.4 / N.1 — Ressources (liste + article)
  if (pathname === '/ressources') {
    return {
      ...pageMeta.ressources,
      jsonLd: breadcrumbJsonLd([
        { name: 'Accueil', url: BRAND_URL },
        { name: 'Ressources', url: `${BRAND_URL}/ressources` },
      ]),
    };
  }
  if (pathname.startsWith('/ressources/')) {
    const slug = pathname.replace(/^\/ressources\//, '');
    const article = getArticleBySlug(slug);
    if (article) {
      const meta = getArticleMeta(article);
      return {
        ...meta,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            articleJsonLd({
              title: article.title,
              description: article.excerpt,
              url: meta.url,
              image: `${BRAND_URL}/og-image.png`,
              datePublished: article.publishedAt,
              dateModified: article.updatedAt || article.publishedAt,
            }),
            breadcrumbJsonLd([
              { name: 'Accueil', url: BRAND_URL },
              { name: 'Ressources', url: `${BRAND_URL}/ressources` },
              { name: article.title, url: meta.url },
            ]),
          ],
        },
      };
    }
    return { title: 'Article introuvable — Webisafe', noindex: true };
  }

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
