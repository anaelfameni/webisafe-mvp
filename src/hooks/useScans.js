import { useState, useEffect } from 'react';

const SCANS_KEY = 'webisafe_scans';
const PAID_KEY = 'webisafe_paid_reports';

export function useScans() {
  const [scans, setScans] = useState([]);
  const [paidReports, setPaidReports] = useState([]);

  useEffect(() => {
    loadScans();
    loadPaidReports();
  }, []);

  const loadScans = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(SCANS_KEY) || '[]');
      setScans(stored);
    } catch {
      setScans([]);
    }
  };

  const loadPaidReports = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(PAID_KEY) || '[]');
      setPaidReports(stored);
    } catch {
      setPaidReports([]);
    }
  };

  const saveScan = (scanData) => {
    const scan = {
      ...scanData,
      id: scanData.id || 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      savedAt: new Date().toISOString(),
    };

    const updated = [scan, ...scans].slice(0, 50); // Garder max 50 scans
    localStorage.setItem(SCANS_KEY, JSON.stringify(updated));
    setScans(updated);
    return scan.id;
  };

  const getScan = (id) => {
    const allScans = JSON.parse(localStorage.getItem(SCANS_KEY) || '[]');
    return allScans.find(s => s.id === id);
  };

  const markAsPaid = (scanId) => {
    const updated = [...paidReports, scanId];
    localStorage.setItem(PAID_KEY, JSON.stringify(updated));
    setPaidReports(updated);
  };

  const isPaid = (scanId) => {
    const stored = JSON.parse(localStorage.getItem(PAID_KEY) || '[]');
    return stored.includes(scanId);
  };

  const deleteScan = (id) => {
    const updated = scans.filter(s => s.id !== id);
    localStorage.setItem(SCANS_KEY, JSON.stringify(updated));
    setScans(updated);
  };

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
