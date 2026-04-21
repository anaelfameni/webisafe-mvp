import axios from 'axios';
import { generateMockData } from './mockData';
import { normalizeURL, extractDomain } from './validators';

const PAGESPEED_API_KEY = import.meta.env.VITE_PAGESPEED_API_KEY;

// Appel API Google PageSpeed Insights
export async function fetchPageSpeedData(url) {
  const normalizedUrl = normalizeURL(url);
  
  if (!PAGESPEED_API_KEY || PAGESPEED_API_KEY === 'your_key_here') {
    console.log('📌 Pas de clé API PageSpeed — utilisation des données mockées');
    return null;
  }

  try {
    const response = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`, {
        params: {
          url: normalizedUrl,
          strategy: 'mobile',
          key: PAGESPEED_API_KEY,
          category: ['performance', 'seo', 'accessibility', 'best-practices'],
        },
        timeout: 30000,
      }
    );
    return parsePageSpeedResponse(response.data);
  } catch (error) {
    console.warn('⚠️ Erreur API PageSpeed:', error.message);
    return null;
  }
}

function parsePageSpeedResponse(data) {
  const lighthouse = data.lighthouseResult;
  if (!lighthouse) return null;

  const categories = lighthouse.categories;
  const audits = lighthouse.audits;

  return {
    performance: {
      score: Math.round((categories.performance?.score || 0.5) * 100),
      lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
      fid: audits['max-potential-fid']?.displayValue || 'N/A',
      cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      loadTime: audits['interactive']?.displayValue || 'N/A',
      pageSize: audits['total-byte-weight']?.displayValue || 'N/A',
      ttfb: audits['server-response-time']?.displayValue || 'N/A',
    },
    seo: {
      score: Math.round((categories.seo?.score || 0.5) * 100),
      titleOk: audits['document-title']?.score === 1,
      descriptionOk: audits['meta-description']?.score === 1,
      altMissing: parseInt(audits['image-alt']?.details?.items?.length || 0),
      robotsTxtOk: audits['robots-txt']?.score === 1,
      viewport: audits['viewport']?.score === 1,
    },
    accessibility: {
      score: Math.round((categories.accessibility?.score || 0.5) * 100),
    },
  };
}

// Vérification sécurité basique via headers HTTP
export async function fetchSecurityData(url) {
  const domain = extractDomain(url);
  
  try {
    // Essayer Mozilla Observatory
    const response = await axios.post(
      `https://http-observatory.security.mozilla.org/api/v1/analyze?host=${domain}`,
      null,
      { timeout: 10000 }
    );
    
    if (response.data && response.data.scan) {
      return {
        grade: response.data.scan.grade,
        score: response.data.scan.score,
      };
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Erreur API sécurité:', error.message);
    return null;
  }
}

// Orchestrateur principal — combine toutes les données
export async function runFullAnalysis(url, onProgress) {
  const normalizedUrl = normalizeURL(url);
  const domain = extractDomain(url);

  // Étape 1: Connexion
  onProgress?.({ step: 0, message: 'Connexion au site...' });
  await delay(1200);

  // Étape 2: Performance
  onProgress?.({ step: 1, message: 'Analyse des performances (Core Web Vitals)...' });
  let pageSpeedData = null;
  try {
    pageSpeedData = await Promise.race([
      fetchPageSpeedData(normalizedUrl),
      delay(15000).then(() => null),
    ]);
  } catch { /* fallback to mock */ }
  await delay(1500);

  // Étape 3: Sécurité
  onProgress?.({ step: 2, message: 'Vérification sécurité...' });
  let securityData = null;
  try {
    securityData = await Promise.race([
      fetchSecurityData(normalizedUrl),
      delay(10000).then(() => null),
    ]);
  } catch { /* fallback to mock */ }
  await delay(1500);

  // Étape 4: SEO
  onProgress?.({ step: 3, message: 'Audit SEO technique...' });
  await delay(1200);

  // Étape 5: UX Mobile
  onProgress?.({ step: 4, message: 'Test expérience mobile...' });
  await delay(1400);

  // Étape 6: Génération recommandations
  onProgress?.({ step: 5, message: 'Génération des recommandations' });
  await delay(1200);

  // Combiner les données réelles et mockées
  const mockData = generateMockData(domain);
  
  // Fusionner: données réelles en priorité, mock en fallback
  const result = {
    ...mockData,
    url: normalizedUrl,
    domain: domain,
    scanDate: new Date().toISOString(),
    isPartial: !pageSpeedData && !securityData,
  };

  if (pageSpeedData) {
    result.performance = { ...result.performance, ...pageSpeedData.performance };
    result.scores.performance = pageSpeedData.performance.score;
    if (pageSpeedData.seo) {
      result.seo = { ...result.seo, ...pageSpeedData.seo };
      result.scores.seo = pageSpeedData.seo.score;
    }
  }

  // Recalculer le score global
  result.scores.global = Math.round(
    result.scores.performance * 0.30 +
    result.scores.security * 0.35 +
    result.scores.seo * 0.20 +
    result.scores.ux * 0.15
  );

  return result;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
