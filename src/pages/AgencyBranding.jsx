import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Palette, Upload, Save, Loader2, AlertTriangle, CheckCircle2, ArrowLeft,
  Eye, Image as ImageIcon, Type, Mail, Phone, Globe, FileSignature, Trash2,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { isAgencyUser } from '../utils/agencyAccess';

/**
 * T.2 — Page de configuration du branding agence (white label persistant).
 *
 * Permet à un utilisateur de plan "agency" de définir son logo, sa couleur
 * primaire, son nom, ses coordonnées, le footer et la signature qui seront
 * appliqués à ses rapports PDF générés via le pipeline white-label.
 *
 * Affiche une preview live (header + footer simulés) qui se met à jour en
 * temps réel à chaque changement.
 */

const PRESET_COLORS = [
  '#1566F0', // Webisafe primary (bleu)
  '#22C55E', // emerald
  '#A855F7', // violet
  '#EC4899', // rose
  '#F59E0B', // ambre
  '#EF4444', // rouge
  '#0EA5E9', // sky
  '#0F172A', // dark slate
];

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const EMPTY = {
  enabled: true,
  agency_name: '',
  agency_email: '',
  agency_phone: '',
  agency_website: '',
  logo_url: '',
  primary_color: '#1566F0',
  footer_text: '',
  signature: '',
};

