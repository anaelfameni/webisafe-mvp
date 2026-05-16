import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lock, AlertTriangle, Loader2, ShieldCheck, Globe, Clock,
  ExternalLink, ArrowLeft, FileText, Eye, Calendar, BarChart3,
  Shield, Zap, Search, Smartphone,
} from 'lucide-react';
import ScoreCircle from '../components/ScoreCircle';
import { extractDomain, formatDate } from '../utils/validators';
import { getScoreBadge } from '../utils/calculateScore';

/**
 * R.2 — Page publique de consultation d'un rapport partagé.
 *
 * URL : /share/:token (optionnellement avec ?p=password pour les liens protégés).
 *
 * Sécurité :
 * - Aucun cookie/session requis : le token suffit (vérifié côté serveur)
 * - Aucun lien vers /dashboard, /admin, /agence (vue lecture seule isolée)
 * - Le rapport ne révèle pas l'email exact du propriétaire (truncated `abc***`)
 */

export default function SharedReport() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);

  const fetchReport = useCallback(async (pwd = null) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/share', window.location.origin);
      url.searchParams.set('token', token);
      if (pwd) url.searchParams.set('password', pwd);

      const res = await fetch(url.toString());
      const payload = await res.json();

      if (res.status === 401 && payload?.password_required) {
        setNeedsPassword(true);
        if (pwd) setError('Mot de passe incorrect');
        return;
      }

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Erreur lors du chargement');
      }

      setData(payload);
      setNeedsPassword(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchReport(null);
  }, [token, fetchReport]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-white/60">Chargement du rapport partagé...</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0B1727] p-8 shadow-[0_30px_120px_rgba(2,6,23,0.5)]"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Lock size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Rapport protégé</h1>
              <p className="text-xs text-white/50">Saisissez le mot de passe pour consulter le rapport</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchReport(password);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
            />
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!password}
              className="w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              Accéder au rapport
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <div className="max-w-md rounded-3xl border border-danger/20 bg-danger/5 p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-danger" />
          <h1 className="mb-2 text-lg font-black text-white">Lien indisponible</h1>
          <p className="mb-5 text-sm text-white/60">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const scan = data?.scan || {};
  const share = data?.share || {};
  const scores = scan.scores || {};
  const recommendations = Array.isArray(scan.recommendations) ? scan.recommendations : [];
  const globalScore = scores.global ?? 0;
  const badge = getScoreBadge(globalScore);
  const expiresOn = share.expires_at
    ? new Date(share.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(21,102,240,0.12),transparent_30%),#07111F] py-12 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Header partage */}
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" size={24} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary/80">Rapport partagé</p>
              <p className="text-sm text-white">
                <Globe size={12} className="mr-1 inline" /> {extractDomain(scan.url)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
            {expiresOn && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} /> Expire le {expiresOn}
              </span>
            )}
            {share.views_count != null && (
              <span className="flex items-center gap-1.5">
                <Eye size={12} /> {share.views_count} vue{share.views_count > 1 ? 's' : ''}
              </span>
            )}
            {scan.scanned_at && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Scan du {formatDate(scan.scanned_at)}
              </span>
            )}
          </div>
        </div>

        {/* Score global */}
        <div className="mb-8 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-7 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center">
            <ScoreCircle score={globalScore} size={180} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Score global</p>
            <h1 className="mt-1 text-3xl font-black text-white">
              {globalScore}/100 <span className={`ml-2 text-sm ${badge.color}`}>{badge.text}</span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Audit complet réalisé par <strong className="text-white">Webisafe</strong> :
              performance, sécurité, SEO et UX mobile. Ce rapport partagé reflète l'état du site
              au moment du scan.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SubScoreCard label="Sécurité" value={scores.security} icon={<Shield size={14} />} color="#EF4444" />
              <SubScoreCard label="Performance" value={scores.performance} icon={<Zap size={14} />} color="#3B82F6" />
              <SubScoreCard label="SEO" value={scores.seo} icon={<Search size={14} />} color="#22C55E" />
              <SubScoreCard
                label="UX Mobile"
                value={scores.ux_mobile ?? scores.ux}
                icon={<Smartphone size={14} />}
                color="#A78BFA"
              />
            </div>
          </div>
        </div>

        {/* Recommandations */}
        {recommendations.length > 0 && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-white">
              <FileText size={20} className="text-primary" /> Recommandations prioritaires
            </h2>
            <div className="space-y-3">
              {recommendations.slice(0, 8).map((rec, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {rec.priority && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          rec.priority === 'critical' || rec.priority === 'high'
                            ? 'bg-danger/15 text-danger'
                            : rec.priority === 'medium'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-success/15 text-success'
                        }`}
                      >
                        {rec.priority}
                      </span>
                    )}
                    {rec.category && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                        {rec.category}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-white">{rec.title || rec.titre}</p>
                  {(rec.description || rec.message) && (
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      {rec.description || rec.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {recommendations.length > 8 && (
              <p className="mt-4 text-xs text-white/40">
                + {recommendations.length - 8} autres recommandations dans le rapport complet
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/60">
            Ce rapport a été généré et partagé via{' '}
            <Link to="/" className="font-bold text-primary hover:underline">
              Webisafe
            </Link>
            , la plateforme d'audit web automatisée pour PME africaines.
          </p>
          <Link
            to="/"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            <BarChart3 size={14} /> Lancer mon propre audit gratuit <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SubScoreCard({ label, value, icon, color }) {
  if (value == null) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <p className="text-xl font-black text-white">
        {value}
        <span className="text-sm text-white/40">/100</span>
      </p>
    </div>
  );
}
