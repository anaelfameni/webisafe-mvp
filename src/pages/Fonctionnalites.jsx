import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap, Shield, Search, Smartphone, ArrowRight, CheckCircle2,
  Activity, Clock, Eye, MousePointerClick, Lock, ShieldCheck,
  Globe, FileText, Image as ImageIcon, Link2, Server, Gauge,
  AlertTriangle, KeyRound, Wifi, Layers, Code2, BookOpen,
  // Services avancés
  Crown, Bell, Wrench, Users, Briefcase,
  MessageSquare, BarChart3, Download,
  Sparkles, LineChart, ShieldAlert,
} from 'lucide-react';
import { SCAN_DURATION_AVG_LABEL } from '../config/brand';

/**
 * Page publique /fonctionnalites
 * Présente en détail toutes les métriques mesurées par Webisafe
 * (Performance, Sécurité, SEO, UX Mobile) avec leurs seuils, sources
 * de référence et impact business pour le client.
 */

const CATEGORIES = [
  {
    key: 'performance',
    Icon: Zap,
    iconColor: 'text-amber-400',
    bgColor: 'from-amber-500/10 to-transparent',
    borderColor: 'border-amber-500/20',
    title: 'Performance',
    subtitle: '7 métriques Core Web Vitals & temps de chargement',
    intro: "La vitesse d'un site est un facteur de classement officiel de Google. Webisafe mesure les indicateurs Core Web Vitals utilisés directement par Google pour évaluer l'expérience utilisateur réelle, et les compare aux seuils publics web.dev.",
    metrics: [
      {
        name: 'LCP — Largest Contentful Paint',
        Icon: Clock,
        definition: "Temps d'affichage du plus gros élément visible de la page (image, bloc de texte, vidéo).",
        thresholds: '✅ ≤ 2,5 s · ⚠️ 2,5–4 s · ❌ > 4 s',
        impact: "Au-delà de 2,5 s, votre site est pénalisé par Google et perd des visiteurs.",
        source: 'Source : Google Core Web Vitals (web.dev/lcp)',
      },
      {
        name: 'FCP — First Contentful Paint',
        Icon: Eye,
        definition: "Délai avant l'apparition du premier élément visuel (texte, logo, image).",
        thresholds: '✅ ≤ 1,8 s · ⚠️ 1,8–3 s · ❌ > 3 s',
        impact: "Premier signal de vie du site. Un FCP lent crée une impression de site cassé.",
        source: 'Source : Google web.dev/fcp',
      },
      {
        name: 'INP — Interaction to Next Paint',
        Icon: MousePointerClick,
        definition: "Mesure la réactivité du site aux clics, taps et saisies. Remplace officiellement FID en mars 2024.",
        thresholds: '✅ ≤ 200 ms · ⚠️ 200–500 ms · ❌ > 500 ms',
        impact: "Un site qui ne répond pas vite donne l'impression d'être en panne.",
        source: 'Source : Google web.dev/inp',
      },
      {
        name: 'CLS — Cumulative Layout Shift',
        Icon: Layers,
        definition: "Mesure la stabilité visuelle : à quel point les éléments « sautent » pendant le chargement.",
        thresholds: '✅ ≤ 0,1 · ⚠️ 0,1–0,25 · ❌ > 0,25',
        impact: "Un site qui saute est frustrant et fait perdre des clics importants (achat, contact).",
        source: 'Source : Google web.dev/cls',
      },
      {
        name: 'TTFB — Time to First Byte',
        Icon: Server,
        definition: "Temps de réponse du serveur avant que le navigateur ne reçoive le premier octet.",
        thresholds: '✅ ≤ 800 ms · ⚠️ 800–1800 ms · ❌ > 1800 ms',
        impact: "Mesure la performance brute de votre hébergement / CDN.",
        source: 'Source : Google web.dev/ttfb',
      },
      {
        name: 'Poids total de la page',
        Icon: Gauge,
        definition: "Taille cumulée de tous les fichiers téléchargés (HTML, CSS, JS, images, polices).",
        thresholds: '✅ ≤ 1,5 Mo · ⚠️ 1,5–3 Mo · ❌ > 3 Mo',
        impact: "Une page trop lourde coûte cher en data à vos visiteurs (surtout sur mobile 3G/4G).",
        source: 'Source : HTTP Archive Web Almanac — Page Weight',
      },
      {
        name: 'Optimisation des images',
        Icon: ImageIcon,
        definition: "Détection des images non compressées, mal dimensionnées ou au mauvais format (PNG au lieu de WebP/AVIF).",
        thresholds: '✅ Formats modernes · ⚠️ Images non optimisées détectées · ❌ Images très lourdes',
        impact: "Les images représentent en général la plus grande part du poids d'une page mobile : levier prioritaire pour gagner en vitesse.",
        source: 'Source : web.dev — Image Performance Best Practices',
      },
    ],
  },
  {
    key: 'security',
    Icon: Shield,
    iconColor: 'text-danger',
    bgColor: 'from-danger/10 to-transparent',
    borderColor: 'border-danger/20',
    title: 'Sécurité',
    subtitle: '8 contrôles HTTPS, certificats, headers et DNS',
    intro: "Webisafe vérifie l'état de votre chaîne de sécurité côté front : HTTPS, certificats SSL, en-têtes HTTP, DNS et exposition de fichiers sensibles. Tous nos contrôles sont passifs : consultation publique du site cible uniquement, sans intrusion ni exploitation de vulnérabilités (cf. CGU §3).",
    metrics: [
      {
        name: 'HTTPS & redirection HTTP → HTTPS',
        Icon: Lock,
        definition: "Vérifie que votre site sert tout son contenu en HTTPS et redirige correctement les requêtes HTTP non sécurisées.",
        thresholds: '✅ Redirection 301 vers HTTPS · ❌ Contenu mixte ou HTTP toléré',
        impact: "Sans HTTPS, Chrome marque votre site comme « Non sécurisé ». Google déclasse aussi le site.",
        source: 'Source : Mozilla Observatory + W3C Mixed Content',
      },
      {
        name: 'Certificat SSL/TLS',
        Icon: ShieldCheck,
        definition: "Validité, durée restante, type (DV/OV/EV), autorité émettrice et niveau de chiffrement.",
        thresholds: '✅ Valide > 30 j · ⚠️ < 30 j · ❌ Expiré ou invalide',
        impact: "Un certificat expiré bloque l'accès au site dans tous les navigateurs (page rouge).",
        source: 'Source : Mozilla TLS Observatory + RFC 5280',
      },
      {
        name: 'En-tête HSTS (Strict-Transport-Security)',
        Icon: KeyRound,
        definition: "Force le navigateur à n'utiliser que HTTPS pendant une durée déterminée (max-age).",
        thresholds: '✅ max-age ≥ 6 mois · ⚠️ < 6 mois · ❌ Absent',
        impact: "Protège contre les attaques SSL stripping (interception de connexion).",
        source: 'Source : OWASP Secure Headers Project',
      },
      {
        name: 'Content-Security-Policy (CSP)',
        Icon: Shield,
        definition: "Politique qui restreint les sources autorisées (scripts, images, frames) pour bloquer le XSS.",
        thresholds: '✅ Présent et restrictif · ⚠️ Présent mais permissif · ❌ Absent',
        impact: "Sans CSP, votre site est exposé aux injections de scripts malveillants (XSS).",
        source: 'Source : OWASP Top 10 + Mozilla MDN',
      },
      {
        name: 'X-Frame-Options & X-Content-Type-Options',
        Icon: Lock,
        definition: "Empêchent le clickjacking (mise en frame) et la lecture MIME-sniffing par le navigateur.",
        thresholds: '✅ DENY ou SAMEORIGIN + nosniff · ❌ Absent',
        impact: "Sans ces en-têtes, un attaquant peut iframer votre site pour piéger vos utilisateurs.",
        source: 'Source : OWASP Secure Headers',
      },
      {
        name: 'Referrer-Policy & Permissions-Policy',
        Icon: Eye,
        definition: "Contrôlent ce que votre site partage avec les autres (referer URL, accès caméra, micro, géoloc).",
        thresholds: '✅ Référer restreint · ⚠️ Référer par défaut · ❌ Absents',
        impact: "Évite de fuiter des URL privées et limite l'accès aux APIs sensibles du navigateur.",
        source: 'Source : W3C Permissions Policy + Referrer-Policy',
      },
      {
        name: 'DNSSEC',
        Icon: Wifi,
        definition: "Signature cryptographique de vos enregistrements DNS pour prévenir le DNS spoofing.",
        thresholds: '✅ Signé · ⚠️ Inconnu · ❌ Non signé',
        impact: "Sans DNSSEC, un attaquant peut détourner votre domaine vers un site malveillant.",
        source: 'Source : ICANN + RFC 4033',
      },
      {
        name: 'Fichiers sensibles exposés',
        Icon: AlertTriangle,
        definition: "Détecte la présence publique de fichiers .env, .git/, /backup, /admin, phpinfo, etc.",
        thresholds: '✅ Aucun fichier exposé · ❌ ≥ 1 fichier critique',
        impact: "Un .env exposé = identifiants base de données + clés API publiques. Catastrophe immédiate.",
        source: 'Source : OWASP A05:2021 — Security Misconfiguration',
      },
    ],
  },
  {
    key: 'seo',
    Icon: Search,
    iconColor: 'text-success',
    bgColor: 'from-success/10 to-transparent',
    borderColor: 'border-success/20',
    title: 'SEO',
    subtitle: '6 vérifications référencement Google & social',
    intro: "Webisafe vérifie les fondations techniques du référencement : balises, structure, accessibilité aux robots, données pour les partages sociaux et données structurées (Schema.org). Ce ne sont pas des promesses de positionnement, mais les prérequis sans lesquels Google ne peut même pas vous lire correctement.",
    metrics: [
      {
        name: 'Title & Meta Description',
        Icon: FileText,
        definition: "Présence, longueur et unicité de la balise <title> (≤ 60 car.) et de la meta description (120–160 car.).",
        thresholds: '✅ Optimisée · ⚠️ Trop longue/courte · ❌ Absente',
        impact: "C'est ce que Google affiche dans les résultats. Sans elles, votre site est invisible dans le clic.",
        source: 'Source : Google Search Central — Title & Snippet',
      },
      {
        name: 'Structure des titres (H1, H2, H3)',
        Icon: Layers,
        definition: "Présence d'un H1 unique et hiérarchie logique des sous-titres.",
        thresholds: '✅ 1 H1 + hiérarchie · ⚠️ Pas de H1 · ❌ Plusieurs H1 ou structure cassée',
        impact: "Google s'appuie sur les titres pour comprendre la thématique de chaque page.",
        source: 'Source : Google Search Central — Structured Content',
      },
      {
        name: 'Robots.txt & Sitemap.xml',
        Icon: BookOpen,
        definition: "Vérifie l'existence et la validité des fichiers d'indexation robots.txt et sitemap.xml.",
        thresholds: '✅ Présents et valides · ⚠️ Sitemap manquant · ❌ Robots.txt bloque tout',
        impact: "Sans sitemap, Google met plus de temps à découvrir vos pages. Avec un robots.txt mal configuré, il peut tout ignorer.",
        source: 'Source : Google Search Central — Crawling & Indexing',
      },
      {
        name: 'Balises canoniques',
        Icon: Link2,
        definition: "Présence de la balise <link rel='canonical'> pour éviter le contenu dupliqué.",
        thresholds: '✅ Présente et auto-référencée · ⚠️ Pointe ailleurs · ❌ Absente',
        impact: "Évite que Google considère vos variantes d'URL (avec/sans www, ?utm=...) comme du contenu dupliqué.",
        source: 'Source : Google Search Central — Canonical URLs',
      },
      {
        name: 'Open Graph & Twitter Cards',
        Icon: ImageIcon,
        definition: "Balises og:title, og:description, og:image (et leurs équivalents Twitter) pour les partages réseaux sociaux.",
        thresholds: '✅ Toutes présentes · ⚠️ Image manquante · ❌ Absentes',
        impact: "Sans ces balises, votre lien partagé sur WhatsApp ou Facebook s'affiche sans aperçu : -40 % de clics.",
        source: 'Source : Open Graph Protocol + Twitter Cards',
      },
      {
        name: 'Données structurées (Schema.org)',
        Icon: Code2,
        definition: "Présence de JSON-LD pour décrire votre activité (Organization, LocalBusiness, Product, Article…).",
        thresholds: '✅ Au moins 1 type valide · ⚠️ Aucune · ❌ Erreurs de syntaxe',
        impact: "Active les résultats enrichis Google (étoiles d'avis, horaires, prix) → plus de clics.",
        source: 'Source : Schema.org + Google Search Central',
      },
    ],
  },
  {
    key: 'ux',
    Icon: Smartphone,
    iconColor: 'text-primary',
    bgColor: 'from-primary/10 to-transparent',
    borderColor: 'border-primary/20',
    title: 'UX Mobile',
    subtitle: '5 vérifications expérience utilisateur sur smartphone',
    intro: "En Afrique francophone, la majorité du trafic web vient désormais du mobile. Webisafe vérifie les fondamentaux du responsive et de l'accessibilité mobile : viewport, taille de texte, zones cliquables et contraste — tous mesurés selon les seuils WCAG 2.1 et les recommandations Apple/Google.",
    metrics: [
      {
        name: 'Viewport configuré',
        Icon: Smartphone,
        definition: "Présence de la balise <meta name='viewport' content='width=device-width, initial-scale=1'>.",
        thresholds: '✅ Configuré · ❌ Absent ou figé',
        impact: "Sans viewport, votre site s'affiche en version « mini desktop » sur mobile : illisible.",
        source: 'Source : W3C + Google Mobile-Friendly Test',
      },
      {
        name: 'Taille de police lisible',
        Icon: FileText,
        definition: "Vérifie que le texte principal est au moins à 16 px sur mobile.",
        thresholds: '✅ ≥ 16 px · ⚠️ 14–16 px · ❌ < 14 px',
        impact: "Un texte trop petit force au zoom : -45 % de taux de conversion sur mobile.",
        source: 'Source : Material Design + Apple HIG',
      },
      {
        name: 'Zones tactiles (boutons & liens)',
        Icon: MousePointerClick,
        definition: "Taille minimale des éléments cliquables : au moins 44×44 px (recommandation Apple/Google).",
        thresholds: '✅ ≥ 44 px · ⚠️ 32–44 px · ❌ < 32 px',
        impact: "Des boutons trop petits = clics ratés = abandons. Surtout sur formulaires de contact.",
        source: 'Source : WCAG 2.1 + Apple Human Interface Guidelines',
      },
      {
        name: 'Contraste des couleurs',
        Icon: Eye,
        definition: "Vérifie le ratio de contraste entre texte et fond selon les normes WCAG.",
        thresholds: '✅ ≥ 4.5:1 (AA) · ⚠️ ≥ 3:1 · ❌ < 3:1',
        impact: "Un texte peu lisible exclut 8 % des utilisateurs (déficience visuelle) et fatigue tous les autres.",
        source: 'Source : WCAG 2.1 — Success Criterion 1.4.3',
      },
      {
        name: 'Langue & encodage',
        Icon: Globe,
        definition: "Présence de l'attribut <html lang='...'> et de l'encodage UTF-8.",
        thresholds: '✅ lang + UTF-8 · ⚠️ Lang manquant · ❌ Encodage cassé',
        impact: "Sans la langue déclarée, les outils d'accessibilité et de traduction ne fonctionnent pas correctement.",
        source: 'Source : W3C + WCAG 2.1 — Success Criterion 3.1.1',
      },
    ],
  },
];

