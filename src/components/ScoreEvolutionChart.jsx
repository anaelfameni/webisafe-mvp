import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Dot,
} from 'recharts';

const COLORS = {
  global: '#ffffff',
  security: '#EF4444',
  performance: '#3B82F6',
  seo: '#22C55E',
  ux: '#A78BFA',
};

function formatMonth(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

const CustomDot = ({ cx, cy, payload, dataKey, onClick }) => {
  if (!cx || !cy) return null;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={COLORS[dataKey] || '#fff'}
      stroke="#0A0F1E"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(payload)}
    />
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0F1E] border border-[#1E3A5F] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/60 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: COLORS[p.dataKey] }} />
          <span className="text-white/80 capitalize">{p.dataKey}</span>
          <span className="ml-auto font-bold" style={{ color: COLORS[p.dataKey] }}>{p.value}/100</span>
        </div>
      ))}
    </div>
  );
};

export default function ScoreEvolutionChart({ history = [], onPointClick }) {
  const data = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(a.scan_date) - new Date(b.scan_date))
      .map(h => ({
        month: formatMonth(h.scan_date),
        global: h.score,
        security: h.security_score,
        performance: h.performance_score,
        seo: h.seo_score,
        ux: h.ux_score,
        _raw: h,
      }));
  }, [history]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40 text-sm">
        Aucune donnée d'historique disponible
      </div>
    );
  }

  const lines = [
    { key: 'global', name: 'Score Global' },
    { key: 'security', name: 'Sécurité' },
    { key: 'performance', name: 'Performance' },
    { key: 'seo', name: 'SEO' },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {lines.map(({ key, name }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={name}
            stroke={COLORS[key]}
            strokeWidth={2}
            dot={<CustomDot dataKey={key} onClick={d => onPointClick?.(d._raw)} />}
            activeDot={{ r: 7, strokeWidth: 2, stroke: '#0A0F1E' }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