export default function AgencyBranding({ user, authLoading = false }) {
  const navigate = useNavigate();
  const [branding, setBranding] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadBranding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/branding', { headers });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Erreur chargement');
      const value = data.branding ? { ...EMPTY, ...data.branding } : EMPTY;
      setBranding(value);
      setInitial(value);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.id) loadBranding();
  }, [authLoading, user?.id, loadBranding]);

  const isDirty = useMemo(() => JSON.stringify(branding) !== JSON.stringify(initial), [branding, initial]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(branding),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Erreur sauvegarde');
      const value = { ...EMPTY, ...data.branding };
      setBranding(value);
      setInitial(value);
      setSuccess('Branding sauvegardé.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [branding]);

  const handleDisable = useCallback(async () => {
    if (!window.confirm('Désactiver votre branding ? Les rapports reviendront au branding Webisafe par défaut.')) {
      return;
    }
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/branding', { method: 'DELETE', headers });
      setBranding({ ...branding, enabled: false });
      setInitial({ ...branding, enabled: false });
      setSuccess('Branding désactivé.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [branding]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <p className="text-white/60">Connectez-vous pour configurer votre branding agence.</p>
      </div>
    );
  }

  if (!isAgencyUser(user)) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="mx-auto max-w-md rounded-3xl border border-warning/20 bg-warning/5 p-8 text-center">
          <ShieldCheck size={32} className="mx-auto mb-3 text-warning" />
          <h1 className="text-lg font-black text-white">Réservé aux agences</h1>
          <p className="mt-2 text-sm text-white/60">
            La configuration du branding white label nécessite un plan agence.
          </p>
          <Link
            to="/white-label"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            Découvrir l'offre Agence
          </Link>
        </div>
      </div>
    );
  }

  const update = (key, val) => setBranding((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            to="/agence"
            className="inline-flex items-center gap-1 text-xs text-white/50 transition hover:text-white"
          >
            <ArrowLeft size={12} /> Retour à la console agence
          </Link>
          <h1 className="mt-2 text-3xl font-black text-white">Branding agence</h1>
          <p className="mt-1 text-sm text-white/60">
            Personnalisez les rapports PDF générés pour vos clients : logo, couleur, signature.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success"
          >
            <CheckCircle2 size={14} /> {success}
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          {/* ── Configuration ───────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-white">
              <Palette size={18} className="text-primary" /> Configuration
            </h2>

            {/* Activation */}
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div>
                <p className="font-bold text-white">Activer le branding agence</p>
                <p className="mt-0.5 text-xs text-white/50">
                  Désactivé : les rapports utilisent le branding Webisafe par défaut.
                </p>
              </div>
              <button
                onClick={() => update('enabled', !branding.enabled)}
                className={`flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                  branding.enabled ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white transition ${
                    branding.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom */}
              <Field label="Nom de l'agence" icon={<Type size={14} />}>
                <input
                  type="text"
                  value={branding.agency_name || ''}
                  onChange={(e) => update('agency_name', e.target.value.slice(0, 200))}
                  placeholder="Ex : Studio XYZ"
                  className={inputCls}
                />
              </Field>

              {/* Logo */}
              <Field
                label="URL du logo (PNG/JPG/SVG)"
                icon={<ImageIcon size={14} />}
                hint="Hébergez votre logo (Cloudinary, Supabase Storage…) et collez l'URL ici."
              >
                <input
                  type="url"
                  value={branding.logo_url || ''}
                  onChange={(e) => update('logo_url', e.target.value.slice(0, 500))}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>

              {/* Couleur */}
              <Field label="Couleur primaire" icon={<Palette size={14} />}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primary_color || '#1566F0'}
                    onChange={(e) => update('primary_color', e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent"
                  />
                  <input
                    type="text"
                    value={branding.primary_color || '#1566F0'}
                    onChange={(e) => update('primary_color', e.target.value.slice(0, 7))}
                    className={`${inputCls} w-32`}
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => update('primary_color', c)}
                        className="h-7 w-7 rounded-lg border-2 transition hover:scale-110"
                        style={{
                          background: c,
                          borderColor: branding.primary_color === c ? '#fff' : 'transparent',
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </Field>

              {/* Coordonnées */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" icon={<Mail size={14} />}>
                  <input
                    type="email"
                    value={branding.agency_email || ''}
                    onChange={(e) => update('agency_email', e.target.value.slice(0, 200))}
                    placeholder="contact@agence.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Téléphone" icon={<Phone size={14} />}>
                  <input
                    type="tel"
                    value={branding.agency_phone || ''}
                    onChange={(e) => update('agency_phone', e.target.value.slice(0, 50))}
                    placeholder="+225 ..."
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Site web" icon={<Globe size={14} />}>
                <input
                  type="url"
                  value={branding.agency_website || ''}
                  onChange={(e) => update('agency_website', e.target.value.slice(0, 500))}
                  placeholder="https://agence.com"
                  className={inputCls}
                />
              </Field>

              {/* Signature & footer */}
              <Field
                label="Signature en fin de rapport"
                icon={<FileSignature size={14} />}
                hint="Affichée juste avant le footer du PDF."
              >
                <textarea
                  rows={2}
                  value={branding.signature || ''}
                  onChange={(e) => update('signature', e.target.value.slice(0, 500))}
                  placeholder="Audit réalisé par l'équipe XYZ — restant à votre disposition."
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <Field
                label="Texte du footer"
                icon={<Type size={14} />}
                hint="Apparaît en bas de chaque page du PDF."
              >
                <textarea
                  rows={2}
                  value={branding.footer_text || ''}
                  onChange={(e) => update('footer_text', e.target.value.slice(0, 500))}
                  placeholder="© 2026 Studio XYZ — Tous droits réservés"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={handleDisable}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/10 disabled:opacity-60"
              >
                <Trash2 size={14} /> Désactiver
              </button>
              <button
                onClick={() => setBranding(initial)}
                disabled={!isDirty}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>

          {/* ── Preview live ───────────────────────────────────────────────── */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-white">
              <Eye size={18} className="text-emerald-300" /> Aperçu live
            </h2>

            <div className="rounded-2xl bg-white p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)]">
              {/* Faux header de rapport */}
              <div
                className="-m-6 mb-5 flex items-center justify-between rounded-t-2xl px-6 py-4"
                style={{
                  background: branding.enabled && branding.primary_color
                    ? `linear-gradient(135deg, ${branding.primary_color} 0%, ${branding.primary_color}cc 100%)`
                    : 'linear-gradient(135deg, #1566F0 0%, #1566F0cc 100%)',
                }}
              >
                <div className="flex items-center gap-3">
                  {branding.enabled && branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="logo"
                      className="h-10 w-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                      <ImageIcon size={18} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">Rapport d'audit</p>
                    <p className="text-base font-black text-white">
                      {(branding.enabled && branding.agency_name) || 'Webisafe'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                  Premium
                </span>
              </div>

              {/* Faux contenu */}
              <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                <AlertTriangle size={11} className="flex-shrink-0 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Aperçu — données fictives
                </span>
              </div>
              <h3 className="mb-1 text-lg font-bold text-slate-900">Score global : 73/100</h3>
              <p className="mb-3 text-sm text-slate-500">
                Audit complet de exemple-client.com — 14 mai 2026
              </p>
              <div className="mb-5 grid grid-cols-4 gap-2">
                {['Sécurité', 'Performance', 'SEO', 'UX'].map((label) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-2 text-center">
                    <div
                      className="text-lg font-bold"
                      style={{
                        color: branding.enabled ? branding.primary_color : '#1566F0',
                      }}
                    >
                      {Math.floor(60 + Math.random() * 30)}
                    </div>
                    <div className="text-[10px] text-slate-400">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  <strong>Recommandation prioritaire :</strong> Activer le HSTS pour renforcer la
                  protection contre les attaques man-in-the-middle.
                </p>
              </div>

              {/* Signature */}
              {branding.enabled && branding.signature && (
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs italic text-slate-500">
                  {branding.signature}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                <span>
                  {(branding.enabled && branding.footer_text) || '© 2026 Webisafe — Tous droits réservés'}
                </span>
                <div className="flex gap-2">
                  {branding.enabled && branding.agency_email && (
                    <span>{branding.agency_email}</span>
                  )}
                  {branding.enabled && branding.agency_phone && (
                    <span>· {branding.agency_phone}</span>
                  )}
                  {branding.enabled && branding.agency_website && (
                    <span>· {branding.agency_website.replace(/^https?:\/\//, '')}</span>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-white/40">
              <strong className="text-white/60">Note :</strong> cet aperçu reflète l'apparence
              de l'en-tête / pied-de-page de vos rapports PDF. Le contenu et les scores réels
              proviennent de chaque audit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none';

function Field({ label, icon, hint, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/50">
        {icon} {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-5 text-white/30">{hint}</p>}
    </div>
  );
}
