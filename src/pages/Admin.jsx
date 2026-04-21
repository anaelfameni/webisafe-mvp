import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import ToastMessage from '../components/ToastMessage';
import { fetchPaymentRequests, markScanPaid, sendConfirmPayment, sendRejectPayment, updatePaymentRequest } from '../utils/paymentApi';
import { ADMIN_TOKEN, computePaymentStats, formatFcfa, getRelativeTimeLabel, isPendingPaymentStatus } from '../utils/wavePayment';

function StatCard({ value, label, tone }) {
  const toneClasses = {
    orange: 'border-warning/40 bg-warning/10',
    green: 'border-success/40 bg-success/10',
    blue: 'border-primary/40 bg-primary/10',
    violet: 'border-purple-400/40 bg-purple-400/10',
  };

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses[tone] || toneClasses.blue}`}>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/60">{label}</p>
    </div>
  );
}

export default function Admin({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isAuthorized = token === ADMIN_TOKEN || user?.role === 'admin';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/', { replace: true });
    }
  }, [isAuthorized, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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

  useEffect(() => {
    if (!isAuthorized) return undefined;
    loadPayments();
    const interval = window.setInterval(() => loadPayments(true), 30000);
    return () => window.clearInterval(interval);
  }, [isAuthorized, loadPayments]);

  const pendingPayments = useMemo(
    () => payments.filter((payment) => isPendingPaymentStatus(payment.status)),
    [payments]
  );
  const stats = useMemo(() => computePaymentStats(payments), [payments]);

  const handleValidate = async (payment) => {
    setActionId(payment.id);
    try {
      await updatePaymentRequest(payment.id, {
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: 'admin',
      });
      await markScanPaid(payment.scan_id);
      try {
        await sendConfirmPayment({
          payment_code: payment.payment_code,
          user_email: payment.user_email,
          scan_id: payment.scan_id,
          url_to_audit: payment.url_to_audit,
        });
      } catch {}
      setToast({ type: 'success', message: 'Paiement valide. Email envoye au client.' });
      await loadPayments(true);
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Validation impossible.' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingPayment || !rejectionReason.trim()) {
      setToast({ type: 'error', message: 'Veuillez saisir une raison de rejet.' });
      return;
    }

    setActionId(rejectingPayment.id);
    try {
      await updatePaymentRequest(rejectingPayment.id, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
      });
      try {
        await sendRejectPayment({
          user_email: rejectingPayment.user_email,
          rejection_reason: rejectionReason.trim(),
        });
      } catch {}
      setToast({ type: 'success', message: 'Paiement rejete. Email envoye au client.' });
      setRejectingPayment(null);
      setRejectionReason('');
      await loadPayments(true);
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Rejet impossible.' });
    } finally {
      setActionId(null);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1E] px-4 py-10">
      <ToastMessage toast={toast} />
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#111827] px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
            >
              <ArrowLeft size={14} />
              Retour à l'accueil
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
              <ShieldAlert size={14} />
              ACCES PRIVE
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">Panel Admin Webisafe</h1>
            <p className="mt-2 text-sm text-white/50">Paiements Wave en attente de validation</p>
          </div>
          <div className="self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70">
            Auto-refresh 30s
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard tone="orange" value={pendingPayments.length} label="En attente" />
          <StatCard tone="green" value={stats.validatedTodayCount} label="Valides aujourd'hui" />
          <StatCard tone="blue" value={formatFcfa(stats.dailyRevenue)} label="CA du jour" />
          <StatCard tone="violet" value={stats.totalDelivered} label="Audits livres" />
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-warning">En attente de verification</h2>
            <button
              type="button"
              onClick={() => loadPayments(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:bg-white/10"
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={28} />
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-center text-white/40">
              Aucun paiement en attente
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-yellow-500/30 bg-[#1E293B] p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-primary">{payment.payment_code}</p>
                      <p className="mt-2 text-xs text-white/40">{getRelativeTimeLabel(payment.created_at)}</p>
                    </div>
                    <div className="inline-flex w-fit items-center rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                      EN ATTENTE
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-white/50">Site a auditer</p>
                      <p className="mt-1 break-all text-white">{payment.url_to_audit}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Numero Wave client</p>
                      <p className="mt-1 text-white">{payment.wave_phone || 'Non renseigne'}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Email client</p>
                      <p className="mt-1 break-all text-white">{payment.user_email || 'Non renseigne'}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Montant</p>
                      <p className="mt-1 font-semibold text-green-400">{formatFcfa(payment.amount || 0)}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={actionId === payment.id}
                      onClick={() => handleValidate(payment)}
                      className="flex-1 rounded-xl bg-success px-5 py-3 font-bold text-white transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      disabled={actionId === payment.id}
                      onClick={() => setRejectingPayment(payment)}
                      className="rounded-xl border border-danger/40 px-6 py-3 font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#111827]">
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className="flex w-full items-center justify-between px-6 py-5 text-left"
          >
            <span className="text-lg font-bold text-white">Historique - Derniers 20 paiements</span>
            <span className="text-sm text-white/50">{showHistory ? 'Masquer' : 'Afficher'}</span>
          </button>

          {showHistory && (
            <div className="overflow-x-auto border-t border-white/10 px-6 py-5">
              <table className="min-w-full text-left text-sm">
                <thead className="text-white/40">
                  <tr>
                    <th className="pb-3 pr-4">Code</th>
                    <th className="pb-3 pr-4">Site</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Montant</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map((payment) => (
                    <tr key={payment.id} className="border-t border-white/5 text-white/80">
                      <td className="py-3 pr-4 font-medium text-primary">{payment.payment_code}</td>
                      <td className="py-3 pr-4">{payment.url_to_audit}</td>
                      <td className="py-3 pr-4">{payment.user_email}</td>
                      <td className="py-3 pr-4">{formatFcfa(payment.amount || 0)}</td>
                      <td className="py-3 pr-4">{payment.status}</td>
                      <td className="py-3">{new Date(payment.created_at).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-right text-xs text-white/40">
          Actualise a {lastRefreshedAt.toLocaleTimeString('fr-FR')}
        </p>
      </div>

      {rejectingPayment && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-danger/30 bg-[#111827] p-6">
            <h2 className="text-xl font-bold text-white">Raison du rejet</h2>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Expliquez pourquoi le paiement n'a pas pu etre confirme."
              className="mt-5 min-h-[150px] w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-white placeholder:text-white/30"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRejectingPayment(null);
                  setRejectionReason('');
                }}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionId === rejectingPayment.id}
                className="rounded-xl bg-danger px-5 py-3 text-sm font-bold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
