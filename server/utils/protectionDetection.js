const MAX_HTML_SCAN_LENGTH = 80_000;

function getHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  return headers[name] || headers[name.toLowerCase()] || '';
}

function hasMetaRefreshChallenge(html) {
  const metaRefresh = /<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/i.exec(html || '');
  if (!metaRefresh) return false;
  return /captcha|challenge|sgcaptcha|bot|verify|security/i.test(metaRefresh[0]);
}

export function detectProtectionPage({ url = '', finalUrl = '', html = '', headers = null } = {}) {
  const headerSignals = [
    getHeader(headers, 'server'),
    getHeader(headers, 'cf-mitigated'),
    getHeader(headers, 'x-sucuri-id'),
    getHeader(headers, 'x-sucuri-cache'),
    getHeader(headers, 'x-firewall'),
  ].join(' ').toLowerCase();

  const haystack = [
    String(url || ''),
    String(finalUrl || ''),
    String(html || '').slice(0, MAX_HTML_SCAN_LENGTH),
    headerSignals,
  ].join('\n').toLowerCase();

  const checks = [
    { provider: 'SiteGround', reason: 'sgcaptcha', test: () => haystack.includes('/.well-known/sgcaptcha') || haystack.includes('sgcaptcha') },
    { provider: 'Cloudflare', reason: 'cloudflare_challenge', test: () => haystack.includes('cf-challenge') || haystack.includes('cf-mitigated') || haystack.includes('/cdn-cgi/challenge-platform') || haystack.includes('__cf_chl') },
    { provider: 'hCaptcha', reason: 'hcaptcha', test: () => haystack.includes('hcaptcha') },
    { provider: 'reCAPTCHA', reason: 'recaptcha', test: () => haystack.includes('recaptcha') || haystack.includes('g-recaptcha') },
    { provider: 'Captcha', reason: 'captcha', test: () => /captcha|prove you are human|verify you are human|robot check/i.test(haystack) },
    { provider: 'Bot protection', reason: 'bot_protection', test: () => /bot protection|anti-bot|checking your browser|browser verification|security check/i.test(haystack) },
    { provider: 'Meta refresh challenge', reason: 'meta_refresh_challenge', test: () => hasMetaRefreshChallenge(html) },
  ];

  const signals = checks.filter(check => check.test()).map(({ provider, reason }) => ({ provider, reason }));

  return {
    detected: signals.length > 0,
    provider: signals[0]?.provider ?? null,
    reason: signals[0]?.reason ?? null,
    signals,
  };
}
