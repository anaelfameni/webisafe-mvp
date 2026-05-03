import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-navy flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl mb-6">🔍</div>
        <h1 className="text-4xl font-bold text-white mb-3">Page introuvable</h1>
        <p className="text-white/50 mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <Link
          to="/"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-full transition-all"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
