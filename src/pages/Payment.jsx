import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import ToastMessage from '../components/ToastMessage';
import { useScans } from '../hooks/useScans';
import { createPaymentRequest, fetchLatestPaymentRequest, markScanPaid, notifyAdmin, updatePaymentRequest } from '../utils/paymentApi';
import { isValidEmail, normalizeURL } from '../utils/validators';
import { WAVE_PAYMENT_AMOUNT, WAVE_PAYMENT_TOTAL, WAVE_PHONE_DISPLAY, formatFcfa, generateWavePaymentCode, getWaveBusinessLink } from '../utils/wavePayment';

function PaymentStep({ icon, text }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#0F172A]/60 px-4 py-3">
      <span className="mt-0.5 text-lg text-primary">{icon}</span>
      <p className="text-sm leading-6 text-white/80">{text}</p>
    </div>
  );
}

export default function Payment({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getScan, markAsPaid } = useScans();

  const scanId = searchParams.get('scan_id') || '';
  const urlToAudit = normalizeURL(searchParams.get('url') || '');
  const scan = useMemo(() => (scanId ? getScan(scanId) : null), [getScan, scanId]);
  const defaultEmail = user?.email || scan?.email || '';

  const [paymentRequest, setPaymentRequest] = useState(null);
  const [wavePhone, setWavePhone] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [showManualFallback, setShowManualFallback] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), toast.duration ?? 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!scanId || !urlToAudit) {
        setLoading(false);
        return;
      }

      try {
        const latestRequest = await fetchLatestPaymentRequest(scanId);
        if (!active) return;

        if (latestRequest && latestRequest.status !== 'rejected') {
          setPaymentRequest(latestRequest);
          setEmail((current) => current || latestRequest.user_email || defaultEmail);
          setWavePhone(latestRequest.wave_phone || '');
        } else {
          // Pas de sauvegarde en base tant que le client n'a pas cliqué 'J'ai payé'
          if (!active) return;
          setPaymentRequest({
            id: null,
            payment_code: generateWavePaymentCode(),
            scan_id: scanId,
            user_email: defaultEmail || null,
            url_to_audit: urlToAudit,
            amount: WAVE_PAYMENT_TOTAL,
            status: 'pending',
          });
        }
      } catch {
        if (!active) return;
        setPaymentRequest({
          id: null,
          payment_code: generateWavePaymentCode(),
          scan_id: scanId,
          user_email: defaultEmail || null,
          url_to_audit: urlToAudit,
          amount: WAVE_PAYMENT_TOTAL,
          status: 'pending',
        });
        setToast({ type: 'error', message: 'Erreur reseau. Reessayez.' });
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [defaultEmail, scanId, urlToAudit]);

  const handleCopy = async (value, message) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast({ type: 'success', message });
    } catch {
      setToast({ type: 'error', message: 'Copie impossible. Reessayez.' });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!wavePhone.trim()) {
      errors.wavePhone = 'Veuillez renseigner votre numero Wave.';
    }
    if (!email.trim()) {
      errors.email = 'Veuillez renseigner votre email.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Veuillez saisir un email valide.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm() || !paymentRequest) {
      setToast({ type: 'error', message: 'Veuillez corriger les champs en rouge.' });
      return;
    }

    setSubmitting(true);

    try {
      let currentRequest = paymentRequest;

      if (!currentRequest.id) {
        // Création dans la base UNIQUEMENT au clic sur 'J'ai payé'
        currentRequest = await createPaymentRequest({
          payment_code: currentRequest.payment_code,
          scan_id: scanId,
          user_email: email,
          url_to_audit: urlToAudit,
          amount: WAVE_PAYMENT_TOTAL,
          status: 'waiting_validation',
          wave_phone: wavePhone,
        });
      } else {
        currentRequest =
          (await updatePaymentRequest(currentRequest.id, {
            wave_phone: wavePhone,
            user_email: email,
            status: 'waiting_validation',
          })) || currentRequest;
      }

      setPaymentRequest(currentRequest);

      // Notification admin envoyée UNIQUEMENT au clic sur 'J'ai payé'
      try {
        await notifyAdmin({
          payment_code: currentRequest.payment_code,
          user_email: email,
          url_to_audit: urlToAudit,
          wave_phone: wavePhone,
          scan_id: scanId,
        });
      } catch {
        // Échec silencieux de la notification admin
      }

      setSubmitted(true);
    } catch {
      setToast({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!scanId || !urlToAudit) {
    return (
      <div className="min-h-screen px-4 pt-28">
        <div className="mx-auto max-w-md rounded-[28px] border border-danger/30 bg-card-bg p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Paiement indisponible</h1>
          <p className="mt-4 text-sm text-white/70">
            Lien incomplet. Relancez un scan puis revenez sur la page de paiement.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !paymentRequest) {
    return (
      <div className="min-h-screen px-4 pt-28">
        <div className="mx-auto max-w-md rounded-[28px] border border-primary/20 bg-card-bg p-10 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={34} />
          <p className="text-sm text-white/70">Preparation de votre paiement Wave...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-16">
        <ToastMessage toast={toast} />
        <div className="mx-auto max-w-md rounded-[28px] border border-[#1566F0]/30 bg-card-bg p-8 text-center shadow-2xl shadow-black/30">
          <CheckCircle2 className="mx-auto text-green-400" size={72} />
          <h1 className="mt-5 text-2xl font-bold text-white">Demande recue !</h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Votre paiement a bien ete signale. Votre rapport sera disponible des que le paiement
            sera valide par notre support. Vous recevrez un email des que c&apos;est pret.
          </p>
          <p className="mt-5 text-primary font-semibold">Votre code : {paymentRequest.payment_code}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 w-full rounded-xl bg-primary px-5 py-4 text-lg font-bold text-white transition hover:bg-primary-hover"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <ToastMessage toast={toast} />
      <div className="mx-auto max-w-md rounded-[28px] border border-[#1566F0]/30 bg-card-bg p-8 shadow-2xl shadow-black/30">
        {/* Bouton bypass ADMIN uniquement */}
        {user?.role === 'admin' && scanId && (
          <div className="mb-6 rounded-2xl border-2 border-orange-500/40 bg-orange-500/10 p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-2">⚙️ Mode Admin</p>
            <p className="text-sm text-white/70 mb-4">Accédez directement à l'audit premium sans paiement.</p>
            <button
              onClick={async () => {
                await markScanPaid(scanId);
                markAsPaid(scanId);
                navigate(`/rapport/${scanId}`, { state: { adminBypass: true } });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-3 text-sm font-bold text-white transition"
            >
              <ShieldCheck size={16} />
              Voir l'audit premium (Admin)
            </button>
          </div>
        )}

        <div className="text-center">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-full bg-primary/10 px-4 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-white">W</div>
            <div className="text-left">
              <p className="text-base font-bold text-white">Paiement securisé</p>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Wave Business</p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={14} />
            Validation sous 2h ouvrées
          </div>

          <p className="mt-4 text-sm italic text-white/70">
            Votre rapport pour : <span className="break-all">{urlToAudit}</span>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-5xl font-bold text-white">{formatFcfa(paymentRequest.amount)}</p>
          <p className="mt-2 text-sm text-white/50">Audit Premium Webisafe — One-time</p>
        </div>

        {/* ── Bouton Wave Business ── */}
        <div className="mt-8">
          <a
            href={getWaveBusinessLink('audit')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1B4DB6] px-6 py-4 text-lg font-bold text-white shadow-lg shadow-blue-900/30 transition hover:bg-[#1640A0]"
          >
            <Smartphone size={22} />
            Payer {formatFcfa(paymentRequest.amount)} avec Wave
          </a>
          <p className="mt-3 text-center text-xs text-white/40">
            Le lien ouvre l&apos;application Wave sur votre téléphone. Le montant est déjà prérempli.
          </p>
        </div>

        {/* ── Référence discrète ── */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F172A]/40 p-4 text-center">
          <p className="text-xs text-white/40">Votre référence de commande</p>
          <p className="mt-1 text-xl font-bold tracking-widest text-primary">{paymentRequest.payment_code}</p>
          <button
            type="button"
            onClick={() => handleCopy(paymentRequest.payment_code, 'Code copié !')}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-primary transition"
          >
            <Copy size={12} /> Copier
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">Apres paiement</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Votre numéro Wave (pour valider rapidement) :
            </label>
            <input
              type="tel"
              value={wavePhone}
              onChange={(event) => {
                setWavePhone(event.target.value);
                setFieldErrors((current) => ({ ...current, wavePhone: '' }));
              }}
              placeholder="+225 07 00 00 00 00"
              className={`w-full rounded-xl border bg-[#0F172A] px-4 py-3 text-white placeholder:text-white/30 ${
                fieldErrors.wavePhone ? 'border-danger' : 'border-white/20 focus:border-primary'
              }`}
            />
            {fieldErrors.wavePhone && <p className="mt-2 text-xs text-danger">{fieldErrors.wavePhone}</p>}
            <p className="mt-2 text-xs text-white/40">
              Nous croisons ce numéro avec votre paiement Wave pour une validation instantanée.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">Votre email :</label>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: '' }));
              }}
              placeholder="votre@email.com"
              className={`w-full rounded-xl border bg-[#0F172A] px-4 py-3 text-white placeholder:text-white/30 ${
                fieldErrors.email ? 'border-danger' : 'border-white/20 focus:border-primary'
              }`}
            />
            {fieldErrors.email && <p className="mt-2 text-xs text-danger">{fieldErrors.email}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting || !wavePhone.trim() || !email.trim()}
            className="w-full rounded-xl bg-primary px-5 py-4 text-lg font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Soumission en cours...' : "J'ai payé — Valider ma commande"}
          </button>
        </form>

        {/* ── Fallback manuel ── */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowManualFallback((s) => !s)}
            className="text-xs text-white/30 hover:text-white/60 transition underline"
          >
            {showManualFallback ? 'Masquer le paiement manuel' : 'Problème avec le lien ? Payer manuellement'}
          </button>
        </div>

        {showManualFallback && (
          <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#0F172A]/40 p-5">
            <p className="text-sm font-semibold text-white">Paiement manuel</p>
            <div className="rounded-2xl bg-[#1E293B] p-4 text-center">
              <p className="text-2xl font-bold text-primary">{WAVE_PHONE_DISPLAY}</p>
              <button
                type="button"
                onClick={() => handleCopy(WAVE_PHONE_DISPLAY, 'Numéro copié !')}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
              >
                <Copy size={16} />
                Copier le numéro
              </button>
            </div>
            <div className="space-y-3">
              <PaymentStep icon="1" text="Ouvrez Wave puis choisissez Envoyer de l'argent." />
              <PaymentStep icon="2" text={`Entrez ${WAVE_PHONE_DISPLAY} et ${formatFcfa(WAVE_PAYMENT_TOTAL)}.`} />
              <PaymentStep icon="3" text={`Dans Note/Motif, collez le code ${paymentRequest.payment_code}.`} />
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F172A]/60 px-4 py-4 text-sm text-white/60">
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="mt-0.5 text-primary" />
            <p>Revenez dans votre tableau de bord pour suivre l&apos;état de votre paiement.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
