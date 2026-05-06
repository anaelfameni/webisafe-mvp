// src/hooks/useScanHistory.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useScanHistory(userId, url = null) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }

        async function load() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch(`/api/history/${encodeURIComponent(userId)}`, {
                    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
                });
                const payload = response.ok ? await response.json() : null;
                const rows = (payload?.history || []).map((scan) => ({
                    id: scan.id,
                    url: scan.site_url,
                    score: scan.score,
                    created_at: scan.scan_date,
                    results_json: {
                        scores: {
                            security: scan.security_score,
                            performance: scan.performance_score,
                            seo: scan.seo_score,
                            ux: scan.ux_score,
                        },
                    },
                }));
                setHistory(url ? rows.filter((scan) => scan.url === url) : rows);
            } catch {
                setHistory([]);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [userId, url]);

    return { history, loading };
}