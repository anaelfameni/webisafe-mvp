const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function buildUrl(table, query = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
}

async function request(table, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase non configure');
  }

  const response = await fetch(buildUrl(table, options.query), {
    method: options.method || 'GET',
    headers: getHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Erreur Supabase');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function selectRows(table, query) {
  return request(table, { query });
}

export async function insertRow(table, body) {
  const rows = await request(table, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body,
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

export async function updateRows(table, query, body) {
  const rows = await request(table, {
    method: 'PATCH',
    query,
    headers: { Prefer: 'return=representation' },
    body,
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

export async function upsertRow(table, body, onConflict) {
  const rows = await request(table, {
    method: 'POST',
    query: onConflict ? `on_conflict=${encodeURIComponent(onConflict)}` : '',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body,
  });

  return Array.isArray(rows) ? rows[0] : rows;
}
