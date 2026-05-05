import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient' // ton import existant

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
      // Compteur total
      const { count } = await supabase
        .from('scan_events')
        .select('*', { count: 'exact', head: true })

      // 10 derniers scans
      const { data } = await supabase
        .from('scan_events')
        .select('domain, score, country, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      const localActivity = readLocalScanEvents()
      const remoteActivity = Array.isArray(data) ? data : []
      const mergedActivity = [...remoteActivity, ...localActivity]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)

      setTotalScans(Math.max(count || 0, localActivity.length))
      setActivity(mergedActivity)

      setLoading(false)
    }

    fetchInitial()

    // 2. Subscription Realtime — écoute les nouveaux scans
    const channel = supabase
      .channel('scan_events_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_events' },
        (payload) => {
          const newScan = payload.new

          // Mettre à jour le compteur
          setTotalScans(prev => (prev || 0) + 1)

          // Ajouter en tête du feed, garder max 10
          setActivity(prev => [newScan, ...prev].slice(0, 10))
        }
      )
      .subscribe()

    // Cleanup à la destruction du composant
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { totalScans, activity, loading }
}