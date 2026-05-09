# Webisafe SEO Security Agency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Webisafe premium audits with enhanced SEO/security checks, premium UI/PDF rendering, and agency mode with branded PDF reports and payment bypass.

**Architecture:** Build pure shared analyzers first, then wire them into the production serverless scan path and legacy scanner path. Keep scan fields additive and tolerant of old cached scans. Render new data through existing report/PDF design patterns, and gate agency features through the `agence` role with Supabase persistence plus localStorage fallback.

**Tech Stack:** React, Vite, React Router, Vitest, Node ESM, Cheerio, Supabase, Vercel-style API routes, existing Webisafe PDF HTML template.

---

## Execution rules

Run commands from:

```powershell
C:\Users\Anael FAMENI\.gemini\antigravity\webisafe
```

Do not commit `.superpowers/brainstorm` files. Make one commit per task. Keep all new scanner fields additive.

---

## File map

- Create `lib/audit/seoSignals.js`: pure SEO technical, AI visibility, and business recommendation analyzer.
- Create `lib/audit/seoSignals.test.js`: unit tests for SEO analyzer.
- Create `lib/audit/securitySignals.js`: pure CSP, CMS, JS library, SRI, and compliance analyzer.
- Create `lib/audit/securitySignals.test.js`: unit tests for security analyzer.
- Modify `api/scan.js`: production scan integration for enhanced SEO/security fields.
- Modify `server/scanners/seoScanner.js`: legacy/server SEO scanner parity.
- Modify `server/scanners/securityScanner.js`: legacy/server security scanner parity.
- Modify `scanners/security-checks.js`: advanced security output for new passive checks.
- Modify `scanners/extended-security-checks.js`: extended technology/dependency output.
- Modify `src/pages/Rapport.jsx`: premium page rendering and agency PDF payload.
- Modify `lib/pdfModel.js`: normalize new fields for PDF.
- Modify `lib/pdfTemplate.js`: render new PDF page and rows without changing design system.
- Modify `lib/pdfTemplate.test.js`: PDF regression coverage.
- Create `src/utils/agencyAccess.js`: pure agency/admin role helpers.
- Create `src/utils/agencyAccess.test.js`: role helper tests.
- Create `src/utils/agencySettings.js`: frontend settings client with localStorage fallback.
- Create `src/utils/agencySettings.test.js`: settings fallback tests.
- Create `src/pages/Agence.jsx`: professional MVP agency dashboard.
- Modify `src/hooks/useAuth.js`, `src/context/AuthContext.jsx`, `src/App.jsx`, `src/components/Header.jsx`, `src/pages/Payment.jsx`: role routing, navigation, bypass.
- Create `api/agency-settings.js`: authenticated agency settings endpoint.
- Modify `api_shared/_utils.js`: add `requireAgency` without weakening `requireAdmin`.
- Create `supabase/agency_settings.sql`: agency settings table.
- Modify `supabase/test_accounts_profiles.sql`: profile seed for `agence@test.com`.
- Modify `supabase/auth_users_profile_sync.sql`: preserve/map role `agence`.

---

## Task 1: Pure SEO analyzer

**Files:**
- Create: `lib/audit/seoSignals.js`
- Create: `lib/audit/seoSignals.test.js`

- [ ] **Step 1: Write failing tests**

Create tests that load HTML with Cheerio and assert:

```js
import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import * as cheerio from 'cheerio';
import { analyzeSeoSignals, buildSeoBusinessRecommendations } from './seoSignals.js';
```

Test cases:

```js
const complete = cheerio.load(`<!doctype html>
<html lang="fr">
  <head>
    <title>Agence Web Abidjan - Création site PME</title>
    <meta name="description" content="Agence web à Abidjan spécialisée dans la création de sites professionnels, rapides et sécurisés pour PME ambitieuses.">
    <meta property="og:title" content="Agence Web">
    <meta property="og:description" content="Création de sites">
    <meta property="og:image" content="/og.jpg">
    <meta name="twitter:title" content="Agence Web">
    <meta name="twitter:description" content="Création">
    <meta name="twitter:image" content="/tw.jpg">
    <script type="application/ld+json">{"@type":"Organization","name":"Agence Web"}</script>
  </head>
  <body>
    <a href="/contact">Contact</a>
    <a href="/mentions-legales">Mentions légales</a>
    <main>
      <h1>Agence Web Abidjan</h1>
      <h2>Sites PME</h2>
      <p>Contenu principal lisible pour les moteurs et les prospects avec une description claire de l’offre.</p>
      <p>Deuxième paragraphe pour confirmer que la page est lisible sans JavaScript.</p>
    </main>
    <img src="/hero.jpg" alt="Agence">
  </body>
