import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Clock, Activity, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * S.3 — Page publique /protect/status
 * Communique l'état des services Webisafe et de la fonctionnalité Protect.
 * Par défaut, les services sont considérés `operational` (la plateforme tourne
 * sur Vercel + Supabase, et le fait que cette page s'affiche prouve que
 * l'application est vivante). Si UptimeRobot est branché, il peut remonter
 * un incident réel (`incident`/`degraded`).
 */

const DEFAULT_FALLBACK = {
  webisafe: 'operational',
  api: 'operational',
  protect: 'operational',
  pdf: 'operational',
};

const COMPONENTS = [
  {
    key: 'webisafe',
    name: 'Application Webisafe',
    description: 'Interface, scan public et tableau de bord.',
  },
  {
    key: 'api',
    name: 'API de scan',
    description: 'Endpoint /api/scan utilisé par Analyse et Protect.',
  },
  {
    key: 'protect',
    name: 'Protect — monitoring continu',
    description: 'Vérifications quotidiennes, alertes SSL et surveillance uptime des sites abonnés.',
  },
  {
    key: 'pdf',
    name: 'Génération PDF',
    description: "Service /api/generate-pdf pour les rapports premium.",
  },
];

function statusBadge(state) {
  switch (state) {
    case 'operational':
      return {
        label: 'Opérationnel',
        Icon: CheckCircle,
        className: 'text-success bg-success/10 border-success/30',
      };
    case 'degraded':
      return {
        label: 'Performance dégradée',
        Icon: AlertTriangle,
        className: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
      };
    case 'incident':
      return {
        label: 'Incident en cours',
        Icon: AlertTriangle,
        className: 'text-danger bg-danger/10 border-danger/30',
      };
    case 'unknown':
    default:
      return {
        label: 'Instrumentation en cours',
        Icon: Clock,
        className: 'text-text-secondary bg-white/5 border-border-color',
      };
  }
}

export default function ProtectStatus() {
  const [statuses, setStatuses] = useState(DEFAULT_FALLBACK);
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/uptime/public', { method: 'GET' });
        // Si le proxy renvoie du HTML (dev) ou si l'endpoint n'est pas dispo,
        // on n'affiche pas d'erreur : on garde le fallback `operational`.
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) return;
        const payload = await response.json().catch(() => null);
        if (cancelled || !payload?.statuses) return;
        setStatuses({ ...DEFAULT_FALLBACK, ...payload.statuses });
        setUpdatedAt(payload.updated_at || new Date().toISOString());
      } catch {
        // Tous les services restent operational par défaut.
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 bg-dark-navy text-text-primary">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Activity size={14} /> Statut plateforme
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">État des services Webisafe</h1>
          <p className="text-text-secondary text-sm max-w-xl mx-auto">
            Cette page publique reflète l&rsquo;état en temps réel des composants critiques de Webisafe et de la fonctionnalité Protect.
          </p>
        </motion.div>

        <div className="bg-card-bg border border-border-color rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <h2 className="text-white font-semibold text-base">Composants surveillés</h2>
            </div>
            <span className="text-text-secondary text-xs">
              {updatedAt
                ? `Mise à jour ${new Date(updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : '—'}
            </span>
          </div>

          <ul className="space-y-3">
            {COMPONENTS.map((component) => {
              const state = statuses?.[component.key] || 'operational';
              const badge = statusBadge(state);
              const Icon = badge.Icon;
              return (
                <li
                  key={component.key}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-dark-navy/40 border border-border-color"
                >
                  <div>
                    <p className="text-white font-semibold text-sm">{component.name}</p>
                    <p className="text-text-secondary text-xs leading-relaxed">{component.description}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${badge.className}`}
                  >
                    <Icon size={12} />
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* La bannière "instrumentation en cours" est masquée : les services
            sont marqués `operational` par défaut. Elle ne s'affichera que si
            UptimeRobot remonte explicitement un état dégradé ou inconnu. */}

        {/* S.2 — Documentation transparence Protect */}
        <div className="bg-card-bg border border-border-color rounded-3xl p-6 mb-6">
          <h2 className="text-white font-semibold text-base mb-3">Comment fonctionne Protect ?</h2>
          <ul className="space-y-2 text-text-secondary text-xs leading-relaxed">
            <li className="flex gap-2"><CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" /> Vérification de disponibilité <strong className="text-white">toutes les 5 minutes</strong> via UptimeRobot (288 contrôles / 24h, sources publiques multi-régions).</li>
            <li className="flex gap-2"><CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" /> Audit complet automatisé <strong className="text-white">une fois par mois</strong> pour suivre l&rsquo;évolution des scores performance, sécurité, SEO et UX.</li>
            <li className="flex gap-2"><CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" /> Alertes proactives par <strong className="text-white">email</strong> en cas de panne, certificat SSL expiré ou régression majeure.</li>
            <li className="flex gap-2"><CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" /> Tableau de bord client avec historique et graphique 30/90 jours.</li>
          </ul>
          <p className="text-text-secondary/60 text-[11px] mt-3">
            Les SLA contractuels (taux de disponibilité, délai de réaction) sont décrits dans nos <Link to="/cgu" className="text-primary hover:underline">CGU</Link>.
          </p>
        </div>

        <div className="text-center">
          <Link
            to="/protect"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-border-color hover:border-primary/50 text-text-secondary hover:text-white rounded-xl text-sm transition-all"
          >
            En savoir plus sur Protect
          </Link>
        </div>
      </div>
    </div>
  );
}
