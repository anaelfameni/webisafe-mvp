// Mock data réalistes pour le MVP — utilisé quand les APIs sont indisponibles
export function generateMockData(url) {
  // Générer des scores semi-aléatoires mais réalistes basés sur l'URL
  const hash = url.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash);
  
  const perfScore = 40 + (seed % 35);
  const secScore = 30 + ((seed * 7) % 40);
  const seoScore = 45 + ((seed * 13) % 35);
  const uxScore = 35 + ((seed * 3) % 40);

  return {
    url: url,
    scanDate: new Date().toISOString(),
    scores: {
      global: Math.round(perfScore * 0.3 + secScore * 0.35 + seoScore * 0.2 + uxScore * 0.15),
      performance: perfScore,
      security: secScore,
      seo: seoScore,
      ux: uxScore,
    },
    performance: {
      loadTime: (2.5 + (seed % 40) / 10).toFixed(1) + 's',
      pageSize: (1.2 + (seed % 30) / 10).toFixed(1) + ' MB',
      lcp: (2.0 + (seed % 35) / 10).toFixed(1) + 's',
      fid: Math.round(100 + (seed % 200)) + 'ms',
      cls: (0.05 + (seed % 20) / 100).toFixed(2),
      ttfb: Math.round(200 + (seed % 800)) + 'ms',
      requests: 30 + (seed % 50),
      status: {
        lcp: perfScore > 60 ? 'pass' : perfScore > 40 ? 'warn' : 'fail',
        fid: perfScore > 55 ? 'pass' : perfScore > 35 ? 'warn' : 'fail',
        cls: perfScore > 50 ? 'pass' : perfScore > 30 ? 'warn' : 'fail',
      },
    },
    security: {
      https: seed % 3 !== 0,
      sslValid: seed % 4 !== 0,
      sslDays: 30 + (seed % 300),
      hsts: seed % 3 === 0,
      csp: seed % 4 === 0,
      xframe: seed % 3 === 0,
      xContentType: seed % 2 === 0,
      malware: false,
      blacklisted: false,
      missingHeaders: getMissingHeaders(seed),
    },
    seo: {
      titleOk: seed % 3 !== 0,
      titleLength: 20 + (seed % 50),
      titleContent: 'Bienvenue sur ' + url,
      descriptionOk: seed % 2 === 0,
      descriptionLength: seed % 2 === 0 ? 120 + (seed % 40) : 0,
      altMissing: 2 + (seed % 12),
      sitemapOk: seed % 3 === 0,
      robotsTxtOk: seed % 2 === 0,
      h1Count: 1 + (seed % 3),
      h1Ok: seed % 4 !== 0,
      canonicalOk: seed % 2 === 0,
      ogTagsOk: seed % 3 === 0,
    },
    ux: {
      responsive: seed % 4 !== 0,
      textReadable: seed % 3 !== 0,
      tapTargets: seed % 3 === 0,
      timeToInteractive: (3.0 + (seed % 40) / 10).toFixed(1) + 's',
      viewport: seed % 5 !== 0,
      fontSizeOk: seed % 3 !== 0,
    },
    recommendations: generateRecommendations(seed, perfScore, secScore, seoScore, uxScore),
  };
}

function getMissingHeaders(seed) {
  const allHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ];
  return allHeaders.filter((_, i) => (seed + i) % 3 !== 0);
}

