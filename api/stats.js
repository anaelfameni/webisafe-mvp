// api/stats.js — Statistiques publiques agrégées (MOAT Webisafe Africa)
import { setCorsHeaders, checkRateLimit, getSupabaseAdminClient } from './_utils.js';

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    const rateLimit = checkRateLimit(req, 20, 60000);
    if (!rateLimit.allowed) {
        return res.status(429).json({ success: false, error: 'Trop de requêtes.' });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return res.status(503).json({ success: false, error: 'Base de données indisponible' });
    }

    try {
        // ── Agrégations globales ─────────────────────────────────────────────
        const { count: totalCount, error: totalErr } = await supabase
            .from('scan_analytics')
            .select('id', { count: 'exact', head: true });

        if (totalErr) throw totalErr;

        const totalScans = totalCount ?? 0;

        // Score moyen global
        const { data: avgData, error: avgErr } = await supabase
            .from('scan_analytics')
            .select('score_global');

        if (avgErr) throw avgErr;

        const avgScore = avgData?.length
            ? Math.round(avgData.reduce((a, c) => a + (c.score_global ?? 0), 0) / avgData.length)
            : 0;

        // Pays couverts
        const { data: countries, error: countriesErr } = await supabase
            .from('scan_analytics')
            .select('country_code')
            .limit(1000);

        if (countriesErr) throw countriesErr;

        const uniqueCountries = new Set(countries?.map(r => r.country_code) ?? []);

        // Répartition par CMS
        const { data: cmsData, error: cmsErr } = await supabase
            .from('scan_analytics')
            .select('cms_detected')
            .not('cms_detected', 'is', null)
            .limit(1000);

        if (cmsErr) throw cmsErr;

        const cmsCounts = {};
        cmsData?.forEach(r => {
            const cms = r.cms_detected || 'Inconnu';
            cmsCounts[cms] = (cmsCounts[cms] || 0) + 1;
        });

        // Top 5 CMS
        const topCms = Object.entries(cmsCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Derniers scans publics (feed)
        const { data: recent, error: recentErr } = await supabase
            .from('scan_analytics')
            .select('domain, score_global, cms_detected, country_code, scanned_at')
            .eq('is_public', true)
            .order('scanned_at', { ascending: false })
            .limit(20);

        if (recentErr) throw recentErr;

        return res.json({
            success: true,
            stats: {
                total_scans: totalScans,
                avg_score: avgScore,
                countries_count: uniqueCountries.size,
                countries: Array.from(uniqueCountries),
                top_cms: topCms,
            },
            recent_scans: recent?.map(r => ({
                domain: r.domain,
                score: r.score_global,
                cms: r.cms_detected,
                country: r.country_code,
                scanned_at: r.scanned_at,
            })) ?? [],
        });

    } catch (error) {
        console.error('[STATS] Erreur:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}
