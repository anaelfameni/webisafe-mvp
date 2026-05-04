# Audit Complet — Webisafe.ci

> **Date** : 4 mai 2026  
> **Auditeur** : Expert produit & technique  
> **Scope** : Toutes les pages, le business model, l'UX, la tech stack, la sécurité et le SEO de l'application elle-même.

---

## 1. Résumé Exécutif

| Domaine | Note /100 | Verdict |
|---------|-----------|---------|
| **Produit & UX** | 72 | Bon MVP, friction inutile sur le parcours de paiement |
| **Business Model** | 68 | Pricing clair mais freins de conversion non traités |
| **Code & Architecture** | 65 | Bonnes pratiques React, dette technique sur l'auth et le scan |
| **Sécurité de l'app** | 58 | Headers sécurité absents, tokens exposés potentiellement |
| **SEO de Webisafe** | 45 | SPA sans SSR = Google ne voit pas le contenu |
| **Fiabilité scanner** | 62 | Faux positifs SPA (H1) corrigés, mais d'autres biais persistants |
| **Performance frontend** | 70 | Bundle lourd, pas de lazy loading exhaustif |

**Note globale Webisafe** : **62/100** — *"Bon MVP avec traction possible, mais des fondations techniques à consolider avant de scaler à des clients payants."*

---

## 2. Analyse Page par Page

### 2.1 Home (`/`)

**Ce qui est bon :**
- H1 visible impactant + H1 sr-only pour SEO (après correction)
- Social proof (live stats, "+3 200 sites audités")
- Scan immédiat dans le hero — bon CTA
- Animations Framer Motion fluides

**Problèmes :**
- **SEO critique** : SPA React sans SSR. Googlebot voit `<div id="root"></div>` vide. Tout le texte marketing est invisible pour l'indexation.
- Pas de meta description dynamique
- Pas de schema.org / JSON-LD
- Pas de Open Graph images spécifiques
- Le H2 "Fonctionnalités" existe mais pas de structure sémantique H2→H3 cohérente
- Le bouton "Scanner gratuitement" ne gère pas le state de loading pendant le routage vers `/analyse`

**Recommandation :** Déployer du SSR (Next.js) ou au minimum un service de prerendering (Prerender.io, Rendertron) pour que Google indexe le contenu.

---

### 2.2 Analyse (`/analyse`)

**Ce qui est bon :**
- Progression visuelle du scan avec étapes claires
- Score gauge animé — bon feedback
- Alertes critiques en haut si détectées
- Bouton "Télécharger PDF" + "Partager" présents

**Problèmes :**
- Le scan peut durer 30-60s sans possibilité de quitter/reprendre
- Pas de numéro de scan / preuve de travail affiché avant le paywall
- Le paywall (FreemiumGate) apparaît brutalement — pas de teasing du contenu premium
- Pas de "save" automatique du scan gratuit dans le dashboard
- Si l'API retourne 500, le message d'erreur est générique ("Erreur d'analyse")

**Recommandation :** Montrer un aperçu partiel du rapport premium (blur/fade sur les sections verrouillées) pour créer du désir avant le paywall.

---

### 2.3 Rapport Premium (`/rapport/:id`)

**Ce qui est bon :**
- Design professionnel, structure claire
- Score gauge premium très visuelle
- Narrative intelligente ("Ce que révèle votre audit")
- Bouton WhatsApp pour contacter Webisafe — bon funnel de conversion

**Problèmes :**
- Si le scan n'est pas payé, l'écran d'attente est trop passif ("rechargera toutes les 30s")
- Pas de notification email quand le paiement est validé
- Le rescan peut être cliqué même si le scan est gratuit — confusion
- Pas de comparaison "avant/après" pour les rescans
- Le PDF ne mentionne pas la date du rescan vs. date originale

**Recommandation :** Ajouter un webhook pour notifier le client par email dès validation du paiement.

---

### 2.4 Dashboard (`/dashboard`)

**Ce qui est bon :**
- Sidebar responsive
- KPI cards (dernier scan, moyenne, évolution)
- Graphique d'évolution des scores
- Historique des scans avec statut payé/non payé

**Problèmes :**
- Le bouton "Retour à l'accueil" utilise `navigate('/')` (corrigé) mais le wording prête à confusion avec "déconnexion"
- Pas de onboarding pour les nouveaux utilisateurs
- Pas de notifications in-app
- Le graphique d'évolution est vide si l'utilisateur n'a qu'un scan
- Pas d'alertes personnalisées (ex: "Votre score a baissé de 15pts")

