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

function getCurrentUserId() {
  try {
    const auth = JSON.parse(localStorage.getItem('webisafe_auth') || '{}');
    return auth?.id || null;
  } catch {
    return null;
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
    const userId = getCurrentUserId();

    const scan = {
      ...scanData,
      id: scanData.id || `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      // Date du scan réel (depuis le backend si disponible, sinon maintenant)
      scanned_at: scanData.scanned_at || scanData.scan_duration_ms
        ? (scanData.scanned_at || new Date().toISOString())
        : new Date().toISOString(),
      savedAt: new Date().toISOString(),
      // Associer au compte connecté si disponible
      user_id: scanData.user_id || userId || null,
    };

    const existing = readStorageArray(SCANS_KEY);
    const updated = [
      scan,
      ...existing.filter((item) => item.id !== scan.id),
    ].slice(0, 50); // max 50 scans en local

    localStorage.setItem(SCANS_KEY, JSON.stringify(updated));
    setScans(updated);
    return scan.id;
  }, []);

  const getScan = useCallback((id) => {
    return readStorageArray(SCANS_KEY).find((scan) => scan.id === id) || null;
  }, []);

  // DEPRECATED : la source de vérité est désormais le flag `paid` en base (Supabase).
  // Ces fonctions ne servent plus que de cache local legacy.
  const markAsPaid = useCallback((scanId) => {
    const existing = readStorageArray(PAID_KEY);
    const updated = Array.from(new Set([...existing, scanId]));
    localStorage.setItem(PAID_KEY, JSON.stringify(updated));
    setPaidReports(updated);

    // Met aussi à jour le scan en local pour refléter paid: true
    const scans = readStorageArray(SCANS_KEY);
    const scanIndex = scans.findIndex((s) => s.id === scanId);
    if (scanIndex !== -1) {
      scans[scanIndex] = { ...scans[scanIndex], paid: true };
      localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
      setScans(scans);
    }
  }, []);

  const isPaid = useCallback((scanId) => {
    return readStorageArray(PAID_KEY).includes(scanId);
  }, []);

  const deleteScan = useCallback((id) => {
    const updated = readStorageArray(SCANS_KEY).filter((scan) => scan.id !== id);
    localStorage.setItem(SCANS_KEY, JSON.stringify(updated));
    setScans(updated);
  }, []);

  // Récupère tous les scans d'une URL donnée (pour l'historique)
  const getScansByUrl = useCallback((url) => {
    return readStorageArray(SCANS_KEY)
      .filter((scan) => scan.url === url)
      .sort((a, b) => new Date(a.scanned_at || a.savedAt) - new Date(b.scanned_at || b.savedAt));
  }, []);

  // Récupère tous les scans de l'utilisateur connecté
  const getUserScans = useCallback(() => {
    const userId = getCurrentUserId();
    if (!userId) return readStorageArray(SCANS_KEY);
    return readStorageArray(SCANS_KEY).filter((scan) => scan.user_id === userId);
  }, []);

  return {
    scans,
    paidReports,
    saveScan,
    getScan,
    getScansByUrl,
    getUserScans,
    markAsPaid,
    isPaid,
    deleteScan,
    loadScans,
  };
}