</html>`);
const result = analyzeSeoSignals(complete, 'https://example.com/', { robots: { status: 'pass', url: 'https://example.com/robots.txt', blocking: false }, sitemap: { status: 'pass', url: 'https://example.com/sitemap.xml', discovered_from: 'robots' }, favicon: { status: 'pass', url: 'https://example.com/favicon.ico' } });
assert.equal(result.technical_checks.title_length.status, 'pass');
assert.equal(result.technical_checks.meta_description_length.status, 'pass');
assert.equal(result.technical_checks.h1_unique.status, 'pass');
assert.equal(result.ai_visibility.score >= 80, true);
```

Add a weak page test that asserts `buildSeoBusinessRecommendations(result)` returns problems for meta description, H1, missing lang, missing sitemap, and structured data.

- [ ] **Step 2: Verify failing test**

Run:

```powershell
pnpm exec vitest lib/audit/seoSignals.test.js --run --reporter=basic
```

Expected: module not found for `./seoSignals.js`.

- [ ] **Step 3: Implement SEO analyzer exports**

Create `lib/audit/seoSignals.js` exporting:

Required exports:

```text
normalizeSeoStatus(status)
analyzeSeoSignals($, url, probes = {})
buildSeoBusinessRecommendations(signals)
```

`analyzeSeoSignals` must return:

```js
{
  title,
  description,
  technical_checks: {
    title_length: { status, value, ideal: '30-60 caractères', message },
    meta_description_length: { status, value, ideal: '120-160 caractères', message },
    h1_unique: { status, value, message },
    headings_structure: { status, value, h2_count, h3_count, message },
    images_alt: { status, missing_count, total, message },
    lang_attribute: { status, value, message },
    robots_txt: { status, url, blocking, message },
    sitemap_xml: { status, url, discovered_from, message },
    structured_data: { status, types, message },
    twitter_cards: { status, missing, message },
    favicon: { status, url, message }
  },
  ai_visibility: { score, checks: [{ key, label, status, evidence, business_impact, recommendation }] }
}
```

`buildSeoBusinessRecommendations` must return objects with:

```js
{ category: 'SEO', problem, impact_business, correction, effort, priority }
```

- [ ] **Step 4: Pass tests**

Run:

```powershell
pnpm exec vitest lib/audit/seoSignals.test.js --run --reporter=basic
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add lib/audit/seoSignals.js lib/audit/seoSignals.test.js
git commit -m "feat: add seo signal analyzer"
```

---

## Task 2: Pure security analyzer

**Files:**
- Create: `lib/audit/securitySignals.js`
- Create: `lib/audit/securitySignals.test.js`

- [ ] **Step 1: Write failing tests**

Create tests importing:

```js
import { analyzeCspQuality, analyzeSri, buildComplianceBadges, detectCms, detectJsLibraries } from './securitySignals.js';
```

Assert these exact behaviors:

```js
const csp = analyzeCspQuality("script-src * 'unsafe-inline' 'unsafe-eval'");
assert.equal(csp.present, true);
assert.equal(csp.status, 'warning');
assert.equal(csp.issues.includes('unsafe-inline'), true);
assert.equal(csp.issues.includes('unsafe-eval'), true);
assert.equal(csp.issues.includes('wildcard-source'), true);
assert.equal(csp.issues.includes('missing-default-src'), true);
assert.equal(csp.issues.includes('missing-frame-ancestors'), true);
```

Use HTML with `wp-content`, `meta generator WordPress`, `jquery-1.12.4.min.js`, Bootstrap CDN, and one CDN script without `integrity`. Assert WordPress, jQuery legacy warning, and missing SRI are detected.

Assert compliance badges include exactly four labels:

```js
['Préparation PCI DSS', 'Préparation GDPR', 'Préparation ISO 27001', 'Préparation cyber assurance']
```

and every explanation includes `Signaux techniques utiles` and does not include `certifié`.