**Recommandation :** Ajouter un walkthrough tooltip pour les nouveaux users. Ajouter des alertes in-app sur les changements de score.

---

### 2.5 Admin (`/admin`)

**Ce qui est bon :**
- Interface dédiée avec KPIs (paiements, revenus, scans)
- Système de validation/refus de paiements Wave manuel
- Graphiques de revenus

**Problèmes :**
- Accès par `?token=ADMIN_TOKEN` — le token est dans le code source (`utils/wavePayment.js`) = **sécurité critique**
- Pas de rate limiting sur les endpoints admin
- Pas de logs d'audit (qui a validé quel paiement ?)
- Le `ADMIN_TOKEN` en dur dans le JS bundle est accessible à tout le monde via `grep` sur le bundle

**Recommandation :** Déplacer l'authentification admin côté serveur (cookie HTTP-only + session). Ne JAMAIS mettre de token admin dans le bundle client.

---

### 2.6 Tarifs (`/tarifs`)

**Ce qui est bon :**
- Pricing transparent en FCFA
- 4 plans bien différenciés
- FAQ spécifique tarifs
- Badge "Le plus populaire" sur Premium

**Problèmes :**
- Le plan "Protect" indique "Offre mai 2026" — contenu daté à maintenir manuellement
- Pas de calcul ROI ("35 000 FCFA = le coût d'une heure de développeur" ou "1 conversion sauvée = amorti")
- Pas de témoignages clients sur cette page
- Pas de garantie satisfait/remboursé (ou explicite : "aucun remboursement")

**Recommandation :** Ajouter un calculateur ROI ("Si votre site a X visiteurs/mois, une amélioration de Y% = Z FCFA de revenus en plus").

---

### 2.7 Contact (`/contact`)

**Ce qui est bon :**
- Formulaire fonctionnel avec validation
- WhatsApp CTA bien visible
- Map + email + horaires

**Problèmes :**
- Le formulaire envoie vers `/api/contact` mais pas de feedback de succès visuel riche (juste un texte)
- Pas de CAPTCHA / protection anti-spam
- L'email `webisafe@gmail.com` manque de professionnalisme (utiliser `contact@webisafe.ci`)

**Recommandation :** Ajouter hCaptcha ou Cloudflare Turnstile. Changer l'email pour un domaine propre.

---

### 2.8 Partenaire / Affiliation (`/partenaire`)

**Ce qui est bon :**
- Programme d'affiliation avec commission 17 500 FCFA/vente (50%)
- Dashboard affilié basique (`/affiliate-dashboard`)
- Inscription simple

