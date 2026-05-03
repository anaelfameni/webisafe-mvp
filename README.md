# 🔒 Webisafe — Backend Express.js

Scanner d'audit web : Performance · Sécurité · SEO · UX Mobile

---

## 📂 Structure

```
server/
├── index.js                    ← Serveur Express (point d'entrée)
├── package.json
├── .env.example                ← Copier en .env.local
├── routes/
│   └── scan.js                 ← POST /api/scan
├── controllers/
│   └── scanController.js       ← Orchestration des 4 scanners
├── scanners/
│   ├── performanceScanner.js   ← Google PageSpeed (mobile)
│   ├── securityScanner.js      ← VirusTotal + Mozilla Observatory
│   ├── seoScanner.js           ← Scraping HTML + Cheerio
│   └── uxScanner.js            ← Google PageSpeed (accessibility)
└── utils/
    └── scoreCalculator.js      ← Score pondéré + grade
```

---

## 🚀 Installation

```bash
cd server
cp .env.example .env.local
# Remplis les clés dans .env.local
npm install
npm start           # Production
npm run dev         # Développement (nodemon)
```

---

## 🔑 Clés API à obtenir (toutes gratuites)

| API | Lien | Limite gratuite |
|-----|------|-----------------|
| Google PageSpeed | console.cloud.google.com → PageSpeed Insights API | 25 000 req/jour |
| VirusTotal | virustotal.com → Compte → API Key | 500 req/jour |

Mozilla Observatory ne nécessite pas de clé.

---

## 📡 Endpoint

### `POST /api/scan`

**Body JSON :**
```json
{ "url": "https://exemple.ci" }
```

**Réponse :**
```json
{
  "success": true,
  "scan_id": "uuid-v4",
  "url": "https://exemple.ci",
  "global_score": 54,
  "grade": "C",
  "scores": {
    "performance": 61,
    "security": 38,
    "seo": 72,
    "ux": 58
  },
  "metrics": {
    "performance": { "lcp": 3800, "cls": 0.18, "fcp": 2100, "page_weight_mb": 3.4 },
    "security": { "malware_detected": false, "observatory_score": 45, "https": true },
    "seo": { "has_title": true, "title_length": 52, "has_description": false, "desc_length": 0, "h1_count": 1, "has_viewport": true, "has_open_graph": false },
    "ux": { "accessibility_score": 58, "tap_targets_ok": false }
  },
  "scanner_errors": {
    "performance": null,
    "security": null,
    "seo": null,
    "ux": null
  },
  "scan_duration_ms": 4823
}
```

### `GET /api/health`

Vérifie que le serveur est en ligne.

---

## ⚙️ Pondération du score global

| Catégorie   | Poids |
|-------------|-------|
| Sécurité    | 35 %  |
| Performance | 30 %  |
| SEO         | 20 %  |
| UX Mobile   | 15 %  |

Si un scanner échoue, son poids est redistribué proportionnellement entre les scanners disponibles.

---

## 🛡️ Notes de sécurité

- Le module `"type": "module"` est requis dans `package.json` pour les imports ES6
- Ne jamais exposer `.env.local` — ajouté au `.gitignore`
- Le CORS est restreint à `localhost:5173` en développement
- Chaque scanner a un timeout individuel via `AbortController`
- `Promise.allSettled` garantit qu'un échec isolé ne bloque pas les autres scanners
