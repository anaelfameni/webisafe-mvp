# 📋 INVENTAIRE COMPLET WEBISAFE — AUDIT INTÉGRAL & INSTRUCTIONS UTILISATEUR

> **Source de vérité** pour l'agent. Toutes les corrections demandées par l'utilisateur sont listées ci-dessous, regroupées par bloc thématique. Le bloc H (sécurité applicative) puis le bloc A (légal sans création d'entité) sont prioritaires.

---

## A. BLOCAGES COMMERCIAUX & LÉGAUX (10 items — à faire en premier)

- **A.1** Créer une entité juridique (entreprise individuelle min., RCCM Côte d'Ivoire). _Externe — non réalisé tant que la société n'est pas créée._
- **A.2** Mettre à jour `CGU.jsx:28` avec : nom commercial, RCCM, adresse complète, capital social. _Reporté (dépend A.1)._
- **A.3** Ajouter dans `CGU.jsx` un article **Droit de rétractation** (14 jours B2C, modalités B2B).
- **A.4** Ajouter dans `CGU.jsx` un article **Médiation à la consommation** avec coordonnées du médiateur.
- **A.5** Ajouter dans `CGU.jsx` une mention **TVA** ("TVA non applicable, art. X du CGI ivoirien" ou taux applicable).
- **A.6** Ajouter dans `CGU.jsx` un article **Garantie & SLA** (engagement de service, taux de disponibilité).
- **A.7** Mettre à jour `Confidentialite.jsx:25-27` avec un responsable de traitement = entité juridique. _Reporté (dépend A.1)._
- **A.8** Ajouter dans `Confidentialite.jsx` un article **Sous-traitants & destinataires des données** (Supabase, Sentry, GA4, Clarity, Wave, OpenRouter, etc. — chacun nommé).
- **A.9** Ajouter dans `Confidentialite.jsx` un article **Transferts hors UE/UEMOA** (Supabase = US).
- **A.10** Ajouter dans `Confidentialite.jsx` un article **Cookies détaillé** avec liste, durée, finalité.

> ✅ Items à exécuter maintenant : **A.3, A.4, A.5, A.6, A.8, A.9, A.10**

---

## B. EMAIL & DOMAINE (5 items)

- **B.1** Acheter le domaine `webisafe.com` ou `webisafe.ci`. _Externe._
- **B.2** Modifier `src/config/brand.js:11` → `SUPPORT_EMAIL = 'contact@webisafe.com'`. _Dépend B.1._
- **B.3** Vérifier toutes les occurrences Gmail. `Confidentialite.jsx:26` a un email codé en dur → à corriger.
- **B.4** Configurer redirection MX + SPF/DKIM/DMARC. _Externe._
- **B.5** Mettre à jour `CGU.jsx:27` (`webisafe.vercel.app` → domaine pro). _Dépend B.1._

---

## C. BRANDING VISUEL (8 items)

- **C.1** Créer un vrai logo SVG (`/public/logo.svg`). _Fichier fourni par utilisateur._
- **C.2** Remplacer le logo lettre dans `Header.jsx:82-84` par le SVG.
- **C.3** Remplacer le logo lettre dans `pdfTemplate.js:42-46` (fonction `brand`) par le SVG.
- **C.4** Créer favicon pro (`favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`). _Fichiers fournis._
- **C.5** Créer une OG image unique pour toutes les pages (1200×630). _Fichier fourni._
- **C.6** Charte typographique stricte (5-6 tailles : `text-xs`, `text-sm`, `text-base`, `text-xl`, `text-3xl`, `text-5xl`).
- **C.7** Réduire palette dans `Protect.jsx:74-81` (3 couleurs max).
- **C.8** Définir un kit couleurs strict dans `tailwind.config.js`.

> ✅ Items à exécuter : **C.1, C.2, C.3, C.4, C.5** (en attente des fichiers)

---

## D. MARQUEE & FOOTER (4 items)

- **D.1** Supprimer la marquee permanente `App.jsx:140-151` (ou bandeau statique sobre).
- **D.2** Supprimer les classes d'animation `animate-marquee` dans `index.css:213-227`.
- **D.3** Refaire le footer `Footer.jsx:23-29` (retirer 🔒 🌍 💳, mentions légales courtes).
- **D.4** Ajouter lien `/statistiques` au footer **OU supprimer la page**. _→ supprimer._

> ✅ Tous à exécuter.

---

## E. EMOJIS À ÉLIMINER (15 items)

- **E.1** `Home.jsx:163` — supprimer 🩺, hero "Audit complet en 60 secondes".
- **E.2** `Home.jsx:84-100` — 🐌 🔒 📉 → Lucide (Snail/Clock, ShieldAlert, TrendingDown).
- **E.3** `Home.jsx:343-366` — refaire le rapport exemple sans emojis.
- **E.4** `ScanProgress.jsx:15-24` — 8 emojis facts → Lucide.
- **E.5** `ScoreCard.jsx:68` — ✅⚠️—❌ → CheckCircle/AlertTriangle/MinusCircle/XCircle.
- **E.6** `RecommendationCard.jsx:117-120` — 🔴🟠🟡🟢 → badges colorés.
- **E.7** `Dashboard.jsx:311` — 🔴🟠 → badges colorés.
- **E.8** `Dashboard.jsx:109` — 🎉 retiré.
- **E.9** `Payment.jsx:211, 243` — ⚙️ → `<Settings size={14}/>`.
- **E.10** `NotFound.jsx:7` — 🔍 retiré.
- **E.11** `Corrections.jsx:97-100` — ⭐ → `<Star fill/>`.
- **E.12** `Corrections.jsx:22-46` — ⭐⭐⭐⭐ → labels textuels.
- **E.13** Audit `RecommendationCard.jsx:9-19, 21-47` pour autres emojis.
- **E.14** Tous écrans validation/succès : 🎉 ✓ ✅ → `<CheckCircle/>`.
- **E.15** Audit global grep emojis dans `/src` et nettoyer.

> ✅ Tous à exécuter (déjà largement avancé en session précédente).

---

## F. CRÉDIBILITÉ BUSINESS (12 items)

- **F.1** `Protect.jsx:407-417` — bloc témoignages → "Phase de lancement bêta — 10 premiers utilisateurs -50%".
- **F.2** Refaire `APropos.jsx:39-43` (mission, méthodologie, technos, partenaires). _Reporté (besoin photo/contenu)._
- **F.3** Ajouter section **Notre équipe** sur `APropos.jsx`.
- **F.4** `PricingSection.jsx:202-209` — bouton WhatsApp White Label → formulaire de devis structuré.
- **F.5** `AgenceDashboard.jsx:548-550` — retirer badge "Verified actif".
- **F.6** `Home.jsx:196-199` — sourcer les 3 stats (60% des sites africains, etc.) ou retirer. **Trouver les sources et ajuster les pourcentages.**
- **F.7** `Home.jsx:524` — retirer "Synchronisé en temps réel depuis Supabase".
- **F.8** Bandeau "En partenariat avec X". _Reporté._
- **F.9** Page `/cas-clients`. _Reporté (besoin de logos clients)._
- **F.10** `Contact.jsx:88` — formuler le numéro WhatsApp pro. _Optionnel._
- **F.11** Compteur de scans réel (masquer si <100).
- **F.12** Section Presse/Mentions. _Reporté._

> ✅ Items à exécuter : **F.1, F.3, F.4, F.5, F.6, F.7, F.11**

---

## G. HONNÊTETÉ DES DONNÉES (5 items)

- **G.1** `ScanInsightCards.jsx:32-50` — supprimer `buildFallbackBenchmark` ou retourner null.
- **G.2** `ScanInsightCards.jsx:112-209` — état vide pro quand bench null.
- **G.3** `useLiveStats.js` — masquer compteur si <100 scans.
- **G.4** `Statistiques.jsx` — disclaimer si peu de scans. _NB: page à supprimer (D.4)._
- **G.5** `Protect.jsx:235` — préciser "288 vérifications/jour" via UptimeRobot ou retirer.

> ✅ Tous à exécuter.

---

## H. CODE / SÉCURITÉ APPLICATIVE (10 items) ⚡ **PRIORITÉ #1**

- **H.1** `src/utils/agencyAccess.js:43` — supprimer le bypass `client@test.com` ou feature flag.
- **H.2** `Rapport.jsx:369` — sécuriser `location.state.adminBypass` côté serveur.
- **H.3** `Rapport.jsx:370` — idem `agencyBypass`.
- **H.4** `App.jsx:25, 129` — utiliser `Error.jsx/NotFoundPage` à la place de `NotFound.jsx`.
- **H.5** Supprimer `src/pages/NotFound.jsx`.
- **H.6** `Header.jsx` — incohérence label "Affiliation" vs route `/partenaire`.
- **H.7** `useAuth.js:7` — réévaluer `SHOULD_PERSIST_AUTH = !import.meta.env.DEV`.
- **H.8** Auditer `console.error` (`Rapport.jsx:479, 578`) → router via Sentry uniquement en prod.
- **H.9** `AuthModal.jsx:124` — retirer `await new Promise(... 800ms)`.
- **H.10** Vérifier rate limiting sur `/api/scan`, `/api/auth/*`, `/api/forgot-password`.

> ✅ Tous à exécuter.

---

## I. UX / FUNNEL DE PAIEMENT (8 items)

- **I.1** `Analyse.jsx:361-368` — délai FreemiumGate 15s → 30-45s ou trigger scroll.
- **I.2** Option "Pas maintenant — me rappeler dans 24h" sur le FreemiumGate.
- **I.3** Réduire funnel paiement à 4 étapes max. **Validation utilisateur requise** (3 propositions).
- **I.4** `Payment.jsx` — compte à rebours réaliste ("Réponse sous 2h ouvrées 8h-18h").
- **I.5** Email auto au client à réception demande de paiement.
- **I.6** `URLInput.jsx:164` — corriger "Résultats en quelques minutes" → "60 à 90 secondes".
- **I.7** Source unique du temps de scan (`Home.jsx:122` FAQ vs `URLInput.jsx:164`).
- **I.8** Bouton "Payer plus tard / Recevoir le rapport partiel par email". **Dépend I.3.**

> ✅ Items à exécuter immédiatement : **I.1, I.2, I.4, I.5, I.6, I.7**. **I.3 + I.8 → validation requise.**

---

## J. DESIGN UI (6 items)

- **J.1** `PricingSection.jsx:103-218` — grid 1/2/3 + Free en bandeau.
- **J.2** Standardiser boutons (primary, secondary, ghost).
- **J.3** Standardiser cards (un seul style de fond).
- **J.4** Header "scrolling" (réduit la hauteur au scroll).
- **J.5** Spacing global cohérent (classe utilitaire `section-spacing`).
- **J.6** Transitions de pages via `<AnimatePresence>` dans `App.jsx`.

> ✅ Tous à exécuter.

---

## K. PDF (8 items)

- **K.1** `pdfTemplate.js:42` — logo SVG dans `brand()`.
- **K.2** Signature consultant. _Reporté (besoin nom + signature)._
- **K.3** Ton "Webisafe recommande" → "Notre équipe recommande".
- **K.4** Icônes inline SVG par section.
- **K.5** `pdfTemplate.js:50` — footer avec domaine pro. _Dépend B.1._
- **K.6** Page Glossaire (LCP, CLS, TBT, CSP, SRI, DNSSEC, etc.).
- **K.7** Page Comparaison avant/après.
- **K.8** QR code en page de garde.

> ✅ Items à exécuter : **K.1, K.3, K.4, K.5, K.6, K.7, K.8**

---

## L. TARIFS & OFFRES (7 items)

- **L.1** `Tarifs.jsx:23-26` — "Aucun remboursement" → "Garantie satisfait ou remboursé 7 jours".
- **L.2** Plan trimestriel/semestriel Protect (-10%, -15%).
- **L.3** Plan annuel Protect (-20% = 144 000 FCFA/an).
- **L.4** Plan combiné "Audit + Correction" avec discount.
- **L.5** Affichage "par mois" vs "one-time" clairement.
- **L.6** Comparatif vs concurrents. _Reporté._
- **L.7** Champ "Code promo" dans le checkout.

> ✅ Items à exécuter : **L.1, L.2, L.3, L.4, L.5, L.7**

---

## M. CONTENU & COPYWRITING (6 items)

- **M.1** Réécrire le hero `Home.jsx`. **Validation utilisateur requise** (3 propositions).
- **M.2** Réécrire les 3 problem cards `Home.jsx:84-100`. _Optionnel._
- **M.3** Page `/methodologie`. _Reporté._
- **M.4** Page `/blog` ou `/ressources` avec **3 articles vérifiés** sur perf web Côte d'Ivoire.
- **M.5** `Protect.jsx` — réécrire "Un dev à temps partiel = 150 000/mois".
- **M.6** Audit fautes de français (Tarifs, Protect, APropos).

> ✅ Items à exécuter : **M.4, M.5, M.6**. **M.1 → validation requise.**

---

## N. SEO & METADATA (8 items)

- **N.1** Meta title/description/keywords par page.
- **N.2** `react-helmet-async` pour `<title>` dynamique.
- **N.3** OG tags par page.
- **N.4** Twitter Card tags par page.
- **N.5** Schema.org JSON-LD Organization + SoftwareApplication.
- **N.6** sitemap.xml automatisé.
- **N.7** robots.txt propre.
- **N.8** `<link rel="canonical">` par page.

> ✅ Tous à exécuter. **NB:** `aggregateRating` factice à retirer dans `index.html`.

---

## O. PERFORMANCE & MONITORING (6 items)

- **O.1** `vite build --analyze` → identifier code-split.
- **O.2** `loading="lazy"` sur images.
- **O.3** Compression Brotli/Gzip Vercel.
- **O.4** Service Worker pour cache statique.
- **O.5** Lighthouse home prod → cible >85.
- **O.6** Configuration Sentry (`SENTRY_DSN`).

> ✅ Tous à exécuter.

---

## P. ACCESSIBILITÉ (5 items) — **non listés dans la priorité utilisateur**

- P.1-P.5 reportés.

---

## Q. INTERNATIONALISATION (3 items)

- **Q.1** Version anglaise via `i18next`.
- **Q.2** Détection auto langue.
- **Q.3** Sélecteur de langue dans Header.

> ✅ Tous à exécuter.

---

## R. FONCTIONNALITÉS MANQUANTES (8 items)

- **R.1** Alerte email régression. _Non listé par l'utilisateur._
- **R.2** Partage rapport via lien tokenisé.
- **R.3** Export CSV/JSON.
- **R.4** Replay du scan à 30 jours.
- **R.5** Système de tickets de support.
- **R.6** Notification push web validation paiement.
- **R.7** Notes/commentaires internes (B2B).
- **R.8** Plan de correction PDF/Markdown séparé.

> ✅ Items à exécuter : **R.2-R.8**.

---

## S. PROTECT (5 items)

- **S.1** `Protect.jsx:255` — retirer "Wave Business" (Wave non PCI-DSS).
- **S.2** Documenter monitoring Protect (fréquence, alertes, canaux).
- **S.3** Page publique `/protect/status` (uptime Webisafe).
- **S.4** Dashboard Protect détaillé pour abonnés.
- **S.5** Conditions d'annulation Protect dans CGU.

> ✅ Tous à exécuter.

---

## T. AGENCE / WHITE LABEL (4 items)

- **T.1** Page `/white-label` documentée.
- **T.2** Page "branding" avec preview live PDF.
- **T.3** Système de facturation agences.
- **T.4** CRM léger client B2B.

> ✅ Tous à exécuter.

---

## U. ADMIN (3 items)

- **U.1** Middleware serveur strict pour `/admin`.
- **U.2** Audit log actions admin.
- U.3 2FA admin. _Non listé par l'utilisateur._

> ✅ Items à exécuter : **U.1, U.2**.

---

## V. AFFILIATION (3 items)

- **V.1** `AffiliateDashboard.jsx` — protéger via auth/token signé.
- V.2 Paiement automatique commissions. _Non listé par l'utilisateur._
- **V.3** Dashboard tracking détaillé.

> ✅ Items à exécuter : **V.1, V.3**.

---

## W. DIVERS (5 items)

- **W.1** `vercel.json` — vérifier config (headers, redirections, edge).
- **W.2** Fichier `.well-known/security.txt`.
- **W.3** SSL EV/DV `webisafe.com`. _Externe (B.1)._
- **W.4** DNSSEC sur le domaine. _Externe._
- W.5 humans.txt. _Non listé._

> ✅ Items à exécuter : **W.1, W.2, W.3, W.4** (W.3/W.4 dépendent du domaine).

---

## ❓ VALIDATIONS REQUISES

### M.1 — Hero Home (3 propositions)

- **A — Audit B2B / autorité**: "L'audit web professionnel pour PME africaines"
- **B — Conversion business** ⭐ recommandé: "Détectez les failles qui font fuir vos clients"
- **C — Urgence**: "Votre site perd des clients sans que vous le sachiez"

### I.3 — Funnel paiement 4 étapes

- **A — CinetPay** ⭐ recommandé (Wave + MTN + Orange + cartes, ~3% commission, 1-2j intégration)
- **B — Wave Business + webhook** (1% commission, KYC entreprise, 2-3j)
- **C — Lien magique pré-payé** (pas d'API tierce, 1j, mais reste partiellement manuel)

### I.8 — Bouton "Payer plus tard / rapport partiel email"
Dépend de la décision I.3.

---

## 🔥 PROBLÈMES CRITIQUES IDENTIFIÉS

- **`index.html`** : `aggregateRating { ratingValue: "4.8", ratingCount: "120" }` factice → à retirer (risque manual action Google + problème légal).
- **`index.html:14`** : référence `/favicon-512.png` qui n'existe pas (fichier réel = `android-chrome-512x512.png`).

---

## 📊 TOTAL

154 items recensés. ~3 mois solo. Mais 20 prioritaires suffisent pour passer de 9.9/20 à 14-15/20 (vendable).
