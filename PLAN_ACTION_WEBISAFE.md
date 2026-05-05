# Plan d'action Webisafe — Audit senior produit, code, sécurité et business

Date : 2026-05-04  
Objectif : transformer Webisafe en SaaS rentable rapidement, avec un maximum d'impact et un minimum de complexité.

## 1. Résumé exécutif

Webisafe a déjà une base forte : proposition de valeur claire, scanner multi-dimensions, rapport premium, paiement Wave, dashboard, offre récurrente Protect, panel admin, emails, monitoring et premiers mécanismes d'affiliation.

Mais le projet présente plusieurs problèmes qui bloquent la scalabilité SaaS et la monétisation fiable :

- **Sécurité critique** : authentification admin de test hardcodée, double système d'authentification, endpoints sensibles insuffisamment protégés, clés API exposables côté frontend, HTML emails non systématiquement échappé.
- **Business critique** : paiement manuel Wave avec trop de friction, validation premium fragile, accès premium dépendant partiellement du localStorage, offres nombreuses mais pas assez structurées en funnel.
- **Conversion** : landing déjà bonne visuellement, mais message hero trop générique, preuves sociales parfois non vérifiables, CTA multiples, manque d'urgence/action spécifique et manque de réassurance avant paiement.
- **Performance** : gros chunks `charts`, `pdf`, `vendor`, `framework`; imports globaux lourds; police Google chargée via CSS; animations omniprésentes; potentiel LCP améliorable.
- **Qualité produit** : incohérences `/pricing` vs `/tarifs`, `sidemap.xml`, fautes/accents manquants, textes parfois trop longs, pages avec statistiques statiques qui peuvent nuire à la crédibilité.

Priorité 80/20 : sécuriser l'argent et l'accès premium, simplifier le funnel, améliorer le copywriting de conversion, puis optimiser performance et crédibilité.

## 2. Audit technique

### 2.1 Problèmes critiques

#### A. Authentification incohérente et admin hardcodé

Fichiers concernés :

- `src/context/AuthContext.jsx`
- `src/hooks/useAuth.js`
- `src/utils/adminAuth.js`
- `src/pages/Admin.jsx`
- `src/pages/Analyse.jsx`

Constats :

- Deux systèmes d'authentification coexistent : Supabase dans `AuthContext` et localStorage dans `src/hooks/useAuth.js`.
- `src/utils/adminAuth.js` contient des identifiants admin hardcodés : `admin@test.com` / `123admin123`.
- Certaines pages utilisent `../context/AuthContext`, d'autres `../hooks/useAuth`, ce qui peut produire des états utilisateur incohérents.
- L'accès admin côté frontend repose sur `user?.role === 'admin'`, mais certaines actions admin utilisent des endpoints protégés par Supabase et d'autres non.

Impact :

- Risque de contournement admin en frontend.
- Expérience utilisateur instable après inscription/connexion.
- Risque direct sur la validation des paiements et la confiance business.

Action proposée :

- Supprimer l'auth localStorage de production.
- Unifier toute l'application sur `AuthContext` + Supabase Auth.
- Retirer les identifiants admin hardcodés du bundle frontend.
- Ajouter un guard admin unique basé sur profil Supabase.

Priorité : **P0 critique**.

#### B. Endpoints paiement insuffisamment protégés

Fichiers concernés :

- `api/confirm-payment.js`
- `api/reject-payment.js`
- `api/notify-admin.js`
- `src/pages/Admin.jsx`
- `src/utils/paymentApi.js`

Constats :

- `api/confirm-payment.js` et `api/reject-payment.js` n'exigent pas `requireAdmin`.
- Ces endpoints peuvent envoyer des emails de confirmation/rejet si appelés avec les bons champs.
- La vraie validation DB est faite côté client via Supabase REST avec anon key (`updatePaymentRequest`), selon les règles RLS réelles.
- Le fallback localStorage des paiements peut masquer des erreurs de base et donner une impression de succès.

Impact :

- Risque de fausse confirmation envoyée au client.
- Validation premium fragile.
- Perte de confiance et risque opérationnel.

Action proposée :

- Protéger tous les endpoints de validation/rejet par `requireAdmin`.
- Déplacer la validation DB `payment_requests` + `scans.paid = true` dans un endpoint serveur unique `confirm-payment`.
- Ne plus faire de validation paiement sensible depuis le frontend.
- Garder le fallback localStorage uniquement pour affichage offline, jamais comme source de vérité premium.

