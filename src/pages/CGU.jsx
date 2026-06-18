import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, BRAND_URL, LEGAL_LAST_UPDATED, LEGAL_VERSION } from '../config/brand';

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
        <p className="text-white/40 text-sm mb-10">Dernière mise à jour : {LEGAL_LAST_UPDATED} — Version {LEGAL_VERSION}</p>

        <div className="space-y-8 text-white/70 text-sm leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Objet et champ d'application</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation
              de la plateforme Webisafe, service d'audit automatisé de sites web accessible à l'adresse{' '}
              <a href={BRAND_URL} className="text-primary hover:underline">{BRAND_URL}</a>{' '}
              (« le Service » ou « la Plateforme »), édité par Anael FAMENI, micro-entrepreneur établi à Abidjan,
              Côte d'Ivoire (« l'Éditeur »).
            </p>
            <p className="mt-3">
              Toute personne physique ou morale qui accède à la Plateforme (« l'Utilisateur ») reconnaît
              avoir pris connaissance des présentes CGU et les accepter sans réserve.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description du service</h2>
            <p>
              Webisafe propose des audits automatisés de sites web analysant six dimensions :
              la performance de chargement (Core Web Vitals), la sécurité de base (HTTPS, headers, malware),
              la sécurité avancée (CSP, DNSSEC, SRI, sécurité email), le référencement naturel (SEO),
              l'expérience utilisateur mobile et la visibilité IA. Les résultats sont fournis sous
              forme de scores chiffrés (de 0 à 100), de constats détaillés et de recommandations
              priorisées avec un plan d'action 7/30/90 jours.
            </p>
            <p className="mt-3">
              Les analyses sont effectuées en mode passif (consultation publique du site cible),
              sans intrusion ni exploitation de vulnérabilités. L'audit ne constitue pas un test
              d'intrusion (pentest) et ne remplace pas un audit humain approfondi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Accès au service et tarification</h2>
            <p>
              <strong className="text-white">Version gratuite :</strong> une analyse de base avec scores globaux et
              aperçu des principaux problèmes est accessible sans inscription ni frais.
            </p>
            <p className="mt-3">
              <strong className="text-white">Rapport Premium (one-time) :</strong> 35 000 FCFA. Inclut le rapport PDF
              complet (13 pages), le plan d'action détaillé, l'accès en ligne au rapport pendant
              12 mois et un rescan offert dans les 30 jours suivant l'achat.
            </p>
            <p className="mt-3">
              <strong className="text-white">Webisafe Protect (abonnement) :</strong> 15 000 FCFA / mois en
              facturation mensuelle, avec remises immédiates pour les paiements anticipés :{' '}
              <strong className="text-white">-10 % en trimestriel</strong> (40 500 FCFA / 3 mois),{' '}
              <strong className="text-white">-15 % en semestriel</strong> (76 500 FCFA / 6 mois) et{' '}
              <strong className="text-white">-20 % en annuel</strong> (144 000 FCFA / an). L'abonnement
              inclut le monitoring uptime, les rescans hebdomadaires, les alertes critiques et l'accès
              prioritaire au support.
            </p>
            <p className="mt-3">
              <strong className="text-white">Conditions d'annulation Protect :</strong> l'abonnement est
              sans engagement de durée et résiliable à tout moment, par email à{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{' '}
              ou depuis l'espace client. La résiliation prend effet à la fin du mois en cours pour la
              formule mensuelle. Pour les formules trimestrielle, semestrielle et annuelle, le solde
              non consommé est remboursé au prorata des mois entiers restants après application
              du tarif mensuel standard (15 000 FCFA), déduction faite des mois déjà utilisés à tarif
              remisé. Le remboursement est effectué sous 14 jours via le moyen de paiement initial.
            </p>
            <p className="mt-3">
              Les paiements sont traités via Wave Money. Les prix sont indiqués en Francs CFA (XOF) et
              sont fermes et définitifs au moment de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Droit de rétractation</h2>
            <p>
              Conformément aux usages du droit ivoirien et aux pratiques internationales applicables
              aux services numériques, l'Utilisateur dispose d'un <strong className="text-white">délai de rétractation
              de 14 jours calendaires</strong> à compter de la date de souscription pour les abonnements
              Webisafe Protect, sans avoir à justifier de motifs ni à payer de pénalités.
            </p>
            <p className="mt-3">
              <strong className="text-white">Exception pour le rapport Premium one-time :</strong> en application
              des règles applicables aux contenus numériques fournis sur support immatériel, l'Utilisateur
              reconnaît expressément que l'exécution du service commence dès le paiement et la génération
              du rapport. <strong className="text-white">L'Utilisateur renonce expressément à son droit de rétractation</strong> dès
              lors que le rapport PDF a été téléchargé ou que le rapport en ligne a été consulté
              au-delà de la première page.
            </p>
            <p className="mt-3">
              <strong className="text-white">Garantie satisfait ou remboursé (7 jours) :</strong> nonobstant ce qui
              précède, Webisafe applique une garantie commerciale de 7 jours pour le rapport Premium.
              Si l'Utilisateur estime que le rapport ne contient aucune recommandation actionnable,
              il peut demander un remboursement intégral en écrivant à{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{' '}
              en justifiant sa demande. Le remboursement est effectué sous 14 jours via le moyen
              de paiement initial.
            </p>
            <p className="mt-3">
              Pour exercer le droit de rétractation, l'Utilisateur peut adresser un email
              non équivoque à <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{' '}
              comportant : son nom, son email d'inscription, la référence de la commande et la
              demande explicite de rétractation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Garantie de service et niveau de disponibilité (SLA)</h2>
            <p>
              <strong className="text-white">Disponibilité :</strong> Webisafe s'engage à fournir un taux de
              disponibilité cible de <strong className="text-white">99% sur le mois calendaire</strong>, hors maintenances
              planifiées (annoncées au moins 48 heures à l'avance) et cas de force majeure.
            </p>
            <p className="mt-3">
              <strong className="text-white">Délai de réponse support :</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Demandes critiques (Protect) : sous 4 heures ouvrées</li>
              <li>Demandes Premium (rapport one-time) : sous 24 heures ouvrées</li>
              <li>Demandes Free (utilisateurs gratuits) : sous 72 heures ouvrées (effort maximum)</li>
            </ul>
            <p className="mt-3">
              <strong className="text-white">Compensation en cas de manquement :</strong> en cas de non-respect
              du taux de disponibilité de 99% sur un mois donné, les abonnés Webisafe Protect
              bénéficient d'un avoir au prorata de l'indisponibilité constatée, applicable sur la
              prochaine échéance d'abonnement. La demande doit être formulée par email dans les
              30 jours suivant l'incident.
            </p>
            <p className="mt-3">
              <strong className="text-white">Limites de la garantie :</strong> les analyses sont effectuées
              automatiquement, en mode passif et sur la base de signaux observables publiquement.
              Webisafe ne garantit pas l'exhaustivité absolue ni la détection de toutes les
              vulnérabilités existantes. L'absence d'alerte ne constitue pas une preuve d'absence
              de risque.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Obligations de l'Utilisateur</h2>
            <p>L'Utilisateur s'engage à :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Soumettre uniquement des URLs de sites web dont il est propriétaire ou pour lesquels il dispose d'une autorisation explicite</li>
              <li>Ne pas utiliser le Service à des fins illicites, frauduleuses ou portant atteinte à des tiers</li>
              <li>Ne pas tenter de contourner les mesures de sécurité, limites de débit ou systèmes de paiement de la Plateforme</li>
              <li>Fournir des informations de contact (email, numéro Wave) exactes et à jour</li>
              <li>Respecter la propriété intellectuelle de Webisafe et des tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Responsabilité</h2>
            <p>
              Les résultats fournis par Webisafe sont indicatifs et basés sur des analyses
              automatisées passives. Ils ne sauraient se substituer à un audit de sécurité humain
              approfondi (pentest), à une revue de code par un expert ou à un conseil juridique.
            </p>
            <p className="mt-3">
              Webisafe ne pourra en aucun cas être tenu responsable des dommages indirects, pertes
              de chiffre d'affaires, pertes de données ou dommages réputationnels résultant de
              l'utilisation ou de l'impossibilité d'utiliser le Service. La responsabilité maximale
              de Webisafe est limitée au montant effectivement payé par l'Utilisateur sur les
              12 derniers mois.
            </p>
            <p className="mt-3">
              L'Utilisateur reste seul responsable de l'interprétation et de l'application
              des recommandations. La correction des problèmes identifiés relève de sa responsabilité
              ou de celle de son prestataire technique.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Régime fiscal et facturation</h2>
            <p>
              Anael FAMENI est enregistré sous le régime de la micro-entreprise / activité
              individuelle en Côte d'Ivoire. <strong className="text-white">Le Service est exonéré de TVA</strong> en
              application des seuils de franchise applicables aux micro-entreprises ivoiriennes.
              Les factures sont émises sans TVA et portent la mention « TVA non applicable —
              régime de la micro-entreprise ».
            </p>
            <p className="mt-3">
              Une facture nominative est mise à disposition dans l'espace client après paiement
              et peut être téléchargée à tout moment. Sur demande, la facture peut être adressée
              au nom de la personne morale ayant réglé le service.
            </p>
            <p className="mt-3 text-white/50 text-xs">
              Une mise à jour de cette section interviendra dès l'immatriculation au RCCM de la
              société Webisafe en cours de constitution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de la Plateforme (algorithmes, interfaces, rapports types,
              textes, logo, charte graphique, base de données) est la propriété exclusive
              d'Anael FAMENI. Toute reproduction, représentation, modification, traduction,
              extraction ou exploitation, totale ou partielle, est interdite sans autorisation
              écrite préalable.
            </p>
            <p className="mt-3">
              <strong className="text-white">Cas des rapports d'audit :</strong> les rapports générés pour
              l'Utilisateur sont sa propriété et il peut les diffuser, les reproduire et les
              communiquer librement à ses prestataires, partenaires et collaborateurs, à condition
              de ne pas en retirer les mentions Webisafe ni les transformer en produit revendable
              à des tiers.
            </p>
            <p className="mt-3">
              <strong className="text-white">White Label / marque blanche :</strong> les agences souscrivant
              au plan White Label disposent d'une licence d'usage du moteur d'audit avec
              personnalisation graphique. Les conditions spécifiques sont définies dans un contrat
              dédié.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Médiation et règlement des litiges</h2>
            <p>
              <strong className="text-white">Réclamation préalable :</strong> en cas de différend, l'Utilisateur
              s'engage à contacter le service support à{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{' '}
              avant toute action contentieuse. Webisafe s'engage à apporter une réponse écrite
              sous 15 jours ouvrés.
            </p>
            <p className="mt-3">
              <strong className="text-white">Médiation à la consommation :</strong> en cas d'échec de la
              réclamation préalable, l'Utilisateur consommateur peut saisir gratuitement un
              médiateur de la consommation. En Côte d'Ivoire, le médiateur compétent est désigné
              par le Conseil National de la Consommation. Pour les litiges relatifs aux données
              personnelles, l'<strong className="text-white">Autorité de Régulation des Télécommunications de Côte
              d'Ivoire (ARTCI)</strong> est compétente :{' '}
              <a href="https://www.artci.ci" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.artci.ci
              </a>.
            </p>
            <p className="mt-3">
              <strong className="text-white">Plateforme européenne (utilisateurs UE) :</strong> les utilisateurs
              résidant dans l'Union européenne peuvent recourir à la plateforme européenne de
              règlement en ligne des litiges (RLL) accessible à{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                ec.europa.eu/consumers/odr
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Droit applicable et juridiction</h2>
            <p>
              Les présentes CGU sont soumises au droit ivoirien. Tout litige relatif à leur
              interprétation ou exécution, qui n'aurait pu être résolu à l'amiable ni par voie de
              médiation, relève de la compétence exclusive des tribunaux d'Abidjan, Côte d'Ivoire,
              nonobstant pluralité de défendeurs ou appel en garantie.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Modifications des CGU</h2>
            <p>
              Webisafe se réserve le droit de modifier les présentes CGU à tout moment. Les
              modifications substantielles seront notifiées aux Utilisateurs inscrits par email,
              au moins 30 jours avant leur entrée en vigueur. La poursuite de l'utilisation du
              Service après cette période vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU, à la facturation, à la résiliation
              ou à l'exercice de vos droits :
            </p>
            <p className="mt-2">
              <strong className="text-white">Webisafe — Anael FAMENI</strong><br />
              Abidjan, Côte d'Ivoire<br />
              Email :{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}