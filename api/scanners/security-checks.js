// api/scanners/security-checks.js
// 7 contrôles de sécurité avancés, indépendants et tolérants aux pannes.
// Chaque check retourne UN OBJET (ou un TABLEAU d'objets) au format standard documenté.
// Compatible Vercel Serverless : utilise uniquement fetch() natif et AbortSignal.timeout().

const UA = 'Mozilla/5.0 (compatible; WebisafeScanner/1.0; +https://webisafe.ci)';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function neutralError(checkName, reason = 'Check non disponible') {
    return {
        check_name: checkName,
        status: 'error',
        score_impact: 0,
        criticality: 'minor',
        title: 'Vérification non disponible',
        description: reason,
        recommendation: 'Réessayez le scan dans quelques instants.',
        technical_detail: reason,
        difficulty: '⭐ Facile',
        time_estimate: '—',
    };
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
        return null;
    }
}

function extractBaseUrl(url) {
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 1 — Security Headers complets (6 sous-checks)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkSecurityHeaders(url) {
    try {
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': UA, 'Accept': '*/*' },
            signal: AbortSignal.timeout(5000),
        });

        const h = res.headers;
        const csp = h.get('content-security-policy');
        const hsts = h.get('strict-transport-security');
        const xfo = h.get('x-frame-options');
        const xcto = h.get('x-content-type-options');
        const refp = h.get('referrer-policy');
        const permp = h.get('permissions-policy');

        const out = [];

        // 1.1 — CSP
        if (csp) {
            out.push({
                check_name: 'header_csp',
                status: 'pass',
                score_impact: 0,
                criticality: 'major',
                title: 'Content-Security-Policy actif',
                description: 'Le navigateur reçoit une politique de sécurité du contenu.',
                recommendation: 'Conservez et durcissez progressivement votre CSP.',
                technical_detail: `Header présent : ${csp.slice(0, 120)}${csp.length > 120 ? '…' : ''}`,
                difficulty: '⭐⭐⭐ Technique',
                time_estimate: '30 à 60 minutes',
            });
        } else {
            out.push({
                check_name: 'header_csp',
                status: 'fail',
                score_impact: 15,
                criticality: 'major',
                title: 'Content-Security-Policy manquant',
                description: 'Sans CSP, votre site est plus vulnérable aux attaques XSS et à l\'injection de scripts tiers.',
                recommendation: 'Ajouter Content-Security-Policy dans la configuration serveur ou via un meta tag HTML.',
                technical_detail: 'Header CSP absent de la réponse HTTP',
                difficulty: '⭐⭐⭐ Technique',
                time_estimate: '30 à 60 minutes',
            });
        }

        // 1.2 — HSTS
        if (hsts) {
            const m = hsts.match(/max-age=(\d+)/i);
            const maxAge = m ? Number(m[1]) : 0;
            if (maxAge >= 31536000) {
                out.push({
                    check_name: 'header_hsts',
                    status: 'pass',
                    score_impact: 0,
                    criticality: 'major',
                    title: 'HSTS correctement configuré',
                    description: 'Votre site force HTTPS pour les visiteurs récurrents.',
                    recommendation: 'Soumettez votre domaine sur hstspreload.org pour rejoindre la liste preload.',
                    technical_detail: `Header présent : ${hsts}`,
                    difficulty: '⭐⭐ Intermédiaire',
                    time_estimate: '15 minutes',
                });
            } else {
                out.push({
                    check_name: 'header_hsts',
                    status: 'warning',
                    score_impact: 5,
                    criticality: 'minor',
                    title: 'HSTS présent mais max-age trop court',
                    description: `Votre HSTS expire trop tôt (max-age=${maxAge}s). Recommandé : 31536000s (1 an).`,
                    recommendation: 'Ajouter : Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
                    technical_detail: `Header présent : ${hsts}`,
                    difficulty: '⭐⭐ Intermédiaire',
                    time_estimate: '15 minutes',
                });
            }
        } else {
            out.push({
                check_name: 'header_hsts',
                status: 'fail',
                score_impact: 12,
                criticality: 'major',
                title: 'HSTS manquant',
                description: 'Sans HSTS, un attaquant peut forcer vos visiteurs à utiliser HTTP non chiffré.',
                recommendation: 'Ajouter : Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
                technical_detail: 'Header absent',
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '15 minutes',
            });
        }

        // 1.3 — X-Frame-Options
        const xfoVal = (xfo || '').trim().toUpperCase();
        if (xfoVal === 'DENY' || xfoVal === 'SAMEORIGIN') {
            out.push({
                check_name: 'header_xframe',
                status: 'pass',
                score_impact: 0,
                criticality: 'major',
                title: 'X-Frame-Options actif',
                description: 'Votre site est protégé contre le clickjacking.',
                recommendation: 'Configuration correcte, rien à faire.',
                technical_detail: `Valeur : ${xfo}`,
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '10 minutes',
            });
        } else {
            out.push({
                check_name: 'header_xframe',
                status: 'fail',
                score_impact: 10,
                criticality: 'major',
                title: 'X-Frame-Options manquant ou permissif',
                description: 'Sans ce header, votre site peut être inclus dans une iframe malveillante (clickjacking).',
                recommendation: 'Ajouter X-Frame-Options: DENY pour bloquer le clickjacking.',
                technical_detail: xfo ? `Valeur trouvée : ${xfo}` : 'Header absent',
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '10 minutes',
            });
        }

        // 1.4 — X-Content-Type-Options
        if ((xcto || '').trim().toLowerCase() === 'nosniff') {
            out.push({
                check_name: 'header_xcontent',
                status: 'pass',
                score_impact: 0,
                criticality: 'minor',
                title: 'X-Content-Type-Options actif',
                description: 'Le navigateur respecte strictement les types MIME déclarés.',
                recommendation: 'Configuration correcte.',
                technical_detail: 'Valeur : nosniff',
                difficulty: '⭐ Facile',
                time_estimate: '5 minutes',
            });
        } else {
            out.push({
                check_name: 'header_xcontent',
                status: 'fail',
                score_impact: 8,
                criticality: 'minor',
                title: 'X-Content-Type-Options manquant',
                description: 'Le navigateur peut interpréter à tort certains fichiers comme du code exécutable.',
                recommendation: 'Ajouter X-Content-Type-Options: nosniff',
                technical_detail: xcto ? `Valeur trouvée : ${xcto}` : 'Header absent',
                difficulty: '⭐ Facile',
                time_estimate: '5 minutes',
            });
        }

        // 1.5 — Referrer-Policy
        const refpVal = (refp || '').trim().toLowerCase();
        const strictRefp = ['strict-origin', 'no-referrer', 'strict-origin-when-cross-origin', 'same-origin'];
        if (strictRefp.some((v) => refpVal.includes(v))) {
            out.push({
                check_name: 'header_referrer',
                status: 'pass',
                score_impact: 0,
                criticality: 'minor',
                title: 'Referrer-Policy stricte',
                description: 'Les URLs internes ne fuient pas vers les sites externes.',
                recommendation: 'Configuration correcte.',
                technical_detail: `Valeur : ${refp}`,
                difficulty: '⭐ Facile',
                time_estimate: '5 minutes',
            });
        } else {
            out.push({
                check_name: 'header_referrer',
                status: 'warning',
                score_impact: 5,
                criticality: 'minor',
                title: 'Referrer-Policy absente ou permissive',
                description: 'Les URLs internes (avec paramètres sensibles) peuvent fuiter vers les sites externes.',
                recommendation: 'Ajouter Referrer-Policy: strict-origin-when-cross-origin',
                technical_detail: refp ? `Valeur trouvée : ${refp}` : 'Header absent',
                difficulty: '⭐ Facile',
                time_estimate: '5 minutes',
            });
        }

        // 1.6 — Permissions-Policy
        if (permp) {
            out.push({
                check_name: 'header_permissions',
                status: 'pass',
                score_impact: 0,
                criticality: 'minor',
                title: 'Permissions-Policy actif',
                description: 'Vous contrôlez l\'accès aux APIs sensibles du navigateur.',
                recommendation: 'Configuration en place.',
                technical_detail: `Valeur : ${permp.slice(0, 120)}${permp.length > 120 ? '…' : ''}`,
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '20 minutes',
            });
        } else {
            out.push({
                check_name: 'header_permissions',
                status: 'warning',
                score_impact: 5,
                criticality: 'minor',
                title: 'Permissions-Policy manquant',
                description: 'Tout script tiers peut accéder à la caméra, micro, géolocalisation.',
                recommendation: 'Ajouter Permissions-Policy pour contrôler l\'accès aux APIs du navigateur (caméra, micro, géolocalisation).',
                technical_detail: 'Header absent',
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '20 minutes',
            });
        }

        return out;
    } catch (e) {
        console.warn('[CHECK headers] échec :', e.message);
        return [neutralError('security_headers', `Impossible de récupérer les headers HTTP (${e.message})`)];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 2 — DNS SPF + DMARC (via Cloudflare DoH)
// ─────────────────────────────────────────────────────────────────────────────
async function dohQueryTxt(name) {
    const res = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`DoH HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.Answer) ? json.Answer : [];
}

export async function checkDNSEmailSecurity(domain) {
    if (!domain) {
        return [
            neutralError('dns_spf', 'Domaine introuvable'),
            neutralError('dns_dmarc', 'Domaine introuvable'),
        ];
    }

    const out = [];

    // SPF
    try {
        const ans = await dohQueryTxt(domain);
        const flat = ans.map((r) => String(r.data || '').replace(/^"|"$/g, '').replace(/"\s*"/g, ''));
        const spf = flat.find((v) => v.toLowerCase().startsWith('v=spf1'));
        if (spf) {
            out.push({
                check_name: 'dns_spf',
                status: 'pass',
                score_impact: 0,
                criticality: 'major',
                title: 'Enregistrement SPF présent',
                description: 'Vos emails sortants sont authentifiables.',
                recommendation: 'Vérifiez périodiquement que tous vos services d\'envoi sont déclarés.',
                technical_detail: spf,
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '20 minutes',
            });
        } else {
            out.push({
                check_name: 'dns_spf',
                status: 'fail',
                score_impact: 10,
                criticality: 'major',
                title: 'Enregistrement SPF manquant',
                description: 'Sans SPF, n\'importe qui peut envoyer des emails en se faisant passer pour votre domaine.',
                recommendation: 'Ajouter un enregistrement TXT SPF chez votre registrar DNS : v=spf1 include:_spf.google.com ~all (à adapter selon votre fournisseur email).',
                technical_detail: `Aucun TXT v=spf1 trouvé sur ${domain}`,
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '20 minutes',
            });
        }
    } catch (e) {
        console.warn('[CHECK SPF] échec :', e.message);
        out.push(neutralError('dns_spf', `Lookup DNS impossible : ${e.message}`));
    }

    // DMARC
    try {
        const ans = await dohQueryTxt(`_dmarc.${domain}`);
        const flat = ans.map((r) => String(r.data || '').replace(/^"|"$/g, '').replace(/"\s*"/g, ''));
        const dmarc = flat.find((v) => v.toLowerCase().startsWith('v=dmarc1'));
        if (dmarc) {
            const policy = (dmarc.match(/p=(reject|quarantine|none)/i) || [])[1]?.toLowerCase() || 'none';
            if (policy === 'reject' || policy === 'quarantine') {
                out.push({
                    check_name: 'dns_dmarc',
                    status: 'pass',
                    score_impact: 0,
                    criticality: 'critical',
                    title: 'DMARC actif et appliqué',
                    description: `Politique p=${policy} appliquée : les emails frauduleux sont bloqués ou mis en quarantaine.`,
                    recommendation: 'Conservez la politique en place, surveillez les rapports rua.',
                    technical_detail: dmarc,
                    difficulty: '⭐⭐ Intermédiaire',
                    time_estimate: '20 minutes',
                });
            } else {
                out.push({
                    check_name: 'dns_dmarc',
                    status: 'warning',
                    score_impact: 5,
                    criticality: 'minor',
                    title: 'DMARC en mode surveillance uniquement',
                    description: 'DMARC présent mais en mode surveillance uniquement (p=none). Aucun email frauduleux n\'est bloqué.',
                    recommendation: 'Passez à p=quarantine après 2 à 4 semaines de surveillance.',
                    technical_detail: dmarc,
                    difficulty: '⭐⭐ Intermédiaire',
                    time_estimate: '20 minutes',
                });
            }
        } else {
            out.push({
                check_name: 'dns_dmarc',
                status: 'fail',
                score_impact: 12,
                criticality: 'critical',
                title: 'Enregistrement DMARC manquant',
                description: `Sans DMARC, votre domaine est vulnérable aux attaques de phishing. Des cybercriminels peuvent envoyer des emails frauduleux depuis @${domain}.`,
                recommendation: `Ajouter un enregistrement TXT sur _dmarc.${domain} : v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
                technical_detail: `Aucun TXT v=DMARC1 trouvé sur _dmarc.${domain}`,
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '20 minutes',
            });
        }
    } catch (e) {
        console.warn('[CHECK DMARC] échec :', e.message);
        out.push(neutralError('dns_dmarc', `Lookup DNS impossible : ${e.message}`));
    }

    return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 3 — Fichiers sensibles exposés
// ─────────────────────────────────────────────────────────────────────────────
const SENSITIVE_FILES = [
    { path: '/.env', label: 'Fichier .env', score_impact: 20 },
    { path: '/.git/config', label: 'Configuration Git exposée', score_impact: 20 },
    { path: '/wp-config.php.bak', label: 'Backup config WordPress', score_impact: 20 },
    { path: '/wp-config.bak', label: 'Backup config WordPress', score_impact: 20 },
    { path: '/backup.zip', label: 'Archive backup exposée', score_impact: 15 },
    { path: '/backup.sql', label: 'Base de données exposée', score_impact: 20 },
    { path: '/phpinfo.php', label: 'PHPInfo exposé', score_impact: 12 },
    { path: '/server-status', label: 'Status serveur Apache exposé', score_impact: 10 },
    { path: '/.htpasswd', label: 'Fichier htpasswd exposé', score_impact: 15 },
];

export async function checkSensitiveFiles(baseUrl) {
    if (!baseUrl) return [neutralError('sensitive_files', 'URL invalide')];

    const findings = [];

    for (const file of SENSITIVE_FILES) {
        try {
            const res = await fetch(`${baseUrl}${file.path}`, {
                method: 'GET',
                redirect: 'follow',
                headers: { 'User-Agent': UA },
                signal: AbortSignal.timeout(4000),
            });
            if (res.status !== 200) continue;

            // Lire le contenu pour distinguer un vrai fichier d'une SPA catch-all
            const text = await res.text();
            const bodyLen = text.length;

            // Faux positif : Vercel/Netlify/GitHub Pages servent index.html (SPA catch-all)
            // sur les routes inconnues → contient du HTML
            const isSpaCatchAll = text.includes('<!DOCTYPE html') ||
                                  text.includes('<html') ||
                                  text.includes('<HTML') ||
                                  bodyLen > 50000;

            if (isSpaCatchAll) {
                continue; // Pas un vrai fichier sensible exposé
            }

            if (bodyLen > 0) {
                findings.push({
                    check_name: `sensitive_file_${file.path.replace(/[^a-z0-9]/gi, '_')}`,
                    status: 'fail',
                    score_impact: file.score_impact,
                    criticality: 'critical',
                    title: `${file.label} accessible publiquement`,
                    description: `Le fichier ${file.path} est accessible sans authentification. Il peut contenir des mots de passe, des clés API ou des données de configuration sensibles.`,
                    recommendation: `Supprimer ou bloquer immédiatement l'accès à ${file.path} via votre configuration serveur (.htaccess ou nginx.conf).`,
                    technical_detail: `${baseUrl}${file.path} → HTTP 200 (${bodyLen} octets)`,
                    difficulty: '⭐⭐ Intermédiaire',
                    time_estimate: '15 minutes',
                });
            }
            // 401, 403, 404 ou autre → pas de finding
        } catch (e) {
            // Erreur réseau / timeout : on n'enregistre rien (silencieux)
        }
        await delay(200); // anti rate-limit
    }

    if (findings.length === 0) {
        return [{
            check_name: 'sensitive_files',
            status: 'pass',
            score_impact: 0,
            criticality: 'critical',
            title: 'Aucun fichier sensible exposé',
            description: 'Les chemins courants (.env, .git, backups, phpinfo) ne sont pas accessibles publiquement.',
            recommendation: 'Maintenez cette hygiène : ne déposez jamais de backup en racine du site.',
            technical_detail: `${SENSITIVE_FILES.length} chemins testés, 0 exposé`,
            difficulty: '⭐⭐ Intermédiaire',
            time_estimate: '15 minutes',
        }];
    }
    return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 4 — Panneaux d'administration exposés
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_PATHS = [
    { path: '/wp-admin', label: 'WordPress Admin' },
    { path: '/wp-login.php', label: 'WordPress Login' },
    { path: '/admin', label: 'Panneau Admin' },
    { path: '/administrator', label: 'Panneau Administrateur' },
    { path: '/phpmyadmin', label: 'phpMyAdmin' },
    { path: '/pma', label: 'phpMyAdmin (alias)' },
    { path: '/cpanel', label: 'cPanel' },
    { path: '/webmail', label: 'Webmail exposé' },
];

const ADMIN_KEYWORDS = ['login', 'password', 'mot de passe', 'admin', 'username', 'connexion', 'sign in', 'log in'];

export async function checkExposedAdminPanels(baseUrl) {
    if (!baseUrl) return [neutralError('admin_panels', 'URL invalide')];

    const findings = [];

    for (const item of ADMIN_PATHS) {
        try {
            const res = await fetch(`${baseUrl}${item.path}`, {
                method: 'GET',
                redirect: 'follow',
                headers: { 'User-Agent': UA },
                signal: AbortSignal.timeout(4000),
            });

            if (res.status === 200) {
                let snippet = '';
                try {
                    const reader = res.body?.getReader();
                    if (reader) {
                        const { value } = await reader.read();
                        snippet = value ? new TextDecoder().decode(value).slice(0, 500).toLowerCase() : '';
                        try { await reader.cancel(); } catch { /* ignore */ }
                    } else {
                        const text = await res.text();
                        snippet = text.slice(0, 500).toLowerCase();
                    }
                } catch { /* ignore */ }

                // Faux positif : SPA catch-all (Vercel/Netlify) sert index.html sur routes inconnues
                const isSpaCatchAll = snippet.includes('<!doctype html') || snippet.includes('<html');
                if (isSpaCatchAll) {
                    continue; // Pas un vrai panneau admin exposé
                }

                const matched = ADMIN_KEYWORDS.some((kw) => snippet.includes(kw));
                if (matched) {
                    findings.push({
                        check_name: `admin_${item.path.replace(/[^a-z0-9]/gi, '_')}`,
                        status: 'fail',
                        score_impact: 8,
                        criticality: 'major',
                        title: `${item.label} accessible publiquement`,
                        description: `La page d'administration ${item.path} est accessible sans restriction géographique ou IP. Elle est donc visible par les robots et les attaquants automatisés.`,
                        recommendation: `Restreindre l'accès à ${item.path} par IP autorisée uniquement, ou déplacer le panneau admin vers une URL personnalisée.`,
                        technical_detail: `${baseUrl}${item.path} → HTTP 200, mots-clés admin détectés`,
                        difficulty: '⭐⭐⭐ Technique',
                        time_estimate: '30 à 45 minutes',
                    });
                } else {
                    findings.push({
                        check_name: `admin_${item.path.replace(/[^a-z0-9]/gi, '_')}`,
                        status: 'warning',
                        score_impact: 3,
                        criticality: 'minor',
                        title: `${item.label} potentiellement accessible`,
                        description: `Le chemin ${item.path} retourne du contenu mais ne ressemble pas à une page de login. Vérifiez manuellement qu'il ne s'agit pas d'un panneau exposé.`,
                        recommendation: 'Vérifiez manuellement et restreignez l\'accès si nécessaire.',
                        technical_detail: `${baseUrl}${item.path} → HTTP 200, pas de mots-clés admin`,
                        difficulty: '⭐⭐⭐ Technique',
                        time_estimate: '30 à 45 minutes',
                    });
                }
            }
            // 401, 403, 404 → pass (silencieux)
        } catch (e) {
            // erreur réseau : silencieux
        }
        await delay(200);
    }

    if (findings.length === 0) {
        return [{
            check_name: 'admin_panels',
            status: 'pass',
            score_impact: 0,
            criticality: 'major',
            title: 'Aucun panneau admin exposé détecté',
            description: 'Les chemins admin courants ne retournent pas de page de connexion publique.',
            recommendation: 'Conservez vos panneaux admin protégés par IP ou auth supplémentaire.',
            technical_detail: `${ADMIN_PATHS.length} chemins testés`,
            difficulty: '⭐⭐⭐ Technique',
            time_estimate: '—',
        }];
    }

    return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 5 — Google Safe Browsing
