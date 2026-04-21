import { useCallback, useEffect, useState } from 'react';

const SCANS_KEY = 'webisafe_scans';
const PAID_KEY = 'webisafe_paid_reports';

function readStorageArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useScans() {
  const [scans, setScans] = useState([]);
  const [paidReports, setPaidReports] = useState([]);

  useEffect(() => {
    loadScans();
    loadPaidReports();
  }, []);

  const loadScans = useCallback(() => {
    setScans(readStorageArray(SCANS_KEY));
  }, []);

  const loadPaidReports = useCallback(() => {
    setPaidReports(readStorageArray(PAID_KEY));
  }, []);

  const saveScan = useCallback((scanData) => {
    const scan = {
      ...scanData,
      id: scanData.id || 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      savedAt: new Date().toISOString(),
    };

    const updated = [scan, ...readStorageArray(SCANS_KEY).filter((item) => item.id !== scan.id)].slice(0, 50);
    localStorage.setItem(SCANS_KEY, JSON.stringify(updated));
    setScans(updated);
    return scan.id;
  }, []);

  const getScan = useCallback((id) => {
    return readStorageArray(SCANS_KEY).find((scan) => scan.id === id) || null;
  }, []);

  const markAsPaid = useCallback((scanId) => {
    const updated = Array.from(new Set([...readStorageArray(PAID_KEY), scanId]));
    localStorage.setItem(PAID_KEY, JSON.stringify(updated));
    setPaidReports(updated);
  }, []);

  const isPaid = useCallback((scanId) => {
    return readStorageArray(PAID_KEY).includes(scanId);
  }, []);

  const deleteScan = useCallback((id) => {
    const updated = readStorageArray(SCANS_KEY).filter((scan) => scan.id !== id);
    localStorage.setItem(SCANS_KEY, JSON.stringify(updated));
    setScans(updated);
  }, []);

  return {
    scans,
    paidReports,
    saveScan,
    getScan,
    markAsPaid,
    isPaid,
    deleteScan,
    loadScans,
  };
}
