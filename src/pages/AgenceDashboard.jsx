import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Home,
  Link2,
  Lock,
  Mail,
  Menu,
  Palette,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import ToastMessage from '../components/ToastMessage';
import { useScans } from '../hooks/useScans';
import { getDashboardAccessState } from '../utils/agencyAccess';
import { loadAgencySettings, normalizeAgencySettings, saveAgencySettings } from '../utils/agencySettings';
import { supabase } from '../lib/supabaseClient';
import { extractDomain } from '../utils/validators';

const AGENCY_NAV = [
  { id: 'overview', label: 'Vue d’ensemble', icon: <BarChart3 size={18} /> },
  { id: 'clients', label: 'Clients', icon: <Users size={18} /> },
  { id: 'audits', label: 'Audits', icon: <Activity size={18} /> },
  { id: 'reports', label: 'Rapports', icon: <FileText size={18} /> },
  { id: 'widget', label: 'Widget', icon: <Code2 size={18} /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> },
];

function getScanScore(scan, key) {
  const value = scan?.scores?.[key] ?? scan?.results_json?.scores?.[key] ?? scan?.data?.scores?.[key] ?? scan?.[`${key}_score`];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function averageScore(scans, key) {
  const values = scans.map((scan) => getScanScore(scan, key)).filter((value) => value !== null);
  if (values.length === 0) return '—';
  return `${Math.round(values.reduce((total, value) => total + value, 0) / values.length)}/100`;
}

function formatDateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildClientRows(scans) {
  const rows = new Map();
  scans.forEach((scan) => {
    const domain = extractDomain(scan.url) || 'Client sans domaine';
    const current = rows.get(domain) || {
      domain,
      audits: 0,
      reports: 0,
      seoScores: [],
      securityScores: [],
      lastScanAt: null,
      latestScan: scan,
    };
    const seo = getScanScore(scan, 'seo');
    const security = getScanScore(scan, 'security');
    current.audits += 1;
    current.reports += scan.paid || scan.report_url || scan.results_json ? 1 : 0;
    if (seo !== null) current.seoScores.push(seo);
    if (security !== null) current.securityScores.push(security);
    const scanDate = scan.created_at || scan.createdAt || scan.date;
    if (!current.lastScanAt || (scanDate && new Date(scanDate) > new Date(current.lastScanAt))) {
      current.lastScanAt = scanDate;
      current.latestScan = scan;
    }
    rows.set(domain, current);
  });

  return Array.from(rows.values()).map((row) => ({
    ...row,
    seoAverage: row.seoScores.length ? Math.round(row.seoScores.reduce((total, value) => total + value, 0) / row.seoScores.length) : null,
    securityAverage: row.securityScores.length ? Math.round(row.securityScores.reduce((total, value) => total + value, 0) / row.securityScores.length) : null,
  }));
}

function StatCard({ icon, label, value, hint, tone = 'blue' }) {
  const tones = {
    blue: 'border-primary/25 bg-primary/10 text-primary',
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
  };
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_80px_rgba(2,6,23,0.22)]">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border ${tones[tone] || tones.blue}`}>{icon}</div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/45">{hint}</p>
    </article>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-primary"
      />
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-left">
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-white/45">{description}</span>
      </span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-primary' : 'bg-white/15'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.03] p-8 text-center">
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/50">{text}</p>
    </div>
  );
}

