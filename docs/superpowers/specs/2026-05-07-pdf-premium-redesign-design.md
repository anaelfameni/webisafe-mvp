# Refonte premium du PDF Webisafe

## Objectif

Transformer le rapport PDF Webisafe en rendu premium, professionnel et visuellement marquant, tout en conservant la fluidité obtenue après suppression de Chart.js, des canvas et des images rasterisées internes.

## Direction validée

Direction C — Premium stunning.

Le rapport doit donner une impression de livrable haut de gamme : hiérarchie visuelle forte, cartes bien structurées, respiration claire, scores immédiatement compréhensibles et palette Webisafe respectée.

## Changements fonctionnels

- Supprimer la section de badges `Alertes à traiter en priorité` du résumé exécutif.
- Supprimer également le rappel `Alertes à surveiller` du plan d'action pour éviter la répétition visuelle des alertes.
- Garder les informations critiques dans les sections concernées lorsqu'elles sont utiles au diagnostic, par exemple fichiers sensibles dans la page sécurité.
- Conserver le contenu métier essentiel : scores, métriques, tableaux, recommandations, améliorations détectées, méthode de correction et CTA final.

## Structure visuelle cible

Chaque section suit une logique claire :

1. Contexte de la section avec titre, sous-titre et numéro.
2. Score principal ou bloc de diagnostic.
3. Constats structurés en cartes.
4. Détails ou preuves dans tableaux lisibles.
5. Action ou interprétation business quand disponible.

## Système visuel

- Fond Webisafe sombre `#0A0F1E`.
- Bleu principal Webisafe `#1566F0` avec accents `#3B82F6`.
- Vert succès `#22C55E`, orange correction `#F97316`, rouge critique `#EF4444`.
- Cartes sombres avec bordures fines, coins arrondis, séparateurs légers.
- Effet premium obtenu par composition, contrastes et micro-accents CSS simples, pas par canvas ni images.

## Contraintes performance

- Aucun `<canvas>` dans le template final.
- Aucun script Chart.js dans le PDF.
- Pas d'images rasterisées générées par les graphiques.
- Garder un PDF léger et fluide au scroll.
- Préserver la génération Puppeteer actuelle simplifiée.

## Tests et vérifications

- Générer un PDF de test et mesurer taille, nombre de pages, nombre d'images internes et temps de génération.
- Vérifier que le HTML final ne contient pas `Alertes à traiter en priorité`, `<canvas>` ni `<script>`.
- Lancer les tests existants `generatePDF.test.js` et `paymentEmails.test.js`.
