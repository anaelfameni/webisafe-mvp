const LEGACY_SCANS_KEY = 'webisafe_scans';

function toTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function readLegacyScans() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_SCANS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeAdminScan(scan) {
  const resultData = scan?.results_json || scan?.data || scan || {};
  const score = scan?.score ?? scan?.scores?.global ?? resultData?.scores?.global ?? resultData?.score ?? null;
  const scannedAt = scan?.scanned_at || scan?.scan_date || scan?.created_at || scan?.scanDate || scan?.savedAt || resultData?.scanned_at || resultData?.scanDate || resultData?.savedAt || null;

  return {
    ...scan,
    id: scan?.id || `${scan?.url || resultData?.url || 'scan'}-${scannedAt || Date.now()}`,
    url: scan?.url || resultData?.url || '',
    user_email: scan?.user_email || scan?.email || resultData?.user_email || resultData?.email || null,
    score,
    scanned_at: scannedAt,
    paid: Boolean(scan?.paid || resultData?.paid),
  };
}

export function mergeAdminScans(remoteScans = [], legacyScans = []) {
  const mergedMap = new Map();

  [...legacyScans, ...remoteScans].forEach((scan) => {
    if (!scan) return;
    const normalized = normalizeAdminScan(scan);
    const key = normalized.id || `${normalized.url}:${normalized.scanned_at}`;
    if (!key) return;
    mergedMap.set(key, normalized);
  });

  return Array.from(mergedMap.values()).sort(
    (a, b) => toTime(b.scanned_at || b.savedAt || b.scanDate) - toTime(a.scanned_at || a.savedAt || a.scanDate)
  );
}
