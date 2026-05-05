// api/benchmark.js — Benchmark africain pour un domaine scanné (MOAT)
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit } from './_utils.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null;
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    const rateLimit = checkRateLimit(req, 20, 60000);
    if (!rateLimit.allowed) {
        return res.status(429).json({ success: false, error: 'Trop de requêtes.' });
    }

    const domain = req.query?.domain || '';
    const country = req.query?.country || 'CI';

    if (!domain || !supabase) {
        return res.json({
            success: true,
            benchmark: null,
            message: !supabase ? 'Base de données indisponible' : 'Domaine requis',
        });
    }

    try {
        // Score du domaine demandé (dernier scan)
        const { data: domainData } = await supabase
            .from('scan_analytics')
            .select('score_global')
            .eq('domain', domain)
            .order('scanned_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const yourScore = domainData?.score_global ?? null;

        // Moyenne du pays
        const { data: avgData } = await supabase
            .from('scan_analytics')
            .select('score_global')
            .eq('country_code', country)
            .limit(1000);

        const countryScores = avgData?.map(r => r.score_global).filter(s => s != null) ?? [];
        const countryAvg = countryScores.length
            ? Math.round(countryScores.reduce((a, c) => a + c, 0) / countryScores.length)
            : 0;

        // Top 10% du pays
        const sorted = [...countryScores].sort((a, b) => b - a);
        const top10Index = Math.max(0, Math.floor(sorted.length * 0.1) - 1);
        const countryTop10 = sorted.length ? sorted[top10Index] : 0;

        // Percentile
        const below = countryScores.filter(s => s < (yourScore ?? 0)).length;
        const percentile = countryScores.length
            ? Math.round((below / countryScores.length) * 100)
            : 0;

        return res.json({
            success: true,
            benchmark: {
                your_score: yourScore,
                country_avg: countryAvg,
                country_top_10: countryTop10,
                percentile,
                rank_text: percentile >= 90 ? 'TOP 10%' : percentile >= 75 ? 'TOP 25%' : percentile >= 50 ? 'Au-dessus de la moyenne' : percentile >= 25 ? 'En dessous de la moyenne' : 'Bottom 25%',
                total_scanned_country: countryScores.length,
            },
        });

    } catch (error) {
        console.error('[BENCHMARK] Erreur:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}
