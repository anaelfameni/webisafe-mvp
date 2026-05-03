import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-black/20 border-t border-white/5 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Webisafe" className="h-6" loading="lazy" onError={e => e.target.style.display='none'} />
            <span className="text-white/60 text-sm">
              © 2026 Webisafe. Tous droits réservés.
            </span>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm justify-center">
            <Link to="/cgu" className="text-white/40 hover:text-white/70 transition-colors">CGU</Link>
            <Link to="/confidentialite" className="text-white/40 hover:text-white/70 transition-colors">Confidentialité</Link>
            <Link to="/a-propos" className="text-white/40 hover:text-white/70 transition-colors">À propos</Link>
            <a href="mailto:webisafe@gmail.com" className="text-white/40 hover:text-white/70 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3 text-white/30 text-xs">
            <span>🔒 SSL Sécurisé</span>
            <span>•</span>
            <span>🌍 Fait à Abidjan</span>
            <span>•</span>
            <span>💳 Wave Money</span>
          </div>

        </div>
      </div>
    </footer>
  );
}