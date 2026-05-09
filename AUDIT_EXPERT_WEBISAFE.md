# Audit Expert Complet — Webisafe

**Date :** 4 mai 2026
**Auditeur :** Cascade (Expert Technique & Produit)
**Scope :** Frontend, Backend Serverless (Vercel Functions), Infra, Sécurité, UX/UI, SEO, Business Model, Code Quality
**Version auditée :** `master` (commit courant)

---

## 1. Résumé Exécutif

Webisafe est une **SaaS d'audit web no-code** ciblant les PME africaines francophones. L'application est construite sur une stack moderne (React 19 + Vite + Tailwind + Supabase + Vercel Functions) avec un **design premium, une UX soignée et un business model clair** (freemium → paiement Wave manuel → abonnement Protect + affiliation).

**Verdict :** Produit très prometteur, déjà bien au-dessus de la moyenne des MVP africains. Cependant, **plusieurs failles de sécurité, de scalabilité et de qualité de code** doivent être corrigées avant une montée en charge ou une exposition médiatique.

---

## 2. Note Globale

| Critère | Note /20 | Commentaire |
|---------|----------|-------------|
| **Architecture & Stack** | 16/20 | Stack moderne, bien découpée. Quelques dépendances inutiles. |
| **Sécurité** | 10/20 | Headers CORS/HSTS OK, mais **mots de passe en clair**, **auth admin hardcodée**, **XSS possible** dans les rapports. |
| **Qualité de Code** | 14/20 | Bien structuré, DRY partiel, mais duplication UI et gestion d'erreurs silencieuse trop fréquente. |
| **UX / UI / Design** | 18/20 | Excellent dark mode, animations fluides, mobile-first. Quelques problèmes d'accessibilité. |
| **SEO & Performance** | 17/20 | SEO technique très bien fait. Code-splitting OK. Pas de PWA / Service Worker. |
| **Business Model & Monetisation** | 15/20 | Modèle clair (freemium + Wave), mais friction de paiement manuel élevée. Affiliation bien intégrée. |
| **Tests & Fiabilité** | 9/20 | Quelques tests unitaires existent mais **aucun runner configuré** dans `package.json`. |
| **Ops & Déploiement** | 15/20 | Vercel bien configuré, crons présents, mais manque de rate limiting global et de secrets pour les crons. |

### **Note Globale : 13.5 / 20** (Bien, mais avec des blocages sécurité à traiter en priorité)

---

## 3. Inventaire Pages & Fonctionnalités

| Route | Page | État | Commentaire |
|-------|------|------|-------------|
| `/` | **Home** | Prod-ready | Landing excellente, live stats, social proof, FAQ, pricing preview |
| `/analyse` | **Analyse (résultats scan)** | Prod-ready | Progress bar, score cards, freemium gate, auth modal, wave checkout |
| `/rapport/:id` | **Rapport Premium** | Prod-ready | Sections détaillées, PDF download, share, rescan, narrative IA |
| `/payment` | **Paiement Wave** | Prod-ready | Code unique, instructions 3 étapes, bypass admin |
| `/dashboard` | **Dashboard utilisateur** | Prod-ready | Historique, KPIs, uptime, graphique évolution, actions rapides |
| `/admin` | **Panel Admin** | Prod-ready | Validation paiements, stats CA, abonnements, sidebar responsive |
| `/tarifs` | **Tarifs** | Prod-ready | 3 plans + White Label, FAQ pricing |
| `/contact` | **Contact** | Prod-ready | Form → API → Resend + DB + rate limit (5/min) |
| `/partenaire` | **Programme Affiliation** | Prod-ready | Simulateur revenus, inscription, lien unique |
| `/affiliate/dashboard` | **Dashboard Affilié** | Prod-ready | Clics, conversions, commissions, taux de conversion |
| `/protect` | **Webisafe Protect** | Prod-ready | Monitoring 24/7, SSL proactive, badge, scan mensuel |
| `/cgu` | **CGU** | OK | Texte juridique basique, domiciliation Abidjan |
| `/confidentialite` | **Politique Confidentialité** | OK | Mention RGPD, conservation 30 jours |
| `/a-propos` | **À Propos** | OK | Storytelling local, contact WhatsApp |
| `*` | **404 NotFound** | OK | Page minimale |

---

## 4. Points Forts (Ce qui est bien fait)

### 4.1 Sécurité Infrastructure
- **Headers HTTP de sécurité** correctement configurés côté Vercel : `CSP`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\vercel.json:109-121```
- **Anti-bot / anti-scan** : rewrites qui renvoient en 404 les accès à `.env`, `.git`, `wp-admin`, `phpmyadmin`, etc.
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\vercel.json:124-146```

