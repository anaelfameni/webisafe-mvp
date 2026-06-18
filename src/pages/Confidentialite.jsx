import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, SUB_PROCESSORS, LEGAL_ENTITY, LEGAL_LAST_UPDATED, LEGAL_VERSION } from '../config/brand';

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
        <p className="text-white/40 text-sm mb-10">Dernière mise à jour : {LEGAL_LAST_UPDATED} — Version {LEGAL_VERSION}</p>

        <div className="space-y-8 text-white/70 text-sm leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Responsable du traitement</h2>
            <p>
              <strong className="text-white">{LEGAL_ENTITY.name}</strong> — {LEGAL_ENTITY.status}<br />
              {LEGAL_ENTITY.city}, {LEGAL_ENTITY.country}<br />
              Contact :{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p className="mt-3 text-white/50 text-xs">
              Cette page sera mise à jour avec la dénomination sociale et le numéro RCCM
              dès l'immatriculation de la société Webisafe en cours de constitution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Données collectées et finalités</h2>
            <p>Webisafe collecte uniquement les données strictement nécessaires à la fourniture du service :</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border border-white/10 rounded-lg">
                <thead className="bg-white/5 text-white/80">
                  <tr>
                    <th className="text-left p-2 border-b border-white/10">Catégorie</th>
                    <th className="text-left p-2 border-b border-white/10">Finalité</th>
                    <th className="text-left p-2 border-b border-white/10">Base légale</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  <tr>
                    <td className="p-2 border-b border-white/10">URL soumises</td>
                    <td className="p-2 border-b border-white/10">Réalisation de l'audit</td>
                    <td className="p-2 border-b border-white/10">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-white/10">Email</td>
                    <td className="p-2 border-b border-white/10">Authentification, envoi des rapports, support</td>
                    <td className="p-2 border-b border-white/10">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-white/10">Numéro Wave</td>
                    <td className="p-2 border-b border-white/10">Validation du paiement</td>
                    <td className="p-2 border-b border-white/10">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-white/10">Adresse IP, user-agent</td>
                    <td className="p-2 border-b border-white/10">Sécurité, prévention de la fraude, rate limiting</td>
                    <td className="p-2 border-b border-white/10">Intérêt légitime</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-white/10">Données de navigation anonymisées</td>
                    <td className="p-2 border-b border-white/10">Statistiques d'audience, amélioration du service</td>
                    <td className="p-2 border-b border-white/10">Consentement (cookies)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Logs d'erreurs applicatives</td>
                    <td className="p-2">Détection des bugs, qualité de service</td>
                    <td className="p-2">Intérêt légitime</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              <strong className="text-white">Données bancaires :</strong> Webisafe ne stocke et ne traite
              aucune donnée de carte bancaire ni d'authentifiants Wave. Les paiements sont entièrement
              traités par Wave Mobile Money sur leurs propres serveurs sécurisés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Utilisation et partage des données</h2>
            <p>
              Vos données sont utilisées uniquement pour fournir le service d'audit, vous transmettre
              vos rapports, gérer votre abonnement et assurer la sécurité de la plateforme. Webisafe
              ne vend, ne loue et ne partage pas vos données personnelles avec des tiers à des fins
              commerciales ou publicitaires.
            </p>
            <p className="mt-3">
              Les données peuvent être communiquées à des autorités judiciaires uniquement en cas
              de réquisition légale conforme à la législation ivoirienne ou internationale applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Sous-traitants et destinataires</h2>
            <p>
              Pour fournir le service, Webisafe fait appel aux sous-traitants suivants. Chacun est
              soumis à un accord de traitement des données (DPA) conforme aux exigences applicables :
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border border-white/10 rounded-lg">
                <thead className="bg-white/5 text-white/80">
                  <tr>
                    <th className="text-left p-2 border-b border-white/10">Sous-traitant</th>
                    <th className="text-left p-2 border-b border-white/10">Finalité</th>
                    <th className="text-left p-2 border-b border-white/10">Localisation</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  {SUB_PROCESSORS.map((processor, idx) => (
                    <tr key={idx} className={idx < SUB_PROCESSORS.length - 1 ? 'border-b border-white/10' : ''}>
                      <td className="p-2">
                        {processor.dpa ? (
                          <a href={processor.dpa} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {processor.name}
                          </a>
                        ) : processor.name}
                      </td>
                      <td className="p-2">{processor.purpose}</td>
                      <td className="p-2">{processor.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-white/50 text-xs">
              Liste actualisée régulièrement. Toute modification substantielle de la liste des
              sous-traitants est notifiée aux utilisateurs inscrits par email avec un délai de
              préavis de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Transferts hors Côte d'Ivoire et hors Union européenne</h2>
            <p>
              Plusieurs sous-traitants techniques de Webisafe sont localisés aux <strong className="text-white">États-Unis</strong>{' '}
              (Supabase, Vercel, Sentry, Google, Microsoft, OpenRouter, UptimeRobot). Ces transferts
              sont nécessaires à la fourniture du service.
            </p>
            <p className="mt-3">
              <strong className="text-white">Encadrement juridique :</strong> les transferts hors Côte d'Ivoire
              et hors Union européenne sont encadrés par :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Les <strong className="text-white">Clauses Contractuelles Types (CCT)</strong> de la Commission européenne, intégrées aux DPA des sous-traitants concernés (équivalent reconnu en Côte d'Ivoire)</li>
              <li>Pour les sous-traitants américains certifiés, le <strong className="text-white">Data Privacy Framework (DPF)</strong> UE/US lorsque applicable</li>
              <li>Des mesures techniques complémentaires (chiffrement en transit TLS 1.2+, chiffrement au repos AES-256, contrôles d'accès, journalisation)</li>
            </ul>
            <p className="mt-3">
              Pour obtenir une copie des CCT applicables ou plus de détails sur ces garanties,
              contactez-nous à{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Conservation des données</h2>
            <p>Les durées de conservation appliquées sont :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li><strong className="text-white">Comptes utilisateurs actifs :</strong> jusqu'à demande de suppression</li>
              <li><strong className="text-white">Comptes inactifs :</strong> 24 mois après la dernière connexion, puis suppression automatique avec notification 30 jours avant</li>
              <li><strong className="text-white">Rapports d'audit :</strong> 12 mois pour les rapports Premium, 30 jours pour les rapports gratuits</li>
              <li><strong className="text-white">Logs de scan :</strong> 90 jours, anonymisés ensuite</li>
              <li><strong className="text-white">Données de paiement (montant, date, identifiant Wave) :</strong> 10 ans (obligation comptable et fiscale)</li>
              <li><strong className="text-white">Logs de sécurité (IP, tentatives de connexion) :</strong> 12 mois</li>
              <li><strong className="text-white">Données analytiques anonymisées (GA4, Clarity) :</strong> 14 mois</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Vos droits</h2>
            <p>
              Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection
              des données à caractère personnel et au Règlement général sur la protection des données
              (RGPD — UE 2016/679) applicable aux traitements internationaux, vous disposez des droits
              suivants :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li><strong className="text-white">Droit d'accès :</strong> obtenir une copie des données vous concernant</li>
              <li><strong className="text-white">Droit de rectification :</strong> corriger des données inexactes</li>
              <li><strong className="text-white">Droit à l'effacement :</strong> demander la suppression de vos données ("droit à l'oubli")</li>
              <li><strong className="text-white">Droit à la limitation :</strong> suspendre temporairement le traitement</li>
              <li><strong className="text-white">Droit à la portabilité :</strong> recevoir vos données dans un format structuré (JSON ou CSV)</li>
              <li><strong className="text-white">Droit d'opposition :</strong> vous opposer à un traitement fondé sur l'intérêt légitime</li>
              <li><strong className="text-white">Droit de retirer votre consentement</strong> à tout moment, sans effet rétroactif</li>
              <li><strong className="text-white">Droit de définir des directives post-mortem</strong> sur le sort de vos données après décès</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, écrivez à{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>{' '}
              en précisant votre demande et en joignant si possible un justificatif d'identité.
              Webisafe répond sous <strong className="text-white">30 jours maximum</strong> (prolongeable de 60 jours
              en cas de complexité).
            </p>
            <p className="mt-3">
              <strong className="text-white">Droit de réclamation auprès d'une autorité de contrôle :</strong>{' '}
              en cas de désaccord persistant, vous pouvez déposer une réclamation auprès de
              l'<strong className="text-white">Autorité de Régulation des Télécommunications de Côte d'Ivoire (ARTCI)</strong> :{' '}
              <a href="https://www.artci.ci" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.artci.ci
              </a>. Pour les utilisateurs résidant dans l'UE, l'autorité compétente est la CNIL
              ou son équivalent national.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Cookies et traceurs</h2>
            <p>
              Webisafe utilise des cookies et technologies similaires (localStorage, sessionStorage)
              dans les conditions suivantes :
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border border-white/10 rounded-lg">
                <thead className="bg-white/5 text-white/80">
                  <tr>
                    <th className="text-left p-2 border-b border-white/10">Cookie / Traceur</th>
                    <th className="text-left p-2 border-b border-white/10">Finalité</th>
                    <th className="text-left p-2 border-b border-white/10">Durée</th>
                    <th className="text-left p-2 border-b border-white/10">Consentement requis</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  <tr className="border-b border-white/10">
                    <td className="p-2"><code className="text-primary">supabase.auth.token</code></td>
                    <td className="p-2">Authentification de session (essentiel)</td>
                    <td className="p-2">Session</td>
                    <td className="p-2">Non (essentiel)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2"><code className="text-primary">webisafe_*</code></td>
                    <td className="p-2">Préférences utilisateur, état du scan</td>
                    <td className="p-2">12 mois</td>
                    <td className="p-2">Non (essentiel)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2"><code className="text-primary">_ga, _ga_*</code></td>
                    <td className="p-2">Google Analytics 4 — statistiques anonymisées</td>
                    <td className="p-2">14 mois</td>
                    <td className="p-2">Oui</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-2"><code className="text-primary">_clck, _clsk</code></td>
                    <td className="p-2">Microsoft Clarity — analyse comportementale anonymisée</td>
                    <td className="p-2">12 mois</td>
                    <td className="p-2">Oui</td>
                  </tr>
                  <tr>
                    <td className="p-2"><code className="text-primary">sentry-trace</code></td>
                    <td className="p-2">Sentry — détection d'erreurs (intérêt légitime)</td>
                    <td className="p-2">Session</td>
                    <td className="p-2">Non</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              <strong className="text-white">Webisafe n'utilise aucun cookie publicitaire</strong>, aucun cookie
              de retargeting et aucun cookie de tracking comportemental à des fins commerciales.
            </p>
            <p className="mt-3">
              Vous pouvez à tout moment refuser les cookies non essentiels via les paramètres de
              votre navigateur, en utilisant un bloqueur de cookies, ou en désactivant Google
              Analytics via{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                tools.google.com/dlpage/gaoptout
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Sécurité des données</h2>
            <p>
              Webisafe applique les mesures techniques et organisationnelles suivantes pour protéger
              vos données :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Chiffrement TLS 1.2+ pour tous les échanges entre votre navigateur et nos serveurs</li>
              <li>Chiffrement au repos AES-256 pour la base de données et les sauvegardes</li>
              <li>Authentification forte des comptes administrateurs (en cours d'activation 2FA)</li>
              <li>Journalisation des accès sensibles avec conservation 12 mois</li>
              <li>Sauvegardes quotidiennes chiffrées avec rétention 30 jours</li>
              <li>Tests de sécurité réguliers et veille sur les vulnérabilités (CVE)</li>
              <li>Principe du moindre privilège pour les accès internes</li>
            </ul>
            <p className="mt-3">
              <strong className="text-white">Notification en cas de violation :</strong> en cas de fuite de
              données affectant vos informations personnelles, Webisafe vous informera personnellement
              dans les <strong className="text-white">72 heures</strong> suivant la prise de connaissance, conformément
              aux meilleures pratiques applicables.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Mineurs</h2>
            <p>
              Webisafe ne s'adresse pas aux personnes de moins de 16 ans. L'inscription est réservée
              aux personnes majeures ou aux mineurs disposant de l'autorisation explicite d'un
              représentant légal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Modifications</h2>
            <p>
              Cette politique de confidentialité peut être mise à jour pour refléter des évolutions
              légales ou techniques. Toute modification substantielle est notifiée aux utilisateurs
              inscrits par email au moins 30 jours avant son entrée en vigueur. La date de dernière
              mise à jour est toujours visible en haut de cette page.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}