**Problèmes :**
- Le dashboard affilié est accessible publiquement via `?code=XXX` — n'importe qui peut voir les stats d'un autre affilié s'il connaît son code
- Pas de génération de lien avec UTM tracking automatique
- Pas de matériel marketing (bannières, copy, posts réseaux sociaux prêts à l'emploi)
- Pas de seuil de paiement minimum affiché

**Recommandation :** Sécuriser le dashboard affilié (PIN ou email). Fournir un kit marketing (bannières 1080x1080, copy WhatsApp, posts LinkedIn).

---

### 2.9 Protect (`/protect`)

**Ce qui est bon :**
- Page dédiée bien designée pour le SaaS récurrent
- Features listées clairement (monitoring, SSL, scan mensuel)
- Badge "Sécurisé par Webisafe" — bon viral loop

**Problèmes :**
- Le pricing dit "Offre mai 2026 : audit initial offert" — encore une date hardcodée
- Pas de page de checkout intégrée — redirection vers Wave manuel
- Pas de free trial / demo du monitoring
- Pas de page de status publique pour les clients Protect

**Recommandation :** Ajouter un simulateur ("Entrez votre URL, voici ce que Webisafe Protect surveillerait").

---

### 2.10 À Propos (`/a-propos`)

**Ce qui est bon :**
- Storytelling local ("Fait à Abidjan, pour l'Afrique")
- Contact direct

**Problèmes :**
- Trop minimaliste — pas de photos, pas de team, pas de timeline
- Pas de témoignages presse ou partenaires
- Lien vers LinkedIn du fondateur absent

**Recommandation :** Ajouter une vidéo de 60s ou une timeline du projet.

---

## 3. Analyse Business Model

### Revenus actuels
| Source | Prix | Friction |
|--------|------|----------|
| Audit Premium unique | 35 000 FCFA | Paiement Wave manuel + validation manuelle admin |
| Protect (mensuel) | 15 000 FCFA | Même friction + pas de prélèvement auto |
| Affiliation | 17 500 FCFA/vente | Paiement manuel sur Wave |

### Problèmes de conversion
1. **Paiement Wave manuel** : L'utilisateur doit ouvrir Wave, payer, puis revenir sur le site pour signaler son paiement. C'est **3 étapes** vs. 1 étape pour un paiement intégré.
2. **Pas de paiement mobile money** : Côte d'Ivoire = Orange Money, MTN MoMo. Wave n'est pas universel.
3. **Validation manuelle** : Le client attend que l'admin valide. Temps de latence = churn.
4. **Pas de upsell automatique** : Après un scan gratuit, pas de séquence email nurture.
5. **Pas d'abonnement annuel** : 15 000/mois × 12 = 180 000. Un plan annuel à 150 000 (2 mois offerts) augmenterait le LTV.

### Opportunités de revenus manquées
- **White Label** : Mentionné dans le code (`white-label.js`) mais pas de page dédiée
- **API publique** : Le scanner pourrait être vendu en API à d'autres outils/agences
- **Correction service** : "Vous avez un score de 42 — Webisafe peut corriger tout ça pour 150 000 FCFA"

---

## 4. Analyse Technique

### Architecture
- **Frontend** : React 18 + Vite + Tailwind + Framer Motion
- **Backend** : Vercel Serverless Functions (Node.js)
- **BDD** : Supabase (PostgreSQL + Auth)
- **Email** : Resend
- **Monitoring** : UptimeRobot (externe)

### Points forts
- Code modulaire, composants réutilisables
- Lazy loading des routes
- Context API pour l'auth
- Scan API robuste avec fallbacks (PageSpeed, VirusTotal, etc.)

### Dette technique critique

#### 4.1 Auth hybride (Supabase + localStorage)
- Deux systèmes d'auth coexistent : Supabase Auth et `localStorage` legacy
- Le `client@test.com` était cassé à cause de cette dualité
- **Risque** : Un utilisateur peut être connecté en local mais pas sur Supabase = états incohérents

#### 4.2 Tokens exposés
- `ADMIN_TOKEN` dans `src/utils/wavePayment.js` → visible dans le bundle
- `RESEND_API_KEY` pourrait être exposée côté client si utilisée dans le frontend

#### 4.3 Pas de rate limiting
- L'API scan peut être appelée en boucle sans limites
- Pas de protection anti-DDoS sur les endpoints

#### 4.4 Pas de tests
- Zéro test unitaire / E2E détecté
- Pas de CI/CD (pas de GitHub Actions)

#### 4.5 Gestion d'erreurs
- Erreurs API parfois affichées brute à l'utilisateur
- Pas de Sentry / Datadog / LogRocket pour le tracking d'erreurs

---

## 5. Sécurité de Webisafe (l'application)

| Check | Statut | Sévérité |
|-------|--------|----------|
| HTTPS | ✅ | — |
| CSP (Content-Security-Policy) | ❌ Absent | **Critique** |
| X-Frame-Options | ❌ Absent | Haute |
| HSTS | ❌ Absent | Haute |
| X-Content-Type-Options | ❌ Absent | Moyenne |
| Referrer-Policy | ❌ Absent | Moyenne |
| Rate Limiting API | ❌ Absent | **Critique** |
| Input sanitization | ⚠️ Partielle | Moyenne |
| Admin token exposé | ❌ Oui | **Critique** |

**Verdict** : Webisafe fait des audits de sécurité mais n'applique pas ses propres recommandations. C'est un argument de vente faible.

---

## 6. SEO de Webisafe (l'application)

| Check | Statut | Impact |
|-------|--------|--------|
| SSR / Prerendering | ❌ Non | **Critique** — Google ne voit rien |
| Sitemap.xml | ✅ Oui | — |
| Robots.txt | ✅ Oui | — |
| Meta descriptions | ⚠️ Partielles | Moyen |
| Open Graph | ⚠️ Basiques | Moyen |
| Structured data (JSON-LD) | ❌ Non | Haut |
| H1 unique par page | ✅ Oui | — |
| Core Web Vitals | ⚠️ Bundle lourd | Moyen |
| Backlinks / Content marketing | ❌ Non | Haut |

**Verdict** : Avec une SPA sans prerendering, Webisafe ne sera jamais bien indexée. Tout le contenu marketing ("Premier outil d'audit d'Afrique", etc.) est invisible pour Google.

---

## 7. Performance Frontend

| Métrique | Estimation | Seuil Google |
|----------|------------|--------------|
| LCP | ~2.5s | 2.5s |
| FID/INP | ~200ms | 200ms |
| CLS | ~0.05 | 0.1 |
| TBT | ~350ms | 200ms |
| Bundle JS | ~450KB gzippé | — |

**Problèmes :**
- Framer Motion chargé sur toutes les pages même statiques
- Lucide icons : import de tout le package au lieu de tree-shaking optimal
- Pas de service worker / PWA
- Pas de prefetching des routes critiques

---

## 8. Recommandations Prioritaires

### 🔴 Critique (à faire cette semaine)

1. **Sécuriser l'admin** : Déplacer `ADMIN_TOKEN` côté serveur. Remplacer l'accès par `?token=` par un cookie HTTP-only + session server-side.
2. **Ajouter rate limiting** : Sur `/api/scan`, `/api/contact`, max 10 requêtes/minute par IP.
3. **Headers sécurité** : Ajouter CSP, HSTS, X-Frame-Options, etc. sur Vercel (`vercel.json`).
4. **Prerendering / SSR** : Implémenter au minimum un `vercel.json` avec `prerender` ou migrer vers Next.js pour l'indexation Google.

### 🟠 Haute (à faire ce mois)

5. **Intégrer Orange Money / MTN MoMo** : Utiliser une passerelle comme CinetPay, PayDunya ou une API Wave business pour des paiements automatisés.
6. **Webhook paiement** : Automatiser la validation des paiements (plus de validation manuelle admin).
7. **Tests E2E** : Cypress ou Playwright sur les parcours critiques (scan → paywall → paiement → rapport).
8. **Kit marketing affiliation** : Bannières, copy WhatsApp, posts LinkedIn prêts à copier-coller.

### 🟡 Moyenne (à faire dans 2-3 mois)

9. **Calculateur ROI** : "Combien de visiteurs/mois ? → Voici le coût d'une seconde de chargement en FCFA"
10. **Séquence email post-scan** : Drip campaign après scan gratuit (jour 1: résumé, jour 3: alertes critiques, jour 7: offre premium -20%).
11. **Page de status publique** : Pour les clients Protect (`status.webisafe.ci`).
12. **Migration Next.js** : Pour le SSR, le SSG des pages statiques, et les API routes intégrées.
13. **Sentry / LogRocket** : Tracking d'erreurs et replay de sessions.
14. **Multi-langue** : FR par défaut, EN pour l'expansion Afrique anglophone (Ghana, Nigeria).

---

## 9. Faux Positifs Scanner à Anticiper

| Faux Positif | Cause | Fix Déjà Appliqué ? |
|--------------|-------|---------------------|
| H1 manquant sur SPA | Contenu rendu côté client | ✅ Corrigé (détection SPA) |
| Fichiers sensibles sur Vercel | Catch-all renvoie index.html | ✅ Corrigé (inspection contenu) |
| Panel admin exposé | Même cause | ✅ Corrigé |
| Open Graph manquant | SPA sans prerendering | ❌ — Webisafe elle-même a ce problème |
| Sitemap manquant | Certains sites n'en ont pas besoin | ⚠️ Ponderation à ajuster |
| TBT élevé sur SPA | Google PageSpeed mesure le shell HTML | ❌ — Compliqué à corriger sans SSR |

---

## 10. Conclusion

**Webisafe est un bon MVP** avec un positionnement fort ("Premier outil d'audit d'Afrique francophone"), un pricing adapté au marché local, et un design professionnel.

**Les 3 blocages actuels au scaling :**
1. **SEO invisible** — personne ne trouve Webisafe sur Google sans pub payante
2. **Paiement manuel** — friction de conversion trop élevée pour un produit numérique
3. **Sécurité interne faible** — l'outil audit la sécurité mais n'est pas sécurisé lui-même = crédibilité affaiblie

**Si ces 3 points sont résolus, Webisafe peut passer de MVP à produit mature en 3-6 mois.**