Priorité : **P0 critique**.

#### C. Secrets/API keys exposables côté frontend

Fichiers concernés :

- `.env.example`
- `src/utils/emailApi.js`
- `api/_utils.js`
- `api/scanners/security-checks.js`

Constats :

- `.env.example` contient `VITE_RESEND_API_KEY`, `VITE_VIRUSTOTAL_API_KEY`, `VITE_GOOGLE_SAFE_BROWSING_KEY`.
- `src/utils/emailApi.js` envoie directement via Resend depuis le navigateur avec `VITE_RESEND_API_KEY`.
- Toute variable `VITE_*` est exposée dans le bundle public.

Impact :

- Risque d'abus email/API, quota consommé, réputation domaine dégradée.
- Mauvaise pratique sécurité pour un SaaS cybersécurité.

Action proposée :

- Supprimer tout usage de Resend depuis le frontend.
- Créer/centraliser endpoints serveur pour nurturing, receipt Protect, follow-up alertes.
- Nettoyer `.env.example` pour ne garder en frontend que Supabase anon et analytics publics.
- Retirer les fallback serveur vers variables `VITE_*` pour services sensibles.

Priorité : **P0 critique**.

#### D. Risque SSRF partiellement traité mais incomplet

Fichiers concernés :

- `api/scan.js`
- `api/scanners/security-checks.js`
- `api/scanners/extended-security-checks.js`

Constats :

- `validateUrl` bloque `localhost`, `.local` et certaines IP privées si l'utilisateur saisit directement l'IP.
- Mais il ne résout pas le DNS pour vérifier si un domaine public pointe vers une IP privée/link-local.
- Les redirections sont suivies (`redirect: 'follow'`) sans revérification de l'URL finale.
- Les checks avancés appellent plusieurs endpoints construits depuis le domaine.

Impact :

- Risque SSRF via DNS rebinding, domaine qui redirige vers IP interne ou domaine pointant vers IP privée.
- Important pour un scanner public.

Action proposée :

- Ajouter validation serveur DNS + IP finale avant scan.
- Bloquer private, loopback, link-local, metadata cloud (`169.254.169.254`), IPv6 privées.
- Après chaque redirection, revalider destination finale avant lire le contenu.
- Limiter taille lue des réponses HTML.

Priorité : **P0 critique**.

### 2.2 Bugs et incohérences techniques

#### A. Route sitemap incohérente

Fichiers concernés :

- `vite.config.ts`
- `public/sidemap.xml`
- `public/robots.txt`

Constats :

- Sitemap configure `/pricing`, mais la vraie route est `/tarifs`.
- Le projet contient `sidemap.xml`, probablement une faute de frappe.

Action : corriger vers `/tarifs`, vérifier `robots.txt`, supprimer/ignorer `sidemap.xml` si inutile.

Priorité : **P1**.

#### B. CSP trop permissive

Fichier concerné : `vercel.json`

Constats :

- CSP contient `script-src 'unsafe-inline' 'unsafe-eval'`.
- Le projet charge Clarity via inline script dans `index.html`.

Action : réduire progressivement CSP, déplacer Clarity dans un module contrôlé ou nonce/hash si nécessaire, vérifier connect-src pour APIs utilisées.

Priorité : **P1**.

#### C. HTML email non échappé partout

Fichiers concernés :

- `api/contact.js`
- `api/correction-request.js`
- `api/subscribe.js`
- `src/utils/emailApi.js`

Constats :

- `paymentEmails.js` a un `escapeHtml`, mais d'autres emails interpolent directement `name`, `message`, `site_url`, etc.

Action : créer un helper serveur `escapeHtml` partagé et l'utiliser dans tous les emails.

Priorité : **P1**.

#### D. Gestion DB Supabase non uniforme

Fichiers concernés :

- `api/scan.js`
- `src/utils/paymentApi.js`
- `src/utils/supabaseRest.js`
- `src/hooks/useScans.js`

Constats :

- Le scan est sauvegardé côté serveur dans `scans`, mais l'app utilise aussi `localStorage`.
- Les paiements sont lus/écrits via Supabase REST côté frontend avec anon key.
- Le fallback localStorage peut cacher les erreurs réseau ou RLS.

Action : définir clairement les sources de vérité :

- Supabase = scans, paiements, abonnements, corrections.
- localStorage = cache UX uniquement.
- Toute action monétaire = endpoint serveur protégé.

