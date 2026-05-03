import type { ScanContext, ScannerResult } from '../types.ts';
import { countCdnScriptsWithoutSri, getWordPressVersion } from '../utils/html.ts';
import { fetchJsonWithTimeout, fetchWithTimeout } from '../utils/http.ts';
import { clampScore } from '../utils/validators.ts';
import { createFinding, createRecommendation } from './shared.ts';

function parseMaxAge(value: string) {
  const match = value.match(/max-age=(\d+)/i);
  return Number(match?.[1] || 0);
}

function gradeToSslBaseScore(grade: string) {
  if (grade === 'A+') return 100;
  if (grade === 'A') return 90;
  if (grade === 'B') return 70;
  if (grade === 'C') return 50;
  return 0;
}

async function fetchObservatory(domain: string) {
  try {
    const { data: analyze } = await fetchJsonWithTimeout<{ scan_id?: number; scan?: { scan_id?: number } }>(
      `https://http-observatory.security.mozilla.org/api/v1/analyze?host=${encodeURIComponent(domain)}&rescan=true`,
      { method: 'POST' },
      12_000
    );

    const scanId = analyze.scan_id || analyze.scan?.scan_id;
    if (!scanId) return null;

    for (let index = 0; index < 4; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const { data } = await fetchJsonWithTimeout<{
        state?: string;
        score?: number;
        grade?: string;
        tests_failed?: number;
      }>(
        `https://http-observatory.security.mozilla.org/api/v1/getScanResults?scan=${scanId}`,
        {},
        8_000
      );

      if (data?.state === 'FINISHED' || typeof data?.score === 'number') {
        return data;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function scoreHeaders(headers: Record<string, string>) {
  const csp = headers['content-security-policy'] || '';
  const hsts = headers['strict-transport-security'] || '';
  const xfo = headers['x-frame-options'] || '';
  const xcto = headers['x-content-type-options'] || '';
  const referrer = headers['referrer-policy'] || '';
  const permissions = headers['permissions-policy'] || '';
  const xxss = headers['x-xss-protection'] || '';

  const cspScore = !csp
    ? 0
    : /default-src/i.test(csp) && /script-src/i.test(csp) && /style-src/i.test(csp)
      ? 15
      : /default-src|script-src|style-src/i.test(csp)
        ? 10
        : 5;
  const hstsMaxAge = parseMaxAge(hsts);
  const hstsScore = !hsts ? 0 : hstsMaxAge >= 31536000 ? 15 : hstsMaxAge >= 86400 ? 10 : 5;
  const xfoScore = /deny|sameorigin/i.test(xfo) ? 10 : 0;
  const xctoScore = /nosniff/i.test(xcto) ? 10 : 0;
  const referrerScore = /no-referrer|strict-origin-when-cross-origin/i.test(referrer) ? 8 : 0;
  const permissionsScore = permissions ? 7 : 0;
  const xxssScore = /1;\s*mode=block/i.test(xxss) ? 5 : 0;

  return {
    total: cspScore + hstsScore + xfoScore + xctoScore + referrerScore + permissionsScore + xxssScore,
    details: {
      csp: { present: Boolean(csp), score: cspScore, details: csp || 'Absent' },
      hsts: { present: Boolean(hsts), score: hstsScore, details: hsts || 'Absent' },
      xframe: { present: Boolean(xfo), score: xfoScore, value: xfo || 'Absent' },
      xcontent: { present: Boolean(xcto), score: xctoScore, value: xcto || 'Absent' },
      referrer_policy: { present: Boolean(referrer), score: referrerScore, value: referrer || 'Absent' },
      permissions_policy: { present: Boolean(permissions), score: permissionsScore, value: permissions || 'Absent' },
      xxss: { present: Boolean(xxss), score: xxssScore, value: xxss || 'Absent' },
    },
  };
}

async function fetchSslLabs(domain: string) {
  try {
    const { data } = await fetchJsonWithTimeout<{
      endpoints?: Array<{ grade?: string; details?: { protocol?: string; cert?: { notAfter?: number; issues?: number }; chain?: { issues?: number } } }>;
    }>(
      `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&all=done`,
      {},
      10_000
    );
    return data;
  } catch {
    return null;
  }
}

async function detectMalware(url: string, context: ScanContext) {
  if (context.externalApis.googleSafeBrowsingKey) {
    try {
      const { data } = await fetchJsonWithTimeout<{ matches?: unknown[] }>(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${context.externalApis.googleSafeBrowsingKey}`,
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
        },
        5_000
      );
      return {
        detected: Array.isArray(data.matches) && data.matches.length > 0,
        source: 'google_safe_browsing',
        threats: data.matches || [],
      };
    } catch {
      // Fallback below.
    }
  }

  if (context.externalApis.virusTotalKey) {
    try {
      const encoded = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const { data } = await fetchJsonWithTimeout<{ data?: { attributes?: { last_analysis_stats?: { malicious?: number } } } }>(
        `https://www.virustotal.com/api/v3/urls/${encoded}`,
        {
          headers: {
            'x-apikey': context.externalApis.virusTotalKey,
          },
        },
        5_000
      );
      const malicious = Number(data?.data?.attributes?.last_analysis_stats?.malicious || 0);
      return {
        detected: malicious >= 1,
        source: 'virustotal',
        threats: malicious >= 1 ? [{ malicious }] : [],
      };
    } catch {
      // ignore
    }
  }

  return {
    detected: false,
    source: 'unavailable',
    threats: [],
  };
}

async function testAdminAccess(baseUrl: string, path: string) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}${path}`, { method: 'GET' }, 4_500);
    return response.status === 200;
  } catch {
    return false;
  }
}

async function testRateLimiting(url: string) {
  try {
    const attempts = await Promise.all(
      Array.from({ length: 3 }, () => fetchWithTimeout(url, { method: 'HEAD' }, 4_000).catch(() => null))
    );
    return attempts.some((response) => response?.status === 429);
  } catch {
    return false;
  }
}

export async function scanSecurity(context: ScanContext): Promise<ScannerResult> {
  const findings = [];
  const recommendations = [];
  const apisUsed: string[] = [];
  const apisFailed: string[] = [];
  let partial = false;

  const headers = context.snapshot?.headers || {};
  const headerScore = scoreHeaders(headers);

  const observatory = await fetchObservatory(context.target.domain);
  if (observatory) apisUsed.push('Observatory');
  else {
    apisFailed.push('Observatory');
    partial = true;
  }

  const sslLabs = context.target.httpsEnabled ? await fetchSslLabs(context.target.domain) : null;
  if (sslLabs) apisUsed.push('SSL Labs');
  else if (context.target.httpsEnabled) {
    apisFailed.push('SSL Labs');
    partial = true;
  }

  const malware = await detectMalware(context.target.normalizedUrl, context);
  if (malware.source !== 'unavailable') apisUsed.push(malware.source === 'google_safe_browsing' ? 'Safe Browsing' : 'VirusTotal');
  else {
    apisFailed.push('Malware API');
    partial = true;
  }

  const sslEndpoint = sslLabs?.endpoints?.[0];
  const sslGrade = sslEndpoint?.grade || (context.target.httpsEnabled ? 'Inconnu' : 'HTTP');
  const sslBaseScore = context.target.httpsEnabled ? gradeToSslBaseScore(sslEndpoint?.grade || 'F') : 0;
  const protocol = sslEndpoint?.details?.protocol || (context.target.httpsEnabled ? 'TLS inconnu' : 'HTTP');
  const certValid = (sslEndpoint?.details?.cert?.issues || 0) === 0;
  const chainValid = (sslEndpoint?.details?.chain?.issues || 0) === 0;
  const protocolBonus = /TLS 1\.[23]/i.test(protocol) ? 10 : 0;
  const certBonus = certValid ? 10 : 0;
  const chainBonus = chainValid ? 5 : 0;
  const sslScore = clampScore((sslBaseScore / 100) * 30 + protocolBonus + certBonus + chainBonus);

  const setCookieHeader = headers['set-cookie'] || '';
  const serverHeader = headers.server || '';
  const poweredBy = headers['x-powered-by'] || '';
  const adminOpen = await testAdminAccess(context.target.normalizedUrl, '/admin');
  const wpAdminOpen = await testAdminAccess(context.target.normalizedUrl, '/wp-admin');
  const hasRateLimiting = await testRateLimiting(context.target.normalizedUrl);
  const directoryListing = /<title>\s*Index of\s*\//i.test(context.snapshot?.html || '');
  const wordpressVersion = getWordPressVersion(context.snapshot?.html || '');
  const oldWordpress = wordpressVersion ? Number(wordpressVersion.split('.').slice(0, 2).join('.')) < 6 : false;
  const sriMissing = countCdnScriptsWithoutSri(context.snapshot?.html || '');

  const owasp = [];
  let owaspPenalty = 0;

  if (adminOpen || wpAdminOpen) {
    owasp.push({ type: 'A01', description: 'Une interface d’administration semble accessible sans protection visible.', severity: 'high' });
    owaspPenalty += 15;
  }
  if (setCookieHeader && !/secure/i.test(setCookieHeader)) {
    owasp.push({ type: 'A02', description: 'Des cookies sont émis sans attribut Secure.', severity: 'medium' });
    owaspPenalty += 10;
  }
  if (!headerScore.details.xcontent.present) {
    owasp.push({ type: 'A03', description: 'Le header X-Content-Type-Options est absent.', severity: 'medium' });
    owaspPenalty += 8;
  }
  if (!headerScore.details.csp.present) {
    owasp.push({ type: 'A03', description: 'Aucune Content-Security-Policy n’est définie.', severity: 'high' });
    owaspPenalty += 15;
  }
  if (!hasRateLimiting) {
    owasp.push({ type: 'A04', description: 'Aucun signe clair de limitation de requêtes n’a été détecté.', severity: 'low' });
    owaspPenalty += 5;
  }
  if (serverHeader) {
    owasp.push({ type: 'A05', description: 'Le header Server expose la technologie serveur.', severity: 'medium' });
    owaspPenalty += 8;
  }
  if (poweredBy) {
    owasp.push({ type: 'A05', description: 'Le header X-Powered-By révèle le framework applicatif.', severity: 'low' });
    owaspPenalty += 5;
  }
  if (directoryListing) {
    owasp.push({ type: 'A05', description: 'Un listing de répertoire semble exposé.', severity: 'high' });
    owaspPenalty += 10;
  }
  if (oldWordpress) {
    owasp.push({ type: 'A06', description: `La version WordPress ${wordpressVersion} paraît obsolète.`, severity: 'medium' });
    owaspPenalty += 10;
  }
  if (setCookieHeader && !/httponly/i.test(setCookieHeader)) {
    owasp.push({ type: 'A07', description: 'Les cookies ne portent pas le flag HttpOnly.', severity: 'medium' });
    owaspPenalty += 8;
  }
  if (setCookieHeader && !/samesite/i.test(setCookieHeader)) {
    owasp.push({ type: 'A07', description: 'Les cookies ne définissent pas SameSite.', severity: 'low' });
    owaspPenalty += 5;
  }
  if (sriMissing > 0) {
    owasp.push({ type: 'A08', description: `${sriMissing} script(s) CDN sont chargés sans Subresource Integrity.`, severity: 'low' });
    owaspPenalty += 5;
  }

  if (malware.detected) {
    findings.push(
      createFinding({
        categorie: 'securite',
        titre: 'Menace malware ou phishing détectée',
        severite: 'critique',
        description: 'Les services de réputation ont signalé une menace potentielle sur ce site. Tant que cette alerte n’est pas levée, le risque pour vos visiteurs et votre crédibilité est maximal.',
        impact_business: 'Vous risquez un blocage navigateur, une chute brutale de trafic et une perte immédiate de confiance client.',
        impact_financier_fcfa: 950000,
        description_courte: 'Le site ressort comme potentiellement malveillant : action immédiate recommandée.',
        probabilite_occurrence: 'élevée',
        temps_resolution: 'Immédiat',
        difficulte: 'difficile',
      })
    );
  }

  if (!headerScore.details.csp.present || !headerScore.details.hsts.present) {
    findings.push(
      createFinding({
        categorie: 'securite',
        titre: 'Headers de sécurité critiques manquants',
        severite: 'critique',
        description: 'Des protections HTTP fondamentales comme CSP ou HSTS sont absentes ou incomplètes. Cela laisse davantage de surface aux injections, au clickjacking et aux attaques sur les connexions.',
        impact_business: 'Une faille exploitée peut compromettre les données, dégrader la confiance client et déclencher un incident coûteux.',
        impact_financier_fcfa: 500000,
        description_courte: 'CSP et/ou HSTS absents : la surface d’attaque reste trop ouverte.',
        probabilite_occurrence: 'élevée',
        temps_resolution: '2 à 6 heures',
      })
    );
  }

  if (!context.target.httpsEnabled) {
    findings.push(
      createFinding({
        categorie: 'securite',
        titre: 'Le site n’impose pas HTTPS',
        severite: 'critique',
        description: 'Le site est servi en HTTP, ce qui expose potentiellement les échanges à l’interception et à l’altération en transit.',
        impact_business: 'Les formulaires, comptes clients et paiements perdent en crédibilité et en sécurité.',
        impact_financier_fcfa: 650000,
        description_courte: 'HTTP détecté : les échanges ne bénéficient pas d’un chiffrement moderne.',
      })
    );
  }

  recommendations.push(
    createRecommendation({
      ordre: 1,
      categorie: 'securite',
      action: 'Mettre en place une politique de headers de sécurité complète',
      justification: 'CSP, HSTS, X-Frame-Options et Referrer-Policy apportent un gain immédiat de protection et de conformité.',
      impact: 'Réduction mesurable du risque d’injection et d’exposition des utilisateurs.',
      difficulte: 'moyenne',
      temps: '4 à 8 heures',
      etapes: [
        'Définir une Content-Security-Policy compatible avec les scripts et styles réellement utilisés.',
        'Activer HSTS avec un max-age long après validation complète du HTTPS.',
        'Ajouter les headers X-Frame-Options, X-Content-Type-Options, Referrer-Policy et Permissions-Policy.',
      ],
    })
  );

  if (adminOpen || wpAdminOpen || oldWordpress) {
    recommendations.push(
      createRecommendation({
        ordre: 2,
        categorie: 'securite',
        action: 'Durcir la surface d’administration et les composants exposés',
        justification: 'Les interfaces d’administration et versions obsolètes restent des cibles privilégiées pour l’automatisation malveillante.',
        impact: 'Baisse du risque d’accès non autorisé et de compromission applicative.',
        difficulte: 'moyenne',
        temps: '1 journée',
        etapes: [
          'Restreindre ou filtrer l’accès aux zones d’administration.',
          'Mettre à jour le CMS, les plugins et dépendances identifiés.',
          'Désactiver les bannières de version côté serveur et framework.',
        ],
      })
    );
  }

  const malwareBonus = malware.detected ? -999 : malware.source === 'unavailable' ? 0 : 20;
  const observatoryScore = Number(observatory?.score || 0);
  const securityScore = malware.detected
    ? 0
    : clampScore(
        Math.min(
          100,
          headerScore.total + sslScore + malwareBonus - owaspPenalty - (context.target.httpsEnabled ? 0 : 30) + observatoryScore * 0.15
        )
      );

  return {
    score: securityScore,
    metrics: {
      observatory_score: observatoryScore,
      observatory_grade: observatory?.grade || 'N/A',
      observatory_tests_failed: Number(observatory?.tests_failed || 0),
      headers: headerScore.details,
      ssl: {
        grade: sslGrade,
        protocol,
        expiry: sslEndpoint?.details?.cert?.notAfter ? new Date(sslEndpoint.details.cert.notAfter).toISOString() : null,
        valid: certValid,
        chain_complete: chainValid,
        score: sslScore,
      },
      malware: {
        detected: malware.detected,
        source: malware.source,
        threats: malware.threats,
      },
      owasp_failles: owasp,
    },
    findings,
    recommendations,
    apisUsed,
    apisFailed,
    partial,
  };
}
