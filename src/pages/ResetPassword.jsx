import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPasswordByCode } = useAuth();

  const code = searchParams.get('code') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [linkValid, setLinkValid] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!code) {
        setError('Lien de réinitialisation invalide ou expiré.');
        setVerifying(false);
        return;
      }
      setLinkValid(true);
      setVerifying(false);
    }
    verify();
  }, [code]);

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

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordByCode(code, newPassword);
      if (!result.success) {
        setLoading(false);
        setError(result.error || 'Erreur lors de la réinitialisation.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    }
    setLoading(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy text-white">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-primary" />
          <p className="text-white/60 text-sm">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border-color rounded-2xl p-8 max-w-md w-full text-center"
        >
          <CheckCircle2 size={48} className="text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Mot de passe réinitialisé</h1>
          <p className="text-white/60 text-sm mb-6">
            Votre mot de passe a été changé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <button
            onClick={() => navigate('/?auth=login')}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition"
          >
            Se connecter
          </button>
        </motion.div>
      </div>
    );
  }

  if (error && !linkValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card-bg border border-border-color rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-danger" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Lien invalide</h1>
          <p className="text-white/60 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
          >
            <ArrowLeft size={14} /> Retour à l'accueil
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-navy px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border border-border-color rounded-2xl p-8 max-w-md w-full"
      >
        <h1 className="text-xl font-bold text-white mb-1">Nouveau mot de passe</h1>
        <p className="text-white/50 text-sm mb-6">Créez un nouveau mot de passe pour votre compte.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-text-secondary text-sm mb-1 block">Nouveau mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.level / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary">{passwordStrength.label}</span>
                </div>
                <p className="text-[10px] text-text-secondary/70 mt-1">
                  8 caractères minimum, avec majuscule, minuscule et chiffre.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-text-secondary text-sm mb-1 block">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
