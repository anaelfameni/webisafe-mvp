# Plan d'Améliorations MVP Final — Webisafe

> Rédigé le 16/06/2026 suite à un audit technique complet du projet.
> Chaque tâche indique : **Problème** → **Fichier** → **Action** → **Validation**

---

## Phase 0.5 — Sécurité critique (immédiat)

### T0.1 — .gitignore corrompu (encodage UTF-16)
- **Problème** : Les lignes 27-30 du `.gitignore` sont en UTF-16 avec des espaces entre chaque caractère (`. e n v`). Résultat : `.env`, `.env.local`, `.env.*.local` ne sont **pas réellement ignorés** par git → risque de fuite de clés API (Supabase, PageSpeed, VirusTotal).
- **Fichier** : `.gitignore`
- **Action** : Réécrire les lignes 27-30 en UTF-8 propre (`.env`, `.env.local`, `.env.*.local`, `settings.json`). Vérifier que `.env` n'est pas déjà commité (`git ls-files .env`).
- **Validation** : `echo ".env" | git check-ignore --stdin` doit retourner `.env`.

---

## Phase 1 — Crédibilité du scoring (Semaine 1, impact maximal)

### T1.1 — Retirer le plancher sécurité à 90
- **Problème** : `combineSecurityScores()` impose `score = Math.max(score, 90)` pour tout site HTTPS sans malware. Un site sans aucun header de sécurité affiche 90/100 "Très bon" alors que les findings listent "CSP manquant, HSTS manquant". Contradiction flagrante.
- **Fichier** : `api/scan.js` ligne ~221
- **Action** : Supprimer la ligne `if (https && malwareDetected !== true) score = Math.max(score, 90);`. Laisser le score naturel issu des calculs de pénalités.
- **Validation** : Scanner un site HTTPS sans headers de sécurité → score < 90.

### T1.2 — Retirer le floor SEO à 63
- **Problème** : `scanSeo()` impose `cappedScore = Math.max(63, cappedScore)` pour toute page avec un titre et indexable. Un site SEO médiocre ne peut pas descendre sous 63.
- **Fichier** : `api/scan.js` lignes ~969-971
- **Action** : Supprimer le block `if (title.length > 0 && isIndexable) { cappedScore = Math.max(63, cappedScore); }`.
- **Validation** : Scanner un site avec titre mais sans sitemap/canonical/OG/h1 → score < 63.

### T1.3 — Retirer le cap global à 97
- **Problème** : `calculateGlobalScore()` plafonne à 97 : `Math.min(Math.round(score / totalW), 97)`. Un site parfait ne peut jamais atteindre 100 sans raison.
- **Fichier** : `api/scan.js` ligne ~1178
- **Action** : Remplacer par `Math.min(Math.round(score / totalW), 100)`.
- **Validation** : Calcul manuel avec 4 scores à 100 → résultat 100.

### T1.4 — Retirer le cap applyScoreCap à 97 pour 0 failedChecks
- **Problème** : `applyScoreCap()` retourne `Math.min(score, 97)` même avec 0 critères échoués.
- **Fichier** : `api/scan.js` ligne ~86
- **Action** : Remplacer `return Math.min(score, 97)` par `return score` (un score parfait est légitime si tout passe).
- **Validation** : `applyScoreCap(100, [])` → 100.

### T1.5 — Corriger `tap_targets_ok` codé en dur
- **Problème** : `tap_targets_ok: true` est toujours retourné sans aucune vérification. Webisafe affirme que les zones tactiles sont OK sans les mesurer.
- **Fichier** : `api/scan.js` ligne ~1156
- **Action** : Remplacer par une détection basée sur les éléments cliquables trop petits (liens/boutons < 48px) via analyse cheerio, ou retirer le champ si non mesurable.
- **Validation** : Scanner un site avec de petits liens → `tap_targets_ok: false`.

