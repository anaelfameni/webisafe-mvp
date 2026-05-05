/**
 * Error Boundary React
 * Capture les erreurs JavaScript dans l'arbre des composants enfants
 * Affiche une UI de secours quand une erreur se produit
 */

import { Component } from 'react';
import { captureError } from '../lib/sentry';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Capturer l'erreur dans Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Logger dans la console en développement
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Recharger la page pour réinitialiser l'état de l'application
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-dark-navy flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card-bg rounded-lg border border-border-color p-8 text-center">
            <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Oups, une erreur s'est produite
            </h1>
            
            <p className="text-text-secondary mb-6">
              Nous sommes désolés, quelque chose s'est mal passé. L'erreur a été 
              signalée à notre équipe technique.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-danger cursor-pointer mb-2">
                  Détails de l'erreur (dev only)
                </summary>
                <pre className="bg-dark-navy p-3 rounded text-xs text-text-secondary overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Réessayer
              </button>
              
              <a
                href="/"
                className="w-full bg-card-hover text-text-primary font-medium py-3 px-4 rounded-lg transition-colors text-center"
              >
                Retour à l'accueil
              </a>
            </div>

            <p className="text-xs text-text-secondary mt-6">
              Si le problème persiste, contactez-nous à{' '}
              <a href="mailto:support@webisafe.ci" className="text-primary hover:underline">
                support@webisafe.ci
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