Priorité : **P1**.

## 3. Audit pages et structure

### 3.1 Accueil (`Home.jsx`)

Points forts :

- Landing complète : hero, formulaire scan, problèmes, solution, aperçu rapport, pricing, FAQ, live stats.
- Bonne orientation PME africaines.
- Capture email avant scan.

Problèmes :

- H1 visuel très générique : "Analysez votre site web en 1 seul clic".
- Sous-titre trop court : "Performance · Sécurité · SEO · UX" ne vend pas assez le résultat business.
- Phrase confuse : "Données mises à jour en temps réel depuis nos serveurs de surveillance analyse pour vous".
- Statistiques fortes mais sans source ni nuance : risque de crédibilité.
- Trop de sections avant le CTA final; le message peut se diluer.

Actions proposées :

- Repositionner le hero sur la douleur business : "Découvrez en 60 secondes ce qui fait perdre des clients à votre site".
- Ajouter sous-texte orienté résultat : sécurité, vitesse, Google, mobile, plan d'action.
- Ajouter 3 trust badges courts sous le formulaire : scan passif, données privées non consultées, rapport en français.
- Corriger les phrases maladroites.
- Ajouter une mini section "Comment ça marche" en 3 étapes avant pricing si nécessaire.

Priorité : **P1 conversion**.

### 3.2 Analyse (`Analyse.jsx`)

Points forts :

- Scan progressif, score global, cartes par catégorie, freemium gate, CTA sticky.
- Bon mécanisme de gating après lecture partielle.

Problèmes :

- Email obligatoire alors que la landing dit "sans inscription", ce qui est acceptable mais doit être formulé comme "recevoir vos résultats".
- `hasPaid` reste local et n'est pas synchronisé serveur dans cette page.
- Gating premium peut sembler brusque après 3s.
- CTA "Débloquer mon rapport" bon, mais manque de garantie/réassurance juste avant paiement.

Actions proposées :

- Ajouter une micro-réassurance près du CTA : paiement Wave, vérification humaine, rapport PDF, support 48h.
- Synchroniser statut premium depuis Supabase/payment request validée.
- Clarifier gratuit vs premium : gratuit = score + aperçu prioritaire; premium = plan complet + PDF + correction.
- Renforcer le CTA sticky avec urgence personnalisée si score faible.

Priorité : **P1 conversion + revenu**.

### 3.3 Paiement (`Payment.jsx` + `WaveCheckoutModal.jsx`)

Points forts :

- Paiement Wave adapté au marché.
- Code paiement unique.
- Instructions étape par étape.

Problèmes :

- Paiement manuel avec friction élevée : copier numéro, copier code, revenir, saisir numéro, attendre validation.
- Texte contient fautes/accents manquants : "securisé", "recu", "ete", "tableau de board".
- Pas assez de preuve de confiance au moment de payer.
- Deux expériences paiement différentes : modal puis page paiement.

Actions proposées :

- Simplifier la page paiement autour de 3 blocs : montant, numéro/code, confirmation.
- Ajouter WhatsApp fallback : "Envoyer une preuve de paiement" préremplie.
- Ajouter promesse de délai : validation sous 2h ouvrées.
- Corriger tous les textes.
- Déplacer la validation effective côté serveur.

Priorité : **P0/P1 revenu**.

### 3.4 Rapport (`Rapport.jsx` + `generatePDF.js`)

Points forts :

- Rapport riche, PDF, sections sécurité avancée, plan d'action, rescan.
- Bonne valeur premium.

Problèmes :

- Page très volumineuse, difficile à maintenir.
- Génération PDF côté client lourde (`pdf` chunk ~443 kB).
- Accès rapport doit dépendre exclusivement d'un état premium serveur fiable.
- CTA correction existe, mais peut être mieux intégré comme upsell naturel.

Actions proposées :

- Vérifier gating serveur du rapport premium.
- Ajouter bloc upsell corrections après les 3 problèmes les plus critiques.
- Reporter refactor lourd, mais isoler ensuite sections rapport en composants.
- Lazy-load PDF uniquement au clic si ce n'est pas déjà optimal.

Priorité : **P1 business/perf**.

### 3.5 Tarifs (`Tarifs.jsx` + `PricingSection.jsx`)

Points forts :

- Offre claire : gratuit, audit premium, Protect, White Label.
- Bonne adaptation Wave/FCFA.

Problèmes :

