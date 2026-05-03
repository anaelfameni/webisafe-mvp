import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Globe, FileText, Shield, Zap, Search, History,
  CreditCard, ArrowUpCircle, LogOut, User, Bell, Menu, X,
  ArrowRight, BarChart3, CheckCircle2, ExternalLink, Plus, Trash2,
  Download, TrendingUp, TrendingDown, AlertTriangle, Activity,
  Sparkles, PartyPopper, Handshake, Users, ChevronRight,
} from 'lucide-react';
import { useScans } from '../hooks/useScans';
import { getScoreBadge, getScoreColor } from '../utils/calculateScore';
import { formatDate, extractDomain } from '../utils/validators';
import { fetchPaymentRequestsByEmail } from '../utils/paymentApi';
import { buildValidatedPremiumMap } from '../utils/premiumAccess';
import { shouldShowDashboardWelcome } from '../utils/dashboardWelcome';
import ScoreEvolutionChart from '../components/ScoreEvolutionChart';
import { generatePDF } from '../utils/generatePDF';

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = '#1566F0', evolution }) {
  return (
    <div className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
      {evolution != null && (
        <div className={`flex items-center gap-1 text-xs ${evolution >= 0 ? 'text-success' : 'text-danger'}`}>
          {evolution >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {evolution >= 0 ? '+' : ''}{evolution} pts ce mois
        </div>
      )}
    </div>
  );
}

// ── Score Arc (mini gauge) ────────────────────────────────────────────────────
function ScoreArc({ score, size = 120 }) {
  const r = 46;
  const cx = 60;
  const cy = 60;
  const circumference = Math.PI * r;
  const progress = Math.min(Math.max(score / 100, 0), 1);
  const offset = circumference * (1 - progress);
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#EAB308' : '#EF4444';

  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 120 72">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold">{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748B" fontSize="8">/100</text>
    </svg>
  );
}

// ── Page: Vue d'ensemble ──────────────────────────────────────────────────────
function PageOverview({ user, scans, isPaid, validatedPremiumMap, navigate, uptime }) {
  const lastScan = scans[0] ?? null;
  const score = lastScan?.scores?.global ?? null;
  const prevScan = scans[1] ?? null;
  const evolution = score != null && prevScan?.scores?.global != null ? score - prevScan.scores.global : null;

  const criticalAlerts = lastScan?.critical_alerts ?? [];
  const activeAlerts = criticalAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  const historyData = scans.slice(0, 6).map(s => ({
    score: s.scores?.global,
    security_score: s.scores?.security,
    performance_score: s.scores?.performance,
    seo_score: s.scores?.seo,
    ux_score: s.scores?.ux_mobile ?? s.scores?.ux,
    scan_date: s.scanDate || s.savedAt,
  }));

  const validatedScans = Object.keys(validatedPremiumMap);
  const mostRecentValidated = validatedScans.length > 0
    ? scans.find(s => s.id === validatedScans[validatedScans.length - 1])
    : null;

  return (
    <div className="space-y-8">
      {/* Banner scan premium validé */}
      {mostRecentValidated && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-r from-success/20 via-primary/10 to-success/10 border border-success/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
          <CheckCircle2 size={28} className="text-success flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white font-bold text-base">🎉 Votre rapport premium est prêt !</p>
            <p className="text-white/60 text-sm mt-0.5">
              L'audit complet de <strong>{extractDomain(mostRecentValidated.url)}</strong> a été validé et est maintenant accessible.
            </p>
          </div>
          <button
            onClick={() => navigate(`/rapport/${mostRecentValidated.id}`)}
            className="relative flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-success hover:bg-success/90 text-white font-bold rounded-xl transition text-sm"
          >
            Voir le rapport complet <ArrowRight size={14} />
          </button>
        </motion.div>
      )}

      {/* Hero Score */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-shrink-0">
          {score != null ? <ScoreArc score={score} size={150} /> : <div className="w-36 h-20 flex items-center justify-center text-white/30 text-sm">Aucun scan</div>}
        </div>
        <div className="flex-1">
          <p className="text-white/50 text-sm mb-1">Score global — dernier scan</p>
          {lastScan ? (
            <>
              <p className="text-white font-bold text-lg mb-1">{extractDomain(lastScan.url)}</p>
              <p className="text-white/40 text-xs mb-3">{formatDate(lastScan.scanDate || lastScan.savedAt)}</p>
              {evolution != null && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${evolution >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {evolution >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {evolution >= 0 ? '+' : ''}{evolution} pts vs scan précédent
                </span>
              )}
            </>
          ) : (
            <p className="text-white/50 text-sm">Lancez votre premier scan pour voir votre score.</p>
          )}
        </div>
        <div>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition text-sm">
            <Plus size={16} /> Nouveau scan
          </Link>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Sécurité" value={lastScan?.scores?.security != null ? `${lastScan.scores.security}/100` : null} icon={<Shield size={16} />} color="#EF4444" />
        <KpiCard label="Performance" value={lastScan?.scores?.performance != null ? `${lastScan.scores.performance}/100` : null} icon={<Zap size={16} />} color="#3B82F6" />
        <KpiCard label="SEO" value={lastScan?.scores?.seo != null ? `${lastScan.scores.seo}/100` : null} icon={<Search size={16} />} color="#22C55E" />
        <KpiCard label="UX Mobile" value={(lastScan?.scores?.ux_mobile ?? lastScan?.scores?.ux) != null ? `${lastScan.scores.ux_mobile ?? lastScan.scores.ux}/100` : null} icon={<Activity size={16} />} color="#A78BFA" />
      </motion.div>

      {/* Uptime */}
      {uptime && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card-bg border border-border-color rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className={`relative flex h-3 w-3 ${uptime.status === 'up' ? 'text-success' : 'text-danger'}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: uptime.status === 'up' ? '#22C55E' : '#EF4444' }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: uptime.status === 'up' ? '#22C55E' : '#EF4444' }} />
            </span>
            <div>
              <p className="text-white font-semibold text-sm">Votre site est {uptime.status === 'up' ? 'EN LIGNE' : 'HORS LIGNE'}</p>
              {uptime.site_url && <p className="text-white/40 text-xs">{uptime.site_url}</p>}
            </div>
          </div>
          {uptime.uptime_ratio != null && (
            <div className="text-center">
              <p className="text-white font-bold text-xl">{uptime.uptime_ratio.toFixed(1)}%</p>
              <p className="text-white/40 text-xs">Uptime 30j</p>
            </div>
          )}
          {uptime.response_time != null && (
            <div className="text-center">
              <p className="text-white font-bold text-xl">{uptime.response_time}ms</p>
              <p className="text-white/40 text-xs">Temps réponse</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Alertes */}
      {activeAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-danger" /> Alertes actives</h3>
          {activeAlerts.slice(0, 3).map((a, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${a.severity === 'critical' ? 'bg-danger/10 border-danger/30' : 'bg-warning/10 border-warning/30'}`}>
              <span className="text-sm">{a.severity === 'critical' ? '🔴' : '🟠'}</span>
              <div>
                <p className="text-white text-sm font-medium">{a.title}</p>
                {a.message && <p className="text-white/50 text-xs">{a.message}</p>}
              </div>
            </div>
          ))}
        </motion.div>
      )}
      {activeAlerts.length === 0 && lastScan && (
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-2xl">
          <CheckCircle2 size={20} className="text-success" />
          <p className="text-success font-medium text-sm">✅ Aucune alerte active — Votre site est sain</p>
        </div>
      )}

      {/* Graphique évolution */}
      {historyData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card-bg border border-border-color rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Évolution des scores (6 derniers scans)</h3>
          <ScoreEvolutionChart history={historyData} onPointClick={d => { if (d?.id) navigate(`/rapport/${d.id}`); }} />
        </motion.div>
      )}

      {/* Actions rapides */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {lastScan && isPaid(lastScan.id) && (
          <button onClick={() => generatePDF(lastScan)} className="flex items-center gap-3 p-4 bg-card-bg border border-border-color rounded-2xl hover:border-primary/50 transition text-left">
            <Download size={18} className="text-primary" />
            <div><p className="text-white text-sm font-semibold">Télécharger PDF</p><p className="text-white/40 text-xs">Dernier rapport</p></div>
          </button>
        )}
        <Link to="/" className="flex items-center gap-3 p-4 bg-card-bg border border-border-color rounded-2xl hover:border-primary/50 transition">
          <Plus size={18} className="text-primary" />
          <div><p className="text-white text-sm font-semibold">Nouveau scan</p><p className="text-white/40 text-xs">Analyser un site</p></div>
        </Link>
        <Link to="/protect" className="relative overflow-hidden flex items-center gap-3 p-4 bg-primary border border-primary rounded-2xl hover:bg-primary-hover transition shadow-[0_0_20px_rgba(21,102,240,0.35)]">
          <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2.5s_infinite]" />
          <Shield size={18} className="text-white relative" />
          <div className="relative"><p className="text-white text-sm font-bold">Activer Webisafe Protect</p><p className="text-white/70 text-xs">15 000 FCFA/mois</p></div>
        </Link>
      </motion.div>
    </div>
  );
}