### T1.6 — Corriger `accessibility_score` (faux label)
- **Problème** : `accessibility_score: rawScore` renomme simplement le score UX en "score d'accessibilité" sans aucun test WCAG réel (contraste, ARIA, navigation clavier).
- **Fichier** : `api/scan.js` ligne ~1155
- **Action** : Brancher la catégorie `accessibility` de Lighthouse (déjà disponible dans l'API PageSpeed, il suffit d'ajouter `&category=accessibility` à l'URL) et utiliser le vrai score a11y.
- **Validation** : Le score d'accessibilité diffère du score UX.

### T1.7 — Ajouter `category=accessibility` à l'appel PageSpeed
- **Problème** : L'URL PageSpeed n'inclut que `category=performance`. Le score accessibility de Lighthouse est gratuit mais non récupéré.
- **Fichier** : `api/scan.js` ligne ~389
- **Action** : Ajouter `&category=accessibility` à l'URL PageSpeed. Extraire `lr.categories?.accessibility?.score` et le transmettre au scanner UX.
- **Validation** : La réponse PageSpeed contient `categories.accessibility`.

### T1.8 — Corriger `ssl_grade: 'A'` inventé
- **Problème** : `ssl_grade: isHttps ? 'A' : 'Absent'` attribue un grade SSL "A" à tout site HTTPS sans aucune vérification SSL Labs.
- **Fichier** : `api/scan.js` ligne ~836
- **Action** : Remplacer par `ssl_grade: isHttps ? 'Non vérifié' : 'Absent'` (honnête) ou intégrer l'API SSL Labs si temps disponible.
- **Validation** : Un site HTTPS affiche "Non vérifié" au lieu de "A" inventé.

---

## Phase 2 — Nettoyage du code mort (Semaine 2)

### T2.1 — Supprimer `lib/scanners/` (code mort)
- **Problème** : Les 5 fichiers TypeScript (`ai-analysis.ts`, `performance.ts`, `security.ts`, `seo.ts`, `ux-mobile.ts`) ne sont importés par aucun fichier du projet. Ils contiennent du code (Gemini AI, SSL Labs, Observatory) qui laisse croire que ces fonctionnalités sont actives alors qu'elles ne le sont pas.
- **Action** : Supprimer le dossier `lib/scanners/` entièrement. Conserver `lib/types.ts`, `lib/audit/`, `lib/utils/`.
- **Validation** : `grep -r "lib/scanners" --include="*.js" --include="*.ts" --include="*.jsx"` → 0 résultats.

### T2.2 — Supprimer `api_disabled/`
- **Problème** : Dossier de fonctions API désactivées, source de confusion.
- **Action** : Supprimer le dossier.
- **Validation** : Le build Vercel passe.

### T2.3 — Évaluer `server/` (Express dormant)
- **Problème** : Application Express complète avec son propre `node_modules` (express, cheerio, nodemon…), jamais déployée. MAIS `api/scan.js` importe `securityProbes.js` depuis `server/scanners/`.
- **Action** : Déplacer `server/scanners/securityProbes.js` dans `scanners/` (qui est le dossier live), puis supprimer `server/` et son `node_modules`.
- **Validation** : `api/scan.js` continue de fonctionner après changement d'import.

### T2.4 — Supprimer fichiers résiduels
- **Problème** : `counter.ts`, `main.ts` (résidus template Vite), `.vite-dev.err.log` (3,4 Mo commité).
- **Action** : Supprimer ces fichiers.
- **Validation** : `npm run build` passe.

---

## Phase 3 — Profondeur des scanners (Semaines 3-4)

### T3.1 — Intégrer le vrai score accessibility Lighthouse
- **Problème** : L'API PageSpeed retourne un score accessibility réel (contraste, ARIA, labels, navigation clavier) mais il n'est pas exploité.
- **Action** : Après T1.7, extraire les audits accessibility détaillés de Lighthouse et les intégrer dans le rapport UX (issues concrètes WCAG).
- **Validation** : Le rapport UX liste des problèmes d'accessibilité réels.

### T3.2 — Activer le rendu JavaScript pour les SPA
- **Problème** : Le scan parse le HTML statique avec cheerio. Les sites React/Vue/Angular retournent un `<div id="root"></div>` vide → SEO et UX sont aveugles.
- **Fichier** : `api/scan.js` (fonction `fetchHtml`)
- **Action** : Utiliser Puppeteer (`@sparticuz/chromium` + `puppeteer-core` déjà en dependencies) pour rendre le JS avant l'analyse cheerio. Fallback sur fetch statique si timeout.
- **Validation** : Scanner une SPA React → le contenu rendu est analysé.

### T3.3 — Crawl multi-pages (3-5 pages)
- **Problème** : Seule la page d'accueil est scannée. Un site peut avoir une home parfaite et des sous-pages cassées.
- **Action** : Extraire les liens internes de la home, scanner 3-5 pages supplémentaires, agréger les résultats.
- **Validation** : Le rapport mentionne les pages analysées.

### T3.4 — Réactiver SSL Labs / Mozilla Observatory
- **Problème** : Le code existe dans `lib/scanners/security.ts` (mort) mais n'est pas branché en production.
- **Action** : Porter la logique SSL Labs dans `scanners/security-checks.js` (le fichier live). Utiliser l'API gratuite SSL Labs pour un vrai grade SSL.
- **Validation** : `ssl_grade` reflète le vrai grade SSL Labs (A+, A, B, C, F).

---

## Phase 4 — Crédibilité des rapports (Semaines 3-4)

### T4.1 — Remplacer les impacts FCFA fictifs
- **Problème** : Les impacts financiers sont codés en dur dans `lib/scanners/` (code mort) : "950 000 FCFA" pour malware, "500 000 FCFA" pour CSP manquant — identiques quel que soit le site.
- **Action** : Comme ces impacts sont dans le code mort, vérifier qu'aucun impact FCFA fictif n'existe dans le code live (`api/scan.js`, `scanners/`, `src/`). Si le rapport PDF les affiche, les remplacer par des pourcentages ou les supprimer.
- **Validation** : Aucun montant FCFA fictif dans les rapports.

### T4.2 — Corriger les stats Home invérifiables
- **Problème** : La page d'accueil affiche "27M cyberattaques en CI", "92M en Afrique de l'Ouest 2025" sans source vérifiable, en hover minuscule. Date future = signal d'invention.
- **Fichier** : `src/pages/Home.jsx`
- **Action** : Sourcer les chiffres avec des rapports officiels (Interpol, ITU, ARTCI) ou les retirer. Mettre la source en clair, pas en hover.
- **Validation** : Chaque stat affichée a une source cliquable.

### T4.3 — Supprimer les benchmarks sectoriels fictifs
- **Problème** : `scoreBenchmark.js` contient des ranges inventés (Stripe/Apple/Jumia) jamais utilisés.
- **Action** : Supprimer le fichier ou le remplacer par des benchmarks basés sur les vrais scans accumulés dans `scan_analytics`.
- **Validation** : Aucun benchmark fictif dans le code.

---

## Phase 5 — Business & Monétisation (Mois 2)

### T5.1 — Automatiser la validation Wave
- **Problème** : Le paiement est validé manuellement par l'admin (clic "confirmer"). Ne scale pas, crée de la friction et des abandons.
- **Action** : Implémenter le webhook Wave pour validation automatique.
- **Validation** : Un paiement Wave est automatiquement confirmé sans intervention admin.

### T5.2 — Masquer les features non validées
- **Problème** : 6 business models construits avant d'en valider 1 (agence, white-label, affiliation, Protect, corrections, packs combo).
- **Action** : Masquer agence/white-label/affiliation dans la navigation. Focus sur : scan gratuit → rapport premium → Protect récurrent.
- **Validation** : Seuls 3 produits sont visibles dans le funnel.

### T5.3 — Implémenter le scan mensuel automatique Protect
- **Problème** : Le produit "Protect" vend un scan mensuel automatique qui n'est pas implémenté (stubé).
- **Action** : Créer un cron Vercel ou Supabase Edge Function qui relance les scans mensuels pour les abonnés Protect.
- **Validation** : Un abonné Protect reçoit un nouveau rapport chaque mois.

---

## Phase 6 — Différenciation (Mois 2-3)

### T6.1 — Construire des benchmarks sectoriels africains réels
- **Problème** : Pas de moat de données. Les benchmarks sont fictifs.
- **Action** : Exploiter `scan_analytics` (déjà en base Supabase) pour calculer des moyennes par secteur/pays à partir des vrais scans.
- **Validation** : Le rapport affiche "Votre site est au-dessus/en-dessous de la moyenne de votre secteur".

### T6.2 — Brancher une IA (Claude/Gemini) sur le résumé exécutif
- **Problème** : Le code Gemini AI existe mais est mort. Le rapport est 100% templaté.
- **Action** : Intégrer un appel IA pour générer un résumé exécutif personnalisé basé sur les résultats du scan. Fallback élégant (texte templaté de qualité, pas "N/A").
- **Validation** : Le résumé exécutif varie d'un site à l'autre.

### T6.3 — Ajouter preuve sociale
- **Problème** : Aucun témoignage, logo client, ou cas d'usage sur le site.
- **Action** : Ajouter une section témoignages sur la Home et la page Tarifs (même avec 2-3 beta-testeurs).
- **Validation** : La Home affiche au moins 2 témoignages réels.

---

## Résumé des priorités

| Phase | Impact | Effort | Priorité |
|-------|--------|--------|----------|
| 0.5 — Sécurité .gitignore | Critique | 5 min | 🔴 Immédiat |
| 1 — Crédibilité scoring | Très élevé | 2-3h | 🔴 Semaine 1 |
| 2 — Nettoyage code mort | Élevé | 1-2h | 🟠 Semaine 2 |
| 3 — Profondeur scanners | Élevé | 1-2 semaines | 🟡 Semaines 3-4 |
| 4 — Crédibilité rapports | Moyen | 3-4h | 🟡 Semaines 3-4 |
| 5 — Business | Élevé | 1-2 semaines | 🟢 Mois 2 |
| 6 — Différenciation | Moyen | 2-3 semaines | 🟢 Mois 2-3 |
