import 'dotenv/config';
import handler from './api/scan.js';

const TESTS = [
  { name: 'google.com',       url: 'https://google.com',        expect: { minScore: 70, shouldPass: true } },
  { name: 'orange.ci',        url: 'https://orange.ci',         expect: { minScore: 50, shouldPass: true } },
  { name: 'mtn.ci',           url: 'https://mtn.ci',            expect: { minScore: 50, shouldPass: true } },
  { name: 'hubspot.com',      url: 'https://hubspot.com',       expect: { minScore: 60, shouldPass: true } },
  { name: 'webisafe.vercel.app', url: 'https://webisafe.vercel.app', expect: { minScore: 75, shouldPass: true } },
  { name: 'domaine inexistant', url: 'https://this-does-not-exist-12345.ci', expect: { shouldPass: false, shouldError: true } },
];

async function runTest({ name, url, expect }) {
  const start = Date.now();
  let result = null;
  let errorMsg = null;

  const fakeReq = {
    method: 'POST',
    headers: {},
    body: { url },
  };

  const fakeRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() { return this; },
    json(payload) {
      result = payload;
      return this;
    },
  };

  try {
    await handler(fakeReq, fakeRes);
  } catch (err) {
    errorMsg = err.message;
  }

  const duration = Date.now() - start;
  const hasError = !!errorMsg || result?.success === false;

  const report = {
    name,
    url,
    duration,
    status: fakeRes.statusCode,
    success: result?.success,
    globalScore: result?.global_score ?? null,
    grade: result?.grade ?? null,
    scores: result?.scores ?? null,
    criticalAlerts: (result?.critical_alerts ?? []).length,
    scannerErrors: result?.scanner_errors ?? {},
    error: errorMsg || result?.error || null,
  };

  // Validation
  const issues = [];
  if (expect.shouldError && !hasError) {
    issues.push(`Attendait une erreur mais a réussi`);
  }
  if (!expect.shouldError && hasError) {
    issues.push(`Erreur inattendue: ${report.error}`);
  }
  if (expect.minScore != null && (report.globalScore == null || report.globalScore < expect.minScore)) {
    issues.push(`Score ${report.globalScore} < attendu ${expect.minScore}`);
  }
  if (duration > 90000) {
    issues.push(`Timeout: ${Math.round(duration/1000)}s > 90s`);
  }

  return { report, issues, passed: issues.length === 0 };
}

async function main() {
  console.log('=== PROTOCOLE DE TEST WEBISAFE ===\n');
  const results = [];

  for (const test of TESTS) {
    console.log(`[TEST] ${test.name} ...`);
    const { report, issues, passed } = await runTest(test);
    results.push({ test, report, issues, passed });

    if (passed) {
      console.log(`  ✅ PASS  score=${report.globalScore} grade=${report.grade} ${Math.round(report.duration/1000)}s`);
    } else {
      console.log(`  ❌ FAIL  ${issues.join(' | ')}`);
    }
    console.log(`       scores=${JSON.stringify(report.scores)} alerts=${report.criticalAlerts}`);
    if (report.error) console.log(`       error=${report.error}`);
    if (Object.values(report.scannerErrors || {}).some(e => e)) {
      console.log(`       scannerErrors=${JSON.stringify(report.scannerErrors)}`);
    }
    console.log();
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log(`=== RÉSULTAT: ${passedCount}/${results.length} tests passés ===`);

  // Sauvegarde JSON
  (await import('fs')).writeFileSync('test-protocol-results.json', JSON.stringify(results, null, 2));
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
