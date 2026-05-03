// src/components/ScoreHistoryChart.jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useScanHistory } from '../hooks/useScanHistory';

export default function ScoreHistoryChart({ userId, url }) {
    const { history, loading } = useScanHistory(userId, url);

    if (loading) return <p className="text-text-secondary text-sm">Chargement...</p>;
    if (history.length < 2) return null; // Pas assez de données

    const chartData = history.map((scan) => ({
        date: new Date(scan.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        score: scan.score,
        perf: scan.results_json?.scores?.performance,
        secu: scan.results_json?.scores?.security,
        seo: scan.results_json?.scores?.seo,
    }));

    return (
        <div className="bg-card-bg border border-border-color rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">📈 Évolution du score</h3>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                        labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Global" />
                    <Line type="monotone" dataKey="perf" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Perf" />
                    <Line type="monotone" dataKey="secu" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Sécu" />
                    <Line type="monotone" dataKey="seo" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="SEO" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}