- Trop d'offres au même niveau visuel : peut créer de l'hésitation.
- Audit Premium et Protect se concurrencent au lieu de former un chemin naturel.
- Texte "Pas d'abonnement caché" alors que Protect est un abonnement : peut créer une ambiguïté.

Actions proposées :

- Positionner les offres comme funnel : Gratuit → Premium → Protect → Corrections/Agence.
- Mettre Premium comme conversion principale après scan.
- Présenter Protect comme continuité après audit : surveillance mensuelle.
- Ajouter "Recommandé après votre premier rapport" sur Protect.

Priorité : **P1 business**.

### 3.6 Protect (`Protect.jsx`)

Points forts :

- Offre récurrente pertinente : 15 000 FCFA/mois.
- Fonctionnalités SaaS différenciantes : uptime, alertes, SSL, scan mensuel, badge.

Problèmes :

- Certaines preuves sociales/statistiques sont statiques et peuvent sembler inventées.
- Demande de connexion obligatoire mais pas de modal intégrée sur place.
- Souscription crée un abonnement `pending`, mais la création UptimeRobot semble se faire avant validation paiement.

Actions proposées :

- Déplacer création réelle du monitoring après validation admin.
- Remplacer stats statiques par données réelles ou libellé "exemple".
- Ajouter modal auth ou redirection plus fluide.
- Ajouter argument ROI : perte d'une journée de site down vs 15 000 FCFA.

Priorité : **P1 revenu récurrent**.

### 3.7 Admin (`Admin.jsx`)

Points forts :

- Vue paiements, abonnements, corrections, KPI.
- Actions validation/rejet.

Problèmes :

- Accès frontend admin dépend du `role` local.
- Certaines validations sensibles passent par fonctions frontend/Supabase REST.
- Bouton logout admin retourne accueil sans forcément déconnecter.

Actions proposées :

- Guard admin serveur + client unique.
- Validation paiement et abonnement via endpoints serveur protégés uniquement.
- Bouton logout réel.
- Ajouter log d'audit admin minimal : qui a validé, quand, montant, code.

Priorité : **P0/P1**.

## 4. UX/UI et conversion

### Problèmes détectés

- Trop de CTA dispersés : scan, rapport, Protect, corrections, affiliation.
- Design global moderne, mais certains textes réduisent la crédibilité à cause de fautes/accents manquants.
- Le paiement manuel a besoin de plus de réassurance et de friction réduite.
- Les statistiques non sourcées peuvent être perçues comme exagérées.
- La valeur premium doit être vendue comme "plan d'action pour économiser du temps/perdre moins de clients", pas seulement PDF.

### Actions proposées

#### P1 — Copywriting conversion

- Réécrire hero, sous-titres, CTA, pricing, paiement, FAQ.
- Harmoniser ton : expert, simple, crédible, orienté PME.
- Corriger fautes et accents visibles.

#### P1 — Trust elements

- Ajouter : "Scan passif", "Aucune donnée privée consultée", "Paiement Wave", "Support en français", "Rapport PDF professionnel".
- Ajouter une mini explication cybersécurité : Webisafe ne tente aucune intrusion.

#### P1 — Funnel

- Funnel cible :
  1. Landing : URL + email.
  2. Scan gratuit : score + aperçu + alerte business.
  3. Premium : rapport complet 35 000 FCFA.
  4. Upsell post-premium : corrections clé-en-main.
  5. Upsell récurrent : Protect 15 000 FCFA/mois.

## 5. Business et monétisation

### Revenus actuels

- Audit Premium : 35 000 FCFA paiement unique.
- Webisafe Protect : 15 000 FCFA/mois.
- Corrections clé-en-main : présent via `/corrections`.
- White Label / agences : sur devis.
- Affiliation : présente via `ref` et pages partenaire.

### Problèmes business

- Premium et Protect ne sont pas assez reliés dans un parcours naturel.
- La validation Wave manuelle est adaptée au marché mais doit être mieux opérationnalisée.
- Les corrections sont un upsell à fort potentiel mais pas assez mises en avant dans la page rapport/PDF.
- Pas encore de notion claire de plan SaaS par niveaux.

### Actions proposées

#### Offre simple court terme

- Gratuit : score + aperçu + capture lead.
- Premium : 35 000 FCFA pour rapport complet + PDF + 1 rescan.
- Corrections : pack diagnostic/correction après rapport.
- Protect : 15 000 FCFA/mois après audit validé.

#### Upsell prioritaire