- [ ] **Step 2: Verify failing test**

```powershell
pnpm exec vitest lib/audit/securitySignals.test.js --run --reporter=basic
```

Expected: module not found for `./securitySignals.js`.

- [ ] **Step 3: Implement security analyzer exports**

Create `lib/audit/securitySignals.js` exporting:

Required exports:

```text
normalizeSecurityCheckStatus(status)
analyzeCspQuality(cspHeader)
detectCms($, html = '', response = {})
detectJsLibraries($, html = '')
analyzeSri($, pageUrl)
buildComplianceBadges(security = {})
```

Return shapes:

```js
{ present, score, issues, strengths, status }
{ primary, detected: [{ name, confidence, evidence, version }], confidence, evidence }
{ detected: [{ name, version, evidence }], outdated_or_risky: [{ name, version, advisory }], status }
{ external_scripts_count, missing_integrity_count, missing_crossorigin_count, findings, status }
{ key, label, status, explanation, missing_signals }
```

Detection requirements:

- CSP penalizes `unsafe-inline`, `unsafe-eval`, wildcard `*`, missing `default-src`, missing `frame-ancestors`, missing reporting.
- CMS detects WordPress, WooCommerce, Shopify, Drupal, Joomla, Laravel, Next.js, PrestaShop.
- JS detects jQuery, Bootstrap, Lodash, React dev build. Flag jQuery major version below 3, Bootstrap major version below 4, Lodash major version below 4, and React dev build.
- SRI checks external `script[src]` tags and reports missing `integrity` or missing `crossorigin` when `integrity` exists.
- Compliance badges use preparation language only.

- [ ] **Step 4: Pass tests**

```powershell
pnpm exec vitest lib/audit/securitySignals.test.js --run --reporter=basic
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add lib/audit/securitySignals.js lib/audit/securitySignals.test.js
git commit -m "feat: add security signal analyzer"
```

---

## Task 3: Wire analyzers into scan engines

**Files:**
- Modify: `api/scan.js`
- Modify: `server/scanners/seoScanner.js`
- Modify: `server/scanners/securityScanner.js`
- Modify: `server/scanners/seoScanner.test.js`

- [ ] **Step 1: Add scanner regression test**

Extend `server/scanners/seoScanner.test.js` with a test that mocks `fetch` for the main page, `/robots.txt`, `/sitemap.xml`, and `/favicon.ico`, then asserts:

```js
assert.equal(result.technical_checks.title_length.status, 'pass');
assert.equal(result.technical_checks.robots_txt.status, 'pass');
assert.equal(result.ai_visibility.score >= 70, true);
assert.equal(Array.isArray(result.business_recommendations), true);
assert.equal(result.has_title, true);
assert.equal(result.has_description, true);
```

- [ ] **Step 2: Verify failing scanner test**

```powershell
pnpm exec vitest server/scanners/seoScanner.test.js --run --reporter=basic
```

Expected: enhanced fields are undefined.

- [ ] **Step 3: Import helpers**

In `api/scan.js`:

```js
import { analyzeSeoSignals, buildSeoBusinessRecommendations } from '../lib/audit/seoSignals.js';
import { analyzeCspQuality, analyzeSri, buildComplianceBadges, detectCms, detectJsLibraries } from '../lib/audit/securitySignals.js';
```

In `server/scanners/seoScanner.js`:

```js
import { analyzeSeoSignals, buildSeoBusinessRecommendations } from '../../lib/audit/seoSignals.js';
```

In `server/scanners/securityScanner.js`:

```js
import { analyzeCspQuality, analyzeSri, buildComplianceBadges, detectCms, detectJsLibraries } from '../../lib/audit/securitySignals.js';
```

- [ ] **Step 4: Add network probe helpers to `api/scan.js`**

Add helpers named:

Required helper names:

```text
fetchProbeText(url, timeoutMs = 3500)
probeSeoResources(url)
probeHttpMethods(url)
checkDnssec(hostname)
probeWordPressSecurity(url, cmsDetection)
```

Required behavior:

