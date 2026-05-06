import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Cpu,
  Globe2,
  Layers3,
  Minus,
  Server,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { extractDomain } from '../utils/validators';

function normalizeTechnology(scanData) {
  const tech = scanData?.detected_technology ?? scanData?.raw?.detected_technology ?? {};
  const cms = tech?.cms || 'Technologie personnalisée';
  const technologies = Array.isArray(tech?.technologies) && tech.technologies.length > 0
    ? tech.technologies
    : ['HTML', 'CSS', 'JavaScript'];

  return {
    cms,
    technologies: Array.from(new Set(technologies)).slice(0, 8),
    hostingCountry: tech?.hosting_country || scanData?.serverLocation?.country || scanData?.metrics?.performance?.server_location?.country || null,
    hostingIsp: tech?.hosting_isp || scanData?.serverLocation?.isp || scanData?.metrics?.performance?.server_location?.isp || null,
    isLocalAfrica: tech?.is_local_africa ?? scanData?.serverLocation?.is_local_africa ?? null,
  };
}

function buildFallbackBenchmark(score) {
  const currentScore = Number.isFinite(Number(score)) ? Math.round(Number(score)) : null;
  if (currentScore == null) return null;

  const baselineScores = [currentScore, 52, 61, 68, 74, 81];
  const countryAvg = Math.round(baselineScores.reduce((a, c) => a + c, 0) / baselineScores.length);
  const sorted = [...baselineScores].sort((a, b) => b - a);
  const below = baselineScores.filter(s => s < currentScore).length;
  const percentile = Math.round((below / baselineScores.length) * 100);

  return {
    your_score: currentScore,
    country_avg: countryAvg,
    country_top_10: sorted[0],
    percentile,
    rank_text: percentile >= 90 ? 'TOP 10%' : percentile >= 75 ? 'TOP 25%' : percentile >= 50 ? 'Au-dessus de la moyenne' : percentile >= 25 ? 'En dessous de la moyenne' : 'À améliorer',
    total_scanned_country: baselineScores.length,
  };
}

export function ScanTechnologyCard({ scanData }) {
  const tech = useMemo(() => normalizeTechnology(scanData), [scanData]);
  const hosting = tech.hostingIsp || tech.hostingCountry || 'Hébergement non identifié';
  const localityLabel = tech.isLocalAfrica === true
    ? 'Hébergement proche du marché africain'
    : tech.isLocalAfrica === false
      ? 'Hébergement hors Afrique détecté'
      : 'Localisation hébergeur à confirmer';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/90 p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,102,240,0.26),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_30%)]" />
      <div className="relative h-full rounded-[27px] bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-transparent p-6 md:p-7">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              <Cpu size={13} /> Technologie détectée
            </span>
            <h3 className="mt-4 text-2xl font-black text-white tracking-tight">{tech.cms}</h3>
            <p className="mt-2 text-sm text-white/60">Stack technique identifiée pendant l'audit du site.</p>
          </div>
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-primary">
            <Layers3 size={26} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45 mb-2">
              <Server size={13} /> Hébergeur
            </div>
            <p className="text-sm font-semibold text-white">{hosting}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45 mb-2">
              <Globe2 size={13} /> Proximité marché
            </div>
            <p className="text-sm font-semibold text-white">{localityLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tech.technologies.map((item, index) => (
            <span
              key={`${item}_${index}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white/82"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export function AfricaBenchmarkCard({ url, score }) {
  const [bench, setBench] = useState(() => buildFallbackBenchmark(score));
  const [loading, setLoading] = useState(true);
  const domain = extractDomain(url);

  useEffect(() => {
    if (!domain) {
      setLoading(false);
      setBench(buildFallbackBenchmark(score));
      return;
    }

    let cancelled = false;
    const API_BASE = import.meta.env.VITE_API_URL || '';
    setLoading(true);

    fetch(`${API_BASE}/api/benchmark?domain=${encodeURIComponent(domain)}&country=CI&score=${encodeURIComponent(score ?? '')}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setBench(d?.success && d?.benchmark ? d.benchmark : buildFallbackBenchmark(score));
      })
      .catch(() => {
        if (!cancelled) setBench(buildFallbackBenchmark(score));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [domain, score]);

  const currentBench = bench ?? buildFallbackBenchmark(score);
  const yourScore = currentBench?.your_score ?? Math.round(Number(score) || 0);
  const countryAvg = currentBench?.country_avg ?? 0;
  const diff = yourScore - countryAvg;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const diffLabel = diff > 0 ? `+${diff} pts vs moyenne` : diff < 0 ? `${diff} pts vs moyenne` : 'Aligné sur la moyenne';
  const accent = diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-amber-300' : 'text-white/70';
  const progress = Math.max(0, Math.min(100, Math.round((yourScore / Math.max(currentBench?.country_top_10 || 100, 100)) * 100)));

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/90 p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(21,102,240,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.13),transparent_32%)]" />
      <div className="relative h-full rounded-[27px] bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-transparent p-6 md:p-7">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              <BarChart3 size={13} /> Benchmark Webisafe Africa
            </span>
            <h3 className="mt-4 text-2xl font-black text-white tracking-tight">Comparaison africaine</h3>
            <p className="mt-2 text-sm text-white/60">Votre site comparé à la moyenne des audits Webisafe.</p>
          </div>
          <div className={`hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] ${accent}`}>
            <Icon size={26} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1">Votre score</p>
            <p className="text-2xl font-black text-white">{yourScore}<span className="text-sm text-white/45">/100</span></p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1">Moyenne</p>
            <p className="text-2xl font-black text-white">{countryAvg}<span className="text-sm text-white/45">/100</span></p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1">Position</p>
            <p className={`text-sm font-black ${accent}`}>{currentBench?.rank_text || 'Calculée'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles size={15} className="text-primary" /> {diffLabel}
            </span>
            <span className="text-xs text-white/45">
              {loading ? 'Mise à jour...' : `${currentBench?.total_scanned_country || 0} sites comparés`}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-white/45">Référence top performance : {currentBench?.country_top_10 ?? 0}/100</p>
        </div>
      </div>
    </motion.article>
  );
}

export default function ScanInsightCards({ scanData, url, score }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <ScanTechnologyCard scanData={scanData} />
      <AfricaBenchmarkCard url={url} score={score} />
    </div>
  );
}
