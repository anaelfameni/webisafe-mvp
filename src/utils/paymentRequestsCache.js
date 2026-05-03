export function mergePaymentRequests(remoteRows = [], localRows = []) {
  const mergedMap = new Map();

  [...localRows, ...remoteRows].forEach((row) => {
    if (!row) return;
    const key = row.id || `${row.scan_id || ''}:${row.payment_code || ''}`;
    if (!key) return;
    mergedMap.set(key, row);
  });

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}