- `probeSeoResources` returns `robots`, `sitemap`, and `favicon` probe objects.
- `probeHttpMethods` checks `OPTIONS`, `TRACE`, `PUT`, `DELETE`, `PROPFIND` and flags `TRACE`, successful `PUT`, successful `DELETE`, and `PROPFIND`.
- `checkDnssec` uses `https://cloudflare-dns.com/dns-query?name=<host>&type=DS` with `accept: application/dns-json`.
- `probeWordPressSecurity` checks `/wp-login.php`, `/xmlrpc.php`, `/wp-json/wp/v2/users`, `/readme.html`, and `/wp-content/plugins/` only when WordPress is detected.

- [ ] **Step 5: Extend `scanSEO` return values**

Inside both `api/scan.js` and `server/scanners/seoScanner.js`, after Cheerio parsing:

```js
const seoProbes = await probeSeoResources(url).catch(() => ({ robots: { status: 'error', url: null, blocking: null }, sitemap: { status: 'error', url: null, discovered_from: null }, favicon: { status: 'error', url: null } }));
const seoSignals = analyzeSeoSignals($, url, seoProbes);
const businessRecommendations = buildSeoBusinessRecommendations(seoSignals);
```

Add returned fields:

```js
technical_checks: seoSignals.technical_checks,
ai_visibility: seoSignals.ai_visibility,
business_recommendations: businessRecommendations,
title_length: seoSignals.technical_checks.title_length.value,
meta_description_length: seoSignals.technical_checks.meta_description_length.value,
h2_count: seoSignals.technical_checks.headings_structure.h2_count,
h3_count: seoSignals.technical_checks.headings_structure.h3_count,
images_without_alt: seoSignals.technical_checks.images_alt.missing_count,
has_lang: seoSignals.technical_checks.lang_attribute.status === 'pass',
has_structured_data: seoSignals.technical_checks.structured_data.status === 'pass',
has_twitter_cards: seoSignals.technical_checks.twitter_cards.status === 'pass',
has_favicon: seoSignals.technical_checks.favicon.status === 'pass'
```

- [ ] **Step 6: Extend `scanSecurity` return values**

Inside `api/scan.js`, after headers and HTML are available:

```js
const $security = cheerio.load(html || '');
const cspQuality = analyzeCspQuality(headers.get('content-security-policy'));
const cmsDetection = detectCms($security, html || '', { headers });
const jsLibraries = detectJsLibraries($security, html || '');
const sri = analyzeSri($security, url);
const httpMethods = await probeHttpMethods(url);
const dnssec = await checkDnssec(new URL(url).hostname);
const wordpressSecurity = await probeWordPressSecurity(url, cmsDetection);
const complianceBadges = buildComplianceBadges({ https, csp_quality: cspQuality, dnssec, sri, malware_detected: malwareDetected });
```

Add returned fields:

```js
http_methods: httpMethods,
csp_quality: cspQuality,
dnssec,
cms_detection: cmsDetection,
wordpress_security: wordpressSecurity,
js_libraries: jsLibraries,
sri,
compliance_badges: complianceBadges
```

In `server/scanners/securityScanner.js`, add `csp_quality`, `cms_detection`, `js_libraries`, `sri`, and `compliance_badges` using available headers/HTML. Use `not_measured` fallback objects when HTML is unavailable.

- [ ] **Step 7: Run scanner tests**

```powershell
pnpm exec vitest lib/audit/seoSignals.test.js lib/audit/securitySignals.test.js server/scanners/seoScanner.test.js --run --reporter=basic
```

Expected: all targeted tests pass.

- [ ] **Step 8: Commit**

```powershell
git add api/scan.js server/scanners/seoScanner.js server/scanners/securityScanner.js server/scanners/seoScanner.test.js
git commit -m "feat: expose enhanced scanner data"
```

---

## Task 4: Extend advanced and extended security outputs

**Files:**
- Modify: `scanners/security-checks.js`
- Modify: `scanners/extended-security-checks.js`

- [ ] **Step 1: Add a standardized check factory**

Add:

```js
function checkFromSignal(check_name, status, title, description, recommendation, criticality = 'medium', score_impact = 5, data = {}) {
  return { check_name, status, score_impact: status === 'pass' ? 0 : score_impact, criticality, title, description, recommendation, technical_detail: description, difficulty: status === 'pass' ? '—' : 'Intermédiaire', time_estimate: status === 'pass' ? '—' : '1-3h', data };
}
```

- [ ] **Step 2: Add check rows for new security areas**

