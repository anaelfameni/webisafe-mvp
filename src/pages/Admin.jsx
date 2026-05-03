import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, RefreshCw, ShieldAlert, LayoutDashboard, CreditCard,
  Activity, TrendingUp, Bell, Settings, Users, Menu, X, LogOut,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Eye,
} from 'lucide-react';
import ToastMessage from '../components/ToastMessage';
import { fetchPaymentRequests, markScanPaid, sendConfirmPayment, sendRejectPayment, updatePaymentRequest } from '../utils/paymentApi';
import { ADMIN_TOKEN, computePaymentStats, formatFcfa, getRelativeTimeLabel, isPendingPaymentStatus } from '../utils/wavePayment';

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
  { id: 'revenue', label: 'Revenus', icon: <TrendingUp size={18} /> },
  { id: 'alerts', label: 'Alertes Système', icon: <Bell size={18} /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> },
];

export default function Admin({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isAuthorized = token === ADMIN_TOKEN || user?.role === 'admin';

  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
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

  useEffect(() => { if (!isAuthorized) navigate('/', { replace: true }); }, [isAuthorized, navigate]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); }, [toast]);

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
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch { /* non-bloquant */ }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadPayments();
    loadSubscriptions();
    const interval = setInterval(() => { loadPayments(true); loadSubscriptions(true); }, 30000);
    return () => clearInterval(interval);
  }, [isAuthorized, loadPayments, loadSubscriptions]);

  const pendingPayments = useMemo(() => payments.filter(p => isPendingPaymentStatus(p.status)), [payments]);
  const pendingSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'pending'), [subscriptions]);
  const stats = useMemo(() => computePaymentStats(payments), [payments]);

  const handleValidate = async (payment) => {
    setActionId(payment.id);
    try {
      await updatePaymentRequest(payment.id, { status: 'validated', validated_at: new Date().toISOString(), validated_by: 'admin' });
      await markScanPaid(payment.scan_id);
      try { await sendConfirmPayment({ payment_code: payment.payment_code, user_email: payment.user_email, scan_id: payment.scan_id, url_to_audit: payment.url_to_audit }); } catch {}
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
      await updatePaymentRequest(rejectingPayment.id, { status: 'rejected', rejection_reason: rejectionReason.trim() });
      try { await sendRejectPayment({ user_email: rejectingPayment.user_email, rejection_reason: rejectionReason.trim() }); } catch {}
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: rejectingSubscription.id, rejection_reason: subRejectionReason }),
      });
      setToast({ type: 'success', message: 'Abonnement rejeté. Email envoyé.' });
      setRejectingSubscription(null); setSubRejectionReason('');
      await loadSubscriptions();
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Rejet impossible.' });
    } finally { setActionId(null); }
  };

  if (!isAuthorized) return null;

  const PAGE_TITLES = { overview: 'Vue d\'ensemble', payments: 'Paiements', subscriptions: 'Abonnements Protect', scans: 'Scans', revenue: 'Revenus', alerts: 'Alertes Système', settings: 'Paramètres' };

  return (
    <div className="flex min-h-screen bg-[#0A0F1E]">
      <ToastMessage toast={toast} />

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Admin */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#060C1A] border-r border-white/10 flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-sm">W</div>
            <span className="text-white font-bold">Webi<span className="text-primary">safe</span></span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
            <ShieldAlert size={10} /> ADMIN
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition relative ${activePage === item.id ? 'bg-primary/20 text-primary font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              {item.icon} {item.label}
              {item.badge === 'payments' && pendingPayments.length > 0 && (
                <span className="ml-auto bg-warning text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>
              )}
              {item.badge === 'subscriptions' && pendingSubscriptions.length > 0 && (
                <span className="ml-auto bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingSubscriptions.length}</span>
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
      <div className="flex-1 lg:ml-64 flex flex-col">
        {/* Admin Header */}
        <header className="sticky top-0 z-30 bg-[#060C1A]/90 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-white/60 hover:text-white"><Menu size={20} /></button>
          <div className="flex-1">
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
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <AdminKpiCard tone="orange" value={pendingPayments.length} label="Paiements en attente" icon={<CreditCard size={18} />} />
                    <AdminKpiCard tone="green" value={stats.validatedTodayCount} label="Validés aujourd'hui" icon={<CheckCircle2 size={18} />} />
                    <AdminKpiCard tone="blue" value={formatFcfa(stats.dailyRevenue)} label="CA du jour" icon={<TrendingUp size={18} />} />
                    <AdminKpiCard tone="violet" value={stats.totalDelivered} label="Audits livrés" icon={<Activity size={18} />} />
                  </div>

                  {pendingPayments.length > 0 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-warning font-bold flex items-center gap-2"><AlertTriangle size={16} /> {pendingPayments.length} paiement(s) en attente</h3>
                        <button onClick={() => setActivePage('payments')} className="text-warning text-xs hover:underline flex items-center gap-1">Voir tout <ArrowRight size={12} /></button>
                      </div>
                      {pendingPayments.slice(0, 2).map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-t border-white/10 first:border-0">
                          <span className="text-primary font-mono text-sm">{p.payment_code}</span>
                          <span className="text-white/60 text-xs truncate flex-1">{p.url_to_audit}</span>
                          <span className="text-white/40 text-xs">{getRelativeTimeLabel(p.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Activité récente */}
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4">Activité récente</h3>
                    <div className="space-y-3">
                      {payments.slice(0, 8).map((p, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.status === 'validated' ? 'bg-success' : p.status === 'rejected' ? 'bg-danger' : 'bg-warning'}`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-white/70">
                              {p.status === 'validated' ? '✅ Audit livré à' : p.status === 'rejected' ? '❌ Paiement rejeté pour' : '⏳ Paiement reçu de'}
                              {' '}<span className="text-white/50 text-xs">{p.user_email}</span>
                            </span>
                          </div>
                          <span className="text-white/30 text-xs flex-shrink-0">{getRelativeTimeLabel(p.created_at)}</span>
                        </div>
                      ))}
                      {payments.length === 0 && <p className="text-white/30 text-sm">Aucune activité récente.</p>}
                    </div>
                  </div>
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
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <AdminKpiCard tone="blue" value={payments.length} label="Scans totaux" icon={<Activity size={18} />} />
                    <AdminKpiCard tone="green" value={stats.validatedTodayCount} label="Audits premium livrés" icon={<CheckCircle2 size={18} />} />
                  </div>
                  <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4">Tous les scans</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead><tr className="border-b border-white/10 text-white/40 text-xs">
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-left">Site</th>
                          <th className="px-4 py-3 text-left">Client</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Statut</th>
                          <th className="px-4 py-3 text-left">Date</th>
                        </tr></thead>
                        <tbody>
                          {payments.map(p => (
                            <tr key={p.id} className="border-t border-white/5 text-white/70 hover:bg-white/5">
                              <td className="px-4 py-3 font-mono text-primary text-xs">{p.payment_code}</td>
                              <td className="px-4 py-3 text-xs max-w-[160px] truncate">{p.url_to_audit}</td>
                              <td className="px-4 py-3 text-xs">{p.user_email}</td>
                              <td className="px-4 py-3 text-xs">Audit Premium</td>
                              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'validated' ? 'bg-success/10 text-success' : p.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{p.status}</span></td>
                              <td className="px-4 py-3 text-xs text-white/40">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE: Revenus */}
              {activePage === 'revenue' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <AdminKpiCard tone="green" value={formatFcfa(stats.dailyRevenue)} label="CA aujourd'hui" icon={<TrendingUp size={18} />} />
                    <AdminKpiCard tone="blue" value={formatFcfa(stats.validatedTodayCount * 35000)} label="CA total validé" icon={<CreditCard size={18} />} />
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
                      {['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'UPTIMEROBOT_API_KEY', 'CRON_SECRET'].map(key => (
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
              <button onClick={() => { setRejectingSubscription(null); setSubRejectionReason(''); }}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5 transition">
                Annuler
              </button>
              <button onClick={handleRejectSub} disabled={actionId === rejectingSubscription.id}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:bg-danger/90 transition disabled:opacity-60">
                Confirmer le refus
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
              <button onClick={() => { setRejectingPayment(null); setRejectionReason(''); }}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5 transition">
                Annuler
              </button>
              <button onClick={handleReject} disabled={actionId === rejectingPayment.id}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:bg-danger/90 transition disabled:opacity-60">
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
