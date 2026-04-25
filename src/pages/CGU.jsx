import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CGU() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-dark-navy py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-white/40 hover:text-white text-sm mb-8 inline-block transition-colors">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-white/40 text-sm mb-10">Dernière mise à jour : Avril 2026</p>

        <div className="space-y-8 text-white/70 text-sm leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
              de Webisafe, plateforme d'audit de sites web accessible à l'adresse{' '}
              <a href="https://webisafe.vercel.app" className="text-primary hover:underline">https://webisafe.vercel.app/</a>,
              éditée par Anael FAMENI, domicilié à Abidjan, Côte d'Ivoire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description du service</h2>
            <p>
              Webisafe propose des audits automatisés de sites web analysant quatre dimensions :
              la performance de chargement, la sécurité, le référencement naturel (SEO) et
              l'expérience utilisateur mobile. Les résultats sont fournis sous forme de scores
              et de recommandations prioritaires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Accès au service</h2>
            <p>
              Une analyse de base est accessible gratuitement. L'accès au rapport complet
              (PDF, plan d'action détaillé, rescan à 30 jours) est conditionné au
              paiement de 35 000 FCFA via Wave Money ou tout autre moyen accepté par la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Responsabilité</h2>
            <p>
              Les résultats fournis par Webisafe sont indicatifs et basés sur des analyses
              automatisées. Webisafe ne garantit pas l'exhaustivité ni la parfaite exactitude
              des analyses et décline toute responsabilité pour les décisions prises sur la
              base de ces résultats. L'utilisateur reste seul responsable de l'interprétation
              et de l'application des recommandations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de la plateforme Webisafe (algorithmes, interfaces, rapports,
              textes, logo) est la propriété exclusive d'Anael FAMENI. Toute reproduction,
              même partielle, est interdite sans autorisation écrite préalable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit ivoirien. Tout litige relatif à leur
              interprétation ou exécution relève de la compétence exclusive des tribunaux
              d'Abidjan, Côte d'Ivoire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU :{' '}
              <a href="mailto:webisafe@gmail.com" className="text-primary hover:underline">
                webisafe@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}