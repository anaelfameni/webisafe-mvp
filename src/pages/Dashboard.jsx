import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, ExternalLink, Handshake, Plus, Trash2, Users } from 'lucide-react';
import { useScans } from '../hooks/useScans';
import { getScoreBadge, getScoreColor } from '../utils/calculateScore';
import { formatDate, extractDomain } from '../utils/validators';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { scans, deleteScan, isPaid } = useScans();

  const partnerRequested = Boolean(location.state?.partnerRequested);
  const isPartner = false;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const averageScore = useMemo(() => {
    if (scans.length === 0) return '—';
    return Math.round(scans.reduce((sum, scan) => sum + (scan.scores?.global || 0), 0) / scans.length);
  }, [scans]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connexion requise</h2>
          <p className="text-text-secondary mb-6">
            Connectez-vous pour accéder à votre tableau de bord.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            Bonjour, {user.name?.split(' ')[0]}
          </h1>
          <p className="text-text-secondary">Voici votre tableau de bord Webisafe</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Scans effectués</p>
            <p className="text-2xl font-bold text-white">{scans.length}</p>
          </div>
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Rapports premium</p>
            <p className="text-2xl font-bold text-primary">{scans.filter((scan) => isPaid(scan.id)).length}</p>
          </div>
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Score moyen</p>
            <p className="text-2xl font-bold text-white">{averageScore}</p>
          </div>
          <div className="bg-card-bg border border-border-color rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-1">Plan</p>
            <p className="text-lg font-bold text-success capitalize">{user.plan || 'free'}</p>
          </div>
        </motion.div>

        {!isPartner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            {!partnerRequested ? (
              <div className="bg-gradient-to-br from-success/10 via-card-bg to-primary/10 border border-success/20 rounded-2xl p-6">
                <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold mb-3">
                      <Users size={14} />
                      Programme partenaire
                    </p>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Recommandez Webisafe et gagnez jusqu'à 50% de commission sur chaque audit premium.
                    </h3>
                    <p className="text-text-secondary text-sm">
                      Si vous accompagnez des entreprises, des clients ou des prospects, vous pouvez
                      transformer vos recommandations en revenu complémentaire avec notre programme
                      partenaire.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/partenaire/confirmation')}
                    className="px-6 py-3 bg-success hover:bg-success/90 text-white rounded-full font-semibold transition-all self-start lg:self-center"
                  >
                    Devenir partenaire
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/20 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Handshake size={22} className="text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Demande de partenariat envoyée</h4>
                    <p className="text-text-secondary text-sm">
                      Merci pour votre demande. Un membre de Webisafe vous contactera dans les 24h
                      pour finaliser le partenariat et vous transmettre votre lien de referral.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Link
            to="/"
            className="flex items-center justify-center gap-2 py-4 bg-primary/10 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-medium hover:bg-primary/20 transition-all"
          >
            <Plus size={20} />
            Lancer un nouveau scan
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Historique des scans</h2>

          {scans.length === 0 ? (
            <div className="bg-card-bg border border-border-color rounded-2xl p-12 text-center">
              <BarChart3 size={48} className="text-text-secondary/30 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Aucun scan effectué</h3>
              <p className="text-text-secondary text-sm mb-6">
                Lancez votre premier audit gratuit pour commencer
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-all"
              >
                Scanner un site
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan, index) => {
                const paid = isPaid(scan.id);
                const badge = getScoreBadge(scan.scores?.global || 0);
                const scoreColor = getScoreColor(scan.scores?.global || 0);

                return (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card-bg border border-border-color rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-hover"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}
                      >
                        {scan.scores?.global || '—'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-sm truncate">{extractDomain(scan.url)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-text-secondary text-xs">
                            {formatDate(scan.scanDate || scan.savedAt)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                          {paid && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Premium
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            paid ? `/rapport/${scan.id}` : `/analyse?url=${encodeURIComponent(scan.url)}`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-all"
                      >
                        <ExternalLink size={14} />
                        {paid ? 'Rapport' : 'Voir'}
                      </button>
                      <button
                        onClick={() => deleteScan(scan.id)}
                        className="p-2 text-text-secondary hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