export default function AgenceDashboard({ user, authLoading = false }) {
  const navigate = useNavigate();
  const { scans } = useScans();
  const [settings, setSettings] = useState(() => normalizeAgencySettings());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accessState = getDashboardAccessState(user, 'agency', { loading: authLoading });
  const isAllowed = accessState.status === 'allowed';

  const agencyScans = useMemo(() => {
    if (!user) return [];
    return scans.filter((scan) => scan.user_email === user.email || scan.email === user.email || scan.user_id === user.id);
  }, [scans, user]);

  const clients = useMemo(() => buildClientRows(agencyScans), [agencyScans]);
  const paidScans = agencyScans.filter((scan) => scan.paid || scan.report_url || scan.results_json);
  const recentAudits = agencyScans.slice(0, 8);
  const recentReports = (paidScans.length ? paidScans : agencyScans).slice(0, 8);
  const widgetCode = `<iframe src="https://webisafe.app/analyse?agency=${encodeURIComponent(settings.agency_name)}" width="100%" height="640" loading="lazy"></iframe>`;

  useEffect(() => {
    if (!user) return;
    supabase.auth.getSession()
      .then(({ data }) => loadAgencySettings(user, { token: data?.session?.access_token }))
      .then(setSettings)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), toast.duration ?? 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (accessState.status === 'redirect') navigate(accessState.redirectTo, { replace: true });
  }, [accessState.redirectTo, accessState.status, navigate]);

  const updateSetting = (field, value) => {
    setSettings((current) => normalizeAgencySettings({ ...current, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const saved = await saveAgencySettings(user, settings, { token: data?.session?.access_token });
      setSettings(saved);
      setToast({ type: 'success', message: 'Paramètres agence enregistrés.' });
    } catch {
      setToast({ type: 'error', message: 'Enregistrement impossible pour le moment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWidget = async () => {
    try {
      await navigator.clipboard.writeText(widgetCode);
      setToast({ type: 'success', message: 'Code widget copié.' });
    } catch {
      setToast({ type: 'error', message: 'Copie impossible.' });
    }
  };

  if (accessState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050A16] px-4">
        <div className="max-w-md rounded-3xl border border-cyan-300/20 bg-white/[0.045] p-8 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-cyan-100/70">Vérification de votre espace agence...</p>
        </div>
      </div>
    );
  }

  if (accessState.status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050A16] px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-8 text-center">
          <Lock className="mx-auto text-primary" size={42} />
          <h1 className="mt-4 text-2xl font-black text-white">Connexion agence requise</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">Connectez-vous avec un compte agence pour accéder à cette console B2B.</p>
          <button onClick={() => navigate('/')} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050A16] px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-white/60">Redirection vers votre dashboard...</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-7">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-cyan-300/25 bg-gradient-to-br from-cyan-300/18 via-slate-950/78 to-violet-500/18 p-8 shadow-[0_30px_120px_rgba(8,47,73,0.28)]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <Building2 size={14} /> Cockpit agence B2B
            </span>
            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-white lg:text-5xl">Gérez votre portefeuille client, vos audits et vos livrables marque blanche depuis un vrai studio d’agence.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">Une vue conçue pour vendre, suivre et livrer : pipeline clients, rapports prêts, widget prospect et branding PDF agence.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setActivePage('clients')} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)]">Voir le portefeuille</button>
              <button onClick={() => setActivePage('widget')} className="rounded-2xl border border-white/15 bg-white/7 px-5 py-3 text-sm font-bold text-white">Installer le widget</button>
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-white/[0.055] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/45">Pipeline agence</p>
              <h2 className="mt-2 text-2xl font-black text-white">{settings.agency_name}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/10 text-violet-200"><TrendingUp size={22} /></div>
          </div>
          <div className="space-y-3">
            {[
              ['Prospection widget', settings.widget_enabled ? 'Actif' : 'À activer', settings.widget_enabled ? 'text-emerald-300' : 'text-amber-300'],
              ['Audits clients', `${agencyScans.length} dossier(s)`, 'text-cyan-100'],
              ['Rapports livrables', `${paidScans.length || agencyScans.length} prêt(s)`, 'text-violet-200'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                <span className="text-sm text-white/58">{label}</span>
                <span className={`text-sm font-black ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="flex items-center gap-2 font-black text-emerald-300"><ShieldCheck size={16} /> Webisafe Verified actif</p>
            <p className="mt-2 text-sm leading-6 text-white/52">Positionnez vos rapports comme des livrables premium prêts à présenter au client.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Users size={20} />} label="Portefeuille" value={clients.length} hint="Domaines clients suivis par votre agence." tone="blue" />
        <StatCard icon={<Activity size={20} />} label="Production" value={agencyScans.length} hint="Audits liés au compte agence." tone="emerald" />
        <StatCard icon={<FileText size={20} />} label="Livrables" value={paidScans.length || agencyScans.length} hint="Rapports premium disponibles ou prêts." tone="violet" />
        <StatCard icon={<BarChart3 size={20} />} label="SEO moyen" value={averageScore(agencyScans, 'seo')} hint="Moyenne des scores SEO clients." tone="amber" />
        <StatCard icon={<ShieldCheck size={20} />} label="Sécurité moyenne" value={averageScore(agencyScans, 'security')} hint="Moyenne des scores sécurité clients." tone="emerald" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-cyan-300/15 bg-white/[0.045] p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white">Portefeuille client prioritaire</h2>
              <p className="mt-1 text-sm text-white/45">Vue agence orientée comptes, volumes et scores moyens.</p>
            </div>
            <button onClick={() => setActivePage('clients')} className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">Tous les clients</button>
          </div>
          {clients.length === 0 ? <EmptyState title="Aucun client pour l’instant" text="Les sites audités par le compte agence apparaîtront ici avec leurs scores moyens." /> : (
            <div className="space-y-3">
              {clients.slice(0, 5).map((client, index) => (
                <div key={client.domain} className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-lg font-black text-cyan-100">{index + 1}</div>
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{client.domain}</p>
                    <p className="mt-1 text-xs text-white/42">{client.audits} audit(s) · {client.reports} rapport(s) · dernier audit {formatDateLabel(client.lastScanAt)}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{ width: `${Math.min(Number(client.seoAverage ?? 0) || 35, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/55">
                    <p className="font-black text-cyan-100">SEO {client.seoAverage ?? '—'}</p>
                    <p className="mt-1 font-black text-emerald-300">Sec {client.securityAverage ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-violet-300/15 bg-white/[0.045] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/10 text-violet-200"><FileText size={20} /></div>
              <div>
                <h2 className="text-xl font-black text-white">Centre de livraison</h2>
                <p className="text-sm text-white/45">Rapports récents à ouvrir ou remettre au client.</p>
              </div>
            </div>
            {recentReports.length === 0 ? <EmptyState title="Aucun rapport généré" text="Les rapports premium apparaîtront ici dès que des audits seront disponibles." /> : (
              <div className="space-y-3">
                {recentReports.slice(0, 4).map((scan) => (
                  <button key={scan.id || scan.url} onClick={() => scan.id && navigate(`/rapport/${encodeURIComponent(scan.id)}`, { state: { agencyBypass: true, agencyScan: scan } })} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left transition hover:border-violet-300/25">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{extractDomain(scan.url) || scan.url}</p>
                      <p className="text-xs text-white/40">{formatDateLabel(scan.created_at || scan.createdAt || scan.date)}</p>
                    </div>
                    <ExternalLink size={16} className="text-violet-200" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-cyan-300/15 bg-cyan-300/10 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/60 text-cyan-100"><Code2 size={20} /></div>
              <div>
                <h2 className="text-xl font-black text-white">Acquisition prospects</h2>
                <p className="text-sm text-white/55">Widget {settings.widget_enabled ? 'actif' : 'à configurer'} · capture email {settings.email_capture_enabled ? 'active' : 'inactive'}</p>
              </div>
            </div>
            <button onClick={() => setActivePage('settings')} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Personnaliser l’agence</button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderClients = () => (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Clients & projets</h1>
          <p className="mt-1 text-sm text-white/50">Suivez les sites gérés par votre agence et leurs scores moyens.</p>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold text-primary">{clients.length} client(s)</span>
      </div>
      {clients.length === 0 ? <EmptyState title="Aucun projet client" text="Les domaines audités par le compte agence seront regroupés automatiquement dans cette section." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-white/35">
              <tr><th className="py-3">Client / domaine</th><th>Audits</th><th>Rapports</th><th>SEO moyen</th><th>Sécurité moyenne</th><th>Dernier audit</th><th>Action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {clients.map((client) => (
                <tr key={client.domain} className="text-white/70">
                  <td className="py-4 font-bold text-white">{client.domain}</td>
                  <td>{client.audits}</td>
                  <td>{client.reports}</td>
                  <td>{client.seoAverage ?? '—'}/100</td>
                  <td>{client.securityAverage ?? '—'}/100</td>
                  <td>{formatDateLabel(client.lastScanAt)}</td>
                  <td><button onClick={() => client.latestScan?.id && navigate(`/rapport/${encodeURIComponent(client.latestScan.id)}`, { state: { agencyBypass: true, agencyScan: client.latestScan } })} className="inline-flex items-center gap-1 rounded-full border border-primary/35 px-3 py-1.5 text-xs font-bold text-primary"><ExternalLink size={12} /> Rapport</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderAudits = () => (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
      <h1 className="text-2xl font-black text-white">Audits récents</h1>
      <p className="mt-1 text-sm text-white/50">Historique opérationnel des audits réalisés par l’agence.</p>
      <div className="mt-6 space-y-3">
        {recentAudits.length === 0 ? <EmptyState title="Aucun audit disponible" text="Les audits lancés par le compte agence apparaîtront ici." /> : recentAudits.map((scan) => (
          <div key={scan.id || scan.url} className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="truncate font-black text-white">{extractDomain(scan.url) || scan.url}</p>
              <p className="mt-1 truncate text-xs text-white/40">{scan.url}</p>
            </div>
            <div className="text-sm text-white/60">SEO <span className="font-black text-white">{getScanScore(scan, 'seo') ?? '—'}</span></div>
            <div className="text-sm text-white/60">Sécurité <span className="font-black text-white">{getScanScore(scan, 'security') ?? '—'}</span></div>
            <button onClick={() => scan.id && navigate(`/rapport/${encodeURIComponent(scan.id)}`, { state: { agencyBypass: true, agencyScan: scan } })} disabled={!scan.id} className="rounded-full bg-primary px-4 py-2 text-xs font-black text-white disabled:opacity-40">Voir audit</button>
          </div>
        ))}
      </div>
    </section>
  );

  const renderReports = () => (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
        <h1 className="text-2xl font-black text-white">Rapports agence</h1>
        <p className="mt-1 text-sm text-white/50">Rapports premium à partager avec vos clients, avec accès direct agence.</p>
      </div>
      {recentReports.length === 0 ? <EmptyState title="Aucun rapport généré" text="Les rapports premium apparaîtront ici dès que des audits seront disponibles." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentReports.map((scan) => (
            <article key={scan.id || scan.url} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300"><FileText size={20} /></div>
              <h2 className="truncate text-lg font-black text-white">{extractDomain(scan.url) || scan.url}</h2>
              <p className="mt-2 text-xs text-white/40">{formatDateLabel(scan.created_at || scan.createdAt || scan.date)}</p>
              <p className="mt-4 text-sm leading-6 text-white/55">{scan.paid ? 'Rapport premium prêt à être livré.' : 'Audit disponible en accès agence.'}</p>
              <button onClick={() => scan.id && navigate(`/rapport/${encodeURIComponent(scan.id)}`, { state: { agencyBypass: true, agencyScan: scan } })} disabled={!scan.id} className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/35 px-4 py-2 text-xs font-black text-primary disabled:border-white/10 disabled:text-white/30"><Link2 size={13} /> Ouvrir le rapport</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderWidget = () => (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
        <h1 className="text-2xl font-black text-white">Widget d’audit</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">Intégrez un formulaire d’audit Webisafe sur votre site agence avec capture email et branding agence.</p>
        <div className="mt-6 space-y-3">
          <ToggleRow label="Widget actif" description="Affiche le widget embarquable sur vos supports agence." checked={settings.widget_enabled} onChange={(value) => updateSetting('widget_enabled', value)} />
          <ToggleRow label="Capture email" description="Prépare la collecte des emails prospects depuis le widget." checked={settings.email_capture_enabled} onChange={(value) => updateSetting('email_capture_enabled', value)} />
        </div>
        <button onClick={handleCopyWidget} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-white"><Copy size={16} /> Copier le code</button>
      </div>
      <div className="rounded-[28px] border border-primary/25 bg-slate-950/70 p-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-3">
            {settings.logo_url ? <img src={settings.logo_url} alt={settings.agency_name} className="h-10 w-10 rounded-2xl object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary font-black text-white">W</div>}
            <div>
              <p className="font-black text-white">Audit offert par {settings.agency_name}</p>
              <p className="text-xs text-white/45">{settings.widget_enabled ? 'Widget actif' : 'Widget inactif'} · {settings.email_capture_enabled ? 'Capture email active' : 'Capture email inactive'}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white/45">https://client.com</div>
          <button className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white">Lancer l’audit gratuit</button>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300"><ShieldCheck size={13} /> Webisafe Verified</div>
        </div>
        <pre className="mt-5 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-white/55">{widgetCode}</pre>
      </div>
    </section>
  );

  const renderSettings = () => (
    <form onSubmit={handleSave} className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><Palette size={20} /></div>
        <div>
          <h1 className="text-2xl font-black text-white">Paramètres agence</h1>
          <p className="mt-1 text-sm text-white/45">Branding, contact et personnalisation des rapports PDF agence.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom de l’agence" value={settings.agency_name} onChange={(value) => updateSetting('agency_name', value)} placeholder="Agence Demo" />
        <Field label="Logo URL" value={settings.logo_url} onChange={(value) => updateSetting('logo_url', value)} placeholder="https://.../logo.png" />
        <Field label="Couleur primaire" value={settings.primary_color} onChange={(value) => updateSetting('primary_color', value)} placeholder="#1566F0" />
        <Field label="Couleur secondaire" value={settings.secondary_color} onChange={(value) => updateSetting('secondary_color', value)} placeholder="#0F172A" />
        <Field label="Email contact" value={settings.contact_email} onChange={(value) => updateSetting('contact_email', value)} placeholder="contact@agence.com" type="email" />
        <Field label="Footer PDF" value={settings.footer_text} onChange={(value) => updateSetting('footer_text', value)} placeholder="Rapport préparé par..." />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToggleRow label="Widget embarquable" description="Active le widget d’audit dans l’espace agence." checked={settings.widget_enabled} onChange={(value) => updateSetting('widget_enabled', value)} />
        <ToggleRow label="Capture email prospect" description="Prépare la capture email dans le tunnel widget." checked={settings.email_capture_enabled} onChange={(value) => updateSetting('email_capture_enabled', value)} />
      </div>
      <button disabled={saving} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-black text-white transition hover:bg-primary-hover disabled:opacity-60">
        {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
      </button>
    </form>
  );

  const pages = {
    overview: renderOverview,
    clients: renderClients,
    audits: renderAudits,
    reports: renderReports,
    widget: renderWidget,
    settings: renderSettings,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%),#040718] text-white">
      <ToastMessage toast={toast} />
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-cyan-300/20 bg-[#070A1F]/96 transition-transform duration-300 shadow-[18px_0_80px_rgba(0,0,0,0.35)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="border-b border-cyan-300/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 font-black text-white shadow-[0_0_30px_rgba(34,211,238,0.35)]">W</div>
              <div className="text-left">
                <p className="font-black text-white">Webisafe</p>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">B2B studio</p>
              </div>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="rounded-xl p-2 text-white/50 lg:hidden"><X size={18} /></button>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {AGENCY_NAV.map((item) => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${activePage === item.id ? 'bg-cyan-300/12 text-cyan-100 font-black ring-1 ring-cyan-300/20' : 'text-white/58 hover:bg-white/5 hover:text-white'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200"><Building2 size={18} /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{settings.agency_name}</p>
                <p className="truncate text-xs text-white/40">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              <ShieldCheck size={12} /> Verified actif
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-cyan-300/15 bg-[#040718]/80 px-4 backdrop-blur-xl lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-white/60 lg:hidden"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100/45">Console agence marque blanche</p>
            <h2 className="truncate text-sm font-black text-white">{AGENCY_NAV.find((item) => item.id === activePage)?.label}</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20"
            aria-label="Retour à l'accueil"
          >
            <Home size={14} /> <span className="hidden sm:inline">Retour à l'accueil</span>
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 sm:flex">
            <TrendingUp size={14} /> B2B premium
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 sm:flex">
            <Mail size={14} /> {settings.contact_email || 'Contact à configurer'}
          </div>
        </header>
        <main className="p-4 lg:p-8">
          {pages[activePage]()}
        </main>
      </div>
    </div>
  );
}
