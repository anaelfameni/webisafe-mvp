# Scanner accuracy design

## Objectif

Rendre les scores Webisafe plus fiables sur les grands sites techniques sans créer de whitelist, sans booster artificiellement les domaines connus et sans masquer les vrais problèmes des sites faibles.

## Problèmes identifiés

- Le frontend recalcule les scores et applique un cap trop brutal : un seul échec peut plafonner une catégorie à 89.
- Le backend et le frontend n'utilisent pas les mêmes poids globaux.
- Certains signaux non vérifiés, comme le sitemap, sont traités comme des échecs.
- Les headers de sécurité sont comptés de façon uniforme alors que leur gravité diffère.
- Les pages WAF/captcha peuvent être analysées comme si elles étaient la vraie page du site, ce qui fausse SEO et UX.
- Les checks `HEAD` peuvent être insuffisants sur certains grands sites qui répondent différemment à `HEAD` et `GET`.

## Décision

Adopter un scoring par preuves observées, gravité et confiance du scan.

Le scanner ne doit pas attribuer un score élevé à un site parce qu'il est connu. Il doit mieux interpréter les signaux observés :

- Les vrais problèmes critiques continuent de pénaliser fortement le score.
- Les signaux mineurs ne doivent pas empêcher automatiquement un score supérieur à 90.
- Les signaux inconnus ou non vérifiables ne doivent pas être traités comme des échecs prouvés.
- Les WAF/captcha doivent produire un scan partiel avec avertissement, pas une pénalité SEO/UX massive.

## Architecture proposée

### Source de vérité du score

Le backend devient la source principale du score métier. Le frontend conserve la normalisation d'affichage, mais ne doit plus appliquer de caps contradictoires avec le backend.

Les poids globaux doivent être alignés :

- Performance : 35%
- Sécurité : 30%
- SEO : 25%
- UX : 10%

### Sévérité des problèmes

Les problèmes seront classés par gravité :

- `critical` : malware, fichiers sensibles exposés, HTTPS absent, site inaccessible.
- `high` : HSTS absent, CSP absent, mixed content, viewport absent, très mauvais Core Web Vitals.
- `medium` : headers recommandés manquants, meta description absente, images sans alt, formulaire sans label.
- `low` : Open Graph absent, H1 multiple, longueur title non idéale.
- `unknown` : signal non vérifié ou bloqué.

Les caps doivent être remplacés ou fortement adoucis : un seul problème `low` ou `medium` ne doit pas plafonner automatiquement la catégorie sous 90.

### Détection WAF/captcha

Ajouter une détection partagée pour reconnaître les pages de protection :

- `/.well-known/sgcaptcha`
- `captcha`
- `recaptcha`
- `hcaptcha`
- `cf-challenge`
- `cloudflare`
- `bot protection`
- meta refresh vers une page de challenge

Si une page de protection est détectée :

- marquer SEO et UX comme `partial: true`
- ajouter un champ `protection_detected`
- ajouter un avertissement explicite dans le rapport
- ne pas transformer les critères HTML manquants en échecs forts

### Sécurité headers

Améliorer la lecture des headers :

- faire `HEAD` en premier
- faire un fallback `GET` si `HEAD` échoue ou retourne une réponse inexploitable
- pondérer les headers selon leur gravité réelle

### SEO

Corriger les faux négatifs :

- ne pas pénaliser `has_sitemap` si le scanner ne l'a pas réellement vérifié
- traiter Open Graph comme bonus ou signal mineur
- ne pas considérer automatiquement plusieurs H1 comme une faute majeure
- utiliser PageSpeed SEO comme signal prioritaire quand disponible

### UX

Corriger les pénalités trop mécaniques :

- ne pas traiter une page captcha comme une vraie page UX
- garder les vrais problèmes UX pénalisants : viewport absent, zoom bloqué, mixed content, labels absents, images sans alt
- limiter l'impact des signaux mineurs isolés

## Impacts attendus

### Positifs

- Les grands sites bien configurés devraient plus souvent obtenir 90+.
- Les sites protégés par WAF seront signalés comme partiels au lieu d'être injustement dégradés.
- Les vrais problèmes critiques resteront fortement pénalisés.
- Le score affiché sera cohérent entre backend et frontend.

### Risques

- Certains scores existants peuvent augmenter après correction des faux positifs.
- Certains scans peuvent être légèrement plus longs à cause du fallback `GET`.
- Les sites protégés peuvent afficher un score moins définitif, accompagné d'un avertissement.

## Critères de succès

- Aucun boost par domaine ou whitelist.
- Un site avec malware, HTTPS absent ou fichier sensible exposé reste fortement pénalisé.
- Un signal mineur isolé ne bloque plus automatiquement un score supérieur à 90.
- Un WAF/captcha produit un scan partiel explicite.
- Backend et frontend affichent un score cohérent.
