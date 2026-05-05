import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config/brand';

export default function Confidentialite() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-dark-navy py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-white/40 hover:text-white text-sm mb-8 inline-block transition-colors">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">
          Politique de Confidentialité
        </h1>
        <p className="text-white/40 text-sm mb-10">Dernière mise à jour : Avril 2026</p>

        <div className="space-y-8 text-white/70 text-sm leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Responsable du traitement</h2>
            <p>
              Anael FAMENI — Abidjan, Côte d'Ivoire<br />
              Contact : <a href="mailto:contact@webisafe.tech" className="text-primary hover:underline">contact@webisafe.tech</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Données collectées</h2>
            <p>Nous collectons uniquement les données strictement nécessaires au service :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Les URLs soumises pour analyse</li>
              <li>Les adresses email fournies volontairement pour recevoir un rapport</li>
              <li>Les données de paiement traitées exclusivement par Wave Money, nous ne stockons aucune donnée bancaire</li>
              <li>Les données techniques de navigation (adresse IP, navigateur) à des fins de sécurité uniquement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Utilisation des données</h2>
            <p>
              Vos données sont utilisées uniquement pour fournir le service d'audit et vous
              transmettre votre rapport. Nous ne vendons, ne louons et ne partageons pas vos
              données personnelles avec des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Conservation des données</h2>
            <p>
              Les résultats d'audit sont conservés pendant 30 jours puis supprimés
              automatiquement. Les adresses email sont conservées jusqu'à désinscription
              de votre part.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Vos droits</h2>
            <p>
              Conformément aux lois en vigueur en Côte d'Ivoire et au Règlement général
              sur la protection des données (RGPD) applicable aux traitements internationaux,
              vous disposez d'un droit d'accès, de rectification, de suppression et de
              portabilité de vos données personnelles.
            </p>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à :{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
            <p>
              Webisafe n'utilise pas de cookies publicitaires. Des cookies techniques
              strictement nécessaires au fonctionnement du service peuvent être déposés.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}