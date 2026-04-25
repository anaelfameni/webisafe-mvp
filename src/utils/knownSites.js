// src/utils/knownSites.js

export const KNOWN_LARGE_SITES = [
    'apple.com', 'google.com', 'amazon.com', 'facebook.com',
    'microsoft.com', 'stripe.com', 'netflix.com', 'twitter.com',
    'x.com', 'linkedin.com', 'youtube.com', 'instagram.com',
    'jumia.com', 'jumia.ci', 'orange.ci', 'mtn.ci', 'moov.ci',
    'cinetpay.com', 'wave.com', 'freemobile.fr', 'sfr.fr',
];

export function isKnownLargeSite(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return KNOWN_LARGE_SITES.some((site) => hostname === site || hostname.endsWith('.' + site));
    } catch {
        return false;
    }
}

export function getLargeSiteDisclaimer(score) {
    if (score >= 75) return null; // Pas besoin si le score est bon
    return {
        title: "Pourquoi ce score ?",
        message:
            "Les grandes entreprises obtiennent parfois un score inférieur aux attentes " +
            "car elles optimisent pour leur propre audience (réseau premium, appareils haut de gamme) " +
            "et non pour les critères standards. " +
            "Ce score reflète les meilleures pratiques générales du web, " +
            "pas nécessairement la réalité vécue par leurs utilisateurs.",
    };
}