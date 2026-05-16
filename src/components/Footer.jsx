import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, LEGAL_ENTITY } from '../config/brand';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-black/20 border-t border-white/5 py-10 px-4 mt-16">
      <div className="max-w-6xl mx-auto">
        {/* Top row : logo + nav principale + nav secondaire */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & description */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-3">
              <img src="/logo.svg" alt="Webisafe" className="h-8" loading="lazy" />
              <span className="text-lg font-bold text-white">
                Webi<span className="text-primary">safe</span>
              </span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed">
              Plateforme d'audit automatisé de sites web pour PME africaines : sécurité,
              performance, SEO et UX mobile.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Produit</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-white/50 hover:text-white transition-colors">Audit gratuit</Link></li>
              <li><Link to="/protect" className="text-white/50 hover:text-white transition-colors">Webisafe Protect</Link></li>
              <li><Link to="/protect/status" className="text-white/50 hover:text-white transition-colors">Statut plateforme</Link></li>
              <li><Link to="/tarifs" className="text-white/50 hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/white-label" className="text-white/50 hover:text-white transition-colors">White Label (agences)</Link></li>
              <li><Link to="/partenaire" className="text-white/50 hover:text-white transition-colors">Programme partenaire</Link></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Entreprise</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/a-propos" className="text-white/50 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/ressources" className="text-white/50 hover:text-white transition-colors">Ressources & articles</Link></li>
              <li><Link to="/contact" className="text-white/50 hover:text-white transition-colors">Contact</Link></li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white/50 hover:text-white transition-colors">
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Légal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/cgu" className="text-white/50 hover:text-white transition-colors">CGU</Link></li>
              <li><Link to="/confidentialite" className="text-white/50 hover:text-white transition-colors">Confidentialité</Link></li>
              {/* Liens masqués à la demande client : security.txt et sitemap restent accessibles directement par URL. */}
              {/* <li><a href="/.well-known/security.txt" className="text-white/50 hover:text-white transition-colors">Sécurité (security.txt)</a></li> */}
              {/* <li><a href="/sitemap.xml" className="text-white/50 hover:text-white transition-colors">Plan du site</a></li> */}
            </ul>
          </div>
        </div>

        {/* Bottom row : copyright + mention légale */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/40">
          <p>
            © {currentYear} Webisafe — Édité par {LEGAL_ENTITY.name}, {LEGAL_ENTITY.city}, {LEGAL_ENTITY.country}.
          </p>
          <p>
            Tous droits réservés · <Link to="/cgu" className="hover:text-white/70 transition-colors">CGU</Link> · <Link to="/confidentialite" className="hover:text-white/70 transition-colors">RGPD</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}