// ── Page: Rapports ────────────────────────────────────────────────────────────
function PageReports({ scans, isPaid, validatedPremiumMap, navigate }) {
  const lastScan = scans[0];

  return (
    <div className="space-y-6">
      {lastScan && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-primary/30 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-4">
            <div>
              <p className="text-white/50 text-xs mb-1">Dernier rapport</p>
              <h3 className="text-white font-bold text-lg">{extractDomain(lastScan.url)}</h3>
              <p className="text-white/40 text-xs">{formatDate(lastScan.scanDate || lastScan.savedAt)} · Score : {lastScan.scores?.global ?? '—'}/100</p>
            </div>
            <div className="flex gap-2">
              {isPaid(lastScan.id) && (
                <button onClick={() => generatePDF(lastScan)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition">
                  <Download size={14} /> Télécharger PDF
                </button>
              )}
              <button onClick={() => navigate(isPaid(lastScan.id) ? `/rapport/${lastScan.id}` : `/analyse?url=${encodeURIComponent(lastScan.url)}`)} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-sm transition hover:bg-white/20">
                <ExternalLink size={14} /> Voir en ligne
              </button>
            </div>
          </div>
          {(lastScan.critical_alerts ?? []).slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/60 mb-1">
              <span>{a.severity === 'critical' ? '🔴' : '🟠'}</span> {a.title}
            </div>
          ))}
        </motion.div>
      )}

      <div>
        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><History size={16} /> Historique des scans</h3>
        {scans.length === 0 ? (
          <div className="bg-card-bg border border-border-color rounded-2xl p-12 text-center">
            <BarChart3 size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Aucun scan</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold mt-2">Scanner maintenant <ArrowRight size={14} /></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan, i) => {
              const paid = isPaid(scan.id);
              const badge = getScoreBadge(scan.scores?.global || 0);
              const scoreColor = getScoreColor(scan.scores?.global || 0);
              const validation = validatedPremiumMap[scan.id];
              return (
                <motion.div key={scan.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="bg-card-bg border border-border-color rounded-xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ background: `${scoreColor}15`, color: scoreColor }}>
                    {scan.scores?.global ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{extractDomain(scan.url)}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-white/40 text-xs">{formatDate(scan.scanDate || scan.savedAt)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.text}</span>
                      {paid && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Premium</span>}
                    </div>
                    {validation && <button onClick={() => navigate(`/rapport/${scan.id}`)} className="mt-2 inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 size={12} /> {validation.message}</button>}
                  </div>
                  <div className="flex gap-2">
                    {paid && <button onClick={() => generatePDF(scan)} className="p-2 text-white/40 hover:text-primary rounded-lg hover:bg-primary/10 transition"><Download size={14} /></button>}
                    <button onClick={() => navigate(paid ? `/rapport/${scan.id}` : `/analyse?url=${encodeURIComponent(scan.url)}`)} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition">
                      <ExternalLink size={12} /> {paid ? 'Rapport' : 'Voir'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page: Sécurité ────────────────────────────────────────────────────────────
function PageSecurity({ scans }) {
  const lastScan = scans[0];
  const sec = lastScan?.metrics?.security ?? lastScan?.security ?? {};
  const secScore = lastScan?.scores?.security ?? null;
  const checks = [
    { label: 'HTTPS activé', ok: lastScan?.summary?.https_enabled, group: 'SSL & HTTPS' },
    { label: 'Grade SSL', ok: ['A+', 'A', 'B'].includes(sec.ssl_grade), value: sec.ssl_grade, group: 'SSL & HTTPS' },
    { label: 'Redirection HTTPS', ok: lastScan?.summary?.https_enabled, group: 'SSL & HTTPS' },
    { label: 'Content-Security-Policy', ok: !(sec.headers_manquants ?? []).some(h => String(h?.header || h).toLowerCase().includes('content-security')), group: 'Headers HTTP' },
    { label: 'X-Frame-Options', ok: !(sec.headers_manquants ?? []).some(h => String(h?.header || h).toLowerCase().includes('x-frame')), group: 'Headers HTTP' },
    { label: 'X-Content-Type-Options', ok: !(sec.headers_manquants ?? []).some(h => String(h?.header || h).toLowerCase().includes('x-content')), group: 'Headers HTTP' },
    { label: 'Strict-Transport-Security', ok: !(sec.headers_manquants ?? []).some(h => String(h?.header || h).toLowerCase().includes('strict-transport')), group: 'Headers HTTP' },
    { label: 'Malware', ok: sec.malware_detected !== true, value: sec.malware_detected === true ? 'DÉTECTÉ' : 'Aucun', group: 'Vulnérabilités' },
    { label: 'Fichiers sensibles exposés', ok: !sec.sensitive_files?.critical, group: 'Vulnérabilités' },
  ];
  const groups = [...new Set(checks.map(c => c.group))];

  if (!lastScan) return <div className="text-white/40 text-sm p-8 text-center">Lancez un scan pour voir votre analyse sécurité.</div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6 bg-card-bg border border-border-color rounded-2xl p-6">
        {secScore != null && <ScoreArc score={secScore} size={130} />}
        <div>
          <p className="text-white/50 text-xs mb-1">Score Sécurité</p>
          <p className="text-4xl font-bold text-white">{secScore ?? '—'}<span className="text-white/30 text-xl">/100</span></p>
          <p className="text-white/50 text-sm mt-1">{secScore >= 80 ? '✅ Bonne protection' : secScore >= 55 ? '⚠️ Protection partielle' : '🔴 Site vulnérable'}</p>
        </div>
      </motion.div>

      {groups.map(group => (
        <motion.div key={group} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-color rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">{group}</h3>
          <div className="space-y-2">
            {checks.filter(c => c.group === group).map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border-color/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{c.ok === true ? '✅' : c.ok === false ? '❌' : '⚠️'}</span>
                  <span className="text-white/80 text-sm">{c.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.ok === true ? 'bg-success/10 text-success' : c.ok === false ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                  {c.value ?? (c.ok === true ? 'OK' : c.ok === false ? 'Absent' : 'N/A')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Page: Performance ─────────────────────────────────────────────────────────
function PagePerformance({ scans }) {
  const lastScan = scans[0];
  const perf = lastScan?.performance ?? {};
  const vitals = perf.core_web_vitals ?? {};
  const perfScore = lastScan?.scores?.performance ?? null;

  if (!lastScan) return <div className="text-white/40 text-sm p-8 text-center">Lancez un scan pour voir votre analyse performance.</div>;

  const cwv = [
    { label: 'LCP', value: vitals.lcp?.value != null ? `${vitals.lcp.value}ms` : 'N/A', rating: vitals.lcp?.rating, desc: 'Largest Contentful Paint — temps d\'affichage du contenu principal. Objectif : < 2 500ms.' },
    { label: 'CLS', value: vitals.cls?.value != null ? vitals.cls.value : 'N/A', rating: vitals.cls?.rating, desc: 'Cumulative Layout Shift — stabilité visuelle. Objectif : < 0.1.' },
    { label: 'FCP', value: vitals.fcp?.value != null ? `${vitals.fcp.value}ms` : 'N/A', rating: vitals.fcp?.rating, desc: 'First Contentful Paint — premier affichage visible. Objectif : < 1 800ms.' },
  ];
  const ratingColor = r => r === 'good' ? '#22C55E' : r === 'needs_improvement' ? '#EAB308' : '#EF4444';
  const ratingLabel = r => r === 'good' ? 'Bon' : r === 'needs_improvement' ? 'À améliorer' : 'Critique';

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6 bg-card-bg border border-border-color rounded-2xl p-6">
        {perfScore != null && <ScoreArc score={perfScore} size={130} />}
        <div>
          <p className="text-white/50 text-xs mb-1">Score Performance</p>
          <p className="text-4xl font-bold text-white">{perfScore ?? '—'}<span className="text-white/30 text-xl">/100</span></p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cwv.map(v => (
          <motion.div key={v.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-color rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold text-lg">{v.label}</span>
              {v.rating && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${ratingColor(v.rating)}15`, color: ratingColor(v.rating) }}>{ratingLabel(v.rating)}</span>}
            </div>
            <p className="text-2xl font-bold text-white mb-2">{v.value}</p>
            <p className="text-white/40 text-xs">{v.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {perf.poids_page_mb != null && (
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-white/50 text-xs mb-1">Poids de la page</p>
            <p className="text-xl font-bold text-white">{perf.poids_page_mb} MB</p>
            <p className={`text-xs mt-1 ${perf.poids_page_mb > 3 ? 'text-danger' : perf.poids_page_mb > 2 ? 'text-warning' : 'text-success'}`}>
              {perf.poids_page_mb > 3 ? '🔴 Trop lourd' : perf.poids_page_mb > 2 ? '🟡 À optimiser' : '✅ Acceptable'}
            </p>
          </div>
        )}
        {perf.nb_requetes != null && (
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-white/50 text-xs mb-1">Requêtes HTTP</p>
            <p className="text-xl font-bold text-white">{perf.nb_requetes}</p>
            <p className={`text-xs mt-1 ${perf.nb_requetes > 100 ? 'text-danger' : perf.nb_requetes > 60 ? 'text-warning' : 'text-success'}`}>
              {perf.nb_requetes > 100 ? '🔴 Trop de requêtes' : '✅ Acceptable'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page: Historique ──────────────────────────────────────────────────────────
function PageHistory({ scans, navigate }) {
  const historyData = scans.slice(0, 6).map(s => ({
    score: s.scores?.global,
    security_score: s.scores?.security,
    performance_score: s.scores?.performance,
    seo_score: s.scores?.seo,
    ux_score: s.scores?.ux_mobile ?? s.scores?.ux,
    scan_date: s.scanDate || s.savedAt,
    id: s.id,
  }));

  return (
    <div className="space-y-6">
      {historyData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-color rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4">Évolution des scores</h3>
          <ScoreEvolutionChart history={historyData} onPointClick={d => { if (d?.id) navigate(`/rapport/${d.id}`); }} />
        </motion.div>
      )}

      <div className="space-y-3">
        {scans.map((scan, i) => {
          const scoreColor = getScoreColor(scan.scores?.global || 0);
          const badge = getScoreBadge(scan.scores?.global || 0);
          return (
            <div key={scan.id} className="bg-card-bg border border-border-color rounded-xl p-4 flex items-center gap-4">
              <div className="w-2 self-stretch rounded-full" style={{ background: scoreColor }} />
              <div className="flex-shrink-0 text-center">
                <p className="text-lg font-bold" style={{ color: scoreColor }}>{scan.scores?.global ?? '—'}</p>
                <p className="text-white/30 text-xs">score</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{extractDomain(scan.url)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/40 text-xs">{formatDate(scan.scanDate || scan.savedAt)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.text}</span>
                </div>
              </div>
              <button onClick={() => navigate(`/rapport/${scan.id}`)} className="text-primary text-xs hover:underline flex items-center gap-1">
                Rapport <ChevronRight size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page: Abonnement ──────────────────────────────────────────────────────────
function PageSubscription({ user, navigate }) {
  const isProtect = user?.plan === 'basic' || user?.plan === 'protect';
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-color rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/50 text-xs mb-1">Plan actuel</p>
            <p className="text-white font-bold text-2xl capitalize">{isProtect ? 'Protect Basic' : 'Gratuit'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isProtect ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/60'}`}>
            {isProtect ? 'Actif' : 'Free'}
          </span>
        </div>
        {isProtect ? (
          <p className="text-white/60 text-sm">Vous bénéficiez du monitoring continu, des alertes et des scans mensuels automatiques.</p>
        ) : (
          <p className="text-white/60 text-sm">Accès aux scans manuels. Passez à Protect Basic pour la surveillance automatique 24h/24.</p>
        )}
      </motion.div>

      {!isProtect && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-primary/10 border-2 border-primary/40 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">Recommandé</div>
          <h3 className="text-white font-bold text-xl mb-2">Webisafe Protect Basic</h3>
          <p className="text-primary font-bold text-3xl mb-4">15 000 <span className="text-sm font-normal text-white/60">FCFA/mois</span></p>
          <ul className="space-y-2 mb-6">
            {['Scan mensuel automatique', 'Monitoring uptime 24h/24', 'Alertes SSL proactives', 'Historique 6 mois', 'Badge "Sécurisé par Webisafe"'].map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-white/80 text-sm"><CheckCircle2 size={14} className="text-success flex-shrink-0" />{f}</li>
            ))}
          </ul>
          <button onClick={() => navigate('/protect')} className="relative overflow-hidden w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(21,102,240,0.4)]">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2.5s_infinite]" />
            <Shield size={16} className="relative" /> <span className="relative">Activer Webisafe Protect Basic</span> <ArrowRight size={16} className="relative" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: <LayoutDashboard size={18} /> },
  { id: 'reports', label: 'Rapports', icon: <FileText size={18} /> },
  { id: 'security', label: 'Sécurité', icon: <Shield size={18} /> },
  { id: 'performance', label: 'Performance', icon: <Zap size={18} /> },
  { id: 'history', label: 'Historique', icon: <History size={18} /> },
  { id: 'subscription', label: 'Mon Abonnement', icon: <CreditCard size={18} /> },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { scans, deleteScan, isPaid, markAsPaid } = useScans();
  const [validatedPremiumMap, setValidatedPremiumMap] = useState({});
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uptime, setUptime] = useState(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(() => shouldShowDashboardWelcome(location.state));

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, []);

  useEffect(() => {
    if (!shouldShowDashboardWelcome(location.state)) return;
    setShowWelcomePopup(true);
    navigate(location.pathname, { replace: true, state: { ...location.state, welcomeNewAccount: false } });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let active = true;
    async function sync() {
      if (!user?.email || scans.length === 0) { if (active) setValidatedPremiumMap({}); return; }
      try {
        const reqs = await fetchPaymentRequestsByEmail(user.email, 50);
        if (!active) return;
        const map = buildValidatedPremiumMap(scans, reqs || []);
        Object.keys(map).forEach(id => markAsPaid(id));
        setValidatedPremiumMap(map);
      } catch { if (active) setValidatedPremiumMap({}); }
    }
    sync();
    return () => { active = false; };
  }, [user?.email, scans, markAsPaid]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/uptime/${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.success) setUptime(data); })
      .catch(() => {});
  }, [user?.id]);

  const PAGE_TITLES = { overview: 'Vue d\'ensemble', reports: 'Rapports', security: 'Sécurité', performance: 'Performance', history: 'Historique', subscription: 'Mon Abonnement' };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connexion requise</h2>
          <p className="text-white/60 mb-6">Connectez-vous pour accéder à votre tableau de bord.</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  const lastScan = scans[0];

  return (
    <div className="flex min-h-screen bg-dark-navy">
      {/* Welcome popup */}
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-primary/30 bg-slate-950/95 p-7 shadow-[0_30px_120px_rgba(2,6,23,0.72)]">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"><PartyPopper size={26} /></div>
              <h2 className="text-2xl font-black text-white mb-3">Votre compte Webisafe est bien créé</h2>
              <p className="text-slate-300 text-sm mb-4">Tout est prêt. Lancez votre premier scan gratuit depuis le tableau de bord.</p>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 mb-6">
                <Sparkles size={18} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-sm">Votre premier audit vous donnera un aperçu complet : performance, sécurité, SEO et UX mobile.</p>
              </div>
              <button onClick={() => setShowWelcomePopup(false)} className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white btn-glow hover:bg-primary-hover">
                <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
                <span className="relative">Compris</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#0A0F1E] border-r border-border-color flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-5 border-b border-border-color">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-sm">W</div>
            <span className="text-white font-bold">Webi<span className="text-primary">safe</span></span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${activePage === item.id ? 'bg-primary/20 text-primary font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              {item.icon} {item.label}
            </button>
          ))}
          <hr className="border-border-color my-3" />
          <button onClick={() => navigate('/protect')} className="relative overflow-hidden w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white bg-primary hover:bg-primary-hover transition font-semibold shadow-[0_0_18px_rgba(21,102,240,0.4)]">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2.5s_infinite]" />
            <ArrowUpCircle size={18} className="relative" /> <span className="relative">Activer Webisafe Protect</span>
          </button>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border-color">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => { window.location.href = '/'; }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition text-white text-sm font-semibold mb-2">
            <LogOut size={14} /> ← Retour à l'accueil
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#0A0F1E]/90 backdrop-blur-xl border-b border-border-color px-4 lg:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{PAGE_TITLES[activePage]}</p>
          </div>
          {lastScan && uptime && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium" style={{ borderColor: uptime.status === 'up' ? '#22C55E40' : '#EF444440', color: uptime.status === 'up' ? '#22C55E' : '#EF4444' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: uptime.status === 'up' ? '#22C55E' : '#EF4444' }} />
              {uptime.status === 'up' ? 'En ligne' : 'Hors ligne'}
            </div>
          )}
          {lastScan && (
            <div className="flex items-center gap-2 text-white/40 text-xs hidden sm:flex">
              <Globe size={12} />
              <span className="truncate max-w-[180px]">{extractDomain(lastScan.url)}</span>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activePage === 'overview' && <PageOverview user={user} scans={scans} isPaid={isPaid} validatedPremiumMap={validatedPremiumMap} navigate={navigate} uptime={uptime} />}
              {activePage === 'reports' && <PageReports scans={scans} isPaid={isPaid} validatedPremiumMap={validatedPremiumMap} navigate={navigate} />}
              {activePage === 'security' && <PageSecurity scans={scans} />}
              {activePage === 'performance' && <PagePerformance scans={scans} />}
              {activePage === 'history' && <PageHistory scans={scans} navigate={navigate} />}
              {activePage === 'subscription' && <PageSubscription user={user} navigate={navigate} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