Generate advanced checks with names:

```js
'http_methods'
'csp_quality'
'dnssec'
'wordpress_security'
'js_libraries'
'sri'
'compliance_preparation'
```

Statuses must be `pass`, `warning`, `fail`, `error`, or `not_measured` only.

- [ ] **Step 3: Update extended technology check**

In `scanners/extended-security-checks.js`, import shared security helpers with the correct relative path and return a `tech_and_dependencies` check containing:

```js
data: { cms_detection, js_libraries, sri }
```

Set status to `warning` when risky JS libraries or missing SRI exist, otherwise `pass`.

- [ ] **Step 4: Run focused tests**

```powershell
pnpm exec vitest lib/audit/securitySignals.test.js --run --reporter=basic
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add scanners/security-checks.js scanners/extended-security-checks.js
git commit -m "feat: add enhanced advanced security checks"
```

---

## Task 5: Render enhanced data in premium report page

**Files:**
- Modify: `src/pages/Rapport.jsx`

- [ ] **Step 1: Add local render helpers**

Add helper functions near existing display helpers:

```jsx
function checkStatusToMetricStatus(status) {
  if (status === 'pass') return 'pass';
  if (status === 'fail') return 'fail';
  if (status === 'warning' || status === 'error') return 'warn';
  return 'unknown';
}

function checkValue(check, fallback = 'Non mesuré') {
  if (!check) return fallback;
  if (check.value !== undefined && check.value !== null && check.value !== '') return String(check.value);
  if (check.message) return check.message;
  return fallback;
}
```

- [ ] **Step 2: Add SEO advanced section**

Inside the SEO section, render `seoM.technical_checks` as existing `MetricRow` items with labels:

```js
['Longueur title', 'Longueur meta description', 'H1 unique', 'Structure H2/H3', 'Images avec alt', 'Langue HTML', 'Robots.txt', 'Sitemap XML', 'Données structurées', 'Twitter Cards', 'Favicon']
```

Keep existing card classes: `rounded-2xl border border-white/10 bg-[#0F172A]/60 p-5`.

- [ ] **Step 3: Add AI visibility and business recommendations**

Render `seoM.ai_visibility` in a primary-tinted card with score badge. Render each check with label, evidence, impact, and recommendation.

Render `seoM.business_recommendations` in an emerald-tinted card with problem, impact business, correction, effort, and priority.

- [ ] **Step 4: Add security advanced rows and cards**

Render:

```js
secM.http_methods
secM.csp_quality
secM.dnssec
secM.cms_detection
secM.js_libraries
secM.sri
secM.wordpress_security
secM.compliance_badges
```

Use existing `MetricRow`, `SeverityPill`, dark rounded cards, and current colors.

- [ ] **Step 5: Verify JSX build**

```powershell
pnpm build
```