/**
 * Services avancés : ce que Webisafe propose au-delà du simple audit.
 * Présentés sous forme de produits avec valeur, prix et CTA précis.
 */
const ADVANCED_SERVICES = [
  {
    key: 'premium',
    Icon: Crown,
    iconColor: 'text-warning',
    badge: 'Audit Premium',
    badgeColor: 'bg-warning/15 text-warning border-warning/30',
    title: 'Rapport Premium PDF',
    price: '35 000 FCFA',
    priceNote: 'Paiement unique',
    description: "Le rapport complet livré en PDF de marque (13 pages structurées) avec plan d'action 7 / 30 / 90 jours, top 5 risques business et projection avant/après correction.",
    features: [
      'PDF 13 pages : couverture, verdict exécutif, top 5 risques, plan d\'action, scorecard, sections techniques et glossaire',
      'Plan d\'action structuré 7 / 30 / 90 jours (urgent / optimisation / surveillance)',
      'Comparaison avant/après : projection des scores après correction',
      'Glossaire technique (LCP, CLS, CSP, HSTS, DMARC…) et sources officielles',
      'QR code de vérification renvoyant vers la version en ligne du rapport',
      'Garantie satisfait ou remboursé 7 jours',
    ],
    cta: { label: 'Voir les tarifs', to: '/tarifs' },
  },
  {
    key: 'protect',
    Icon: ShieldCheck,
    iconColor: 'text-success',
    badge: 'Webisafe Protect',
    badgeColor: 'bg-success/15 text-success border-success/30',
    title: 'Surveillance continue',
    price: '15 000 FCFA',
    priceNote: '/ mois — sans engagement',
    description: "Veille active 24h/24 sur la disponibilité et la sécurité de votre site, via un partenariat avec UptimeRobot. Alertes email uniquement quand c'est urgent — zéro spam.",
    features: [
      'Monitoring uptime via UptimeRobot : vérification toutes les 5 minutes (288 contrôles / jour)',
      'Scan complet automatisé chaque mois (même profondeur que l\'audit Premium)',
      'Alertes email critiques : site down, SSL expirant (J-14, J-7, J-1), score qui chute de plus de 15 points',
      'Historique évolution sur 6 mois avec graphiques interactifs',
      'Badge « Sécurisé par Webisafe » à ajouter en footer (script de 2 lignes)',
      'Tarifs dégressifs : -10 % trimestriel · -15 % semestriel · -20 % annuel',
    ],
    cta: { label: 'En savoir plus', to: '/protect' },
  },
  {
    key: 'corrections',
    Icon: Wrench,
    iconColor: 'text-primary',
    badge: 'Pack Correction',
    badgeColor: 'bg-primary/15 text-primary border-primary/30',
    title: 'Correction par nos experts',
    price: 'À partir de 50 000 FCFA',
    priceNote: '3 packs disponibles',
    description: "Vous n'avez pas le temps ou l'équipe technique pour corriger ? Notre équipe applique directement les recommandations de votre audit, avec rescan post-correction inclus.",
    features: [
      'Pack Rapide — 50 000 FCFA · jusqu\'à 3 améliorations · délai 24–48h',
      'Pack Standard — 85 000 FCFA · priorités sécurité + perf + SEO · délai 3–5 jours',
      'Pack Complet — 150 000+ FCFA · toutes les améliorations + refonte mobile · 1–2 semaines',
      'Combo Audit Premium + Pack Standard — 102 000 FCFA au lieu de 120 000 (–15 %)',
      'Garantie 30 jours après correction · rescan post-correction inclus (J+30)',
    ],
    cta: { label: 'Demander un devis', to: '/corrections' },
  },
  {
    key: 'whitelabel',
    Icon: Briefcase,
    iconColor: 'text-purple-400',
    badge: 'White Label',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    title: 'Pour les agences',
    price: '100 000 – 250 000 FCFA',
    priceNote: '/ mois selon volume',
    description: "Revendez Webisafe sous votre propre marque : logo, couleurs, sous-domaine dédié et PDF en marque blanche. Vos clients ne voient que votre identité.",
    features: [
      'Rebranding complet : logo, couleurs primaire/secondaire, typo et URL personnalisée',
      'PDF en marque blanche — aucune mention « Webisafe » visible',
      'Sous-domaine dédié type audit.votre-agence.com',
      'Comptes clients illimités + console agence (suivi multi-sites, pipeline)',
      'Environnement de démo gratuit 14 jours · mise en production sous 5–10 jours ouvrés',
      'Abonnement annuel : –15 % · paiement Wave, virement UEMOA ou Stripe',
    ],
    cta: { label: 'Découvrir White Label', to: '/white-label' },
  },
  {
    key: 'partner',
    Icon: Users,
    iconColor: 'text-emerald-400',
    badge: 'Programme Partenaire',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    title: 'Affiliation 43 % commission',
    price: '15 000 FCFA',
    priceNote: '/ vente confirmée',
    description: "Recommandez Webisafe à votre réseau et touchez une commission sur chaque audit Premium vendu via votre lien unique. Sans stock, sans limite.",
    features: [
      '43 % de commission = 15 000 FCFA pour chaque Audit Premium vendu',
      'Lien d\'affiliation unique livré en 2 minutes après validation',
      'Dashboard dédié : suivi des clics, des conversions et des gains',
      'Versements virés sur Wave pour chaque vente confirmée',
      'Aucun stock, aucune logistique — partagez et c\'est tout',
    ],
    cta: { label: 'Devenir partenaire', to: '/partenaire' },
  },
  {
    key: 'support',
    Icon: MessageSquare,
    iconColor: 'text-cyan-400',
    badge: 'Support & Contact',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    title: 'Assistance dédiée',
    price: 'Inclus',
    priceNote: 'Tous les plans',
    description: "Une question sur votre rapport ou votre abonnement ? Notre équipe répond par email, WhatsApp ou via le centre de support intégré.",
    features: [
      'Centre de support intégré : tickets nominatifs avec statut (Ouvert / En cours / Résolu)',
      'Catégories : Paiement, Scan, Protect, Agence — chacune routée vers le bon expert',
      'Réponse sous 24h ouvrées par email ou via le centre de support',
      'WhatsApp : réponse sous 2h en moyenne (Lun–Ven, 8h–18h GMT)',
      'Email support : webisafe@gmail.com',
    ],
    cta: { label: 'Nous contacter', to: '/contact' },
  },
];