- Après achat premium : proposer correction des 3 problèmes critiques.
- Après correction ou bon score : proposer Protect pour surveiller.
- Dans PDF : CTA final plus direct avec WhatsApp.

#### Growth hacking simple

- Email J+1 après scan gratuit si non acheté : rappeler première faille critique.
- Email J+3 : proposer réduction limitée ou diagnostic WhatsApp.
- Badge Webisafe Protect comme boucle virale.
- Affiliation agences : lien/ref plus visible, commission simple.

## 6. Performance

### Constats

Build existant :

- `pdf` ~443 kB.
- `vendor` ~380 kB.
- `charts` ~362 kB.
- `framework` ~226 kB.
- `db` ~194 kB.
- `animation` ~139 kB.

Problèmes :

- Police Google importée via `@import` CSS : moins optimal que preload/link.
- Framer Motion utilisé sur beaucoup de pages.
- Recharts et jsPDF sont lourds.
- Le dashboard/rapport/admin sont lazy-loadés, ce qui est positif.

Actions proposées :

- Déplacer Google Fonts de CSS vers `index.html` avec preconnect/preload ou utiliser font système si objectif performance maximal.
- Lazy-load explicite de `generatePDF` uniquement au clic dans Dashboard/Rapport si nécessaire.
- Vérifier imports Recharts pour limiter bundle.
- Réduire animations non essentielles sur mobile via `prefers-reduced-motion`.
- Corriger sitemap/SEO pour indexation.

Priorité : **P2 après sécurité/funnel**.

## 7. Améliorations avancées pertinentes

### Cybersécurité différenciante

Déjà présent :

- Headers sécurité.
- SPF/DMARC.
- Fichiers sensibles.
- Admin panels.
- Google Safe Browsing.
- HIBP.
- Mixed content.
- CORS.
- WAF.
- security.txt.
- Typosquatting passif.

À améliorer :

- Marquer clairement les checks passifs vs non intrusifs.
- Ajouter scoring de confiance "Scan passif — aucun test intrusif".
- Ajouter exports "preuve technique" dans PDF.
- Ajouter "priorité business" basée sur impact : sécurité, trafic, conversion.

### Automatisation/IA

Court terme sans complexité :

- Génération d'un résumé business plus personnalisé selon score et secteur si l'utilisateur renseigne son activité.
- Email automatique post-scan avec première faille critique.
- Alertes Protect liées aux scores qui baissent.

### Capture leads

Déjà présent : email avant scan. À renforcer :

- Stockage lead serveur sécurisé au lieu de Supabase client direct si RLS incertain.
- Tag source : scan gratuit, Protect, corrections, partenaire.
- Nurturing J+1/J+3.

## 8. Plan d'exécution priorisé

## Phase A — Sécuriser le revenu et l'accès premium (P0)

Objectif : empêcher les contournements et fiabiliser la validation paiement.

Actions :

1. Unifier l'authentification sur Supabase/AuthContext.
2. Retirer les identifiants admin hardcodés du frontend.
3. Protéger `confirm-payment` et `reject-payment` avec `requireAdmin`.
4. Déplacer validation DB paiement + `scans.paid` côté serveur.
5. Corriger l'accès rapport premium pour dépendre d'une source serveur fiable.
6. Supprimer les clés Resend/VirusTotal/SafeBrowsing exposables en `VITE_*`.
7. Ajouter protection SSRF renforcée dans `api/scan.js`.

Impact attendu : sécurité, confiance, revenus protégés.

## Phase B — Corriger le funnel de conversion (P1)

Objectif : augmenter conversion scan gratuit → rapport premium.

Actions :

1. Réécrire hero, sous-titres et trust badges de la landing.
2. Corriger copy et fautes sur paiement, tarifs, Protect.
3. Simplifier `FreemiumGate` avec valeur claire : PDF + plan d'action + support + rescan.
4. Améliorer page paiement : réassurance, délai validation, WhatsApp preuve paiement.
5. Harmoniser pricing : Gratuit → Premium → Protect → Corrections/Agence.
6. Ajouter CTA corrections post-rapport et dans PDF.

Impact attendu : meilleure compréhension, moins de friction, plus d'achats.

## Phase C — Crédibilité SaaS et rétention (P1)

Objectif : rendre Webisafe plus crédible et plus récurrent.

Actions :