Expected: build completes.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/Rapport.jsx
git commit -m "feat: render enhanced data in premium report"
```

---

## Task 6: Extend PDF model and template

**Files:**
- Modify: `lib/pdfModel.js`
- Modify: `lib/pdfTemplate.js`
- Modify: `lib/pdfTemplate.test.js`

- [ ] **Step 1: Extend PDF test sample**

Add enhanced `metrics.security` sample fields: `http_methods`, `csp_quality`, `dnssec`, `cms_detection`, `wordpress_security`, `js_libraries`, `sri`, `compliance_badges`.

Add enhanced `metrics.seo` sample fields: `technical_checks`, `ai_visibility`, `business_recommendations`.

Append assertions:

```js
expect(html).toContain('Visibilité IA &amp; conformité préparatoire');
expect(html).toContain('Préparation PCI DSS');
expect(html).toContain('Aucun DS détecté.');
expect(html).toContain('WordPress');
expect(html).toContain('jQuery');
expect(html).toContain('Meta description absente');
expect(html).toContain('Baisse du taux de clic.');
expect(html).toContain('Page 11 /');
```

- [ ] **Step 2: Verify failing PDF test**

```powershell
pnpm exec vitest lib/pdfTemplate.test.js --run --reporter=basic
```

Expected: missing AI/compliance page assertion fails.

- [ ] **Step 3: Extend `lib/pdfModel.js`**

In `buildSeo`, add normalized properties:

```js
advancedRows
aiVisibility
businessRecommendations
```

In the advanced security model builder, add:

```js
httpMethods
cspQuality
dnssec
cmsDetection
wordpressSecurity
jsLibraries
sri
complianceBadges
```

Add `agencyBranding` to the top-level model with sanitized values from `scanData.agencyBranding` and default Webisafe fallback values.

Preserve score parity: do not recalculate displayed scores in PDF.

- [ ] **Step 4: Extend `lib/pdfTemplate.js`**

Add `aiCompliancePage(model)` between `seoUxPage(model)` and `methodologyClosingPage(model)`.

The page title must be:

```text
Visibilité IA & conformité préparatoire
```

The page must render:

- AI visibility score and checks.
- Business SEO recommendations.
- Compliance badges.
- DNSSEC, CMS, JS libraries, and SRI summary.

Update page total from 10 to 11 and keep existing style helpers (`page`, `panel`, `dataTable`, `scoreBar`).

- [ ] **Step 5: Add agency branding in template**

Use `model.agencyBranding.enabled` to replace visible agency-facing brand values:

```js
const brandName = model.agencyBranding?.enabled ? model.agencyBranding.agency_name : 'Webisafe';
const primaryColor = model.agencyBranding?.enabled ? model.agencyBranding.primary_color : '#1566F0';
const logoUrl = model.agencyBranding?.enabled ? model.agencyBranding.logo_url : '';
```

Keep Webisafe trust language and existing visual shell. If logo URL is empty, keep text brand.

- [ ] **Step 6: Run PDF tests**

```powershell
pnpm exec vitest lib/pdfTemplate.test.js src/utils/generatePDF.test.js --run --reporter=basic
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add lib/pdfModel.js lib/pdfTemplate.js lib/pdfTemplate.test.js
git commit -m "feat: add enhanced audit data to premium pdf"
```

---

## Task 7: Agency settings persistence

**Files:**
- Create: `src/utils/agencySettings.js`
- Create: `src/utils/agencySettings.test.js`
- Create: `api/agency-settings.js`
- Modify: `api_shared/_utils.js`
- Create: `supabase/agency_settings.sql`

- [ ] **Step 1: Write frontend settings tests**

Create tests for:

```js
normalizeAgencySettings({ agency_name: 'Agence Demo', primary_color: 'bad' }).primary_color === '#1566F0'
loadAgencySettings({ email: 'agence@test.com' }) uses localStorage when fetch throws
saveAgencySettings({ email: 'agence@test.com' }, settings) POSTs to /api/agency-settings and stores fallback
```

- [ ] **Step 2: Verify failing test**

```powershell
pnpm exec vitest src/utils/agencySettings.test.js --run --reporter=basic
```

Expected: module not found.

- [ ] **Step 3: Implement `src/utils/agencySettings.js`**

Export:

Required exports:

```js
export const AGENCY_SETTINGS_DEFAULTS = { agency_name: 'Votre agence', logo_url: '', primary_color: '#1566F0', secondary_color: '#0F172A', contact_email: '', footer_text: 'Rapport préparé par votre agence avec Webisafe.', widget_enabled: true, email_capture_enabled: true };
```

```text
normalizeAgencySettings(input = {})
loadAgencySettings(user)
saveAgencySettings(user, input)
```

Use localStorage key:

```js
const key = `webisafe.agencySettings.${user?.email || 'anonymous'}`;
```

- [ ] **Step 4: Add backend agency auth helper**

In `api_shared/_utils.js`, add `requireAgency(req)` that returns ok only when public profile role is `agence` or auth email is `agence@test.com`. Keep `requireAdmin` behavior unchanged.

- [ ] **Step 5: Create `api/agency-settings.js`**

Implement `GET` and `POST` only. Use `requireAgency(req)`. Upsert by `user_email`. Accepted fields:

```js
['agency_name', 'logo_url', 'primary_color', 'secondary_color', 'contact_email', 'footer_text', 'widget_enabled', 'email_capture_enabled']
```

- [ ] **Step 6: Create SQL table**

Create `supabase/agency_settings.sql`:

```sql
create table if not exists public.agency_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text not null unique,
  agency_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  contact_email text,
  footer_text text,
  widget_enabled boolean default true,
  email_capture_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists agency_settings_user_email_idx on public.agency_settings (user_email);
