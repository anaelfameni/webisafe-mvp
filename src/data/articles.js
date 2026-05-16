// M.4 — Articles ressources Webisafe (sources vérifiées, perf web Côte d'Ivoire / Afrique de l'Ouest)
export const ARTICLES = [
  {
    slug: 'performance-web-cote-divoire-2025',
    title: 'Performance web en Côte d’Ivoire : pourquoi votre site doit charger en moins de 3 secondes',
    excerpt:
      'Sur mobile 4G ivoirien, plus la moitié des visiteurs abandonnent un site qui met plus de 3 secondes à charger. Voici les leviers concrets pour rester sous la barre.',
    readingTime: '6 min',
    category: 'Performance',
    publishedAt: '2025-09-15',
    updatedAt: '2026-01-20',
    sources: [
      { label: 'Google · Mobile Page Speed Industry Benchmarks', url: 'https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/mobile-page-speed-new-industry-benchmarks/' },
      { label: 'Web.dev · Largest Contentful Paint (LCP)', url: 'https://web.dev/articles/lcp' },
      { label: 'GSMA · Mobile Economy Sub-Saharan Africa 2024', url: 'https://www.gsma.com/r/mobileeconomy/sub-saharan-africa/' },
    ],
    sections: [
      {
        heading: 'Le seuil critique : 3 secondes',
        paragraphs: [
          "L'étude Google publiée par Think with Google indique que la probabilité de rebond augmente de 32 % lorsqu'une page passe de 1 à 3 secondes de chargement, et de 90 % entre 1 et 5 secondes.",
          "En Côte d'Ivoire, où le trafic mobile représente plus de 70 % des visites web selon les données GSMA 2024, ce seuil est encore plus pénalisant : la 4G y est dominante mais inégale, et la qualité réseau varie fortement entre Abidjan, Bouaké et les zones rurales.",
        ],
      },
      {
        heading: 'Les 4 leviers les plus impactants',
        paragraphs: [
          "1. Compression d'images : passez en WebP ou AVIF pour réduire le poids de 30 à 60 % à qualité visuelle équivalente.",
          "2. Hébergement géographiquement proche : un serveur en Europe est généralement plus rapide qu'un serveur aux États-Unis pour les visiteurs ivoiriens, car la latence transatlantique double les temps de réponse.",
          "3. Cache navigateur (Cache-Control + Brotli/Gzip) : les ressources statiques ne doivent pas être re-téléchargées à chaque visite.",
          "4. Code-splitting JavaScript : ne chargez que ce qui est visible à l'écran. La technique LCP de web.dev recommande de viser un Largest Contentful Paint < 2,5 s.",
        ],
      },
      {
        heading: 'Mesurer avant d’agir',
        paragraphs: [
          "Les outils gratuits comme PageSpeed Insights de Google ou WebPageTest offrent des mesures fiables. Pour une lecture business adaptée au marché local, l'audit Webisafe combine ces signaux et les traduit en plan d'action priorisé.",
        ],
      },
    ],
  },
  {
    slug: 'securite-site-pme-afrique-ouest',
    title: 'Sécurité d’un site PME en Afrique de l’Ouest : 5 risques sous-estimés',
    excerpt:
      'HTTPS, headers de sécurité, fichiers exposés, comptes admin laissés ouverts : la majorité des PME ivoiriennes hébergent encore des failles que les bots scannent en permanence.',
    readingTime: '7 min',
    category: 'Sécurité',
    publishedAt: '2025-10-08',
    updatedAt: '2026-02-12',
    sources: [
      { label: 'OWASP · Top 10 Web Application Security Risks', url: 'https://owasp.org/www-project-top-ten/' },
      { label: 'Mozilla · Web Security Cheat Sheet (HTTP Headers)', url: 'https://infosec.mozilla.org/guidelines/web_security' },
      { label: 'ANSSI · Recommandations sécurité Web', url: 'https://cyber.gouv.fr/publications/recommandations-pour-la-securisation-dun-site-web' },
      { label: 'Let’s Encrypt · Statistiques HTTPS', url: 'https://letsencrypt.org/stats/' },
    ],
    sections: [
      {
        heading: '1. HTTPS partiel ou périmé',
        paragraphs: [
          "Un certificat SSL absent ou expiré déclenche l'avertissement « Non sécurisé » de Chrome. D'après Let's Encrypt, près de 90 % du trafic web mondial est désormais en HTTPS — un site qui ne l'est pas perd immédiatement en crédibilité, surtout sur mobile.",
        ],
      },
      {
        heading: '2. Headers de sécurité manquants',
        paragraphs: [
          "Les headers Content-Security-Policy, X-Frame-Options, Strict-Transport-Security et Referrer-Policy sont recommandés par Mozilla et l'ANSSI. Leur absence ne casse pas le site, mais facilite le clickjacking, l'injection de scripts et la fuite d'information.",
        ],
      },
      {
        heading: '3. Fichiers sensibles exposés',
        paragraphs: [
          "Sauvegardes .sql, fichiers .env, .git/config laissés accessibles : c'est l'une des sources de fuite les plus fréquentes. Les bots automatisés testent ces chemins en boucle. Une simple règle dans le serveur web (Apache, Nginx) suffit à les bloquer.",
        ],
      },
      {
        heading: '4. Comptes admin par défaut',
        paragraphs: [
          "WordPress, Joomla ou Prestashop installés avec admin / admin ou un mot de passe trivial : le top 10 OWASP A07 (Identification and Authentication Failures) reste l'une des vulnérabilités les plus exploitées en Afrique de l'Ouest car les outils de force brute sont gratuits et automatisés.",
        ],
      },
      {
        heading: '5. Plugins non mis à jour',
        paragraphs: [
          "Près de 90 % des compromissions de sites WordPress proviennent d'extensions obsolètes (source : OWASP Top 10 2021 — A06 Vulnerable and Outdated Components). La mise à jour mensuelle est non négociable.",
        ],
      },
    ],
  },
  {
    slug: 'seo-local-abidjan-google',
    title: 'SEO local à Abidjan : être visible sur Google quand on est une PME ivoirienne',
    excerpt:
      'Référencement local, fiche Google Business, données structurées : voici la base pour qu’un client à Cocody ou Yopougon trouve votre PME plutôt qu’un concurrent étranger.',
    readingTime: '5 min',
    category: 'SEO',
    publishedAt: '2025-11-20',
    updatedAt: '2026-03-04',
    sources: [
      { label: 'Google · Search Quality Rater Guidelines (E-E-A-T)', url: 'https://services.google.com/fh/files/misc/hsw-sqrg.pdf' },
      { label: 'Google Business Profile · Centre d’aide', url: 'https://support.google.com/business/' },
      { label: 'Schema.org · LocalBusiness', url: 'https://schema.org/LocalBusiness' },
      { label: 'Statcounter · Search Engine Market Share Côte d’Ivoire', url: 'https://gs.statcounter.com/search-engine-market-share/all/cote-divoire' },
    ],
    sections: [
      {
        heading: 'Pourquoi Google d’abord ?',
        paragraphs: [
          "Statcounter mesure la part de Google à plus de 95 % du marché des moteurs de recherche en Côte d'Ivoire. Optimiser pour Google reste donc le levier le plus rentable, avant Bing ou les moteurs alternatifs.",
        ],
      },
      {
        heading: 'Étape 1 — Google Business Profile',
        paragraphs: [
          "Une fiche Google Business gratuite, complète et vérifiée fait remonter votre PME dans le « pack local » (les 3 cartes affichées en haut des résultats). Le centre d'aide officiel de Google détaille la procédure ; les éléments les plus importants sont les horaires, la catégorie principale, les photos régulières et la collecte des avis clients.",
        ],
      },
      {
        heading: 'Étape 2 — Données structurées Schema.org',
        paragraphs: [
          "Le balisage LocalBusiness permet à Google de comprendre votre zone d'intervention, votre adresse, vos avis et votre offre. Schema.org est le standard que Google recommande explicitement.",
        ],
      },
      {
        heading: 'Étape 3 — E-E-A-T et contenu local',
        paragraphs: [
          "Les Search Quality Rater Guidelines de Google (mises à jour 2024) insistent sur Experience, Expertise, Authoritativeness, Trust. Concrètement : page « À propos » crédible, mention du quartier ou de la commune, témoignages clients réels, contact local visible.",
          "Pour une PME ivoirienne, citer Cocody, Plateau, Marcory, Bouaké, San Pedro dans le contenu (sans bourrage de mots-clés) aide directement le SEO local.",
        ],
      },
    ],
  },
];

export function getArticleBySlug(slug) {
  return ARTICLES.find((article) => article.slug === slug) || null;
}
