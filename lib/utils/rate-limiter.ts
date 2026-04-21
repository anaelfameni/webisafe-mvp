import { fetchJsonWithTimeout, fetchWithTimeout } from './http.ts';
import { getEnv } from './validators.ts';

const memoryStore = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
}

function getSupabaseConfig() {
  const env = getEnv();
  return {
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
  };
}

function getHeaders() {
  const { supabaseAnonKey } = getSupabaseConfig();
  return {
    apikey: supabaseAnonKey || '',
    Authorization: `Bearer ${supabaseAnonKey || ''}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function rememberLocally(key: string, now: number, windowMs: number, limit: number) {
  const history = (memoryStore.get(key) || []).filter((item) => now - item < windowMs);
  history.push(now);
  memoryStore.set(key, history);
  const retryAfter = history.length > limit ? Math.ceil((windowMs - (now - history[0])) / 1000) : 0;
  return {
    allowed: history.length <= limit,
    retryAfter,
    remaining: Math.max(0, limit - history.length),
  };
}

export async function consumeRateLimit(ipAddress: string, scope = 'free_scan', limit = 5, windowSeconds = 3600): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${scope}:${ipAddress}`;
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    return rememberLocally(key, now, windowMs, limit);
  }

  try {
    const sinceIso = new Date(now - windowMs).toISOString();
    const query = new URLSearchParams({
      select: 'id,created_at',
      scope: `eq.${scope}`,
      ip_address: `eq.${ipAddress}`,
      created_at: `gte.${sinceIso}`,
      order: 'created_at.desc',
    });

    const { data } = await fetchJsonWithTimeout<Array<{ created_at: string }>>(
      `${supabaseUrl}/rest/v1/rate_limits?${query.toString()}`,
      { headers: getHeaders() },
      6_000
    );

    const count = Array.isArray(data) ? data.length : 0;
    if (count >= limit) {
      const oldest = data[data.length - 1]?.created_at ? new Date(data[data.length - 1].created_at).getTime() : now;
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
        remaining: 0,
      };
    }

    await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/rate_limits`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ip_address: ipAddress,
          scope,
          created_at: new Date(now).toISOString(),
        }),
      },
      6_000
    );

    return {
      allowed: true,
      retryAfter: 0,
      remaining: Math.max(0, limit - count - 1),
    };
  } catch {
    return rememberLocally(key, now, windowMs, limit);
  }
}
