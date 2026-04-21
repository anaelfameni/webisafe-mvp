import { Link } from 'react-router-dom';
import { MessageCircle, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark-navy border-t border-border-color">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-lg">
                W
              </div>
              <span className="text-xl font-bold text-white">
                Webi<span className="text-primary">safe</span>
              </span>
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              Le diagnostic web de l'Afrique. Analysez, comprenez et ameliorez votre presence en ligne.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://linkedin.com/company/webisafe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-card-bg border border-border-color rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a
                href="https://instagram.com/webisafe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-card-bg border border-border-color rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a
                href="https://wa.me/2250595335662"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-card-bg border border-border-color rounded-lg flex items-center justify-center text-text-secondary hover:text-success hover:border-success/50 transition-all"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Produit</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-text-secondary text-sm hover:text-primary transition-colors">Audit Gratuit</Link></li>
              <li><Link to="/tarifs" className="text-text-secondary text-sm hover:text-primary transition-colors">Rapport Complet</Link></li>
              <li><Link to="/tarifs" className="text-text-secondary text-sm hover:text-primary transition-colors">White Label</Link></li>
              <li><Link to="/tarifs" className="text-text-secondary text-sm hover:text-primary transition-colors">Tarifs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><span className="text-text-secondary text-sm cursor-pointer hover:text-primary transition-colors">Conditions d'utilisation</span></li>
              <li><span className="text-text-secondary text-sm cursor-pointer hover:text-primary transition-colors">Politique de confidentialite</span></li>
              <li><span className="text-text-secondary text-sm cursor-pointer hover:text-primary transition-colors">Mentions legales</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-text-secondary text-sm">
                <Mail size={14} className="text-primary" />
                <a href="mailto:contact@webisafe.ci" className="hover:text-primary transition-colors">contact@webisafe.ci</a>
              </li>
              <li className="flex items-center gap-2 text-text-secondary text-sm">
                <MessageCircle size={14} className="text-success" />
                <a href="https://wa.me/2250595335662" target="_blank" rel="noopener noreferrer" className="hover:text-success transition-colors">
                  WhatsApp
                </a>
              </li>
              <li className="text-text-secondary text-sm mt-2">Abidjan, Cote d'Ivoire</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border-color flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-secondary text-sm">© 2025 Webisafe · Fait a Abidjan, Cote d'Ivoire</p>
          <p className="text-text-secondary/60 text-xs">Paiement securise via Wave · +225 01 70 90 77 80</p>
        </div>
      </div>
    </footer>
  );
}
