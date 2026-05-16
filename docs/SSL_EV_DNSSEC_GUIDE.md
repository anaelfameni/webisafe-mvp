# Guide SSL EV & DNSSEC — Webisafe (W.3 / W.4)

> Ce document explique comment Webisafe vérifie les certificats SSL Extended
> Validation (EV) et l'état DNSSEC d'un domaine, comment interpréter les
> résultats dans les rapports, et comment guider un client pour activer
> ces protections.

---

## 1. SSL Extended Validation (EV) — W.3

### Qu'est-ce que c'est ?

Un certificat SSL EV est délivré par une autorité de certification après
**vérification approfondie de l'identité légale de l'entreprise** : registre
du commerce, adresse vérifiée, appels téléphoniques de confirmation. Il se
distingue des certificats DV (Domain Validation) — qui ne vérifient que le
contrôle du domaine — et des OV (Organization Validation).

### Pourquoi c'est important pour les PME africaines

- **Confiance institutionnelle** : un certificat EV indique aux clients,
  banques et partenaires que l'entité opérant le site est légalement vérifiée.
- **Score sécurité Webisafe** : la présence d'un EV apporte un bonus de +5 à +10
  points sur le score sécurité (selon la qualité globale).
- **Anti-phishing** : les certificats EV rendent l'impersonnation d'une marque
  plus coûteuse pour un attaquant.

### Comment Webisafe détecte un certificat EV

Le check `ssl_extended_validation` (api côté serveur) extrait les attributs du
certificat SSL renvoyé par le serveur cible, puis :

1. Récupère le champ `subject` du certificat (nom légal de l'entreprise,
   pays, code juridiction).
2. Récupère les **OID de policy** (Object Identifiers) embarqués dans le
   certificat. Les CA principales utilisent des OID dédiés pour les EV
   (ex : `2.16.840.1.114414.1.7.23.3` pour Amazon, `2.23.140.1.1` pour le
   CA/Browser Forum baseline EV).
3. Compare contre une **liste blanche d'OID EV reconnus** (voir
   `api/scan-extended-security.js`).
4. Si match → `status: pass`, sinon `status: warn` (DV/OV détecté) ou
   `unknown` (timeout, parse error).

### Que voir dans le rapport client

Section **Sécurité Avancée → Certificat SSL EV** :

- ✅ **Conforme** : "Certificat Extended Validation détecté ({CA})"
- ⚠️ **Attention** : "Certificat standard (DV/OV) — l'identité légale n'est
  pas vérifiée"
- ❓ **Non mesuré** : "Impossible d'analyser le certificat (timeout)"

### Recommandation Webisafe pour activer EV

> Étapes proposées au client dans la section recommandations :
>
> 1. Choisir une CA reconnue (DigiCert, Sectigo, GlobalSign).
> 2. Préparer les pièces : extrait Kbis ou équivalent OHADA, adresse vérifiée,
>    téléphone professionnel actif.
> 3. Compter 5 à 15 jours pour la validation initiale.
> 4. Compter 250 000 – 600 000 FCFA / an selon la CA.
> 5. Renouveler tous les 12 ou 13 mois (le standard EV impose maintenant 13 mois max).

---

## 2. DNSSEC — W.4

### Qu'est-ce que c'est ?

DNSSEC (Domain Name System Security Extensions) signe cryptographiquement les
réponses DNS pour empêcher l'empoisonnement de cache et les attaques
man-in-the-middle au niveau résolution DNS. Sans DNSSEC, un attaquant capable
d'intercepter le trafic peut rediriger les visiteurs vers un faux serveur
même si SSL est activé sur le vrai serveur.

### Pourquoi c'est important