```

- [ ] **Step 7: Run tests**

```powershell
pnpm exec vitest src/utils/agencySettings.test.js --run --reporter=basic
```

Expected: pass.

- [ ] **Step 8: Commit**

```powershell
git add src/utils/agencySettings.js src/utils/agencySettings.test.js api/agency-settings.js api_shared/_utils.js supabase/agency_settings.sql
git commit -m "feat: add agency settings persistence"
```

---

## Task 8: Agency role, dashboard, and payment bypass

**Files:**
- Create: `src/utils/agencyAccess.js`
- Create: `src/utils/agencyAccess.test.js`
- Create: `src/pages/Agence.jsx`
- Modify: `src/hooks/useAuth.js`
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/pages/Payment.jsx`
- Modify: `src/pages/Rapport.jsx`
- Modify: `supabase/test_accounts_profiles.sql`
- Modify: `supabase/auth_users_profile_sync.sql`

- [ ] **Step 1: Add agency access tests**

Create tests for:

```js
isAgencyUser({ role: 'agence' }) === true
isAgencyUser({ email: 'agence@test.com' }) === true
getPostLoginPath({ role: 'admin' }) === '/admin'
getPostLoginPath({ role: 'agence' }) === '/agence'
getPostLoginPath({ role: 'user' }) === '/dashboard'
canUseAgencyBypass({ role: 'agence' }, 'scan_1') === true
canUseAgencyBypass({ role: 'user' }, 'scan_1') === false
```

- [ ] **Step 2: Implement `src/utils/agencyAccess.js`**

Export:

```js
export function isAgencyUser(user) { return user?.role === 'agence' || String(user?.email || '').toLowerCase() === 'agence@test.com'; }
export function isAdminUser(user) { return user?.role === 'admin' || String(user?.email || '').toLowerCase() === 'admin@test.com'; }
export function getPostLoginPath(user) { if (isAdminUser(user)) return '/admin'; if (isAgencyUser(user)) return '/agence'; return '/dashboard'; }
export function canUseAgencyBypass(user, scanId) { return isAgencyUser(user) && Boolean(scanId); }
```

- [ ] **Step 3: Wire auth redirects**

In `useAuth.js` and `AuthContext.jsx`, use `getPostLoginPath(user)` for post-login navigation. When Supabase role is missing, assign fallback role:

```js
const fallbackRole = email.toLowerCase() === 'admin@test.com' ? 'admin' : email.toLowerCase() === 'agence@test.com' ? 'agence' : 'user';
```

- [ ] **Step 4: Add route and header link**

In `App.jsx`:

```jsx
import Agence from './pages/Agence.jsx';
<Route path="/agence" element={<Agence />} />
```

In `Header.jsx`, route agency users to `/agence` and label link `Agence`.

- [ ] **Step 5: Create `src/pages/Agence.jsx`**

Build MVP dashboard with these sections:

- Overview cards: clients audited, reports generated, audits premium ready, Webisafe Verified.
- PDF customization form: agency name, logo URL, primary color, secondary color, contact email, footer text.
- Widget preview and copyable iframe embed.
- Multi-client table with clean placeholder rows when no scans are available.
- Disabled future actions: public report link, automatic notification, bulk reports.

Use existing classes: `bg-card-bg`, `border-border-color`, `text-primary`, `rounded-2xl`, `bg-dark-navy`.

- [ ] **Step 6: Add agency payment bypass**

In `Payment.jsx`, when `canUseAgencyBypass(user, scanId)` is true, render copy:

```text
⚙️ Mode Agence
Accédez directement à l'audit premium sans paiement.
Voir l'audit premium (Agence)
```

On click:

```js
markAsPaid(scanId);
saveScan({ ...(scan || {}), id: scanId, paid: true, user_email: user?.email || null });
navigate(`/rapport/${encodeURIComponent(scanId)}`, { state: { agencyBypass: true, agencyScan: scan } });
```

Use existing local functions or imports for `markAsPaid`, `saveScan`, and `navigate`.

- [ ] **Step 7: Unlock agency report and pass branding to PDF**

In `Rapport.jsx`, treat `location.state?.agencyBypass === true` or `isAgencyUser(user)` as premium access. Load agency settings only for agency users. In PDF download payload:

