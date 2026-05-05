# 🔒 Webisafe - Audit de sites web pour les PME africaines

Scanner d'audit web : Performance · Sécurité · SEO · UX Mobile

---

## � Table des matières

- [Présentation](#présentation)
- [Architecture](#architecture)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Développement](#développement)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Sécurité](#sécurité)

---

## 🎯 Présentation

Webisafe est une plateforme d'audit de sites web conçue pour les PME africaines. Elle permet d'analyser gratuitement la performance, la sécurité, le SEO et l'UX mobile d'un site web, avec des recommandations actionnables pour améliorer la présence en ligne.

### Fonctionnalités principales

- **Scan multi-dimensions** : Performance, Sécurité, SEO, UX Mobile
- **Scoring pondéré** : Perf 30%, Sec 35%, SEO 20%, UX 15%
- **Rapports détaillés** avec recommandations actionnables
- **Mode freemium** avec gating stratégique
- **Paiement Wave** adapté au marché africain
- **Dashboard utilisateur** avec historique des scans
- **Panel admin** pour gérer les paiements et abonnements

---

## 🏗️ Architecture

### Stack technique

- **Frontend** : React 19 + Vite + TailwindCSS
- **Backend** : Supabase (BaaS)
- **Authentification** : Supabase Auth
- **API Externes** : Google PageSpeed Insights, VirusTotal
- **Email** : Resend
- **Monitoring** : Sentry, Microsoft Clarity
- **Tests** : Playwright (E2E)

### Structure du projet

```
webisafe/
├── src/
│   ├── components/          # Composants React réutilisables
│   │   ├── AccessibleForm.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── Header.jsx
│   │   └── SEOHead.jsx
│   ├── context/             # Contextes React
│   │   └── AuthContext.jsx
│   ├── hooks/               # Hooks personnalisés
│   │   ├── useScans.js
│   │   └── useLiveStats.js
│   ├── lib/                 # Utilitaires et configurations
│   │   ├── envValidation.js
│   │   ├── sentry.js
│   │   └── supabaseClient.js
│   ├── pages/               # Pages de l'application
│   │   ├── Home.jsx
│   │   ├── Analyse.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Rapport.jsx
│   │   └── ...
│   ├── utils/               # Fonctions utilitaires
│   │   ├── validationSchemas.js
│   │   ├── sanitize.js
│   │   └── calculateScore.js
│   ├── App.jsx              # Point d'entrée principal
│   └── main.jsx             # Configuration React
├── api/                     # API handlers (serverless)
│   ├── scan.js              # Endpoint de scan
│   ├── contact.js           # Endpoint de contact
│   └── _utils.js            # Utilitaires API
├── e2e/                     # Tests E2E Playwright
│   ├── home.spec.js
│   ├── auth.spec.js
│   └── contact.spec.js
├── public/                  # Assets statiques
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── playwright.config.js
```

---

## 🚀 Installation

### Prérequis

- Node.js 18+ 
- npm ou yarn
- Un compte Supabase
- Les clés API Google PageSpeed et VirusTotal

### Étapes d'installation

```bash
# Cloner le repository
git clone <repository-url>
cd webisafe

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Configurer les variables d'environnement (voir section ci-dessous)
```

---

## 🔑 Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# Supabase (Obligatoire)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Keys (Obligatoire)
GOOGLE_PAGESPEED_KEY=your-pagespeed-api-key
VIRUSTOTAL_API_KEY=your-virustotal-api-key

# Email (Obligatoire)
RESEND_API_KEY=your-resend-api-key

# Monitoring (Optionnel)
SENTRY_DSN=your-sentry-dsn
VITE_CLARITY_PROJECT_ID=your-clarity-project-id
GA_MEASUREMENT_ID=your-ga-measurement-id

# Contact (Optionnel)
CONTACT_ADMIN_EMAIL=admin@webisafe.ci
CONTACT_FROM_EMAIL=noreply@webisafe.ci

# UptimeRobot (Optionnel)
UPTIMEROBOT_API_KEY=your-uptimerobot-api-key
CRON_SECRET=your-cron-secret
```

### Obtenir les clés API

| API | Lien | Limite gratuite |
|-----|------|-----------------|
| Google PageSpeed | console.cloud.google.com → PageSpeed Insights API | 25 000 req/jour |
| VirusTotal | virustotal.com → Compte → API Key | 500 req/jour |
| Resend | resend.com → API Keys | 3 000 emails/mois |
| Supabase | supabase.com → New Project | 500 MB DB, 1 GB bandwidth |

---

## � Développement

### Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Lancer les tests E2E

```bash
# Installer les navigateurs Playwright (première fois)
npx playwright install

# Lancer les tests
npm run test:e2e

# Lancer les tests en mode UI
npx playwright test --ui
```

### Build de production

```bash
npm run build
```

### Prévisualiser le build de production

```bash
npm run preview
```

---

## 🧪 Tests

### Tests E2E avec Playwright

Les tests E2E sont situés dans le dossier `e2e/` et couvrent :

- **home.spec.js** : Page d'accueil, formulaire de scan, navigation
- **auth.spec.js** : Authentification, inscription, validation
- **contact.spec.js** : Formulaire de contact, validation des champs

```bash
# Lancer tous les tests
npx playwright test

# Lancer un fichier spécifique
npx playwright test e2e/home.spec.js

# Lancer en mode headed
npx playwright test --headed

# Voir le rapport HTML
npx playwright show-report
```

---

## 🚢 Déploiement

### Déploiement sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

Variables d'environnement à configurer dans Vercel :
- Toutes les variables du fichier `.env.local`
- Supprimer le préfixe `VITE_` pour les variables côté serveur

### Déploiement sur Netlify

```bash
# Installer Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Déployer
netlify deploy --prod
```

---

## 🔐 Sécurité

### Mesures de sécurité implémentées

1. **Validation stricte des entrées** avec Zod
2. **Sanitization HTML** avec DOMPurify
3. **Limitation de la taille des payloads**
4. **Rate limiting** sur les API endpoints
5. **CORS configuré** pour les origines autorisées
6. **Error Boundary** React pour capturer les erreurs
7. **Sentry** pour le tracking des erreurs en production
8. **RLS Supabase** pour la sécurité des données
9. **Cache avec TTL** pour éviter les abus d'API

### Bonnes pratiques

- Ne jamais exposer les variables d'environnement
- Utiliser des secrets forts pour les clés API
- Activer 2FA sur tous les comptes externes
- Surveiller les logs Sentry régulièrement
- Effectuer des audits de sécurité réguliers

---

## 📊 API Endpoints

### `POST /api/scan`

Effectue un audit complet d'un site web.

**Body JSON :**
```json
{
  "url": "https://exemple.ci",
  "email": "user@example.com"
}
```

**Réponse :**
```json
{
  "success": true,
  "scan_id": "uuid-v4",
  "url": "https://exemple.ci",
  "global_score": 54,
  "scores": {
    "performance": 61,
    "security": 38,
    "seo": 72,
    "ux": 58
  },
  "metrics": { ... },
  "alerts": [ ... ]
}
```

### `POST /api/contact`

Envoie un message de contact.

**Body JSON :**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Support",
  "message": "Message..."
}
```

---

## ⚙️ Pondération du score global

| Catégorie   | Poids |
|-------------|-------|
| Sécurité    | 35 %  |
| Performance | 30 %  |
| SEO         | 20 %  |
| UX Mobile   | 15 %  |

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir le fichier [CONTRIBUTING.md](CONTRIBUTING.md) pour plus de détails.

---

## � Licence

Ce projet est sous licence propriétaire. Contactez l'équipe Webisafe pour plus d'informations.

---

## 📞 Support

- Email : support@webisafe.ci
- Site : https://webisafe.vercel.app
- WhatsApp : +225 01 70 90 77 80
