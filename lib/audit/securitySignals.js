const PASS = 'pass';
const WARNING = 'warning';
const FAIL = 'fail';
const ERROR = 'error';
const NOT_MEASURED = 'not_measured';

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getHeader(headers, key) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return cleanText(headers.get(key));
  return cleanText(headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()]);
}

function addDetected(list, name, confidence, evidence, version = null) {
  if (list.some((item) => item.name === name && item.evidence === evidence)) return;
  list.push({ name, confidence, evidence, version });
}

function getScriptSources($) {
  return $('script[src]').toArray().map((node) => ({
    src: cleanText($(node).attr('src')),
    integrity: cleanText($(node).attr('integrity')),
    crossorigin: cleanText($(node).attr('crossorigin')),
  })).filter((item) => item.src);
}

function isExternalUrl(src, pageUrl) {
  try {
    const page = new URL(pageUrl);
    const resolved = new URL(src, page);
    return resolved.hostname !== page.hostname;
  } catch {
    return /^https?:\/\//i.test(src);
  }
}

function findVersion(patterns, value) {
  for (const pattern of patterns) {
    const match = String(value || '').match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function majorVersion(version) {
  const major = String(version || '').split('.')[0];
  const value = Number.parseInt(major, 10);
  return Number.isFinite(value) ? value : null;
}

export function normalizeSecurityCheckStatus(status) {
  if ([PASS, WARNING, FAIL, ERROR, NOT_MEASURED].includes(status)) return status;
  return NOT_MEASURED;
}

export function analyzeCspQuality(cspHeader) {
  const csp = cleanText(cspHeader);
  if (!csp) {
    return {
      present: false,
      score: 0,
      issues: ['missing-csp'],
      strengths: [],
      status: FAIL,
    };
  }

  const lower = csp.toLowerCase();
  const issues = [];
  const strengths = [];
  let score = 100;

  if (lower.includes("'unsafe-inline'")) {
    issues.push('unsafe-inline');
    score -= 12;
  }

  if (lower.includes("'unsafe-eval'")) {
    issues.push('unsafe-eval');
    score -= 12;
  }

  if (/(^|\s)\*(\s|;|$)/.test(lower)) {
    issues.push('wildcard-source');
    score -= 10;
  }

  if (!/default-src\s+/i.test(csp)) {
    issues.push('missing-default-src');
    score -= 8;
  }

  if (!/frame-ancestors\s+/i.test(csp)) {
    issues.push('missing-frame-ancestors');
    score -= 8;
  }

  if (/report-uri\s+|report-to\s+/i.test(csp)) {
    strengths.push('reporting-enabled');
  } else {
    issues.push('missing-reporting');
    score -= 4;
  }

  if (/https:\s*;|https:\s|https:\*/i.test(csp)) {
    issues.push('broad-https-source');
    score -= 5;
  }

  const finalScore = clampScore(score);
  return {
    present: true,
    score: finalScore,
    issues,
    strengths,
    status: finalScore >= 85 ? PASS : finalScore >= 45 ? WARNING : FAIL,
  };
}

export function detectCms($, html = '', response = {}) {
  const detected = [];
  const body = String(html || $.html()).toLowerCase();
  const generator = cleanText($('meta[name="generator"]').attr('content')).toLowerCase();
  const poweredBy = getHeader(response.headers, 'x-powered-by').toLowerCase();

  if (body.includes('wp-content') || body.includes('wp-includes') || generator.includes('wordpress')) {
    addDetected(detected, 'WordPress', 95, 'WordPress markers in HTML or generator');
  }

  if (body.includes('woocommerce')) {
    addDetected(detected, 'WooCommerce', 90, 'WooCommerce marker in HTML');
  }

  if (body.includes('cdn.shopify.com') || body.includes('shopify')) {
    addDetected(detected, 'Shopify', 90, 'Shopify assets or markers');
  }

  if (body.includes('/sites/default/') || generator.includes('drupal')) {
    addDetected(detected, 'Drupal', 85, 'Drupal markers');
  }

  if (body.includes('content="joomla') || generator.includes('joomla')) {
    addDetected(detected, 'Joomla', 85, 'Joomla generator marker');
  }

  if (poweredBy.includes('laravel') || body.includes('laravel_session')) {
    addDetected(detected, 'Laravel', 75, 'Laravel header or cookie marker');
  }

  if (poweredBy.includes('next.js') || body.includes('/_next/')) {
    addDetected(detected, 'Next.js', 80, 'Next.js header or asset path');
  }

  if (body.includes('prestashop') || generator.includes('prestashop')) {
    addDetected(detected, 'PrestaShop', 85, 'PrestaShop marker');
  }

  detected.sort((a, b) => b.confidence - a.confidence);

  return {
    primary: detected[0]?.name || null,
    detected,
    confidence: detected[0]?.confidence || 0,
    evidence: detected.map((item) => item.evidence),
  };
}

export function detectJsLibraries($, html = '') {
  const source = `${String(html || $.html())}\n${getScriptSources($).map((item) => item.src).join('\n')}`;
  const detected = [];
  const outdatedOrRisky = [];

  const jqueryVersion = findVersion([/jquery[-.]([0-9]+\.[0-9]+\.[0-9]+)/i, /jquery@([0-9]+\.[0-9]+\.[0-9]+)/i], source);
  if (/jquery/i.test(source)) {
    detected.push({ name: 'jQuery', version: jqueryVersion, evidence: 'jQuery asset marker' });
    if (jqueryVersion && majorVersion(jqueryVersion) < 3) {
      outdatedOrRisky.push({ name: 'jQuery', version: jqueryVersion, advisory: 'jQuery 1.x/2.x est ancien et doit être mis à jour.' });
    }
  }

  const bootstrapVersion = findVersion([/bootstrap[-@/]([0-9]+\.[0-9]+\.[0-9]+)/i], source);
  if (/bootstrap/i.test(source)) {
    detected.push({ name: 'Bootstrap', version: bootstrapVersion, evidence: 'Bootstrap asset marker' });
    if (bootstrapVersion && majorVersion(bootstrapVersion) < 4) {
      outdatedOrRisky.push({ name: 'Bootstrap', version: bootstrapVersion, advisory: 'Bootstrap 3.x est legacy et doit être vérifié.' });
    }
  }

  const lodashVersion = findVersion([/lodash[-@/]([0-9]+\.[0-9]+\.[0-9]+)/i, /lodash\.js\?v=([0-9]+\.[0-9]+\.[0-9]+)/i], source);
  if (/lodash/i.test(source)) {
    detected.push({ name: 'Lodash', version: lodashVersion, evidence: 'Lodash asset marker' });
    if (lodashVersion && majorVersion(lodashVersion) < 4) {
      outdatedOrRisky.push({ name: 'Lodash', version: lodashVersion, advisory: 'Ancienne version Lodash à vérifier.' });
    }
  }

  if (/react\.development\.js|react-dom\.development\.js|process\.env\.node_env\s*!==\s*['"]production/i.test(source)) {
    detected.push({ name: 'React dev build', version: null, evidence: 'React development marker' });
    outdatedOrRisky.push({ name: 'React dev build', version: null, advisory: 'Un build React de développement ne doit pas être exposé en production.' });
  }

  return {
    detected,
    outdated_or_risky: outdatedOrRisky,
    status: outdatedOrRisky.length > 0 ? WARNING : detected.length > 0 ? PASS : NOT_MEASURED,
  };
}

export function analyzeSri($, pageUrl) {
  const externalScripts = getScriptSources($).filter((script) => isExternalUrl(script.src, pageUrl));
  const findings = externalScripts
    .filter((script) => !script.integrity || (script.integrity && !script.crossorigin))
    .map((script) => ({
      src: script.src,
      missing_integrity: !script.integrity,
      missing_crossorigin: Boolean(script.integrity && !script.crossorigin),
    }));
  const missingIntegrity = findings.filter((finding) => finding.missing_integrity).length;
  const missingCrossorigin = findings.filter((finding) => finding.missing_crossorigin).length;

  return {
    external_scripts_count: externalScripts.length,
    missing_integrity_count: missingIntegrity,
    missing_crossorigin_count: missingCrossorigin,
    findings,
    status: externalScripts.length === 0 ? NOT_MEASURED : missingIntegrity || missingCrossorigin ? WARNING : PASS,
  };
}

export function buildComplianceBadges(security = {}) {
  const hasHttps = security.https === true || security.https_enabled === true;
  const cspOk = Number(security.csp_quality?.score || 0) >= 75;
  const dnssecOk = security.dnssec?.status === PASS;
  const sriOk = security.sri?.status === PASS || security.sri?.status === NOT_MEASURED;
  const malwareOk = security.malware_detected === false;
  const explanation = 'Signaux techniques utiles pour la préparation. Ne constitue pas une certification.';
  const badge = (key, label, passed, missingSignals) => ({
    key,
    label,
    status: passed ? PASS : WARNING,
    explanation,
    missing_signals: missingSignals.filter(Boolean),
  });

  return [
    badge('pci_dss_preparation', 'Préparation PCI DSS', hasHttps && cspOk && malwareOk, [!hasHttps && 'HTTPS', !cspOk && 'CSP solide', !malwareOk && 'Réputation malware saine']),
    badge('gdpr_preparation', 'Préparation GDPR', hasHttps && cspOk, [!hasHttps && 'HTTPS', !cspOk && 'Protection navigateur CSP']),
    badge('iso_27001_preparation', 'Préparation ISO 27001', hasHttps && cspOk && dnssecOk, [!hasHttps && 'HTTPS', !cspOk && 'CSP', !dnssecOk && 'DNSSEC']),
    badge('cyber_insurance_preparation', 'Préparation cyber assurance', hasHttps && cspOk && dnssecOk && sriOk && malwareOk, [!hasHttps && 'HTTPS', !cspOk && 'CSP', !dnssecOk && 'DNSSEC', !sriOk && 'SRI', !malwareOk && 'Absence de malware']),
  ];
}
