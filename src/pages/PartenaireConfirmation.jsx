import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle } from 'lucide-react';

const partnerProfileQuestions = [
  {
    id: 'profileType',
    label: 'Quel est votre profil ?',
    type: 'select',
    options: ['Indépendant', 'Agence web', 'Consultant marketing', 'Freelance SEO', 'Développeur', 'Autre'],
  },
  {
    id: 'clientVolume',
    label: 'Combien de clients ou prospects web accompagnez-vous par mois ?',
    type: 'select',
    options: ['0 à 5', '6 à 15', '16 à 30', '31 et plus'],
  },
  {
    id: 'goal',
    label: 'Pourquoi voulez-vous rejoindre le programme partenaire ?',
    type: 'select',
    options: ['Générer des commissions', 'Ajouter un service à mon offre', 'Revendre des audits', 'Tester le programme'],
  },
  {
    id: 'market',
    label: 'Quels types de clients ciblez-vous principalement ?',
    type: 'text',
    placeholder: 'PME, e-commerce, institutions, startups...',
  },
  {
    id: 'notes',
    label: 'Comment comptez-vous recommander Webisafe ?',
    type: 'textarea',
    placeholder: 'Expliquez brièvement votre approche : réseau, prospection, accompagnement, contenu...',
  },
];

export default function PartenaireConfirmation({ user }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState(
    Object.fromEntries(partnerProfileQuestions.map((question) => [question.id, '']))
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (!user) {
    navigate('/?auth=signup');
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const hasEmptyField = partnerProfileQuestions.some(
      (question) => !String(answers[question.id] || '').trim()
    );

    if (hasEmptyField) {
      setError('Merci de répondre à toutes les questions avant de continuer.');
      return;
    }

    navigate('/dashboard', { state: { partnerRequested: true } });
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10 mb-4">
            <CheckCircle size={28} className="text-success" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            Confirmation de partenariat
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Répondez à ces quelques questions pour que l'équipe Webisafe comprenne votre profil et
            finalise votre intégration au programme partenaire.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-card-bg border border-border-color rounded-2xl p-6 space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerProfileQuestions.map((question) => (
              <div key={question.id} className={question.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="text-text-secondary text-sm mb-1 block">{question.label}</label>
                {question.type === 'select' ? (
                  <div className="relative">
                    <Briefcase
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                    />
                    <select
                      value={answers[question.id]}
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white focus:outline-none focus:border-success transition-colors text-sm"
                    >
                      <option value="">Sélectionnez une réponse</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : question.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    value={answers[question.id]}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                    }
                    placeholder={question.placeholder}
                    className="w-full px-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-success transition-colors text-sm resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={answers[question.id]}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                    }
                    placeholder={question.placeholder}
                    className="w-full px-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-success transition-colors text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-danger text-sm text-center bg-danger/10 rounded-lg p-2">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="relative overflow-hidden px-6 py-3 bg-success hover:bg-success/90 text-white rounded-full font-semibold transition-all btn-glow"
            >
              <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_2.7s_infinite]" />
              <span className="relative z-10">Envoyer ma demande</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 border border-border-color text-text-secondary hover:text-white rounded-full transition-all"
            >
              Retour au dashboard
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
