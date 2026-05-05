/**
 * Page d'erreur utilisateur-friendly
 * Affichée pour les erreurs 404, 500, etc.
 */

import { Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw, Mail } from 'lucide-react';

export default function ErrorPage({ 
  code = 500, 
  title = 'Une erreur est survenue',
  message = 'Nous sommes désolés, quelque chose s\'est mal passé.',
  showRetry = true 
}) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-dark-navy flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-card-bg rounded-2xl border border-border-color p-8 text-center">
          {/* Icône d'erreur */}
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-danger" />
          </div>

          {/* Code d'erreur */}
          {code && (
            <div className="text-6xl font-bold text-primary mb-2">{code}</div>
          )}

          {/* Titre */}
          <h1 className="text-2xl font-bold text-text-primary mb-3">
            {title}
          </h1>

          {/* Message */}
          <p className="text-text-secondary mb-8">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && (
              <button
                onClick={handleRetry}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            )}

            <Link
              to="/"
              className="flex items-center justify-center gap-2 bg-card-hover hover:bg-border-color text-text-primary font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Accueil
            </Link>
          </div>

          {/* Contact */}
          <div className="mt-8 pt-6 border-t border-border-color">
            <p className="text-sm text-text-secondary mb-3">
              Le problème persiste ? Contactez notre équipe :
            </p>
            <a
              href="mailto:support@webisafe.ci"
              className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <Mail className="w-4 h-4" />
              support@webisafe.ci
            </a>
          </div>

          {/* Informations additionnelles en dev */}
          {import.meta.env.DEV && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-text-secondary cursor-pointer mb-2">
                Informations de développement
              </summary>
              <div className="bg-dark-navy p-3 rounded text-xs text-text-secondary">
                <p>Code: {code}</p>
                <p>Mode: {import.meta.env.MODE}</p>
                <p>Time: {new Date().toISOString()}</p>
              </div>
            </details>
          )}
        </div>

        {/* Footer simple */}
        <div className="text-center mt-6 text-xs text-text-secondary">
          <Link to="/cgu" className="hover:text-primary transition-colors">
            CGU
          </Link>
          {' • '}
          <Link to="/confidentialite" className="hover:text-primary transition-colors">
            Confidentialité
          </Link>
        </div>
      </div>
    </div>
  );
}

// Page d'erreur 404 spécifique
export function NotFoundPage() {
  return (
    <ErrorPage
      code={404}
      title="Page non trouvée"
      message="La page que vous recherchez n'existe pas ou a été déplacée."
      showRetry={false}
    />
  );
}

// Page d'erreur 500 spécifique
export function ServerErrorPage() {
  return (
    <ErrorPage
      code={500}
      title="Erreur serveur"
      message="Nos serveurs rencontrent des difficultés. L'équipe technique a été notifiée."
      showRetry={true}
    />
  );
}
