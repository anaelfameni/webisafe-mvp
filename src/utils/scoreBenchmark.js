// src/utils/scoreBenchmark.js

export const BENCHMARK_SITES = [
    {
        url: 'https://stripe.com',
        description: 'Excellence technique mondiale',
        expectedScores: {
            global: { min: 72, max: 92 },
            performance: { min: 65, max: 90 },
            security: { min: 75, max: 97 },
            seo: { min: 70, max: 97 },
        },
    },
    {
        url: 'https://apple.com',
        description: 'Grand site corporate, perf volontairement lente',
        expectedScores: {
            global: { min: 45, max: 72 },
            performance: { min: 30, max: 65 },
            security: { min: 55, max: 85 },
            seo: { min: 55, max: 80 },
        },
    },
    {
        url: 'https://jumia.ci',
        description: 'E-commerce africain de référence',
        expectedScores: {
            global: { min: 40, max: 70 },
            performance: { min: 30, max: 65 },
            security: { min: 45, max: 75 },
            seo: { min: 50, max: 80 },
        },
    },
    {
        url: 'https://cinetpay.com',
        description: 'Fintech CI',
        expectedScores: {
            global: { min: 45, max: 75 },
        },
    },
];

// Fonction de validation : renvoie true si le score est dans la plage attendue
export function validateScore(url, category, actualScore) {
    const benchmark = BENCHMARK_SITES.find(
        (s) => s.url === url || new URL(s.url).hostname === new URL(url).hostname
    );
    if (!benchmark) return null; // Pas de référence pour ce site

    const expected = benchmark.expectedScores[category];
    if (!expected) return null;

    const isValid = actualScore >= expected.min && actualScore <= expected.max;
    return {
        isValid,
        expected,
        actual: actualScore,
        message: isValid
            ? `✅ Score cohérent (${actualScore} dans [${expected.min}-${expected.max}])`
            : `⚠️ Score hors plage (${actualScore} hors de [${expected.min}-${expected.max}])`,
    };
}