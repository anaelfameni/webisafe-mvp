# 🔐 Webisafe — 7 Vrais Checks de Sécurité

Ce module ajoute **7 contrôles de sécurité réels** au scanner Webisafe.
Aucun bluff : chaque check teste vraiment quelque chose et renvoie un résultat actionnable.

## Architecture

- **Module isolé** : `api/scanners/security-checks.js`
- **Intégration** : appelé depuis `api/scan.js` via `Promise.allSettled`
- **Tolérance aux pannes** : chaque check est dans son propre `try/catch`. Si un check échoue (timeout, API down), il retourne un objet neutre `status: 'error'` sans faire crasher les autres.
- **Format standardisé** : chaque résultat contient `check_name`, `status`, `score_impact`, `criticality`, `title`, `description`, `recommendation`, `technical_detail`, `difficulty`, `time_estimate`.

## Les 7 checks

| # | Check | Méthode | Score impact max |
|---|-------|---------|------------------|
| 1 | **Security Headers** (CSP, HSTS, X-Frame, X-Content-Type, Referrer, Permissions) | `fetch GET` | 55 pts |
| 2 | **DNS SPF + DMARC** | Cloudflare DoH `1.1.1.1` | 22 pts |
| 3 | **Fichiers sensibles exposés** (.env, .git/config, backup.sql…) | `fetch GET` séquentiel | 152 pts cumulés |
| 4 | **Panneaux admin exposés** (wp-admin, phpmyadmin…) | `fetch GET` + parsing keywords | 8 pts × 8 |
| 5 | **Google Safe Browsing** | API Google v4 | 25 pts |
| 6 | **Fuites de données HIBP** | API HaveIBeenPwned | 15 pts |
| 7 | **Mixed Content** | Parse HTML regex | 12 pts |

## Score de sécurité — Combinaison

Le score sécurité retourné par le scan est désormais une **moyenne pondérée** :
- 40 % score de sécurité historique (HTTPS, headers basiques, malware VirusTotal)
- 60 % score des checks avancés (`100 - ∑ score_impact`)

Le score legacy reste accessible via `metrics.security.legacy_score` pour debug.

## Données exposées au frontend

Dans `metrics.security` :

```json
{
  "score": 67,                         // Score combiné (max 97)
  "legacy_score": 75,                  // Score historique (legacy)
  "advanced_security_score": 62,       // Score des nouveaux checks (sur 100)
  "advanced_counts": { "pass": 4, "warning": 2, "fail": 5, "error": 1 },
  "advanced_checks": [
    {
      "check_name": "header_csp",
      "status": "fail",
      "score_impact": 15,
      "criticality": "major",
      "title": "Content-Security-Policy manquant",
      "description": "Sans CSP, votre site est plus vulnérable aux attaques XSS…",
      "recommendation": "Ajouter Content-Security-Policy dans la configuration…",
      "technical_detail": "Header CSP absent de la réponse HTTP",
      "difficulty": "⭐⭐⭐ Technique",
      "time_estimate": "30 à 60 minutes"
    },
    …
  ]
}
```

Le wrapper `src/utils/api.js` :
- expose `security.advanced_checks` côté UI
- convertit automatiquement chaque `fail` ou `warning` en **recommandation** (apparaît dans la page Analyse, le Rapport et le PDF généré)
- les `critical_alerts` du backend incluent les `fail` de criticité `critical` (Safe Browsing, DMARC manquant, fichier sensible exposé…)

## ✅ Variables d'environnement à configurer

### Obligatoire
- `GOOGLE_PAGESPEED_KEY` (déjà en place)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (déjà en place)

### Recommandé pour les nouveaux checks
- `GOOGLE_SAFE_BROWSING_API_KEY` (gratuit, 10 000 req/jour)
  - Va sur https://console.cloud.google.com/apis/library/safebrowsing.googleapis.com
  - Active l'API "Safe Browsing API" sur ton projet GCP
  - Crée une clé API restreinte à cette API
  - Ajoute-la dans `.env.local` ET dans les variables Vercel (Settings → Environment Variables)

> Le code lit dans cet ordre : `GOOGLE_SAFE_BROWSING_API_KEY`, puis `GOOGLE_SAFE_BROWSING_KEY`, puis `VITE_GOOGLE_SAFE_BROWSING_KEY`. Tu as déjà `GOOGLE_SAFE_BROWSING_KEY` dans ton `.env`, donc ça marche tout de suite.

### Optionnel
- `VIRUSTOTAL_API_KEY` (déjà en place, garde-la)

### Aucune clé requise
- HaveIBeenPwned : API publique gratuite, rate-limitée à 1 req/1.5s
- Cloudflare DoH (DNS SPF/DMARC) : public

## 🧪 Tests de validation

Après déploiement, scanne ces URLs pour vérifier chaque check :

| Check | URL de test | Comportement attendu |
|-------|-------------|----------------------|
| 1 (Headers) | `https://webisafe.vercel.app` | tous les headers détectés |
| 2 (DNS) | `https://exemple-sans-dmarc.com` | DMARC = fail, SPF = fail |
| 3 (Fichiers sensibles) | `http://testphp.vulnweb.com` | détection probable |
| 5 (Safe Browsing) | `http://testsafebrowsing.appspot.com/s/malware.html` | fail, criticality critical |
| 6 (HIBP) | `https://linkedin.com` | warning ou fail (breaches connues) |
| 7 (Mixed Content) | site WordPress mal migré | détection des images http:// |

Si un check retourne systématiquement `status: 'error'`, regarde les logs Vercel :
```bash
vercel logs --follow
```
Tu verras `[CHECK headers] échec`, `[CHECK SafeBrowsing] échec`, etc. avec le message exact.

## ⏱️ Performance

Les 7 checks tournent en parallèle (`Promise.allSettled`). Avec timeouts de 4-5s chacun :
- Cas normal : **~5 secondes** ajoutées au scan total
- Cas pire (tous timeouts) : **~5s plafond** (parallélisme)

Vercel Serverless gratuit : 10s max → conforme.
Plan Pro : 60s → confortable.

## 🚀 Évolutions possibles (post-MVP)

- **Cache Supabase** des résultats pendant 24h (déjà désactivé dans `readCache`, à activer)
- **Scan SSL approfondi** via SSL Labs API (grade A+/A/B…)
- **Scan ports ouverts** via Shodan API (paid)
- **Scan WordPress** : version, plugins outdated, comptes admin par défaut
- **Scan dépendances JS** : versions Lodash/jQuery/React vulnérables (Snyk DB)
