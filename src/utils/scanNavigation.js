const FRESH_SCAN_PARAM = 'fresh_scan';

export function buildFreeScanUrl({ url, email, requestId = Date.now() }) {
  const params = new URLSearchParams({ url });
  if (email) params.set('email', email);
  params.set(FRESH_SCAN_PARAM, String(requestId));
  return `/analyse?${params.toString()}`;
}

export function shouldForceFreshScan(searchParams) {
  return Boolean(searchParams?.get?.(FRESH_SCAN_PARAM));
}

export function stripFreshScanMarker(searchParams) {
  const params = new URLSearchParams(searchParams);
  params.delete(FRESH_SCAN_PARAM);
  const query = params.toString();
  return query ? `/analyse?${query}` : '/analyse';
}
