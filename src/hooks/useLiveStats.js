import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient' // ton import existant

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

      setTotalScans(count || 0)
      setActivity(data || [])
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