- **Banques, e-commerce, fintech** : DNSSEC est exigé par de nombreuses
  réglementations financières (ex : régulations BCEAO en cours d'évolution).
- **Score sécurité Webisafe** : DNSSEC actif apporte +3 à +7 points sur le
  score sécurité.
- **Compatibilité** : DNSSEC est largement supporté par les TLD africains
  (.ci, .sn, .ma, .tn, .za, .ng, .ke) — et obligatoirement par .com / .org.

### Comment Webisafe détecte DNSSEC

Le check `dnssec` (côté serveur, dans `api/scan-extended-security.js`) :

1. Interroge en parallèle plusieurs résolveurs DNS publics (Google `8.8.8.8`,
   Cloudflare `1.1.1.1`).
2. Demande l'enregistrement **DS** (Delegation Signer) au niveau du domaine
   parent (registre TLD).
3. Demande les enregistrements **DNSKEY** au niveau du domaine cible.
4. Vérifie qu'au moins un DS pointe vers un DNSKEY valide.
5. Vérifie le flag `AD` (Authenticated Data) dans la réponse DNS — confirme
   que la chaîne de confiance est validée par le résolveur.

Statuts possibles :

| Statut | Signification |
| ------ | ------------- |
| `pass` | DS + DNSKEY + flag AD = chaîne complète et signée |
| `warn` | Configuration partielle (ex : DNSKEY présent mais pas de DS au registre) |
| `fail` | Aucun enregistrement DNSSEC trouvé |
| `unknown` | Timeout, ou résolveur DNS ne supporte pas DNSSEC |

### Que voir dans le rapport client

Section **Sécurité Avancée → DNSSEC** :

- ✅ **Conforme** : "DNSSEC actif et chaîne de confiance validée"
- ⚠️ **Attention** : "Configuration partielle — DNSKEY sans DS publié"
- ❌ **Non conforme** : "DNSSEC non activé pour ce domaine"

### Recommandation Webisafe pour activer DNSSEC

> Étapes proposées au client :
>
> 1. Vérifier que le **registrar** (Gandi, OVH, Africa Registry, Namecheap…)
>    supporte DNSSEC. C'est le cas de tous les registrars sérieux.
> 2. Vérifier que le **DNS provider** (Cloudflare, Route 53, DNSimple) supporte
>    la signature automatique. **Recommandation Webisafe : Cloudflare** (activation
>    en 1 clic, gratuit).
> 3. Activer DNSSEC dans l'interface du DNS provider — le DNS provider génère
>    automatiquement la paire de clés (KSK / ZSK).
> 4. Copier l'enregistrement **DS** depuis l'interface DNS et le coller dans
>    l'interface du registrar (section "DNSSEC" ou "DS records").
> 5. Attendre la propagation TLD (4h à 48h selon le TLD).
> 6. Tester avec [Verisign DNSSEC Debugger](https://dnssec-debugger.verisignlabs.com/)
>    ou `dig +dnssec example.com`.

### Pièges fréquents (à anticiper côté support)

- **Migration de DNS** : si le client change de DNS provider, **désactiver
  DNSSEC AVANT** la bascule (sinon le domaine devient injoignable).
- **DNSSEC + email** : si le domaine envoie du courrier (DKIM, DMARC), DNSSEC
  protège aussi ces enregistrements TXT — bonus sécurité non négligeable.
- **CDN tiers** : certains CDN (ex : un CDN africain custom) peuvent ne pas
  bien gérer DNSSEC. Vérifier avec le CDN avant activation.

---

## 3. Comment ces checks alimentent le score sécurité Webisafe

Le score sécurité (`/100`) combine ~20 checks, dont :

| Check | Poids | Statut idéal |
| ----- | ----- | ------------ |
| HTTPS / TLS valide | 15 | pass |
| HSTS | 8 | pass |
| Headers de sécurité (CSP, X-Frame-Options, …) | 12 | pass |
| **SSL EV** | 5 | pass (bonus) |
| **DNSSEC** | 5 | pass (bonus) |
| CSP qualité | 10 | pass |
| Versions JS libs (CVE scan) | 10 | pass |
| WordPress security (si CMS détecté) | 8 | pass |
| Compliance badges (PCI, GDPR, OHADA…) | 7 | pass |

> La formule exacte vit dans `src/utils/calculateScore.js` (`calculateScores`).
> Les bonus EV / DNSSEC sont conçus pour **différencier** les sites de niveau
> "premium" sans pénaliser durement les sites sans EV (qui restent valables).

---

## 4. Bonus support : que répondre à un client qui demande "Faut-il EV + DNSSEC ?"

Question fréquente : *"Mon site marche, est-ce vraiment nécessaire ?"*

Réponse type (à adapter selon le client) :

> EV et DNSSEC ne sont **pas obligatoires** pour un site vitrine ou un blog.
> Ils deviennent **fortement recommandés** dans les cas suivants :
>
> - Vous prenez des paiements en ligne (e-commerce, fintech, recharge mobile)
> - Vous gérez des données sensibles (banque, santé, ressources humaines)
> - Vous êtes en B2B et vos clients sont des grandes entreprises ou institutions
> - Vous voulez afficher un badge "Sécurisé par Webisafe Premium" sur votre site
>
> Pour un site vitrine simple, restez sur **HTTPS + DV** + bonnes pratiques
> classiques (CSP, HSTS) — c'est largement suffisant et 4x moins cher.

---

## 5. Références techniques

- [CA/Browser Forum EV Guidelines](https://cabforum.org/extended-validation/)
- [RFC 4033 — DNSSEC Introduction](https://datatracker.ietf.org/doc/html/rfc4033)
- [Cloudflare DNSSEC docs](https://developers.cloudflare.com/dns/dnssec/)
- [Verisign DNSSEC Debugger](https://dnssec-debugger.verisignlabs.com/)
- [Africa Registry DNSSEC](https://africaregistry.net/) — support DNSSEC pour
  TLD africains.

Source des checks Webisafe : `api/scan-extended-security.js` (méthodes
`checkSSLExtendedValidation` et `checkDNSSEC`).
