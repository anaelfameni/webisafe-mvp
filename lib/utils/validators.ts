const ROOT_DOMAIN_EXCEPTIONS = new Set([
  'co.uk',
  'org.uk',
  'gov.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.za',
  'co.jp',
  'com.br',
  'com.ng',
  'com.ci',
  'co.ci',
]);

export interface UrlValidationResult {
  ok: boolean;
  normalizedUrl?: string;
  code?: 'INVALID_URL';
  message?: string;
}

export function validateScanUrl(input: string): UrlValidationResult {
  const candidate = String(input || '').trim();

  if (!candidate) {
    return { ok: false, code: 'INVALID_URL', message: 'URL invalide' };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, code: 'INVALID_URL', message: 'URL invalide' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, code: 'INVALID_URL', message: 'URL invalide' };
  }

  if (!parsed.hostname || isPrivateHostname(parsed.hostname)) {
    return { ok: false, code: 'INVALID_URL', message: 'URL invalide' };
  }

  return { ok: true, normalizedUrl: parsed.toString().replace(/\/$/, '') };
}

export function isPrivateHostname(hostname: string): boolean {
  const lowered = hostname.toLowerCase();

  if (lowered === 'localhost' || lowered.endsWith('.local')) {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lowered)) {
    const [a, b] = lowered.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (lowered === '::1' || lowered.startsWith('fc') || lowered.startsWith('fd')) {
    return true;
  }

  return false;
}

export function extractScanTarget(input: string) {
  const parsed = new URL(input);
  return {
    normalizedUrl: parsed.toString().replace(/\/$/, ''),
    hostname: parsed.hostname.toLowerCase(),
    domain: extractRootDomain(parsed.hostname.toLowerCase()),
    protocol: parsed.protocol as 'http:' | 'https:',
    httpsEnabled: parsed.protocol === 'https:',
  };
}

export function extractRootDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;

  const lastTwo = parts.slice(-2).join('.');
  const lastThree = parts.slice(-3).join('.');
  if (ROOT_DOMAIN_EXCEPTIONS.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  if (ROOT_DOMAIN_EXCEPTIONS.has(lastThree)) {
    return parts.slice(-4).join('.');
  }

  return parts.slice(-2).join('.');
}

export function deriveGrade(score: number) {
  if (score >= 90) return { grade: 'A+', interpretation: 'Excellent - Top 10%' };
  if (score >= 80) return { grade: 'A', interpretation: 'Très bon - Top 25%' };
  if (score >= 70) return { grade: 'B', interpretation: 'Bon - Top 50%' };
  if (score >= 60) return { grade: 'C', interpretation: 'Moyen - Améliorations nécessaires' };
  if (score >= 50) return { grade: 'D', interpretation: 'Insuffisant - Corrections urgentes' };
  return { grade: 'F', interpretation: 'Critique - Refonte nécessaire' };
}

export async function resolveDns(hostname: string): Promise<boolean> {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`);
    if (!response.ok) return false;
    const data = (await response.json()) as { Answer?: unknown[]; Status?: number };
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function bytesToMb(bytes: number) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

export function ratingFromThresholds(value: number, good: number, medium: number, inverse = false) {
  if (inverse) {
    if (value >= good) return 'good';
    if (value >= medium) return 'needs_improvement';
    return 'poor';
  }

  if (value <= good) return 'good';
  if (value <= medium) return 'needs_improvement';
  return 'poor';
}

export function pickIpAddress(headers: Headers) {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0]?.trim() || '0.0.0.0';
  }

  return headers.get('x-real-ip') || '0.0.0.0';
}

export function getEnv() {
  const runtime = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;

  return runtime || {};
}