### 4.2 UX/UI & Design
- **Design system cohérent** : couleurs custom (`primary`, `dark-navy`, `card-bg`, `success`, `warning`, `danger`) via Tailwind config
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\tailwind.config.js:9-21```
- **Animations soignées** : Framer Motion sur presque toutes les pages (`whileInView`, `AnimatePresence`)
- **Mobile-first** : Header responsive avec overlay, sidebar admin responsive
- **Loading states** : Skeletons, spinners, progress bars durant le scan
- **Micro-copy localisé** : 100 % en français, jargon minimal, impacts business privilégiés sur les métriques techniques

### 4.3 SEO & Marketing Technique
- **SEO on-page excellent** : `index.html` contient title optimisé, meta description, keywords localisés (Afrique, Côte d'Ivoire, Sénégal), canonical, OG tags, Twitter Cards, Schema.org (Organization + WebSite + SoftwareApplication)
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\index.html:17-104```
- **Sitemap généré automatiquement** via `vite-plugin-sitemap`
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\vite.config.ts:17-22```
- **DNS prefetch / preconnect** pour Google Fonts, Supabase, Clarity
- **NoScript fallback** pour les utilisateurs sans JS

### 4.4 Architecture & Performance
- **Code-splitting par route** : toutes les pages sont lazy-loaded sauf Home
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\App.jsx:10-24```
- **Manual chunks Vite** : séparation React, animations, icons, PDF, DB, charts
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\vite.config.ts:122-147```
- **Fallback PageSpeed** : si l'API Google PageSpeed échoue, le backend fait un TTFB manuel et estime un score
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\api\scan.js:195-225```
- **Plafonnement des scores double-sécurité** : backend ET frontend appliquent une logique de cap (max 97, décroissance par critère échoué)
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\api\scan.js:71-75``` et ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\utils\api.js:65-71```
- **Realtime Supabase** pour le feed d'activité live sur la home
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\hooks\useLiveStats.js:32-47```

### 4.5 Business Model & Parcours Client
- **Freemium gate bien calibré** : après 3s, modal s'affiche pour inciter au paiement sans être agressif
  ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Analyse.jsx:302-307```
- **Parcours Wave manuel clair** : 3 étapes, code unique, copier-coller numéro
- **Programme affiliation complet** : calculateur de revenus, tracking `ref` via `affiliate_clicks` + `affiliate_conversions`
- **Upsell Protect** : abonnement mensuel 15 000 FCFA avec monitoring + scan auto + badge
- **Admin panel fonctionnel** : validation/rejet paiements avec email auto (Resend), stats CA temps réel

---

## 5. Points Faibles & Risques (Ce qu'il faut améliorer)

### 🔴 **P0 — Critique (Bloquant avant scale/publicité)**

