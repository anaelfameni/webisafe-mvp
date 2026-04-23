import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function APropos() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-dark-navy py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-white/40 hover:text-white text-sm mb-8 inline-block transition-colors">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">À propos de Webisafe</h1>
        <p className="text-white/40 text-sm mb-10">Fait à Abidjan, pour l'Afrique 🇨🇮</p>

        <div className="space-y-8 text-white/70 text-sm leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Le problème qu'on résout</h2>
            <p>
              En Côte d'Ivoire et dans toute l'Afrique de l'Ouest, des milliers de PME ont
              des sites web lents, non sécurisés, invisibles sur Google. Elles n'ont pas les
              moyens de payer une agence, ni le temps de comprendre des rapports techniques complexes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Notre réponse</h2>
            <p>
              Webisafe est un outil d'audit automatisé qui analyse votre site en moins de
              60 secondes et vous donne un score clair, des recommandations concrètes et un
              plan d'action priorisé sans jargon, sans agence, à un prix adapté au marché local.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Qui sommes-nous</h2>
            <p>
              Webisafe est développé par Anael FAMENI, développeur basé à Abidjan.
              Le projet est né d'un constat simple : les outils d'audit existants sont
              pensés pour l'Europe ou les États-Unis, pas pour les PME africaines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              <a href="mailto:webisafe@gmail.com" className="text-primary hover:underline">
                webisafe@gmail.com
              </a>
              <br />
              WhatsApp : <a href="https://wa.me/2250595335662" className="text-primary hover:underline">+225 05 95 33 56 62</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}