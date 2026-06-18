import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, RefreshCw, ShieldAlert, LayoutDashboard, CreditCard,
  Activity, TrendingUp, Bell, Settings, Users, Menu, X, LogOut,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Eye, Wrench,
} from 'lucide-react';
import ToastMessage from '../components/ToastMessage';
import { fetchPaymentRequests, fetchScans, sendConfirmPayment, sendRejectPayment } from '../utils/paymentApi';
import { fetchCorrectionRequests } from '../utils/correctionApi';
import { mergeAdminScans, readLegacyScans } from '../utils/adminScanHistory';
import { computePaymentStats, formatFcfa, getRelativeTimeLabel, isPendingPaymentStatus } from '../utils/wavePayment';
import { supabase } from '../lib/supabaseClient';
import { getDashboardAccessState } from '../utils/agencyAccess';
import { PAYMENT_CONFIG } from '../config/brand';

function AdminKpiCard({ value, label, tone, icon }) {
  const toneClasses = {
    orange: { border: 'border-warning/40 bg-warning/10', color: '#F59E0B' },
    green: { border: 'border-success/40 bg-success/10', color: '#22C55E' },
    blue: { border: 'border-primary/40 bg-primary/10', color: '#1566F0' },
    violet: { border: 'border-purple-400/40 bg-purple-400/10', color: '#A78BFA' },
  };
  const style = toneClasses[tone] || toneClasses.blue;
  return (
    <div className={`rounded-2xl border p-5 ${style.border} flex items-start gap-4`}>
      {icon && <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${style.color}20`, color: style.color }}>{icon}</div>}
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="mt-1 text-sm text-white/60">{label}</p>
      </div>
    </div>
  );
}

const ADMIN_NAV = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: <LayoutDashboard size={18} /> },
  { id: 'payments', label: 'Paiements', icon: <CreditCard size={18} />, badge: 'payments' },
  { id: 'subscriptions', label: 'Abonnements', icon: <Users size={18} />, badge: 'subscriptions' },
  { id: 'scans', label: 'Scans', icon: <Activity size={18} /> },
  { id: 'corrections', label: 'Corrections', icon: <Wrench size={18} />, badge: 'corrections' },
  { id: 'revenue', label: 'Revenus', icon: <TrendingUp size={18} /> },
  { id: 'alerts', label: 'Alertes Système', icon: <Bell size={18} /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> },
];

export default function Admin({ user, authLoading = false }) {
  const navigate = useNavigate();
  const accessState = getDashboardAccessState(user, 'admin', { loading: authLoading });
  const isAuthorized = accessState.status === 'allowed';

  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [scans, setScans] = useState([]);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingSubscription, setRejectingSubscription] = useState(null);
  const [subRejectionReason, setSubRejectionReason] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (accessState.status === 'unauthenticated') navigate('/', { replace: true });
    if (accessState.status === 'redirect') navigate(accessState.redirectTo, { replace: true });
  }, [accessState.redirectTo, accessState.status, navigate]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); }, [toast]);

  async function getAdminHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }

  const loadPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await fetchPaymentRequests(50);
      setPayments(rows || []);
      setLastRefreshedAt(new Date());
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Chargement impossible.' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadSubscriptions = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/subscribe', { headers: await getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch { /* non-bloquant */ }
  }, []);

  const loadCorrections = useCallback(async () => {
    try {
      const headers = await getAdminHeaders();
      const token = headers?.Authorization?.replace('Bearer ', '');
      const rows = await fetchCorrectionRequests(token);
      setCorrectionRequests(rows || []);
    } catch { /* non-bloquant */ }
  }, []);

  const loadScans = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await fetchScans(100);
      setScans(mergeAdminScans(rows || [], readLegacyScans()).slice(0, 100));
      setLastRefreshedAt(new Date());
    } catch (error) {
      const legacyRows = readLegacyScans();
      if (legacyRows.length > 0) {
        setScans(mergeAdminScans([], legacyRows).slice(0, 100));
      } else {
        setToast({ type: 'error', message: error.message || 'Chargement impossible.' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadPayments();
    loadSubscriptions();
    loadScans();
    loadCorrections();
    const interval = setInterval(() => { loadPayments(true); loadSubscriptions(true); }, 30000);
    return () => clearInterval(interval);
  }, [isAuthorized, loadPayments, loadSubscriptions, loadScans, loadCorrections]);

  const pendingPayments = useMemo(() => payments.filter(p => isPendingPaymentStatus(p.status)), [payments]);
  const pendingSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'pending'), [subscriptions]);
  const stats = useMemo(() => computePaymentStats(payments), [payments]);

  const handleValidate = async (payment) => {
    setActionId(payment.id);
    try {
      await sendConfirmPayment({ payment_id: payment.id });
      setToast({ type: 'success', message: 'Paiement valide. Email envoye au client.' });
      await loadPayments(true);
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Validation impossible.' });
    } finally { setActionId(null); }
  };

  const handleReject = async () => {
    if (!rejectingPayment || !rejectionReason.trim()) { setToast({ type: 'error', message: 'Veuillez saisir une raison.' }); return; }
    setActionId(rejectingPayment.id);
    try {
      await sendRejectPayment({ payment_id: rejectingPayment.id, rejection_reason: rejectionReason.trim() });
      setToast({ type: 'success', message: 'Paiement rejete. Email envoye au client.' });
      setRejectingPayment(null); setRejectionReason('');
      await loadPayments(true);
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Rejet impossible.' });
    } finally { setActionId(null); }
  };

  const handleValidateSub = async (sub) => {
    setActionId(sub.id);
    try {
      const res = await fetch('/api/confirm-subscription', {
        method: 'POST',
        headers: await getAdminHeaders(),
        body: JSON.stringify({ subscription_id: sub.id, validated_by: 'admin' }),
      });
      if (!res.ok) throw new Error('Erreur activation');
      setToast({ type: 'success', message: 'Abonnement activé. Email envoyé au client.' });
      await loadSubscriptions();
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Impossible d\'activer.' });
    } finally { setActionId(null); }
  };

  const handleRejectSub = async () => {
    if (!rejectingSubscription) return;
    setActionId(rejectingSubscription.id);
    try {
      await fetch('/api/reject-subscription', {
        method: 'POST',
        headers: await getAdminHeaders(),
        body: JSON.stringify({ subscription_id: rejectingSubscription.id, rejection_reason: subRejectionReason }),
      });
      setToast({ type: 'success', message: 'Abonnement rejeté. Email envoyé.' });
      setRejectingSubscription(null); setSubRejectionReason('');
      await loadSubscriptions();
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Rejet impossible.' });
    } finally { setActionId(null); }
  };

  const openPremiumScan = (scan) => {
    if (!scan?.paid || !scan?.id) return;
    const resultData = scan.results_json || scan.data || {};
    const adminScan = {
      ...resultData,
      ...scan,
      id: scan.id,
      url: scan.url || resultData.url || '',
      paid: true,
    };
    navigate(`/rapport/${encodeURIComponent(scan.id)}`, { state: { adminBypass: true, adminScan } });
  };

  if (accessState.status === 'loading' || accessState.status === 'redirect') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4">
        <div className="rounded-3xl border border-orange-400/20 bg-slate-950/80 p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-orange-100/70">
            {accessState.status === 'redirect' ? 'Redirection vers votre espace dédié...' : 'Vérification des droits administrateur...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const PAGE_TITLES = { overview: 'Vue d\'ensemble', payments: 'Paiements', subscriptions: 'Abonnements Protect', scans: 'Scans', corrections: 'Demandes de correction', revenue: 'Revenus', alerts: 'Alertes Système', settings: 'Paramètres' };

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(21,102,240,0.16),transparent_32%),#030712]">
      <ToastMessage toast={toast} />

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Admin */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#050816]/96 border-r border-orange-400/20 flex flex-col z-40 transition-transform duration-300 shadow-[18px_0_80px_rgba(0,0,0,0.35)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-orange-400/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-[0_0_28px_rgba(249,115,22,0.35)]">W</div>
            <span className="text-white font-bold">Webi<span className="text-primary">safe</span></span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/15 text-orange-300 text-xs font-bold uppercase tracking-widest">
            <ShieldAlert size={10} /> Command center
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition relative ${activePage === item.id ? 'bg-orange-500/15 text-orange-200 font-semibold ring-1 ring-orange-400/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              {item.icon} {item.label}
              {item.badge === 'payments' && pendingPayments.length > 0 && (
                <span className="ml-auto bg-warning text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>
              )}
              {item.badge === 'subscriptions' && pendingSubscriptions.length > 0 && (
                <span className="ml-auto bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingSubscriptions.length}</span>
              )}
              {item.badge === 'corrections' && correctionRequests.filter(c => c.status === 'pending').length > 0 && (
                <span className="ml-auto bg-warning text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{correctionRequests.filter(c => c.status === 'pending').length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-white/40 text-xs mb-3 truncate">{user?.email}</p>
          <button onClick={() => { navigate('/'); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition text-white text-sm font-semibold">
            <LogOut size={14} /> ← Retour à l'accueil
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-72 flex flex-col">
        {/* Admin Header */}
        <header className="sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-xl border-b border-orange-400/15 px-4 lg:px-8 h-16 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-white/60 hover:text-white"><Menu size={20} /></button>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300/70">Console administrateur</p>
            <p className="text-white font-semibold text-sm">{PAGE_TITLES[activePage]}</p>
          </div>
          <span className="text-white/40 text-xs hidden sm:block">Rafraîchi à {lastRefreshedAt.toLocaleTimeString('fr-FR')}</span>
          <button onClick={() => loadPayments(true)} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition">
            <RefreshCw size={16} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* PAGE: Vue d'ensemble */}
              {activePage === 'overview' && (
                <div className="space-y-8">
                  <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="relative overflow-hidden rounded-[36px] border border-orange-400/25 bg-gradient-to-br from-orange-500/18 via-slate-950/80 to-red-500/14 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.34)]">
                      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
                      <div className="relative">
                        <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-orange-200">
                          <ShieldAlert size={14} /> Supervision plateforme
                        </span>
                        <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-white lg:text-5xl">Centre de contrôle Webisafe : paiements, abonnements, audits et incidents en temps réel.</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">Une vue opérateur pour prioriser les validations, sécuriser les livraisons premium et garder la plateforme sous surveillance.</p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                          <button onClick={() => setActivePage('payments')} className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(251,146,60,0.35)]">Traiter les paiements</button>
                          <button onClick={() => setActivePage('alerts')} className="rounded-2xl border border-white/15 bg-white/7 px-5 py-3 text-sm font-bold text-white">Voir les alertes système</button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[36px] border border-red-400/20 bg-white/[0.055] p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200/55">File opérateur</p>
                          <h2 className="mt-2 text-2xl font-black text-white">{pendingPayments.length + pendingSubscriptions.length + correctionRequests.filter(c => c.status === 'pending').length} action(s)</h2>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-200"><AlertTriangle size={22} /></div>
                      </div>
                      <div className="space-y-3">
                        {[
                          ['Paiements à valider', pendingPayments.length, 'text-orange-200'],
                          ['Abonnements en attente', pendingSubscriptions.length, 'text-blue-200'],
                          ['Corrections à traiter', correctionRequests.filter(c => c.status === 'pending').length, 'text-red-200'],
                        ].map(([label, value, color]) => (
                          <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                            <span className="text-sm text-white/58">{label}</span>
                            <span className={`text-sm font-black ${color}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                        <p className="flex items-center gap-2 font-black text-emerald-300"><CheckCircle2 size={16} /> Système opérationnel</p>
                        <p className="mt-2 text-sm leading-6 text-white/52">Dernière synchronisation : {lastRefreshedAt.toLocaleTimeString('fr-FR')}</p>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <AdminKpiCard tone="orange" value={pendingPayments.length} label="Paiements en attente" icon={<CreditCard size={18} />} />
                    <AdminKpiCard tone="green" value={stats.validatedTodayCount} label="Validés aujourd'hui" icon={<CheckCircle2 size={18} />} />
                    <AdminKpiCard tone="blue" value={formatFcfa(stats.dailyRevenue)} label="CA du jour" icon={<TrendingUp size={18} />} />
                    <AdminKpiCard tone="violet" value={stats.totalDelivered} label="Audits livrés" icon={<Activity size={18} />} />
                  </div>

                  <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-[30px] border border-orange-400/20 bg-white/[0.045] p-6">
                      <div className="mb-6 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-black text-white">Salle de validation</h3>
                          <p className="mt-1 text-sm text-white/45">Paiements entrants à contrôler avant livraison premium.</p>
                        </div>
                        <button onClick={() => setActivePage('payments')} className="rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-200">Ouvrir</button>
                      </div>
                      {pendingPayments.length > 0 ? (
                        <div className="space-y-3">
                          {pendingPayments.slice(0, 4).map(p => (
                            <div key={p.id} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/55 p-4 md:grid-cols-[1fr_auto] md:items-center">
                              <div className="min-w-0">
                                <p className="font-mono text-sm font-black text-orange-200">{p.payment_code}</p>
                                <p className="mt-1 truncate text-xs text-white/45">{p.url_to_audit}</p>
                              </div>
                              <span className="text-xs font-bold text-white/35">{getRelativeTimeLabel(p.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/45 p-8 text-center">
                          <CheckCircle2 className="mx-auto text-emerald-300" size={28} />
                          <p className="mt-3 font-black text-white">Aucun paiement en attente</p>
                          <p className="mt-1 text-sm text-white/45">La file de validation est vide.</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><Activity size={20} /></div>
                        <div>
                          <h3 className="text-2xl font-black text-white">Journal plateforme</h3>
                          <p className="text-sm text-white/45">Flux récent des paiements, rejets et livraisons.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {payments.slice(0, 8).map((p, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm">
                            <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${p.status === 'validated' ? 'bg-success' : p.status === 'rejected' ? 'bg-danger' : 'bg-warning'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-white/72">{p.status === 'validated' ? 'Audit livré' : p.status === 'rejected' ? 'Paiement rejeté' : 'Paiement reçu'}</p>
                              <p className="mt-1 truncate text-xs text-white/38">{p.user_email}</p>
                            </div>
                            <span className="flex-shrink-0 text-xs text-white/30">{getRelativeTimeLabel(p.created_at)}</span>
                          </div>
                        ))}
                        {payments.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/35">Aucune activité récente.</p>}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* PAGE: Paiements */}
              {activePage === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">Paiements Wave</h2>
                    <button onClick={() => loadPayments(true)} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition">
                      <RefreshCw size={12} /> Actualiser
                    </button>
                  </div>

                  {loading ? (
                    <div className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-primary" size={28} /></div>
                  ) : (
                    <>
                      {pendingPayments.length > 0 && (
                        <div>
                          <h3 className="text-warning font-semibold text-sm mb-3">⏳ En attente de validation ({pendingPayments.length})</h3>
                          <div className="space-y-4">
                            {pendingPayments.map(payment => (
                              <div key={payment.id} className="rounded-2xl border border-warning/30 bg-[#1E293B] p-5">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <p className="text-primary font-mono font-bold">{payment.payment_code}</p>
                                    <p className="text-white/40 text-xs mt-1">{getRelativeTimeLabel(payment.created_at)}</p>
                                  </div>
                                  <span className="bg-warning/10 text-warning text-xs px-2 py-1 rounded-full font-semibold">EN ATTENTE</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                  <div><p className="text-white/40 text-xs">Site</p><p className="text-white mt-0.5 break-all">{payment.url_to_audit}</p></div>
                                  <div><p className="text-white/40 text-xs">Wave</p><p className="text-white mt-0.5">{payment.wave_phone || 'N/A'}</p></div>
                                  <div><p className="text-white/40 text-xs">Email</p><p className="text-white mt-0.5 break-all">{payment.user_email || 'N/A'}</p></div>
                                  <div><p className="text-white/40 text-xs">Montant</p><p className="text-success font-semibold mt-0.5">{formatFcfa(payment.amount || 0)}</p></div>
                                </div>
                                <div className="flex gap-3">
                                  <button type="button" disabled={actionId === payment.id} onClick={() => handleValidate(payment)}
                                    className="flex-1 rounded-xl bg-success px-4 py-2.5 font-bold text-white text-sm transition hover:bg-success/90 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {actionId === payment.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Valider
                                  </button>
                                  <button type="button" disabled={actionId === payment.id} onClick={() => setRejectingPayment(payment)}
                                    className="rounded-xl border border-danger/40 px-5 py-2.5 font-semibold text-danger text-sm transition hover:bg-danger/10 disabled:opacity-60 flex items-center gap-2">
                                    <XCircle size={14} /> Rejeter
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-white/60 font-semibold text-sm mb-3">Historique (20 derniers)</h3>
                        <div className="overflow-x-auto bg-[#111827] border border-white/10 rounded-2xl">
                          <table className="min-w-full text-sm">
                            <thead><tr className="border-b border-white/10 text-white/40 text-xs">
                              <th className="px-4 py-3 text-left">Code</th>
                              <th className="px-4 py-3 text-left">Site</th>
                              <th className="px-4 py-3 text-left">Email</th>
                              <th className="px-4 py-3 text-left">Montant</th>
                              <th className="px-4 py-3 text-left">Statut</th>
                              <th className="px-4 py-3 text-left">Date</th>
                            </tr></thead>
                            <tbody>
                              {payments.slice(0, 20).map(p => (
                                <tr key={p.id} className="border-t border-white/5 text-white/70 hover:bg-white/5">
                                  <td className="px-4 py-3 font-mono text-primary text-xs">{p.payment_code}</td>
                                  <td className="px-4 py-3 text-xs max-w-[160px] truncate">{p.url_to_audit}</td>
                                  <td className="px-4 py-3 text-xs">{p.user_email}</td>
                                  <td className="px-4 py-3 text-xs text-success">{formatFcfa(p.amount || 0)}</td>
                                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'validated' ? 'bg-success/10 text-success' : p.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{p.status}</span></td>
                                  <td className="px-4 py-3 text-xs text-white/40">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PAGE: Scans */}
              {activePage === 'scans' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">Historique des scans</h2>
                    <button onClick={() => loadScans(true)} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition">
                      <RefreshCw size={12} /> Actualiser
                    </button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <AdminKpiCard tone="blue" value={scans.length} label="Scans totaux" icon={<Activity size={18} />} />
                    <AdminKpiCard tone="green" value={scans.filter(s => s.paid).length} label="Audits premium" icon={<CheckCircle2 size={18} />} />
                  </div>
                  {scans.length === 0 ? (
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 text-center">
                      <Activity size={32} className="mx-auto text-white/20 mb-3" />
                      <p className="text-white/50 text-sm">Aucun scan enregistré pour le moment.</p>
                    </div>
                  ) : (
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
                      <h3 className="text-white font-bold mb-4">Tous les scans ({scans.length})</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead><tr className="border-b border-white/10 text-white/40 text-xs">
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">Site</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Score</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Date</th>
                          </tr></thead>
                          <tbody>
                            {scans.map(s => (
                              <tr
                                key={s.id}
                                onClick={() => openPremiumScan(s)}
                                className={`border-t border-white/5 text-white/70 hover:bg-white/5 ${s.paid ? 'cursor-pointer' : ''}`}
                                title={s.paid ? 'Ouvrir le rapport premium' : undefined}
                              >
                                <td className="px-4 py-3 font-mono text-primary text-xs max-w-[120px] truncate">
                                  {s.paid ? <button type="button" className="hover:underline">{s.id}</button> : s.id}
                                </td>
                                <td className="px-4 py-3 text-xs max-w-[180px] truncate">
                                  {s.paid ? <button type="button" className="hover:text-primary hover:underline">{s.url}</button> : s.url}
                                </td>
                                <td className="px-4 py-3 text-xs">{s.user_email || '—'}</td>
                                <td className="px-4 py-3 text-xs">
                                  <span className={`font-semibold ${s.score >= 70 ? 'text-success' : s.score >= 40 ? 'text-warning' : 'text-danger'}`}>
                                    {s.score ?? '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.paid ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                    {s.paid ? 'Premium' : 'Gratuit'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-white/40">
                                  {s.scanned_at ? new Date(s.scanned_at).toLocaleDateString('fr-FR') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAGE: Corrections */}
              {activePage === 'corrections' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">Demandes de correction</h2>
                    <button onClick={() => loadCorrections()} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition">
                      <RefreshCw size={12} /> Actualiser
                    </button>
                  </div>

                  {correctionRequests.length === 0 ? (
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 text-center">
                      <Wrench size={32} className="mx-auto text-white/20 mb-3" />
                      <p className="text-white/50 text-sm">Aucune demande de correction pour le moment.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {correctionRequests.map(req => (
                        <div key={req.id} className={`rounded-2xl border p-5 ${req.status === 'pending' ? 'border-warning/30 bg-[#1E293B]' : req.status === 'in_progress' ? 'border-primary/30 bg-primary/5' : 'border-success/30 bg-success/5'}`}>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-white font-bold text-sm">{req.name}</p>
                              <p className="text-white/40 text-xs mt-1">{req.email} · {req.phone || 'Pas de téléphone'}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${req.status === 'pending' ? 'bg-warning/10 text-warning' : req.status === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                              {req.status === 'pending' ? 'EN ATTENTE' : req.status === 'in_progress' ? 'EN COURS' : 'TERMINÉ'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div><p className="text-white/40 text-xs">Site</p><p className="text-white mt-0.5 break-all">{req.url}</p></div>
                            <div><p className="text-white/40 text-xs">Pack</p><p className="text-white mt-0.5 capitalize">{req.pack}</p></div>
                          </div>
                          {req.message && (
                            <div className="bg-white/5 rounded-xl p-3 mb-4">
                              <p className="text-white/60 text-xs">{req.message}</p>
                            </div>
                          )}
                          <p className="text-white/30 text-xs">Demande reçue le {new Date(req.created_at).toLocaleString('fr-FR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PAGE: Revenus */}
              {activePage === 'revenue' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <AdminKpiCard tone="green" value={formatFcfa(stats.dailyRevenue)} label="CA aujourd'hui" icon={<TrendingUp size={18} />} />
                    <AdminKpiCard tone="blue" value={formatFcfa(stats.validatedTodayCount * PAYMENT_CONFIG.premiumAmount)} label="CA total validé" icon={<CreditCard size={18} />} />
                    <AdminKpiCard tone="violet" value={stats.totalDelivered} label="Audits facturés" icon={<CheckCircle2 size={18} />} />
                  </div>
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4">Transactions récentes</h3>
                    <div className="space-y-3">
                      {payments.filter(p => p.status === 'validated').slice(0, 15).map(p => (
                        <div key={p.id} className="flex items-center gap-4 py-2 border-t border-white/5 first:border-0">
                          <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-sm truncate">{p.url_to_audit}</p>
                            <p className="text-white/40 text-xs">{p.user_email} · {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <p className="text-success font-semibold text-sm">{formatFcfa(p.amount || 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE: Abonnements */}
              {activePage === 'subscriptions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">Abonnements Protect Basic</h2>
                    <button onClick={() => loadSubscriptions()} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition"><RefreshCw size={12} /> Actualiser</button>
                  </div>

                  {pendingSubscriptions.length > 0 && (
                    <div>
                      <h3 className="text-primary font-semibold text-sm mb-3">⏳ En attente de validation ({pendingSubscriptions.length})</h3>
                      <div className="space-y-4">
                        {pendingSubscriptions.map(sub => (
                          <div key={sub.id} className="rounded-2xl border border-primary/30 bg-[#1E293B] p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <p className="text-primary font-mono font-bold text-sm">{sub.wave_subscription_id || sub.id.slice(0,8).toUpperCase()}</p>
                                <p className="text-white/40 text-xs mt-1">{new Date(sub.created_at).toLocaleString('fr-FR')}</p>
                              </div>
                              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-semibold">EN ATTENTE</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                              <div><p className="text-white/40 text-xs">Site</p><p className="text-white mt-0.5 break-all">{sub.site_url}</p></div>
                              <div><p className="text-white/40 text-xs">Wave</p><p className="text-white mt-0.5">{sub.wave_phone || 'N/A'}</p></div>
                              <div><p className="text-white/40 text-xs">Email</p><p className="text-white mt-0.5 break-all">{sub.user_email || 'N/A'}</p></div>
                              <div><p className="text-white/40 text-xs">Montant</p><p className="text-success font-semibold mt-0.5">15 000 FCFA/mois</p></div>
                            </div>
                            <div className="flex gap-3">
                              <button type="button" disabled={actionId === sub.id} onClick={() => handleValidateSub(sub)}
                                className="flex-1 rounded-xl bg-success px-4 py-2.5 font-bold text-white text-sm hover:bg-success/90 disabled:opacity-60 flex items-center justify-center gap-2">
                                {actionId === sub.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Activer
                              </button>
                              <button type="button" disabled={actionId === sub.id} onClick={() => setRejectingSubscription(sub)}
                                className="rounded-xl border border-danger/40 px-5 py-2.5 font-semibold text-danger text-sm hover:bg-danger/10 disabled:opacity-60 flex items-center gap-2">
                                <XCircle size={14} /> Refuser
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-white/60 font-semibold text-sm mb-3">Tous les abonnements</h3>
                    <div className="overflow-x-auto bg-[#111827] border border-white/10 rounded-2xl">
                      <table className="min-w-full text-sm">
                        <thead><tr className="border-b border-white/10 text-white/40 text-xs">
                          <th className="px-4 py-3 text-left">Site</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Statut</th>
                          <th className="px-4 py-3 text-left">Date</th>
                        </tr></thead>
                        <tbody>
                          {subscriptions.map(s => (
                            <tr key={s.id} className="border-t border-white/5 text-white/70 hover:bg-white/5">
                              <td className="px-4 py-3 text-xs max-w-[180px] truncate">{s.site_url}</td>
                              <td className="px-4 py-3 text-xs">{s.user_email}</td>
                              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-success/10 text-success' : s.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>{s.status}</span></td>
                              <td className="px-4 py-3 text-xs text-white/40">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE: Alertes */}
              {activePage === 'alerts' && (
                <div className="space-y-6">
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Bell size={18} className="text-warning" /> Alertes système</h3>
                    {pendingPayments.length > 0 ? (
                      <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl mb-3">
                        <p className="text-warning font-semibold text-sm">{pendingPayments.length} paiement(s) en attente de validation</p>
                        <p className="text-white/50 text-xs mt-1">Certains clients attendent leur rapport depuis plus de 30 minutes.</p>
                        <button onClick={() => setActivePage('payments')} className="mt-2 text-warning text-xs underline">Traiter maintenant</button>
                      </div>
                    ) : (
                      <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
                        <p className="text-success font-semibold text-sm flex items-center gap-2"><CheckCircle2 size={14} /> Aucune alerte active</p>
                        <p className="text-white/50 text-xs mt-1">Tous les paiements sont traités et les services fonctionnent normalement.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAGE: Paramètres */}
              {activePage === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Informations admin</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-white/50">Email admin</span>
                        <span className="text-white">{user?.email}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-white/50">Rôle</span>
                        <span className="text-[#FF6B35] font-semibold">Administrateur</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-white/50">Dernier refresh</span>
                        <span className="text-white">{lastRefreshedAt.toLocaleTimeString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Variables d'environnement requises</h3>
                    <div className="space-y-2 text-sm">
                      {['Configuration base de données', 'Clé service backend', 'Service email backend', 'Monitoring backend', 'Secret cron backend'].map(key => (
                        <div key={key} className="flex items-center gap-2 py-1">
                          <span className="w-2 h-2 rounded-full bg-success" />
                          <code className="text-primary text-xs">{key}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modal rejet subscription */}
      {rejectingSubscription && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-danger/30 bg-[#111827] p-6">
            <h2 className="text-xl font-bold text-white mb-4">Raison du refus</h2>
            <textarea value={subRejectionReason} onChange={e => setSubRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi l'abonnement n'a pas pu être activé."
              className="w-full min-h-[100px] rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary" />
            <div className="flex gap-3 mt-4 justify-end">
              <button type="button" onClick={() => { setRejectingSubscription(null); setSubRejectionReason(''); }}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5 transition">
                Annuler
              </button>
              <button type="button" onClick={handleRejectSub} disabled={!subRejectionReason.trim() || actionId === rejectingSubscription.id}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:bg-danger/90 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {actionId === rejectingSubscription.id ? 'En cours…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejet */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-danger/30 bg-[#111827] p-6">
            <h2 className="text-xl font-bold text-white mb-4">Raison du rejet</h2>
            <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi le paiement n'a pas pu être confirmé."
              className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary" />
            <div className="flex gap-3 mt-4 justify-end">
              <button type="button" onClick={() => { setRejectingPayment(null); setRejectionReason(''); }}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5 transition">
                Annuler
              </button>
              <button type="button" onClick={handleReject} disabled={!rejectionReason.trim() || actionId === rejectingPayment.id}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:bg-danger/90 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {actionId === rejectingPayment.id ? 'En cours…' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