/**
 * Fonctionnalités transversales (incluses dans tous les plans) :
 * petits "plus" qui rendent l'expérience produit cohérente.
 */
const PLATFORM_FEATURES = [
  {
    Icon: Bell,
    title: 'Alertes email critiques',
    description: "Notifications email automatiques en cas de panne, certificat SSL expirant ou chute brutale du score (−15 pts) — réservées aux abonnés Protect.",
  },
  {
    Icon: LineChart,
    title: 'Historique sur 6 mois',
    description: "Suivez l'évolution de votre score global et par catégorie pendant 6 mois. Graphiques interactifs inclus.",
  },
  {
    Icon: Globe,
    title: 'Pensé pour l\'Afrique francophone',
    description: "Tarifs en FCFA, paiement Wave Money, hypothèses de mesure calées sur les conditions réseau locales (3G/4G mobile).",
  },
  {
    Icon: Download,
    title: 'Export PDF & partage',
    description: "Téléchargez vos rapports ou partagez-les via lien sécurisé tokenisé, sans inscription requise pour le destinataire.",
  },
  {
    Icon: BarChart3,
    title: 'Dashboard centralisé',
    description: "Tous vos sites, scans, paiements et tickets de support au même endroit. Tri, filtres et recherche inclus.",
  },
  {
    Icon: ShieldAlert,
    title: 'Audit éthique & passif',
    description: "Aucune intrusion ni exploitation de vulnérabilités. Toutes les analyses sont effectuées en mode passif, sur la base de signaux observables publiquement (cf. CGU §3).",
  },
];

