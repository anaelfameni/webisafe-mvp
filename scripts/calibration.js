const TEST_SITES = [
  'https://jumia.com.ci',
  'https://orange.ci',
  'https://google.com',
  'https://wordpress.com',
];

async function getPageSpeedScore(url, apiKey) {
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`);
    const data = await res.json();
    return Math.round(data.lighthouseResult?.categories?.performance?.score * 100);
  } catch { return null; }
}

async function getWebisafeScore(url) {
  try {
    const res = await fetch('http://localhost:3001/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    return data.scores?.performance ?? data.data?.scores?.performance ?? null;
  } catch { return null; }
}

async function runCalibration() {
  const apiKey = process.env.GOOGLE_PAGESPEED_KEY;
  if (!apiKey) { console.error('GOOGLE_PAGESPEED_KEY manquante'); process.exit(1); }

  console.log('\nCALIBRATION WEBISAFE vs GOOGLE PAGESPEED\n');
  console.log('Site'.padEnd(35) + 'Webisafe'.padEnd(12) + 'PageSpeed'.padEnd(12) + 'Ecart'.padEnd(10) + 'Statut');
  console.log('-'.repeat(80));

  let allPassed = true;
  for (const site of TEST_SITES) {
    const [w, g] = await Promise.all([getWebisafeScore(site), getPageSpeedScore(site, apiKey)]);
    if (w == null || g == null) {
      console.log(site.padEnd(35) + 'N/A'.padEnd(12) + 'N/A'.padEnd(12) + 'N/A'.padEnd(10) + 'ERREUR');
      continue;
    }
    const gap = Math.abs(w - g);
    const ok = gap <= 15;
    if (!ok) allPassed = false;
    console.log(site.padEnd(35) + String(w).padEnd(12) + String(g).padEnd(12) + String(gap).padEnd(10) + (ok ? 'OK' : 'REVOIR'));
  }
  console.log('-'.repeat(80));
  console.log(allPassed ? '\nCalibration reussie\n' : '\nCalibration echouee\n');
}

runCalibration();