// ─────────────────────────────────────────────────────────────────────────────
export async function checkGoogleSafeBrowsing(url) {
    const apiKey =
        process.env.GOOGLE_SAFE_BROWSING_API_KEY ||
        process.env.GOOGLE_SAFE_BROWSING_KEY ||
        process.env.VITE_GOOGLE_SAFE_BROWSING_KEY;

    if (!apiKey) {
        return {
            check_name: 'safe_browsing',
            status: 'error',
            score_impact: 0,
            criticality: 'critical',
            title: 'Vérification Google Safe Browsing indisponible',
            description: 'Vérification Google Safe Browsing non disponible (clé API manquante).',
            recommendation: 'Configurez GOOGLE_SAFE_BROWSING_API_KEY dans les variables d\'environnement.',
            technical_detail: 'Variable d\'environnement manquante',
            difficulty: '⭐ Facile',
            time_estimate: '—',
        };
    }

    try {
        const res = await fetch(
            `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client: { clientId: 'webisafe', clientVersion: '1.0' },
                    threatInfo: {
                        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
                        platformTypes: ['ANY_PLATFORM'],
                        threatEntryTypes: ['URL'],
                        threatEntries: [{ url }],
                    },
                }),
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const matches = Array.isArray(data.matches) ? data.matches : [];

        if (matches.length > 0) {
            const m = matches[0];
            return {
                check_name: 'safe_browsing',
                status: 'fail',
                score_impact: 25,
                criticality: 'critical',
                title: 'Site blacklisté par Google Safe Browsing',
                description: `Google a détecté une menace sur ce site : ${m.threatType}. Les visiteurs verront une page d'avertissement rouge avant d'accéder à votre site.`,
                recommendation: 'Nettoyer le site des malwares, soumettre une demande de révision via Google Search Console.',
                technical_detail: `Type de menace : ${m.threatType} | Plateforme : ${m.platformType}`,
                difficulty: '⭐⭐⭐⭐ Expert',
                time_estimate: '2 à 48 heures',
            };
        }

        return {
            check_name: 'safe_browsing',
            status: 'pass',
            score_impact: 0,
            criticality: 'critical',
            title: 'Site non blacklisté par Google',
            description: 'Aucune menace détectée par Google Safe Browsing.',
            recommendation: 'Continuez à surveiller régulièrement votre domaine.',
            technical_detail: 'API Google Safe Browsing v4 — 0 match',
            difficulty: '—',
            time_estimate: '—',
        };
    } catch (e) {
        console.warn('[CHECK SafeBrowsing] échec :', e.message);
        return neutralError('safe_browsing', `Appel Google Safe Browsing échoué : ${e.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 6 — HaveIBeenPwned (fuites de données par domaine)
// ─────────────────────────────────────────────────────────────────────────────
let __lastHibpCall = 0;

export async function checkDataBreaches(domain) {
    if (!domain) return neutralError('data_breaches', 'Domaine introuvable');

    // Anti-rate-limit (1.5s minimum entre 2 appels HIBP)
    const sinceLast = Date.now() - __lastHibpCall;
    if (sinceLast < 1500) await delay(1500 - sinceLast);
    __lastHibpCall = Date.now();

    try {
        const res = await fetch(`https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(domain)}`, {
            headers: { 'User-Agent': 'Webisafe-Scanner' },
            signal: AbortSignal.timeout(5000),
        });

        if (res.status === 404) {
            return {
                check_name: 'data_breaches',
                status: 'pass',
                score_impact: 0,
                criticality: 'major',
                title: 'Aucune fuite de données connue pour ce domaine',
                description: `Le domaine ${domain} n'apparaît dans aucune fuite répertoriée par HaveIBeenPwned.`,
                recommendation: 'Continuez à surveiller régulièrement et appliquez la 2FA partout.',
                technical_detail: 'HIBP : 404 (domaine inconnu)',
                difficulty: '—',
                time_estimate: '—',
            };
        }

        if (!res.ok) throw new Error(`HIBP HTTP ${res.status}`);

        const breaches = await res.json();
        if (!Array.isArray(breaches) || breaches.length === 0) {
            return {
                check_name: 'data_breaches',
                status: 'pass',
                score_impact: 0,
                criticality: 'major',
                title: 'Aucune fuite de données connue pour ce domaine',
                description: `Le domaine ${domain} n'apparaît dans aucune fuite répertoriée par HaveIBeenPwned.`,
                recommendation: 'Continuez à surveiller régulièrement et appliquez la 2FA partout.',
                technical_detail: 'HIBP : 0 breach',
                difficulty: '—',
                time_estimate: '—',
            };
        }

        const sorted = [...breaches].sort((a, b) => new Date(b.BreachDate) - new Date(a.BreachDate));
        const latest = sorted[0];
        const count = breaches.length;

        const isCritical = count >= 3;
        return {
            check_name: 'data_breaches',
            status: isCritical ? 'fail' : 'warning',
            score_impact: isCritical ? 15 : 8,
            criticality: isCritical ? 'critical' : 'major',
            title: `${count} fuite(s) de données détectée(s) sur ce domaine`,
            description: `Le domaine ${domain} apparaît dans ${count} fuite(s) de données connue(s). La plus récente : "${latest.Name}" (${latest.BreachDate}), ${latest.PwnCount?.toLocaleString?.() ?? latest.PwnCount} comptes compromis.`,
            recommendation: 'Forcer la réinitialisation des mots de passe de tous les utilisateurs. Activer l\'authentification à deux facteurs. Vérifier que les mots de passe ne sont pas stockés en clair.',
            technical_detail: `Fuites : ${breaches.map((b) => b.Name).join(', ')}`,
            difficulty: '⭐⭐ Intermédiaire',
            time_estimate: '30 minutes à 2 heures',
        };
    } catch (e) {
        console.warn('[CHECK HIBP] échec :', e.message);
        return neutralError('data_breaches', `HaveIBeenPwned indisponible : ${e.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 7 — Mixed Content (HTTPS chargeant des ressources HTTP)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkMixedContent(url) {
    if (!url || !url.toLowerCase().startsWith('https://')) {
        return {
            check_name: 'mixed_content',
            status: 'error',
            score_impact: 0,
            criticality: 'major',
            title: 'Mixed Content non applicable',
            description: 'Vérification mixed content non applicable (le site n\'utilise pas HTTPS).',
            recommendation: 'Activez HTTPS sur votre site avant ce check.',
            technical_detail: 'Site en HTTP',
            difficulty: '⭐⭐ Intermédiaire',
            time_estimate: '30 à 60 minutes',
        };
    }

    try {
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*;q=0.8' },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let html = await res.text();
        if (html.length > 500_000) html = html.slice(0, 500_000);

        // On retire les commentaires HTML pour éviter les faux positifs
        html = html.replace(/<!--[\s\S]*?-->/g, '');

        const safeHttp = (m) => {
            const u = m.toLowerCase();
            return u.includes('localhost') || u.includes('127.0.0.1') || u.includes('://0.0.0.0');
        };

        const countMatches = (regex) => {
            const matches = html.match(regex) || [];
            return matches.filter((m) => !safeHttp(m)).length;
        };

        const images = countMatches(/src=["']http:\/\/[^"']+["']/gi);
        const scripts = countMatches(/<script[^>]+src=["']http:\/\/[^"']+["']/gi);
        const stylesheets = countMatches(/<link[^>]+href=["']http:\/\/[^"']+["']/gi);
        const iframes = countMatches(/<iframe[^>]+src=["']http:\/\/[^"']+["']/gi);

        const total = images + scripts + stylesheets + iframes;
        if (total === 0) {
            return {
                check_name: 'mixed_content',
                status: 'pass',
                score_impact: 0,
                criticality: 'major',
                title: 'Aucun mixed content détecté',
                description: 'Toutes les ressources sont chargées en HTTPS.',
                recommendation: 'Continuez à utiliser uniquement des URLs HTTPS dans votre code.',
                technical_detail: 'Aucune ressource HTTP détectée dans le HTML',
                difficulty: '⭐⭐ Intermédiaire',
                time_estimate: '—',
            };
        }

        const heavyTypes = scripts > 0 || stylesheets > 0;
        return {
            check_name: 'mixed_content',
            status: 'fail',
            score_impact: heavyTypes ? 12 : 6,
            criticality: heavyTypes ? 'critical' : 'major',
            title: `Mixed Content détecté (${total} ressource(s))`,
            description: `Votre site HTTPS charge ${total} ressource(s) en HTTP non sécurisé. Les navigateurs modernes bloquent ces ressources, ce qui peut casser l'affichage de votre site.`,
            recommendation: 'Remplacer toutes les URLs http:// par https:// dans votre code source. Utiliser le plugin "Really Simple SSL" si vous êtes sur WordPress.',
            technical_detail: `Images HTTP: ${images} | Scripts HTTP: ${scripts} | CSS HTTP: ${stylesheets} | iFrames HTTP: ${iframes}`,
            difficulty: '⭐⭐ Intermédiaire',
            time_estimate: '30 à 60 minutes',
        };
    } catch (e) {
        console.warn('[CHECK MixedContent] échec :', e.message);
        return neutralError('mixed_content', `Impossible d'analyser le HTML : ${e.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrateur — exécute les 7 checks en parallèle (Promise.allSettled)
// ─────────────────────────────────────────────────────────────────────────────
export async function runAdvancedSecurityChecks(url) {
    const domain = extractDomain(url);
    const baseUrl = extractBaseUrl(url);

    const settled = await Promise.allSettled([
        checkSecurityHeaders(url),       // [] of 6
        checkDNSEmailSecurity(domain),   // [] of 2
        checkSensitiveFiles(baseUrl),    // []
        checkExposedAdminPanels(baseUrl),// []
        checkGoogleSafeBrowsing(url),    // {}
        checkDataBreaches(domain),       // {}
        checkMixedContent(url),          // {}
    ]);

    const collected = [];
    const labels = ['headers', 'dns', 'sensitive_files', 'admin_panels', 'safe_browsing', 'data_breaches', 'mixed_content'];

    settled.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            const val = r.value;
            if (Array.isArray(val)) collected.push(...val);
            else collected.push(val);
        } else {
            console.warn(`[SECURITY-CHECKS] ${labels[i]} rejected:`, r.reason?.message);
            collected.push(neutralError(labels[i], r.reason?.message || 'Erreur inconnue'));
        }
    });

    // Calcul du score (base 100)
    let deducted = 0;
    for (const c of collected) {
        if (c.status === 'fail') deducted += c.score_impact || 0;
        else if (c.status === 'warning') deducted += Math.round((c.score_impact || 0) / 2);
    }
    const advanced_security_score = Math.max(0, 100 - deducted);

    // Stats résumées
    const counts = {
        pass: collected.filter((c) => c.status === 'pass').length,
        warning: collected.filter((c) => c.status === 'warning').length,
        fail: collected.filter((c) => c.status === 'fail').length,
        error: collected.filter((c) => c.status === 'error').length,
    };

    return {
        advanced_security_score,
        counts,
        checks: collected,
    };
}