```js
const reportPayload = isAgency && agencySettings ? { ...pdfScan, agencyBranding: { enabled: true, ...agencySettings } } : pdfScan;
await generatePDF(reportPayload);
```

- [ ] **Step 8: Update Supabase seed SQL**

Add to `supabase/test_accounts_profiles.sql`:

```sql
insert into public.users (email, name, plan, role)
values ('agence@test.com', 'Agence Webisafe', 'agency', 'agence')
on conflict (email) do update set name = excluded.name, plan = excluded.plan, role = excluded.role;
```

In `supabase/auth_users_profile_sync.sql`, ensure `agence@test.com` maps to role `agence` and metadata role `agence` is preserved.

- [ ] **Step 9: Run tests and build**

```powershell
pnpm exec vitest src/utils/agencyAccess.test.js src/utils/agencySettings.test.js --run --reporter=basic
pnpm build
```

Expected: tests pass and build completes.

- [ ] **Step 10: Commit**

```powershell
git add src/utils/agencyAccess.js src/utils/agencyAccess.test.js src/pages/Agence.jsx src/hooks/useAuth.js src/context/AuthContext.jsx src/App.jsx src/components/Header.jsx src/pages/Payment.jsx src/pages/Rapport.jsx supabase/test_accounts_profiles.sql supabase/auth_users_profile_sync.sql
git commit -m "feat: add agency mode dashboard and bypass"
```

---

## Task 9: Final verification and documentation

**Files:**
- Modify: `SECURITY_CHECKS.md` when the new security checks are implemented.

- [ ] **Step 1: Update `SECURITY_CHECKS.md`**

Add sections for:

- HTTP methods.
- CSP quality scoring.
- DNSSEC.
- CMS detection.
- WordPress lightweight scan.
- JS library detection.
- Subresource Integrity.
- Compliance preparation badges.

Use the exact sentence:

```text
Les badges de conformité indiquent des signaux techniques utiles pour la préparation; ils ne constituent pas une certification.
```

- [ ] **Step 2: Run targeted test suite**

```powershell
pnpm exec vitest lib/audit/seoSignals.test.js lib/audit/securitySignals.test.js server/scanners/seoScanner.test.js lib/pdfTemplate.test.js src/utils/agencyAccess.test.js src/utils/agencySettings.test.js src/utils/generatePDF.test.js --run --reporter=basic
```

Expected: all targeted tests pass.

- [ ] **Step 3: Run production build**

```powershell
pnpm build
```

Expected: build completes.

- [ ] **Step 4: Manual Supabase Auth seed**

In Supabase dashboard, create Auth user:

```text
email: agence@test.com
password: 123agence123
```

Confirm email if confirmation is enabled. Run `supabase/test_accounts_profiles.sql` and `supabase/agency_settings.sql` in the SQL editor.

- [ ] **Step 5: Manual agency verification**

Perform:

1. Log in as `agence@test.com`.
2. Confirm redirect to `/agence`.
3. Save agency settings.
4. Launch a scan.
5. Open payment page.
6. Confirm agency bypass block appears.
7. Click `Voir l'audit premium (Agence)`.
8. Confirm premium report opens.
9. Confirm enhanced SEO/security data appears.
10. Download PDF.
11. Confirm agency branding and enhanced data appear in PDF.

- [ ] **Step 6: Commit documentation**

```powershell
git add SECURITY_CHECKS.md
git commit -m "docs: document enhanced security checks"
```

---

## Self-review checklist

- [ ] Scanner fields are additive and old cached scans remain readable.
- [ ] SEO checks include title length, description length, H1, H2/H3, image alt, lang, robots, sitemap, structured data, Twitter Cards, favicon.
- [ ] AI visibility includes Organization schema, contact, legal, brand, Open Graph, sitemap, robots, readable content, author/org, title-description-H1 coherence.
- [ ] Security checks include HTTP methods, CSP quality, DNSSEC, CMS, WordPress, JS libraries, SRI, compliance badges.
- [ ] Premium report renders all new data without redesign.
- [ ] PDF renders all new data and keeps current design language.
- [ ] Agency dashboard exists at `/agence`.
- [ ] Agency settings persist through Supabase with localStorage fallback.
- [ ] Agency user bypasses payment without admin-only APIs.
- [ ] Non-agency users do not receive agency privileges.
- [ ] Admin behavior remains unchanged.
