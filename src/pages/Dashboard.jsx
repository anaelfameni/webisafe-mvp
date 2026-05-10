import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Globe, FileText, Shield, Zap, Search, History,
  CreditCard, ArrowUpCircle, LogOut, User, Bell, Menu, X,
  ArrowRight, BarChart3, CheckCircle2, ExternalLink, Plus, Trash2,
  Download, TrendingUp, TrendingDown, AlertTriangle, Activity,
  Sparkles, PartyPopper, Handshake, Users, ChevronRight, Wrench,
  Settings, KeyRound,
} from 'lucide-react';
import { useScans } from '../hooks/useScans';
import { useAuth } from '../hooks/useAuth';
import { getScoreBadge, getScoreColor } from '../utils/calculateScore';
import { formatDate, extractDomain } from '../utils/validators';
import { fetchLatestPaymentRequest } from '../utils/paymentApi';
import { buildValidatedPremiumMap } from '../utils/premiumAccess';
import { supabase } from '../lib/supabaseClient';
import { shouldShowDashboardWelcome } from '../utils/dashboardWelcome';
import { getDashboardAccessState } from '../utils/agencyAccess';
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
  const siteLabel = lastScan ? extractDomain(lastScan.url) : 'Aucun site suivi';
  const userFirstName = (user?.name || user?.email || 'Client').split(' ')[0];
  const priorityAction = activeAlerts[0]?.title || (lastScan ? 'Relancer un scan après vos prochaines corrections.' : 'Lancer votre premier audit gratuit.');
  const actionSteps = [
    { label: '1. Scanner', title: lastScan ? 'Dernier audit disponible' : 'Premier scan à lancer', text: lastScan ? `${siteLabel} analysé le ${formatDate(lastScan.scanDate || lastScan.savedAt)}.` : 'Analysez votre domaine pour obtenir vos scores sécurité, performance, SEO et UX.' },
    { label: '2. Comprendre', title: score != null ? `Score actuel ${score}/100` : 'Score à découvrir', text: activeAlerts.length > 0 ? `${activeAlerts.length} alerte(s) prioritaire(s) à traiter.` : 'Consultez les recommandations et points forts de votre site.' },
    { label: '3. Corriger', title: 'Passer à l’action', text: priorityAction },
  ];

  return (
    <div className="space-y-8">
      {mostRecentValidated && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-r from-success/20 via-primary/10 to-success/10 border border-success/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
          <CheckCircle2 size={28} className="text-success flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white font-bold text-base">Votre rapport premium est prêt</p>
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

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-primary/25 bg-gradient-to-br from-primary/22 via-slate-950/80 to-emerald-400/14 p-7 shadow-[0_30px_120px_rgba(2,6,23,0.32)]">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
              <User size={14} /> Mon espace personnel
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-white lg:text-5xl">Bonjour {userFirstName}, pilotez la santé de votre site sans jargon technique.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">Votre tableau de bord client transforme chaque scan en score, priorités et actions concrètes pour sécuriser, accélérer et améliorer votre présence web.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-[0_0_26px_rgba(21,102,240,0.35)] transition hover:bg-primary-hover">
                <Plus size={16} /> Nouveau scan
              </Link>
              {lastScan && (
                <button onClick={() => navigate(`/rapport/${lastScan.id}`)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/7 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  <FileText size={16} /> Ouvrir mon dernier rapport
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-white/[0.055] p-6">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/38">Score personnel</p>
              <h2 className="mt-2 text-2xl font-black text-white">{siteLabel}</h2>
              <p className="mt-2 text-sm text-white/50">{lastScan ? formatDate(lastScan.scanDate || lastScan.savedAt) : 'Aucun scan lancé'}</p>
            </div>
            {score != null ? <ScoreArc score={score} size={160} /> : <div className="flex h-28 w-36 items-center justify-center rounded-3xl border border-dashed border-white/15 text-sm text-white/35">Aucun score</div>}
          </div>
          {evolution != null && (
            <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${evolution >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {evolution >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {evolution >= 0 ? '+' : ''}{evolution} pts depuis le scan précédent
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs text-white/40">Rapports premium</p>
              <p className="mt-1 text-2xl font-black text-white">{validatedScans.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs text-white/40">Scans réalisés</p>
              <p className="mt-1 text-2xl font-black text-white">{scans.length}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sécurité" value={lastScan?.scores?.security != null ? `${lastScan.scores.security}/100` : null} icon={<Shield size={16} />} color="#EF4444" />
        <KpiCard label="Performance" value={lastScan?.scores?.performance != null ? `${lastScan.scores.performance}/100` : null} icon={<Zap size={16} />} color="#3B82F6" />
        <KpiCard label="SEO" value={lastScan?.scores?.seo != null ? `${lastScan.scores.seo}/100` : null} icon={<Search size={16} />} color="#22C55E" />
        <KpiCard label="UX Mobile" value={(lastScan?.scores?.ux_mobile ?? lastScan?.scores?.ux) != null ? `${lastScan.scores.ux_mobile ?? lastScan.scores.ux}/100` : null} icon={<Activity size={16} />} color="#A78BFA" />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200"><CheckCircle2 size={20} /></div>
            <div>
              <h2 className="text-xl font-black text-white">Plan d’action client</h2>
              <p className="text-sm text-white/45">Trois étapes simples pour avancer.</p>
            </div>
          </div>
          <div className="space-y-3">
            {actionSteps.map((step) => (
              <div key={step.label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{step.label}</span>
                <p className="mt-2 font-black text-white">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-white/50">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">État de votre site</h2>
              <p className="mt-1 text-sm text-white/45">Alertes, disponibilité et priorités visibles.</p>
            </div>
            {uptime && (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${uptime.status === 'up' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: uptime.status === 'up' ? '#22C55E' : '#EF4444' }} />
                {uptime.status === 'up' ? 'En ligne' : 'Hors ligne'}
              </span>
            )}
          </div>
          {activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.slice(0, 3).map((a, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${a.severity === 'critical' ? 'border-danger/30 bg-danger/10' : 'border-warning/30 bg-warning/10'}`}>
                  <AlertTriangle size={18} className={a.severity === 'critical' ? 'text-danger' : 'text-warning'} />
                  <div>
                    <p className="font-bold text-white">{a.title}</p>
                    {a.message && <p className="mt-1 text-sm text-white/50">{a.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : lastScan ? (
            <div className="rounded-2xl border border-success/25 bg-success/10 p-4">
              <p className="flex items-center gap-2 font-bold text-success"><CheckCircle2 size={18} /> Aucune alerte critique active</p>
              <p className="mt-2 text-sm leading-6 text-white/50">Continuez à suivre vos scores après chaque correction ou mise à jour du site.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/45 p-6 text-center">
              <p className="font-bold text-white">Aucun site analysé</p>
              <p className="mt-2 text-sm text-white/45">Lancez votre premier scan pour afficher vos alertes ici.</p>
            </div>
          )}
          {uptime && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs text-white/40">Uptime 30j</p>
                <p className="mt-1 text-xl font-black text-white">{uptime.uptime_ratio != null ? `${uptime.uptime_ratio.toFixed(1)}%` : '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs text-white/40">Temps réponse</p>
                <p className="mt-1 text-xl font-black text-white">{uptime.response_time != null ? `${uptime.response_time}ms` : '—'}</p>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {historyData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><TrendingUp size={18} className="text-primary" /> Progression de votre site</h3>
          <ScoreEvolutionChart history={historyData} onPointClick={d => { if (d?.id) navigate(`/rapport/${d.id}`); }} />
        </motion.div>
      )}

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
              {isPaid(lastScan.id) && (
                <button onClick={() => navigate(`/corrections?url=${encodeURIComponent(lastScan.url || '')}`)} className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success border border-success/30 rounded-xl text-sm font-semibold transition hover:bg-success/20">
                  <Wrench size={14} /> Corriger mon site
                </button>
              )}
              <button onClick={() => navigate(isPaid(lastScan.id) ? `/rapport/${lastScan.id}` : `/analyse?url=${encodeURIComponent(lastScan.url)}`)} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-sm transition hover:bg-white/20">
                <ExternalLink size={14} /> Voir en ligne
              </button>
            </div>
          </div>
          {(lastScan.critical_alerts ?? []).slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/60 mb-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  a.severity === 'critical' ? 'bg-danger' : 'bg-warning'
                }`}
                aria-hidden="true"
              />
              {a.title}
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
                    {paid && <button onClick={() => navigate(`/corrections?url=${encodeURIComponent(scan.url || '')}`)} className="p-2 text-white/40 hover:text-success rounded-lg hover:bg-success/10 transition" title="Corriger ce site"><Wrench size={14} /></button>}
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
          <p className="text-white/50 text-sm mt-1">{secScore >= 80 ? 'Bonne protection' : secScore >= 55 ? 'Protection partielle' : 'Site vulnérable'}</p>
        </div>
      </motion.div>

      {groups.map(group => (
        <motion.div key={group} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border-color rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">{group}</h3>
          <div className="space-y-2">
            {checks.filter(c => c.group === group).map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border-color/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      c.ok === true ? 'bg-success' : c.ok === false ? 'bg-danger' : 'bg-warning'
                    }`}
                    aria-hidden="true"
                  />
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
  const ratingColor = r => r === 'good' ? '#22C55E' : r === 'needs_improvement' ? '#EAB308' : r === 'poor' ? '#EF4444' : '#94A3B8';
  const ratingLabel = r => r === 'good' ? 'Bon' : r === 'needs_improvement' ? 'À améliorer' : r === 'poor' ? 'Critique' : 'Non mesuré';

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
              {perf.poids_page_mb > 3 ? 'Trop lourd' : perf.poids_page_mb > 2 ? 'À optimiser' : 'Acceptable'}
            </p>
          </div>
        )}
        {perf.nb_requetes != null && (
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-white/50 text-xs mb-1">Requêtes HTTP</p>
            <p className="text-xl font-bold text-white">{perf.nb_requetes}</p>
            <p className={`text-xs mt-1 ${perf.nb_requetes > 100 ? 'text-danger' : perf.nb_requetes > 60 ? 'text-warning' : 'text-success'}`}>
              {perf.nb_requetes > 100 ? 'Trop de requêtes' : 'Acceptable'}
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

// ── Page: Paramètres ──────────────────────────────────────────────────────────
function PageSettings({ user }) {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function getPasswordStrength(pw) {
    if (!pw || pw.length < 8) return { level: 0, label: 'Trop court (8 min)', color: 'bg-red-500' };
    let score = 0;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: 'Faible', color: 'bg-red-500' },
      { label: 'Moyen', color: 'bg-orange-500' },
      { label: 'Bon', color: 'bg-yellow-400' },
      { label: 'Fort', color: 'bg-green-500' },
    ];
    return { level: score, label: levels[score - 1]?.label || 'Faible', color: levels[score - 1]?.color || 'bg-red-500' };
  }

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(result.error || 'Erreur lors du changement de mot de passe.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-lg">
      <div className="bg-card-bg border border-border-color rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <KeyRound size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Sécurité du compte</h3>
            <p className="text-white/50 text-xs">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-text-secondary text-sm mb-1 block">Ancien mot de passe</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-1 block">Nouveau mot de passe</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} transition-all duration-300`} style={{ width: `${(passwordStrength.level / 4) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-text-secondary">{passwordStrength.label}</span>
                </div>
                <p className="text-[10px] text-text-secondary/70 mt-1">8 caractères minimum, avec majuscule, minuscule et chiffre.</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-1 block">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-10 pr-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-danger text-sm text-center bg-danger/10 rounded-lg p-2">
              {error}
            </motion.p>
          )}

          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-success text-sm bg-success/10 rounded-lg p-2">
              <CheckCircle2 size={16} /> Mot de passe mis à jour avec succès.
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </motion.div>
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
  { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user, authLoading = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { scans, deleteScan, isPaid, markAsPaid } = useScans();
  const [validatedPremiumMap, setValidatedPremiumMap] = useState({});
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uptime, setUptime] = useState(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(() => shouldShowDashboardWelcome(location.state));
  const accessState = getDashboardAccessState(user, 'client', { loading: authLoading });

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, []);

  useEffect(() => {
    if (accessState.status === 'redirect') navigate(accessState.redirectTo, { replace: true });
  }, [accessState.redirectTo, accessState.status, navigate]);

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
        const reqs = (await Promise.all(
          scans.slice(0, 50).map((scan) => fetchLatestPaymentRequest(scan.id).catch(() => null))
        )).filter(Boolean);
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
    supabase.auth.getSession()
      .then(({ data }) => fetch(`/api/uptime/${user.id}`, {
        headers: data?.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {},
      }))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.success) setUptime(data); })
      .catch(() => {});
  }, [user?.id]);

  const PAGE_TITLES = { overview: 'Vue d\'ensemble', reports: 'Rapports', security: 'Sécurité', performance: 'Performance', history: 'Historique', subscription: 'Mon Abonnement', settings: 'Paramètres' };

  if (accessState.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Chargement sécurisé de votre espace...</p>
        </div>
      </div>
    );
  }

  if (accessState.status === 'unauthenticated') {
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

  if (accessState.status === 'redirect') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Redirection vers votre espace dédié...</p>
        </div>
      </div>
    );
  }

  const lastScan = scans[0];

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(21,102,240,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.14),transparent_30%),#07111F]">
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
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#08111F]/96 border-r border-primary/20 flex flex-col z-40 transition-transform duration-300 shadow-[18px_0_80px_rgba(2,6,23,0.28)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-5 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-emerald-400 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-[0_0_28px_rgba(21,102,240,0.35)]">W</div>
            <div>
              <span className="block text-white font-bold leading-tight">Webi<span className="text-primary">safe</span></span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">Client space</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${activePage === item.id ? 'bg-primary/18 text-blue-100 font-semibold ring-1 ring-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
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
        <div className="p-4 border-t border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => { navigate('/'); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition text-white text-sm font-semibold mb-2">
            <LogOut size={14} /> ← Retour à l'accueil
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#07111F]/82 backdrop-blur-xl border-b border-primary/15 px-4 lg:px-8 h-16 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Espace client personnel</p>
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
              {activePage === 'settings' && <PageSettings user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
