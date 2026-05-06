import { useState, useEffect } from 'react'

function readLocalScanEvents() {
  try {
    const scans = JSON.parse(localStorage.getItem('webisafe_scans') || '[]')
    if (!Array.isArray(scans)) return []
    return scans.slice(0, 10).map((scan) => ({
      domain: (() => {
        try {
          return new URL(scan.url).hostname.replace(/^www\./, '')
        } catch {
          return scan.url || scan.domain || 'Site analysé'
        }
      })(),
      score: scan.scores?.global ?? scan.global_score ?? null,
      country: scan.metrics?.performance?.server_location?.country ?? 'CI',
      created_at: scan.scanned_at || scan.savedAt || scan.created_at || new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

export function useLiveStats() {
  const [totalScans, setTotalScans]   = useState(null)
  const [activity, setActivity]       = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    // 1. Chargement initial
    async function fetchInitial() {
      try {
        const response = await fetch('/api/stats')
        const payload = response.ok ? await response.json() : null
        const localActivity = readLocalScanEvents()
        const remoteActivity = Array.isArray(payload?.recent_scans)
          ? payload.recent_scans.map((scan) => ({
              domain: scan.domain,
              score: scan.score,
              country: scan.country || 'CI',
              created_at: scan.scanned_at || scan.created_at,
            }))
          : []
        const mergedActivity = [...remoteActivity, ...localActivity]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)

        setTotalScans(Math.max(payload?.stats?.total_scans || 0, localActivity.length))
        setActivity(mergedActivity)
      } catch {
        const localActivity = readLocalScanEvents()
        setTotalScans(localActivity.length)
        setActivity(localActivity)
      } finally {
        setLoading(false)
      }
    }

    fetchInitial()

    // 2. Rafraîchissement périodique des derniers scans publics
    const channel = window.setInterval(fetchInitial, 30000)

    // Cleanup à la destruction du composant
    return () => {
      window.clearInterval(channel)
    }
  }, [])

  return { totalScans, activity, loading }
}