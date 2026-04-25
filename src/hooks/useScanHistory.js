// src/hooks/useScanHistory.js
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useScanHistory(userId, url = null) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }

        async function load() {
            let query = supabase
                .from('scans')
                .select('id, url, score, created_at, results_json')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })
                .limit(30);

            if (url) query = query.eq('url', url);

            const { data } = await query;
            setHistory(data || []);
            setLoading(false);
        }

        load();
    }, [userId, url]);

    return { history, loading };
}