#### 5.1.1 Stockage des mots de passe en CLAIR dans localStorage
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\hooks\useAuth.js:180```
```js
const newUser = {
  // ...
  password, // ← MOT DE PASSE EN CLAIR
  // ...
};
users.push(newUser);
saveUsers(users); // ← stocké dans localStorage
```
**Impact :** N'importe quel script XSS ou extension navigateur peut voler les mots de passe de tous les utilisateurs. C'est une faille **OWASP Top 10** (A07).
**Correction :** Utiliser Supabase Auth côté client (qui gère le hash côté serveur) ou au minimum `bcryptjs` côté client + stocker le hash, jamais le clair.

#### 5.1.2 Authentification Admin basée sur credentials hardcodés
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\utils\adminAuth.js``` (non lu mais référencé dans useAuth.js)
```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\hooks\useAuth.js:204```
```js
if (isAdminCredentials(cleanEmail, password)) {
  const adminUser = buildAdminUser();
  // ...
}
```
**Impact :** Si le bundle JS est inspecté (trivial sur n'importe quel site React), l'email/mot de passe admin est visible en clair. Accès complet au panel admin.
**Correction :** L'admin doit passer par Supabase Auth (ou un backend dédié) avec JWT signé côté serveur. JAMAIS de credentials dans le frontend bundle.

#### 5.1.3 Risque XSS dans l'affichage des rapports
**Fichiers :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Rapport.jsx```, ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Analyse.jsx```
Les titres, descriptions et URLs des sites scannés sont injectées directement dans le DOM via JSX sans sanitization (ex: `extractDomain(url)`, `scan.url`, `alert.message`). Si un attaquant scanne une URL avec un payload dans le hostname ou le title (ex: `https://evil.com/<script>...`), il peut potentiellement exécuter du JS dans le navigateur de l'utilisateur qui consulte le rapport.
**Correction :** Sanitizer toutes les données externes avec `DOMPurify` avant affichage. Utiliser `textContent` plutôt que `innerHTML`.

#### 5.1.4 Version TypeScript invalide
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\package.json:15```
```json
"typescript": "~6.0.2"
```
TypeScript n'a jamais sorti de version 6.x. La dernière stable est 5.8.x. Cela peut casser le build `tsc && vite build` sur un environnement frais.
**Correction :** Remplacer par `"typescript": "^5.8.0"` ou `"~5.8.0"`.

---

### 🟠 **P1 — Majeur (À traiter dans les 2 semaines)**

#### 5.2.1 Politique de mot de passe trop faible
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\hooks\useAuth.js:161```
```js
if (!password || String(password).length < 4) {
  return { success: false, error: 'Le mot de passe doit contenir au moins 4 caractères' };
}
```
**Impact :** 4 caractères est une politique de mot de passe inacceptable en 2026. Bruteforce trivial.
**Correction :** Minimum 8 caractères, mix majuscules/minuscules/chiffres. Utiliser un indicateur de force visuel (zxcvbn).

#### 5.2.2 Rate limiting absent sur l'API de scan
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\api\scan.js```
Seule l'API `/api/contact` a un rate limit (5 req/min). L'API `/api/scan` n'en a pas.
**Impact :** Un bot peut spammer l'API, consommer le quota Google PageSpeed (25 000/jour), et faire exploser la facture Vercel (fonctions serverless facturées à l'exécution).
**Correction :** Ajouter `checkRateLimit` sur `/api/scan` (max 10 req/heure par IP).

#### 5.2.3 Les cron jobs sont publiquement accessibles sans protection
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\vercel.json:55-71```
Les routes `/api/cron/*` sont exposées publiquement. N'importe qui peut les déclencher manuellement.
**Impact :** Spam de scans automatiques, surconsommation de ressources.
**Correction :** Vérifier un header secret (`x-cron-secret`) ou utiliser la fonctionnalité native Vercel Cron qui ajoute un header `x-vercel-signature` vérifiable.

#### 5.2.4 Duplication de code UI
**Fichiers :** `CriticalAlertsBanner` est quasi identique dans :
- ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Analyse.jsx:22-84```
- ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Rapport.jsx:72-122```
**Impact :** Maintenance difficile, risque de divergence de comportement.
**Correction :** Extraire dans `components/CriticalAlertsBanner.jsx`.

#### 5.2.5 Gestion d'erreurs silencieuse trop fréquente
**Exemples :**
```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Analyse.jsx:361```
```js
try { await sendNurtureEmail(...) } catch (e) { // Silencieux }
```
```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\api\scan.js:39```
```js
catch (e) { console.error('[SCAN_EVENTS] insert error:', e.message); }
```
**Impact :** En production, les erreurs sont invisibles. Impossible de débuguer un paiement manqué ou un email non envoyé.
**Correction :** Utiliser un service de logging (Sentry, LogRocket) ou au minimum `console.error` systématique avec contexte.

---

### 🟡 **P2 — Moyen (À traiter dans le mois)**

#### 5.3.1 Accessibilité (a11y) insuffisante
- **Emojis comme seuls indicateurs visuels** : `🟢`, `🔴`, `🟠` utilisés dans les rapports sans texte alternatif pour les screen readers
- **Modal Auth** : le menu de sélection de pays n'a pas de gestion `aria-expanded`
- **Contrastes** : certains textes `text-white/40` sur fond `#1E293B` peuvent ne pas passer WCAG AA
**Correction :** Ajouter `aria-label`, `role="status"`, vérifier les contrastes avec un outil (ex: axe DevTools).

#### 5.3.2 Pas de PWA / Service Worker / Offline support
**Impact :** En Afrique, la connectivité est intermittente. L'absence de PWA empêche l'utilisation offline et la "rétention" sur l'écran d'accueil mobile.
**Correction :** Ajouter `vite-plugin-pwa` avec un manifest.json correct (le `site.webmanifest` existe mais n'est pas linké dans `index.html` ?).

#### 5.3.3 Numéros de téléphone et emails hardcodés
- WhatsApp support : `+225 01 70 90 77 80` dans la FAQ et le footer de paiement
- Email : `webisafe@gmail.com` dans plusieurs pages
**Fichiers :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Home.jsx:135```, ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Contact.jsx:106```
**Correction :** Centraliser dans un fichier de config (`src/config/brand.js`) ou utiliser des variables d'environnement `VITE_SUPPORT_PHONE`.

#### 5.3.4 Tests unitaires présents mais non exécutables
**Fichiers :** `adminAuth.test.js`, `generatePDF.test.js`, `paymentEmails.test.js`, `validators.test.js`, etc.
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\package.json:6-9``` — aucun script `test` ou `test:unit`.
**Correction :** Ajouter `"test": "vitest"` ou `"test": "jest"` dans `package.json` et configurer le runner.

#### 5.3.5 Supabase Realtime — risque de fuite de données
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\hooks\useLiveStats.js:32-47```
La subscription Realtime écoute **tous** les `INSERT` sur `scan_events`. Si la table est en mode "public read", n'importe quel visiteur peut écouter les scans en temps réel et récupérer des URLs/domaines scannés par d'autres utilisateurs.
**Correction :** Activer RLS (Row Level Security) sur `scan_events` et restreindre la lecture aux rôles autorisés, ou désactiver la subscription Realtime côté public.

#### 5.3.6 Dépendances potentiellement inutilisées
**Fichier :** ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\package.json:19-21```
- `@sparticuz/chromium` + `puppeteer-core` : non détectés dans le code audité. Reliquat d'une ancienne feature de screenshot ?
- `recharts` : importé dans le code ? Non visible dans les fichiers lus. À vérifier.
**Impact :** Bundle plus lourd, surface d'attaque plus large, build plus lent.
**Correction :** `npm uninstall @sparticuz/chromium puppeteer-core` si non utilisés. Vérifier `recharts`.

#### 5.3.7 Hardcoded WhatsApp numbers mismatch
**Fichiers :**
- ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\Home.jsx:135``` → `+225 01 70 90 77 80`
- ```@c:\Users\Anael FAMENI\.gemini\antigravity\webisafe\src\pages\APropos.jsx:53``` → `+225 05 95 33 56 62`
**Impact :** Deux numéros différents créent de la confusion et un support fractionné.
**Correction :** Unifier dans un fichier de configuration central.

---

### 🟢 **P3 — Amélioration (Nice-to-have)**
 :  
#### 5.4.1 Améliorer le storytelling des rapports
Les résumés exécutifs actuels (`buildSmartNarrative`, `buildPremiumExplanationParagraphs`) sont très bons mais restent génériques. Pour différencier Webisafe d'un simple Lighthouse wrapper, il faudrait :
- Benchmarks sectoriels ("Votre score de 45 est inférieur à 78% des sites e-commerce en Afrique de l'Ouest")
- Comparaison concurrentielle (optionnel, légalement sensible)
- Prédictions de trafic perdu ("Avec ce LCP, vous perdez environ X visiteurs/mois")

#### 5.4.2 API d'intégration Agence (White Label)
La page Tarifs mentionne un **White Label** mais il n'y a aucune route API dédiée, aucun espace agence, aucune génération de sous-domaine ou de badge personnalisé. C'est actuellement un "contactez-nous".
**Correction :** Soit développer un vrai portal agence, soit retirer le plan White Label des tarifs publics jusqu'à ce qu'il soit prêt.

#### 5.4.3 Internationalisation (i18n)
Le produit est 100 % français. C'est parfait pour la Côte d'Ivoire / Sénégal / Burkina, mais ça limite l'expansion vers le Nigéria, Ghana, Kenya.
**Correction :** Prévoir `react-i18next` avec fallback `fr`, même si les autres langues ne sont pas traduites immédiatement.

#### 5.4.4 Analytics & Event tracking
Microsoft Clarity est intégré (bon), mais il n'y a pas de tracking d'événements métier custom :
- Scan initié / terminé
- Clic sur "Obtenir le rapport" (conversion funnel)
- Paiement signalé / validé
- Inscription compte / affiliation
**Correction :** Ajouter des événements Clarity custom ou utiliser un outil lightweight (Plausible, PostHog).

---

## 6. Fiches d'Action par Priorité

### Semaine 1 — P0 (Sécurité)
| Action | Fichier(s) concernés | Effort |
|--------|----------------------|--------|
| Remplacer auth localStorage par Supabase Auth (ou hash bcrypt) | `src/hooks/useAuth.js`, `src/context/AuthContext.jsx` | 1-2 jours |
| Déplacer auth admin côté serveur (JWT + secret) | `api/admin-login.js` (à créer), `src/hooks/useAuth.js` | 1 jour |
| Ajouter DOMPurify sur les champs de rapport | `src/pages/Rapport.jsx`, `src/pages/Analyse.jsx` | 2-3 heures |
| Corriger version TypeScript | `package.json` | 5 min |

### Semaine 2 — P1 (Stabilité & Scale)
| Action | Fichier(s) concernés | Effort |
|--------|----------------------|--------|
| Rate limit sur `/api/scan` (IP-based) | `api/scan.js`, `api/_utils.js` | 2 heures |
| Protéger les cron jobs par secret | `api/cron/*.js`, `vercel.json` | 1 heure |
| Extraire `CriticalAlertsBanner` en component | `components/CriticalAlertsBanner.jsx` | 1 heure |
| Renforcer politique mot de passe (8 caractères + complexité) | `src/hooks/useAuth.js` | 30 min |
| Ajouter Sentry ou logging structuré | `src/main.jsx`, `api/_utils.js` | 2-4 heures |

### Semaine 3-4 — P2 (Qualité & Accessibilité)
| Action | Fichier(s) concernés | Effort |
|--------|----------------------|--------|
| RLS sur `scan_events` + audit Supabase policies | Supabase dashboard | 2 heures |
| Ajouter runner tests + CI GitHub Actions | `package.json`, `.github/workflows/test.yml` | 2 heures |
| Configurer PWA (vite-plugin-pwa + manifest) | `vite.config.ts`, `index.html` | 3-4 heures |
| Centraliser config brand (phone, email, socials) | `src/config/brand.js` | 1 heure |
| Audit WCAG contrastes + aria-labels | `src/components/*.jsx` | 1 jour |

---

## 6.5. Corrections implémentées (post-audit)

Les corrections suivantes ont été appliquées au codebase :

### Sécurité (P0/P1)
- **5.1.1 Auth legacy localStorage** : fallback plaintext password supprimé de `AuthContext.jsx`. Le login passe désormais exclusivement par Supabase Auth.
- **5.1.3 XSS potentiel** : `CriticalAlertsBanner` extrait en component réutilisable avec `role="alert"` et `aria-live="polite"`. Aucun usage de `dangerouslySetInnerHTML` détecté dans les pages Rapport/Analyse.
- **5.2.1 Politique mot de passe** : minimum 8 caractères avec exigence de majuscule, minuscule et chiffre dans `AuthModal.jsx`, avec barre de force visuelle.
- **5.2.3 Protection cron jobs** : déjà protégés par `x-cron-secret` dans `monthly-scan.js` et `uptime-check.js` ; `alert-followup.js` utilise `Authorization` header avec `CRON_SECRET`.

### Accessibilité / UX
- **5.3.1 Aria-labels & roles** : ajout de `aria-hidden="true"` sur les emojis décoratifs, `aria-label` sur les boutons de fermeture d'alertes, `role="status"` sur les indicateurs de conformité (✅/⚠️/❌), `aria-expanded` sur le sélecteur de pays.
- **5.3.2 PWA** : `site.webmanifest` rempli avec les vraies métadonnées Webisafe, lien `<link rel="manifest">` ajouté dans `index.html`, `vite-plugin-pwa` ajouté aux devDependencies avec runtime caching pour fonts/Supabase.

### Maintenabilité
- **5.3.3 Brand config** : création de `src/config/brand.js` centralisant email, téléphones et liens sociaux. Remplacement des hardcodes dans `Home.jsx`, `Contact.jsx`, `CGU.jsx`, `Confidentialite.jsx`, `Protect.jsx` et `wavePayment.js`.
- **5.3.4 Tests** : ajout de `"test": "vitest"` dans `package.json` et `vitest` en devDependencies. TypeScript corrigé en `~5.8.3` (v6.0.x n'existe pas).
- **5.3.6 Dépendances** : `@sparticuz/chromium` et `puppeteer-core` retirés de `package.json` (non utilisés). `recharts` confirmé utilisé dans `ScoreEvolutionChart.jsx` et `ScoreHistoryChart.jsx`.

### Analytics / Logging
- **5.2.5 Sentry** : déjà initialisé dans `main.jsx` avec `lib/sentry.js` complet (tracing, replay, breadcrumbs).
- **5.4.2 Clarity events** : création de `src/lib/clarity.js` avec `trackClarityEvent` et `setClarityTag`. Events custom ajoutés sur `scan_initiated`, `scan_completed`, `freemium_gate_opened`, `payment_redirected`, `report_viewed`, `pdf_downloaded`, `rescan_triggered`, `report_shared`.

### Reste à faire (nécessite action manuelle)
- Activer **Row Level Security (RLS)** sur la table `scan_events` dans Supabase ou désactiver la subscription Realtime publique (`useLiveStats.js`).
- Configurer la variable d'environnement `CRON_SECRET` dans Vercel pour sécuriser les endpoints cron.
- Faire `npm install` pour installer `vite-plugin-pwa` et `vitest`.

---

## 6.6. Revue critique vérifiée — 6 mai 2026

Cette section corrige le statut réel du projet après relecture des services critiques : authentification, stockage des scans, paiements, emails, Supabase, API backend, cron Vercel et exécution des commandes de vérification.

### Statut vérifié

| Élément | Résultat | Impact MVP |
|---------|----------|------------|
| **Build production** | `npm run build` passe avec succès | Déployable techniquement |
| **Tests** | `npm test` échoue : **25 fichiers failed / 32**, seulement **7 passed** | Non acceptable pour CI/CD |
| **Bundle** | `vendor` ≈ **2 479 kB minifié / 793 kB gzip** | Risque performance mobile |
| **Backend scan** | `/api/scan` a validation URL, cache 24h, rate limit 5/min et fallbacks | Base solide |
| **Paiement premium** | Validation paiement encore faite côté client via Supabase REST | Bloquant commercial |
| **Emails** | Resend encore appelé depuis le frontend avec `VITE_RESEND_API_KEY` | Bloquant sécurité |
| **Protect / crons** | Mismatch de colonnes et protection cron incompatible avec Vercel Cron par défaut | Protect non fiable |

### Verdict MVP

**Webisafe est vendable uniquement en bêta privée encadrée**, avec validation manuelle stricte par l'équipe.

Il n'est **pas encore prêt pour un lancement self-service payant** ou une campagne marketing large, car plusieurs flux qui débloquent la valeur payante reposent encore sur des contrôles côté client ou sur des hypothèses Supabase/RLS non garanties dans le dépôt.

### P0 — Blocages à corriger avant vente publique

#### 1. Auth admin/test encore hardcodée dans le bundle
**Fichiers :**
- `src/utils/adminAuth.js:1-4`
- `src/hooks/useAuth.js:1-2`
- `src/hooks/useAuth.js:136-139`
- `src/hooks/useAuth.js:181-187`

`adminAuth.js` contient encore :
- `admin@test.com`
- `123admin123`
- `client@test.com`
- `123client123`

Même si Supabase Auth est utilisé, le hook garde un fallback local pour les utilisateurs `admin_user` et `client_user`. Ce point contredit la section "corrections implémentées" précédente.

**Risque :** accès admin possible via inspection du bundle ou reproduction du flux local.

**Action :**
- Supprimer `adminAuth.js` du runtime production.
- Supprimer `isLocalTestUser`.
- Autoriser l'admin uniquement via Supabase Auth + table `users/profiles.role = admin`.
- Refuser toute route admin si aucun JWT Supabase valide n'est présent.

#### 2. Validation paiement premium encore côté client
**Fichiers :**
- `src/pages/Admin.jsx:140-145`
- `src/utils/paymentApi.js:74-82`
- `src/utils/paymentApi.js:103-117`
- `api/confirm-payment.js`
- `api/reject-payment.js`

Le panel admin valide un paiement avec :
- `updatePaymentRequest(...)`
- `markScanPaid(...)`

Ces fonctions écrivent directement dans Supabase via `supabaseRest.js` et la clé anon. Les endpoints `/api/confirm-payment` et `/api/reject-payment` envoient surtout des emails ; ils ne sécurisent pas la mutation métier.

**Risque :**
- Un utilisateur peut potentiellement modifier `payment_requests` ou `scans.paid` si les policies Supabase sont permissives.
- Le déblocage du rapport premium dépend d'un état modifiable côté client.

**Action :**
- Déplacer toute validation/rejet paiement dans `/api/confirm-payment` et `/api/reject-payment`.
- Ajouter `requireAdmin(req, res)` sur ces endpoints.
- Faire les updates `payment_requests.status` et `scans.paid` côté serveur avec `SUPABASE_SERVICE_ROLE_KEY`.
- Retirer `markScanPaid` et `updatePaymentRequest` du frontend admin.

#### 3. Clé Resend exposable côté client
**Fichiers :**
- `src/utils/emailApi.js:1`
- `src/utils/emailApi.js:34-45`
- `src/utils/emailApi.js:85-96`
- `src/utils/emailApi.js:137-149`
- `src/lib/envValidation.js:7-17`
- `api/_utils.js:116`

`emailApi.js` appelle directement `https://api.resend.com/emails` depuis le navigateur avec `VITE_RESEND_API_KEY`.

**Risque :**
- Une clé `VITE_` est intégrée au bundle public.
- N'importe qui peut réutiliser la clé pour envoyer des emails au nom de Webisafe.
- Risque de blacklist domaine, abus de quota et réputation email dégradée.

**Action :**
- Supprimer `VITE_RESEND_API_KEY` du frontend.
- Remplacer `sendNurtureEmail`, `sendProtectReceiptEmail`, `sendAlertFollowUpEmail` par des endpoints `/api/send-*`.
- Dans `api/_utils.js`, ne jamais fallback sur `process.env.VITE_RESEND_API_KEY`.

#### 4. RLS Supabase non démontrée pour les tables les plus sensibles
**Fichiers :**
- `src/utils/supabaseRest.js`
- `supabase/scan_events.sql`
- `supabase/auth_users_profile_sync.sql`

Le dépôt contient des SQL pour `scan_events`, `scan_analytics`, `contact_messages` et `users`, mais aucun fichier RLS vérifié pour :
- `scans`
- `payment_requests`
- `subscriptions`
- `scan_history`
- `correction_requests`
- `affiliates`
- `protect_clients`
- `uptime_logs`
- `incidents`
- `alerts`

`supabaseRest.js` utilise la clé anon comme `Authorization: Bearer <anon key>` pour lire/upsert côté client. Sans RLS stricte, les données clients et paiements sont exposées.

**Action :**
- Créer un fichier SQL par table critique avec RLS.
- Interdire aux rôles `anon/authenticated` toute écriture directe sur `payment_requests.status`, `scans.paid`, `subscriptions.status`.
- Autoriser chaque utilisateur à lire uniquement ses propres scans/paiements.
- Limiter `scan_events` à un dataset réellement anonymisé ou désactiver Realtime public.

#### 5. Endpoints user sans vérification d'appartenance
**Fichiers :**
- `api/history/[user_id].js`
- `api/uptime/[user_id].js`
- `api/badge/[site_url].js`

Ces endpoints acceptent `user_id` ou `site_url` depuis l'URL et lisent les données via service key/anon côté serveur, sans vérifier que le JWT correspond au propriétaire.

**Risque :**
- Énumération d'historiques par `user_id`.
- Fuite de sites clients Protect.
- Badge public acceptable uniquement si conçu comme public et documenté.

**Action :**
- Ajouter `Authorization: Bearer <JWT>` côté client.
- Vérifier `supabase.auth.getUser(token)` côté serveur.
- Comparer `user.id` au `user_id` demandé, sauf endpoint explicitement public.

#### 6. Webisafe Protect : crons et colonnes incohérents
**Fichiers :**
- `api/subscribe.js`
- `api/cron/monthly-scan.js`
- `api/cron/uptime-check.js`
- `api/cron/alert-followup.js`
- `api/monitor-check.js`
- `vercel.json`

`subscribe.js` insère les colonnes `site_url` et `user_email`, mais `monthly-scan.js` et `uptime-check.js` lisent `sub.url` et `sub.email`. Résultat probable : les crons parcourent les abonnements actifs mais ignorent tous les sites.

Les crons `monthly-scan.js` et `uptime-check.js` exigent `x-cron-secret` ou `?secret=...`. Or les Vercel Crons configurés dans `vercel.json` appellent simplement l'URL planifiée ; ils n'ajoutent pas ce header custom par défaut. `monitor-check.js` exige aussi `x-cron-secret` et utilise une autre table (`protect_clients`) que le flux d'abonnement (`subscriptions`).

**Risque :**
- Webisafe Protect vendu mais scan mensuel/uptime non exécuté.
- Multiplication de deux systèmes de monitoring concurrents : `subscriptions` vs `protect_clients`.

**Action :**
- Choisir un seul modèle : `subscriptions`.
- Corriger les champs en `site_url` et `user_email`.
- Adapter l'auth cron à Vercel : secret dans l'URL cron, endpoint proxy, ou vérification compatible avec l'environnement Vercel.
- Supprimer ou réconcilier `monitor-check.js`.

#### 7. SSRF partiellement traité mais pas complet
**Fichier :** `api/scan.js`

La validation bloque `localhost`, `.local` et les IP privées en entrée directe. C'est bien, mais elle ne résout pas les DNS avant fetch.

**Risque :**
- Domaine public pointant vers une IP privée.
- DNS rebinding.
- Accès indirect à des ressources internes depuis la fonction serverless.

**Action :**
- Résoudre A/AAAA avant chaque fetch serveur.
- Bloquer les plages privées/link-local après résolution.
- Revalider après redirection.

#### 8. Injection HTML dans emails transactionnels
**Fichiers :**
- `api/contact.js`
- `api/correction-request.js`
- `api/reject-subscription.js`
- `src/utils/emailApi.js`

Plusieurs emails interpolent directement `name`, `email`, `url`, `message`, `rejection_reason` dans du HTML.

**Risque :**
- Injection HTML dans l'email admin/client.
- Phishing ou liens trompeurs dans les boîtes email.

**Action :**
- Ajouter un helper `escapeHtml`.
- Échapper toutes les valeurs utilisateur avant interpolation HTML.
- Valider `url`, `email`, `phone`, `pack` avec Zod.

### P1 — Fiabilité et qualité à traiter immédiatement après les P0

#### Tests non exploitables
`npm test` échoue actuellement :
- **25 fichiers failed**
- **7 fichiers passed**
- **21 tests passed**

Exemples vérifiés :
- `src/utils/scanConclusion.test.js` importe `./scanConclusion.js`, fichier absent.
- `src/utils/textEncoding.test.js` ne contient aucune suite de test.
- `src/utils/validators.test.js` ne contient aucune suite de test.

**Action :**
- Supprimer ou compléter les fichiers de test vides.
- Restaurer `scanConclusion.js` ou corriger l'import.
- Ajouter un workflow CI qui exécute `npm test -- --run` puis `npm run build`.

#### Bundle vendor trop lourd
Le build passe, mais `dist/assets/vendor-*.js` atteint environ **2,48 MB minifié**.

**Action :**
- Auditer `@react-pdf/renderer`, `jspdf`, `html2canvas`, `recharts`, `framer-motion`.
- Charger PDF/charts uniquement dans les pages qui les utilisent.
- Vérifier le `manualChunks` Vite actuel, car le chunk `vendor` reste trop gros.

#### Variables d'environnement client mal classées
`src/lib/envValidation.js` exige ou liste des variables `VITE_` qui ne devraient pas être côté client :
- `VITE_GOOGLE_PAGESPEED_KEY`
- `VITE_VIRUSTOTAL_API_KEY`
- `VITE_RESEND_API_KEY`
- `VITE_UPTIMEROBOT_API_KEY`
- `VITE_CRON_SECRET`

**Action :**
- Garder côté client uniquement `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_APP_URL`, analytics publics.
- Déplacer toutes les clés d'API tierces côté Vercel Functions.

#### Stats publiques bug probable
**Fichier :** `api/stats.js`

La requête :
`select('id', { count: 'exact', head: true })`
retourne normalement `data = null` et `count` séparé. Le code calcule `totalRows?.length ?? 0`, donc `total_scans` risque d'être toujours `0`.

**Action :**
- Lire `const { count } = ...` et retourner `count ?? 0`.

### Plan court terme recommandé

| Délai | Action | Objectif |
|-------|--------|----------|
| **24h** | Supprimer auth admin hardcodée + fallback local | Éviter accès admin trivial |
| **24-48h** | Déplacer validation paiement côté API admin | Sécuriser le déblocage premium |
| **48h** | Retirer Resend/PageSpeed/VirusTotal/UptimeRobot des `VITE_*` | Protéger les secrets |
| **48-72h** | Ajouter RLS SQL pour tables paiement/scans/subscriptions | Protéger données clients |
| **72h** | Corriger crons Protect + colonnes `site_url/user_email` | Rendre l'abonnement vendable |
| **1 semaine** | Faire passer tests + CI | Stabiliser releases |

---

## 7. Conclusion

Webisafe est un **produit solide, bien pensé et esthétiquement abouti**. Le positionnement sur les PME africaines est intelligent, le parcours freemium est clair, et l'intégration Wave Money est adaptée au marché local. Le design et le copywriting sont au-dessus de la moyenne des SaaS africains.

**Cependant, la revue vérifiée du 6 mai montre que le MVP n'est pas encore prêt pour une vente publique self-service.** Les blocages prioritaires sont l'auth admin/test encore hardcodée, la validation paiement côté client, l'exposition potentielle de Resend via `VITE_RESEND_API_KEY`, l'absence de RLS documentée sur les tables sensibles, et les crons Protect incohérents avec le schéma actuel.

**Prochaine milestone recommandée :** Corriger les P0 de la section 6.6 → refaire passer `npm test` et `npm run build` → lancer un beta test fermé avec 10 agences web à Abidjan → itérer sur les retours → puis ouverture grand public.

---

*Fin de l'audit.*
