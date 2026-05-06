---
title: Generate PDF Premium Report Redesign
date: 2026-05-06
status: approved
---

# Generate PDF Premium Report Redesign

## Objectif

Refondre `src/utils/generatePDF.js` pour produire un rapport PDF premium Webisafe complet, professionnel, sombre et cohérent, couvrant toutes les données disponibles du scan sans afficher de valeurs brutes `undefined`, `null` ou `N/A` non justifiées.

Le PDF doit conserver un fond sombre uniforme sur toutes les pages et utiliser une palette cohérente : bleu Webisafe, rouge critique, ambre avertissement, vert conforme et bleu excellent.

## Contraintes

- Conserver les exports existants : `sanitizePdfText`, `buildPdfFilename`, `buildPdfAuditModel`, `createPDFBlob`, `generatePDF`.
- Préserver les accents français dans les textes : é, è, à, ê, ô, ù, î, â, û, ç.
- Masquer les champs absents lorsque le scan ne fournit pas la donnée.
- Éviter tout texte qui déborde des cartes ou tableaux.
- Garder header, footer et numérotation sur chaque page.
- Ne pas introduire de nouvelle dépendance.

## Architecture

`buildPdfAuditModel` devient la source unique de vérité du PDF. Il normalise les données depuis les formats actuels et legacy :

- `scores` et `global_score` pour les scores.
- `metrics.performance` pour Core Web Vitals, poids de page, serveur et opportunités PageSpeed.
- `metrics.security` pour SSL, HTTPS, VirusTotal, headers, cookies, fichiers sensibles, CORS, disclosures et erreurs SQL.
- `metrics.security.advanced_checks` et `extended_checks` pour la sécurité avancée.
- `metrics.seo` pour les balises SEO.
- `metrics.ux` pour les problèmes UX mobile.
- `recommendations` pour le plan d’action.
- `critical_alerts` pour les métadonnées et alertes.

## Structure PDF

1. Page de couverture avec logo Webisafe, domaine, date et heure exactes, jauge globale, label, quatre scores par catégorie, synthèse exécutive de cinq phrases maximum et métadonnées du scan.
2. Section Performance avec score, LCP, FCP, CLS, TBT, TTI, poids de page, localisation serveur, avertissement de latence et opportunités PageSpeed.
3. Section Sécurité avec SSL, HTTPS, VirusTotal, headers présents et manquants, fichiers sensibles, cookies, CORS, disclosure serveur et erreurs SQL.
4. Section Sécurité avancée avec WAF, sous-domaines, takeover, supply chain, sécurité email, typosquatting, réputation IP, security.txt, zone transfer et tableau des checks étendus.
5. Section SEO avec title, meta description, H1, viewport, Open Graph, sitemap, canonical et indexabilité.
6. Section UX mobile avec score, grade, compression, images sans alt, liens sans texte, zoom bloqué et problèmes UX.
7. Plan d’action groupé par urgentes, importantes et améliorations, avec compteur, impact, difficulté, temps estimé et CTA final.

## Rendu visuel

Le rendu utilisera des composants internes simples : jauge, barre de score, carte métrique, badge de statut, tableau flexible, section de priorité et carte de recommandation.

Tous les contenus seront conçus pour tenir dans les cartes avec des tailles de police maîtrisées, des colonnes larges et des sections paginables.

## Qualité texte

`sanitizePdfText` supprimera uniquement les caractères problématiques pour React PDF, tout en conservant les accents français. Les phrases générées commenceront par une majuscule. Les libellés historiques sans accents seront remplacés par des libellés français corrects.

## Tests

Mettre à jour `src/utils/generatePDF.test.js` pour valider :

- Conservation des accents français.
- Construction du modèle enrichi.
- Présence des métriques importantes quand les données existent.
- Masquage ou fallback contrôlé des valeurs absentes.
- Groupement des recommandations par priorité.
- Absence de chaînes brutes `undefined` et `null` dans les champs principaux du modèle.