function generateRecommendations(seed, perf, sec, seo, ux) {
  const allRecs = [
    {
      priority: 'CRITIQUE',
      category: 'security',
      title: 'Certificat HSTS manquant',
      description: 'Votre site ne force pas la connexion HTTPS, ce qui expose vos visiteurs à des attaques de type "man-in-the-middle".',
      impact: 'Vos visiteurs peuvent être redirigés vers un faux site à votre insu',
      action: 'Activez HSTS dans les paramètres de votre hébergeur ou ajoutez le header Strict-Transport-Security',
      difficulty: 'Facile',
      time: '15 min',
      impactBusiness: 'Protège 100% de vos visiteurs contre les interceptions',
    },
    {
      priority: 'CRITIQUE',
      category: 'performance',
      title: 'Images non compressées détectées',
      description: 'Vos images pèsent en moyenne 3x plus que nécessaire, ralentissant considérablement le chargement.',
      impact: 'Votre site charge 2x plus lentement qu\'il ne devrait',
      action: 'Compressez vos images avec squoosh.app ou TinyPNG avant de les uploader sur votre site',
      difficulty: 'Facile',
      time: '30 min',
      impactBusiness: 'Peut réduire le temps de chargement de 40%',
    },
    {
      priority: 'IMPORTANT',
      category: 'seo',
      title: 'Meta description manquante',
      description: 'Google ne trouve pas de description pour votre site, il affiche donc un extrait aléatoire de votre page.',
      impact: 'Google affiche votre site de façon peu attractive dans les résultats',
      action: 'Ajoutez une meta description de 150-160 caractères dans votre CMS ou directement dans le HTML',
      difficulty: 'Facile',
      time: '10 min',
      impactBusiness: 'Peut augmenter votre taux de clic Google de 30%',
    },
    {
      priority: 'IMPORTANT',
      category: 'security',
      title: 'Content-Security-Policy absent',
      description: 'Sans cette protection, des scripts malveillants peuvent être injectés dans votre site.',
      impact: 'Risque d\'injection de code malveillant sur votre site',
      action: 'Ajoutez un header Content-Security-Policy dans la configuration de votre serveur web',
      difficulty: 'Moyen',
      time: '1h',
      impactBusiness: 'Élimine le risque de scripts malveillants pour vos visiteurs',
    },
    {
      priority: 'IMPORTANT',
      category: 'performance',
      title: 'Temps de chargement excessif',
      description: 'Votre page met plus de 3 secondes à charger sur mobile, ce qui fait fuir la majorité des visiteurs.',
      impact: 'Vous perdez environ 40% de vos visiteurs avant même qu\'ils voient votre contenu',
      action: 'Activez la compression GZIP, minimisez vos fichiers CSS/JS, et utilisez un CDN',
      difficulty: 'Moyen',
      time: '2h',
      impactBusiness: 'Peut récupérer jusqu\'à 40% des visiteurs perdus',
    },
    {
      priority: 'IMPORTANT',
      category: 'ux',
      title: 'Éléments tactiles trop proches',
      description: 'Les boutons et liens de votre site sont trop rapprochés sur mobile, causant des clics accidentels.',
      impact: 'Expérience frustrante sur mobile — les utilisateurs cliquent sur le mauvais lien',
      action: 'Espacez vos boutons et liens d\'au moins 48px et agrandissez les zones cliquables',
      difficulty: 'Facile',
      time: '45 min',
      impactBusiness: 'Améliore l\'expérience de 80% de vos visiteurs mobiles',
    },
    {
      priority: 'AMELIORATION',
      category: 'seo',
      title: 'Images sans attribut ALT',
      description: 'Plusieurs images de votre site n\'ont pas de texte alternatif, ce qui pénalise votre référencement.',
      impact: 'Google ne peut pas comprendre vos images et les afficher dans Google Images',
      action: 'Ajoutez un attribut alt descriptif à chaque image de votre site',
      difficulty: 'Facile',
      time: '20 min',
      impactBusiness: 'Améliore votre visibilité sur Google Images',
    },
    {
      priority: 'AMELIORATION',
      category: 'seo',
      title: 'Sitemap.xml manquant',
      description: 'Votre site n\'a pas de plan de site XML, ce qui rend l\'indexation par Google plus lente.',
      impact: 'Google met plus de temps à découvrir vos nouvelles pages',
      action: 'Générez un sitemap.xml avec un outil en ligne et placez-le à la racine de votre site',
      difficulty: 'Facile',
      time: '15 min',
      impactBusiness: 'Accélère l\'apparition de vos pages dans les résultats Google',
    },
    {
      priority: 'AMELIORATION',
      category: 'ux',
      title: 'Texte trop petit sur mobile',
      description: 'La taille de police de certaines sections est inférieure à 16px, rendant la lecture difficile sur téléphone.',
      impact: 'Les visiteurs doivent zoomer pour lire, ce qui est une mauvaise expérience',
      action: 'Utilisez une taille de police minimum de 16px pour le corps du texte',
      difficulty: 'Facile',
      time: '20 min',
      impactBusiness: 'Améliore la lisibilité pour tous vos visiteurs mobiles',
    },
    {
      priority: 'CRITIQUE',
      category: 'security',
      title: 'X-Frame-Options manquant',
      description: 'Votre site peut être intégré dans un iframe malveillant pour tromper vos visiteurs (clickjacking).',
      impact: 'Des arnaqueurs peuvent utiliser votre site pour piéger vos clients',
      action: 'Ajoutez le header X-Frame-Options: DENY dans votre configuration serveur',
      difficulty: 'Facile',
      time: '10 min',
      impactBusiness: 'Protège votre marque contre le détournement',
    },
  ];

  // Sélectionner les recommandations pertinentes basées sur les scores
  let selected = [];
  if (sec < 50) selected.push(allRecs[0], allRecs[3], allRecs[9]);
  if (perf < 60) selected.push(allRecs[1], allRecs[4]);
  if (seo < 65) selected.push(allRecs[2], allRecs[6], allRecs[7]);
  if (ux < 55) selected.push(allRecs[5], allRecs[8]);

  // Toujours au moins 5 recommandations
  if (selected.length < 5) {
    for (const rec of allRecs) {
      if (!selected.includes(rec)) selected.push(rec);
      if (selected.length >= 8) break;
    }
  }

  // Trier par priorité
  const priorityOrder = { CRITIQUE: 0, IMPORTANT: 1, AMELIORATION: 2 };
  selected.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return selected;
}

// Données mockées par défaut
export const defaultMockData = generateMockData('exemple.ci');