1. Remplacer stats statiques risquées par stats réelles ou libellés explicites.
2. Clarifier "scan passif non intrusif" dans landing/FAQ/rapport.
3. Créer un mini onboarding dashboard après inscription.
4. Activer Protect uniquement après validation paiement.
5. Ajouter journal admin minimal des validations.

Impact attendu : confiance, baisse support, meilleure rétention.

## Phase D — Performance et SEO (P2)

Objectif : améliorer vitesse, SEO et maintenabilité sans gros refactor.

Actions :

1. Corriger `/pricing` → `/tarifs` dans sitemap.
2. Corriger `sidemap.xml` si inutile.
3. Optimiser chargement font.
4. Lazy-load PDF au clic si nécessaire.
5. Réduire animations sur mobile/reduced-motion.
6. Réviser CSP pour réduire `unsafe-inline`/`unsafe-eval` progressivement.

Impact attendu : meilleurs Core Web Vitals, crédibilité technique, SEO.

## 9. Modifications que je propose d'appliquer après validation

### Lot 1 — P0 sécurité/revenu

- `src/utils/adminAuth.js` : neutraliser/supprimer credentials admin de production.
- `src/hooks/useAuth.js` / pages concernées : migration vers `AuthContext` ou retrait du hook local pour les flux critiques.
- `api/confirm-payment.js` : exiger admin, mettre à jour `payment_requests` et `scans` côté serveur, envoyer email.
- `api/reject-payment.js` : exiger admin, mettre à jour DB côté serveur, envoyer email.
- `src/pages/Admin.jsx` : appeler endpoints serveur au lieu de muter DB via Supabase REST côté client.
- `src/utils/emailApi.js` : remplacer envoi direct Resend par endpoints serveur.
- `.env.example` : retirer clés sensibles `VITE_*`.
- `api/scan.js` : ajouter validation SSRF renforcée.

### Lot 2 — P1 conversion/copy

- `src/pages/Home.jsx` : hero, trust badges, sections ambiguës.
- `src/components/URLInput.jsx` : microcopy email/scan.
- `src/components/FreemiumGate.jsx` : promesse premium plus claire.
- `src/components/WaveCheckoutModal.jsx` et `src/pages/Payment.jsx` : copy, réassurance, WhatsApp fallback.
- `src/components/PricingSection.jsx` et `src/pages/Tarifs.jsx` : structuration funnel.
- `src/pages/Protect.jsx` : stats réelles/exemples, copy, activation après paiement.

### Lot 3 — P2 performance/SEO

- `vite.config.ts` : routes sitemap.
- `public/robots.txt` / `public/sidemap.xml` : cohérence SEO.
- `index.html` / `src/index.css` : police et CSP-compatible Clarity si possible.
- `src/pages/Rapport.jsx` / `Dashboard.jsx` : lazy-load PDF au clic si pertinent.

## 10. Critères de validation après implémentation

Je vérifierai au minimum :

- `npm run build` passe.
- Les routes principales chargent : `/`, `/analyse`, `/payment`, `/tarifs`, `/protect`, `/dashboard`, `/admin`.
- Le scan gratuit fonctionne avec email.
- Le paiement crée une demande en attente.
- La validation admin passe par endpoint serveur protégé.
- Un utilisateur non admin ne peut pas appeler les endpoints admin.
- Le rapport premium n'est accessible qu'après validation réelle.
- Les clés sensibles ne sont plus dans le bundle frontend.
- Le sitemap pointe vers les bonnes routes.

## 11. Suggestions non prioritaires pour plus tard

- Paiement Wave automatisé si API/agrégateur disponible.
- Plans SaaS multi-niveaux : Basic, Pro, Agency.
- Dashboard agence multi-clients.
- API publique payante pour agences.
- Scans programmés par secteur/benchmark concurrent.
- Score de risque cyber simplifié pour dirigeants.
- Intégration WhatsApp Business pour relance automatique.

## 12. Décision demandée

Avant toute modification du code applicatif, merci de valider l'un des chemins suivants :

1. **Valider le plan complet** : j'applique Phase A puis Phase B en priorité.
2. **Valider seulement P0** : je sécurise d'abord auth, paiement, secrets et SSRF.
3. **Valider conversion d'abord** : je commence par landing, paiement et pricing, en gardant la sécurité ensuite.

Recommandation senior : **option 2 d'abord**. Webisafe vend de la cybersécurité ; il faut d'abord sécuriser l'accès admin, les paiements, les clés et le scanner avant d'accélérer l'acquisition.