export default function Fonctionnalites() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const totalMetrics = CATEGORIES.reduce((acc, c) => acc + c.metrics.length, 0);
  const totalServices = ADVANCED_SERVICES.length;

  return (
    <div className="min-h-screen pt-28 pb-24 px-4">
      {/* Hero */}
      <section className="max-w-5xl mx-auto text-center mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-5 leading-tight">
            Tout ce que <span className="shiny-text">Webisafe vous offre</span><br />
            <span className="text-white">sur votre site web</span>
          </h1>
          <p className="text-text-secondary text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
            <strong className="text-white">{totalMetrics} indicateurs techniques</strong> (Performance, Sécurité, SEO, UX Mobile)
            sourcés sur les standards officiels (Google Core Web Vitals, OWASP, W3C, WCAG).
          </p>
        </motion.div>

        {/* Quick links to sections */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-8"
        >
          <a href="#metrics" className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-xs font-bold text-white/70 hover:text-white transition-all">
            {totalMetrics} métriques techniques
          </a>
          <a href="#services" className="px-3 py-1.5 rounded-full bg-warning/10 hover:bg-warning/20 border border-warning/30 text-xs font-bold text-warning transition-all">
            {totalServices} services avancés
          </a>
          <a href="#methodology" className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-xs font-bold text-white/70 hover:text-white transition-all">
            Méthodologie
          </a>
        </motion.div>
      </section>

      {/* Catégories */}
      <section id="metrics" className="max-w-6xl mx-auto space-y-12 scroll-mt-24">
        {CATEGORIES.map((cat, catIdx) => {
          const CatIcon = cat.Icon;
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6 }}
              className={`bg-gradient-to-b ${cat.bgColor} border ${cat.borderColor} rounded-3xl p-6 lg:p-10`}
            >
              {/* En-tête de catégorie */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6 pb-6 border-b border-white/10">
                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 ${cat.iconColor}`}>
                  <CatIcon size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl lg:text-3xl font-bold text-white">{cat.title}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-white/60">
                      {cat.metrics.length} contrôles
                    </span>
                  </div>
                  <p className="text-text-secondary/80 text-sm mb-3">{cat.subtitle}</p>
                  <p className="text-white/70 text-sm lg:text-base leading-relaxed max-w-3xl">{cat.intro}</p>
                </div>
              </div>

              {/* Grille des métriques */}
              <div className="grid sm:grid-cols-2 gap-4">
                {cat.metrics.map((m) => {
                  const MIcon = m.Icon;
                  return (
                    <div
                      key={m.name}
                      className="bg-card-bg/60 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 ${cat.iconColor}`}>
                          <MIcon size={16} />
                        </div>
                        <h3 className="text-white font-bold text-sm lg:text-base leading-snug">{m.name}</h3>
                      </div>

                      <p className="text-white/70 text-xs lg:text-sm leading-relaxed mb-3">{m.definition}</p>

                      <div className="space-y-2 mb-3">
                        <div className="bg-white/5 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-0.5">Seuils</p>
                          <p className="text-xs text-white/80 font-mono">{m.thresholds}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-0.5">Impact business</p>
                          <p className="text-xs text-white/80">{m.impact}</p>
                        </div>
                      </div>

                      <p className="text-[10px] text-white/40 italic">{m.source}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Services avancés */}
      <section id="services" className="max-w-6xl mx-auto mt-24 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/30 rounded-full mb-5 text-sm text-warning font-medium">
            <Sparkles size={14} /> Services avancés
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Au-delà du scan&nbsp;: <span className="shiny-text">la suite complète</span>
          </h2>
          <p className="text-text-secondary text-base lg:text-lg max-w-3xl mx-auto leading-relaxed">
            Du rapport PDF de référence à la surveillance continue, en passant par la correction par nos experts et le
            white label pour les agences&nbsp;: tous les services Webisafe pour transformer un audit en résultats concrets.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {ADVANCED_SERVICES.map((svc) => {
            const SIcon = svc.Icon;
            return (
              <motion.div
                key={svc.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5 }}
                className="bg-card-bg border border-white/8 rounded-3xl p-6 lg:p-7 hover:border-white/20 transition-all flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${svc.iconColor}`}>
                      <SIcon size={22} />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${svc.badgeColor}`}>
                      {svc.badge}
                    </span>
                  </div>
                </div>

                {/* Titre + prix */}
                <h3 className="text-white font-bold text-xl lg:text-2xl mb-1">{svc.title}</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-white text-lg font-black">{svc.price}</span>
                  <span className="text-white/40 text-xs">{svc.priceNote}</span>
                </div>

                <p className="text-white/70 text-sm leading-relaxed mb-4">{svc.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-5 flex-1">
                  {svc.features.map((f, idx) => (
                    <li key={idx} className="flex gap-2 text-white/75 text-sm leading-relaxed">
                      <CheckCircle2 size={15} className={`flex-shrink-0 mt-0.5 ${svc.iconColor}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={svc.cta.to}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all w-full"
                >
                  {svc.cta.label}
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Fonctionnalités transversales */}
      <section className="max-w-6xl mx-auto mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Et aussi&nbsp;: les fondamentaux qui font la différence
          </h2>
          <p className="text-text-secondary text-sm lg:text-base max-w-2xl mx-auto">
            Les briques transversales incluses dans tous les plans, pensées pour votre quotidien.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_FEATURES.map((feat, idx) => {
            const FIcon = feat.Icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="bg-dark-navy/40 border border-white/8 rounded-2xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <FIcon size={18} />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{feat.title}</h3>
                <p className="text-white/60 text-xs lg:text-sm leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Méthodologie */}
      <section id="methodology" className="max-w-5xl mx-auto mt-20 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card-bg border border-border-color rounded-3xl p-6 lg:p-10"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 text-center">
            Comment fonctionne l'analyse&nbsp;?
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-dark-navy/40 border border-white/10 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Activity size={18} />
              </div>
              <h3 className="text-white font-bold text-base mb-2">1. Audit passif</h3>
              <p className="text-text-secondary text-xs lg:text-sm leading-relaxed">
                Webisafe lit uniquement les éléments publics de votre site : HTML, en-têtes HTTP, certificat SSL, DNS public.
                Aucune intrusion, aucun test offensif, aucune modification de votre site.
              </p>
            </div>

            <div className="bg-dark-navy/40 border border-white/10 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Gauge size={18} />
              </div>
              <h3 className="text-white font-bold text-base mb-2">2. Mesure standardisée</h3>
              <p className="text-text-secondary text-xs lg:text-sm leading-relaxed">
                Chaque métrique utilise les seuils officiels (Google Core Web Vitals, OWASP, WCAG). Les scores ne sont
                pas inventés : ils suivent les barèmes publics utilisés par l'industrie.
              </p>
            </div>

            <div className="bg-dark-navy/40 border border-white/10 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center mb-3">
                <FileText size={18} />
              </div>
              <h3 className="text-white font-bold text-base mb-2">3. Recommandations</h3>
              <p className="text-text-secondary text-xs lg:text-sm leading-relaxed">
                Chaque problème détecté est expliqué avec son impact business, sa difficulté de correction
                et la marche à suivre concrète — lecture orientée décision, pas rapport technique brut.
              </p>
            </div>
          </div>

          <div className="mt-8 bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-white/80 text-sm leading-relaxed">
              <strong className="text-white">100 % éthique :</strong> Webisafe ne réalise aucun test d'intrusion (pentest)
              et n'exploite aucune vulnérabilité. L'analyse repose uniquement sur la consultation publique du site cible,
              comme le ferait un visiteur normal — détail complet dans nos <Link to="/cgu" className="text-primary hover:underline">CGU §3</Link>.
            </p>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto mt-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-b from-primary/15 to-transparent border border-primary/30 rounded-3xl p-8 lg:p-12"
        >
          <h2 className="text-2xl lg:text-4xl font-bold text-white mb-4">
            Prêt à voir l'état réel de votre site&nbsp;?
          </h2>
          <p className="text-text-secondary text-base lg:text-lg mb-6 max-w-2xl mx-auto">
            Lancez un audit gratuit en {SCAN_DURATION_AVG_LABEL}. Vous recevrez vos {totalMetrics} indicateurs avec leurs
            seuils, leur impact business et les premières recommandations.
          </p>
          <button
            onClick={() => navigate('/', { state: { scrollToTop: true } })}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all btn-glow"
          >
            Lancer l'audit gratuit
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
