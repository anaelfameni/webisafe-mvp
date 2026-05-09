# Webisafe SEO, Security, and Agency Mode Enhancements Design

## Status

Approved for implementation planning.

## Goal

Improve Webisafe's premium audit so it feels closer to SEOptimer for SEO and ImmuniWeb for security, while keeping Webisafe focused on SMEs, agencies, trust, and business-readable recommendations.

The implementation will be delivered in three structured lots:

1. Scanner data model and scan engines.
2. Premium report page and PDF rendering.
3. Agency mode, agency dashboard, payment bypass, and agency-branded PDFs.

## Non-goals

- Do not redesign the existing premium report visual identity.
- Do not claim real certification for PCI DSS, GDPR, ISO 27001, or cyber insurance readiness.
- Do not add intrusive security exploitation. Checks remain passive and safe.
- Do not add a public secret route that creates the agency user automatically.
- Do not remove or rename existing scan fields that older reports may still use.

## Existing integration points

The production scan path for the current frontend/serverless flow is `api/scan.js`. It contains the scan orchestration used by the frontend and duplicates some logic from `server/scanners/*`.

Implementation must prioritize `api/scan.js` for production behavior, then mirror essential scanner improvements into:

- `server/scanners/seoScanner.js`
- `server/scanners/securityScanner.js`
- `scanners/security-checks.js`
- `scanners/extended-security-checks.js`

Frontend and PDF integration points:

- `src/pages/Rapport.jsx`
- `src/pages/Payment.jsx`
- `src/App.jsx`
- `src/hooks/useAuth.js`
- `src/context/AuthContext.jsx`
- `src/components/Header.jsx`
- `src/utils/api.js`
- `src/utils/generatePDF.js`
- `lib/pdfModel.js`
- `lib/pdfTemplate.js`
- `api/generate-pdf.js`

Supabase-related integration points:

- `supabase/test_accounts_profiles.sql`
- `supabase/auth_users_profile_sync.sql`
- a dedicated `agency_settings` SQL schema plus settings API endpoints

## Lot 1: Scanner data and engines

### SEO technical checks

Add the following SEO checks while preserving existing fields such as `has_title`, `has_description`, `h1_count`, `has_sitemap`, `has_viewport`, `has_canonical`, `has_open_graph`, and `is_indexable`:

- Title length with ideal range around 30 to 60 characters.
- Meta description length with ideal range around 120 to 160 characters.
- Unique H1 with failure for zero H1 and warning for more than one H1.
- H2/H3 presence and simple structure signal.
- Images without `alt`, also surfaced in SEO even if UX already reports it.
- `<html lang="...">` presence.
- `robots.txt` accessibility.
- Sitemap discovery through `robots.txt` and common `/sitemap.xml` paths.
- Structured data detection through `script[type="application/ld+json"]`.
- Twitter Card tags: `twitter:title`, `twitter:description`, `twitter:image`.
- Favicon detection through common icon link tags and fallback `/favicon.ico` probing.

Recommended normalized shape:

```js
metrics.seo.technical_checks = {
  title_length: { status, value, ideal, message },
  meta_description_length: { status, value, ideal, message },
  h1_unique: { status, value, message },
  headings_structure: { status, h2_count, h3_count, message },
  images_alt: { status, missing_count, total, message },
  lang_attribute: { status, value, message },
  robots_txt: { status, url, blocking, message },
  sitemap_xml: { status, url, discovered_from, message },
  structured_data: { status, types, message },
  twitter_cards: { status, missing, message },
  favicon: { status, url, message }
}
```

### AI and machine credibility

Add a `metrics.seo.ai_visibility` object focused on trust signals that LLMs, crawlers, and business users can understand.

Checks:

- Organization structured data.
- Visible contact page link.
- Visible legal mentions link.
- Identifiable brand name.
- Complete Open Graph tags.
- Accessible sitemap.
- Non-blocking robots.txt.
- Main content readable without requiring JavaScript.
- Author or organization identifiable.
- Coherence between title, meta description, and H1.

Recommended shape:

```js
metrics.seo.ai_visibility = {
  score,
  checks: [
    { key, label, status, evidence, business_impact, recommendation }
  ]
}
```

### Business SEO recommendations

Add `metrics.seo.business_recommendations` and feed selected items into the existing general `recommendations` list.

Each recommendation must include:

- problem
- impact_business
- correction
- effort
- priority

Example:

```js
{
  category: 'SEO',
  problem: 'Meta description absente',
  impact_business: 'Google peut générer un extrait peu convaincant, ce qui réduit le taux de clic.',
  correction: 'Ajouter une description unique de 120 à 160 caractères.',
  effort: 'Faible',
  priority: 'P2'
}
```

### Security checks

Add passive, timeout-bounded checks for:

- HTTP methods: `OPTIONS`, `TRACE`, `PUT`, `DELETE`, `PROPFIND`.
- CSP quality scoring.
- DNSSEC through DNS-over-HTTPS lookups for DS records.
- CMS detection for WordPress, Shopify, Drupal, Joomla, Laravel, Next.js, WooCommerce, and PrestaShop.
- Lightweight WordPress security scan.
- JS library version detection.
- SRI checks for external CDN scripts.
- Simple compliance preparation badges.

Recommended normalized shape:

```js
metrics.security.http_methods = {
  checked: ['OPTIONS', 'TRACE', 'PUT', 'DELETE', 'PROPFIND'],
  allowed: [],
  risky: [],
  status,
  findings: []
}

metrics.security.csp_quality = {
  present,
  score,
  issues: [],
  strengths: [],
  status
}

metrics.security.dnssec = {
  status,
  ds_records_found,
  message,
  recommendation
}

metrics.security.cms_detection = {
  primary,
  detected: [],
  confidence,
  evidence: []
}

metrics.security.wordpress_security = {
  applicable,
  checks: []
}

metrics.security.js_libraries = {
  detected: [],
  outdated_or_risky: [],
  status
}

metrics.security.sri = {
  external_scripts_count,
  missing_integrity_count,
  missing_crossorigin_count,
  findings: [],
  status
}

metrics.security.compliance_badges = [
  { key, label, status, explanation, missing_signals }
]
```

### Security check details

HTTP methods:

- `TRACE` enabled is critical or high severity.
- `PUT` or `DELETE` returning a permissive success status is high severity.
- `PROPFIND` indicates possible WebDAV exposure.
- `OPTIONS` is informational unless it advertises risky methods.

CSP quality:

- Penalize `unsafe-inline`.
- Penalize `unsafe-eval`.
- Penalize wildcard `*`.
- Penalize missing `default-src`.
- Penalize missing `frame-ancestors`.
- Reward `report-uri` or `report-to`.
- Warn for overly broad third-party domains.

DNSSEC:

- Use DoH to query DS records.
- Return `pass` when DS records exist.
- Return `warning` when DS records are absent.
- Return `error` when validation cannot be performed.
- Recommendation must point to registrar/DNS provider configuration.

CMS detection:

- Use HTML markers, headers, paths, generator tags, asset URLs, and existing technology detection.
- Keep confidence explicit.
- Use detected CMS to decide whether WordPress checks are applicable.

WordPress checks:

- `/wp-login.php` visible.
- `/xmlrpc.php` active.
- `/wp-json/wp/v2/users` exposed.
- WordPress version exposed in HTML/generator/assets.
- `/readme.html` accessible.
- Plugin paths visible in HTML.
- Potential directory listing on common plugin/content paths.

JS library detection:

- Detect jQuery, Bootstrap, Lodash, and React dev build when visible in HTML or asset names.
- Compare only against a small local advisory map to avoid introducing heavy external dependency or CVE API failure.

SRI:

- Check external script tags, especially CDN scripts.
- Warn when `integrity` is missing.
- Warn when `crossorigin` is missing for integrity-protected scripts.

Compliance badges:

- `Préparation PCI DSS`
- `Préparation GDPR`
- `Préparation ISO 27001`
- `Préparation cyber assurance`

Badges must say they are technical preparation signals, not certifications.

### Scoring

SEO:

- When PageSpeed SEO score is available, keep it as the SEO display score source.
- Local SEO score incorporates new checks when PageSpeed is unavailable.
- New checks always feed details and recommendations, even when the displayed SEO score comes from PageSpeed.
- Apply light caps only for critical SEO blockers such as no title, no description, no H1, noindex, robots blocking, or no sitemap.

Security:

- Fundamental HTTPS and malware checks remain important.
- New passive checks influence advanced or extended security score more than base security score.
- Critical findings appear in alerts and recommendations.
- Compliance badges do not directly certify or heavily change the score.

### Error handling

- Each external or network check uses short timeouts.
- A check failure returns `error` or `not_measured`, not a failed scan.
- The global scan response must still be returned when any single check fails.
- Cached scans must remain readable when new fields are absent.

## Lot 2: Premium report page and PDF

### Premium page

Update `src/pages/Rapport.jsx` to render new data while preserving current layout and styling.

SEO additions:

- Add `SEO technique avancé` inside the SEO section.
- Add `Visibilité IA & crédibilité machine` inside the SEO section.
- Add `Recommandations business SEO` cards when available.

Security additions:

- Keep `Sécurité` for base HTTPS, malware, SSL, headers, cookies, and sensitive files.
- Add new passive checks mostly under `Sécurité Avancée`:
  - HTTP methods
  - CSP quality
  - DNSSEC
  - CMS detected
  - WordPress security
  - JS libraries
  - SRI
  - Compliance badges

Use existing visual patterns:

- `MetricRow`
- dark rounded cards
- severity pills
- current Webisafe colors
- existing section navigation

### PDF model

Update `lib/pdfModel.js` to normalize new data for PDF rendering.

Add model sections or subsections for:

- Advanced SEO technical signals.
- AI and machine credibility.
- Business SEO recommendations.
- HTTP methods.
- CSP quality.
- DNSSEC.
- CMS and WordPress findings.
- JS libraries and SRI.
- Compliance preparation badges.
- Agency branding.

Existing PDF score parity behavior must be preserved: displayed PDF scores should continue to use scan/page score values as the source of truth, not recalculate or cap them inside PDF rendering.

### PDF template

Update `lib/pdfTemplate.js` without changing the design language.

Allowed changes:

- Add more rows to existing metric grids.
- Add panels using existing `panel`, `dataTable`, and `technicalFinding` components.
- Add one extra page for the new AI visibility and compliance-preparation content so the existing SEO/UX and security pages remain readable.

Extra page title:

`Visibilité IA & conformité préparatoire`

This page can include:

- AI credibility score and checks.
- Organization/contact/legal signals.
- Compliance preparation badges.
- Business SEO recommendations.

### Agency-branded PDF

When the connected user has role `agence`, `Rapport.jsx` must pass agency branding into `generatePDF`.

Recommended branding object:

```js
agencyBranding: {
  enabled: true,
  agency_name,
  logo_url,
  primary_color,
  secondary_color,
  contact_email,
  footer_text
}
```

Rules:

- Branding applies only for agency users.
- Non-agency PDFs remain standard Webisafe reports.
- If logo or colors are invalid, fall back to the Webisafe default design.
- Keep Webisafe Verified language as a trust badge, not a legal certification.

## Lot 3: Agency mode

### Role and routing

Add role `agence`.

Expected routing:

- `admin@test.com` logs in to `/admin`.
- `agence@test.com` logs in to `/agence`.
- Normal users log in to `/dashboard`.

Update role checks in:

- `src/hooks/useAuth.js`
- `src/context/AuthContext.jsx`
- `src/App.jsx`
- `src/components/Header.jsx`
- relevant report/payment access checks

### Agency account creation

Do not create a seed API route.

Add SQL/profile support for:

- email: `agence@test.com`
- role: `agence`
- plan: `agency`

Manual Supabase Auth instruction:

- Create user in Supabase Auth.
- Email: `agence@test.com`.
- Password: `123agence123`.
- Confirm the user if email confirmation is enabled.
- Ensure the profile row has role `agence`.

### Agency settings persistence

Use Supabase with localStorage fallback.

Recommended table:

```sql
agency_settings (
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
)
```

API behavior:

- Fetch settings for current agency user.
- Save settings for current agency user.
- Deny normal users.
- Deny admin mutation of agency settings in this MVP; admin keeps existing admin scan/report access only.
- If API fails, frontend loads and saves fallback localStorage settings.

### Agency dashboard

Create `/agence` as a professional dashboard.

MVP sections:

1. Overview cards:
   - clients audited
   - reports generated
   - premium scans ready
   - Webisafe Verified badge

2. PDF customization:
   - agency name
   - logo URL or local preview value
   - primary color
   - secondary color
   - contact email
   - footer text

3. Widget embed:
   - visual preview
   - copyable embed code
   - email capture toggle

4. Multi-client table:
   - use existing scans when available
   - show clean placeholder rows if no data is available
   - include URL/domain, score, status, date, and report action

5. Prepared future actions:
   - public report link
   - automatic notification
   - bulk reports

Prepared actions are shown as disabled with a “bientôt disponible” state because backend automation is outside this MVP.

### Payment bypass

Update `src/pages/Payment.jsx` to add an agency bypass block when:

- `user.role === 'agence'`
- `scanId` is present

Copy:

- `⚙️ Mode Agence`
- `Accédez directement à l'audit premium sans paiement.`
- `Voir l'audit premium (Agence)`

Behavior:

- Mark scan as paid locally.
- Save hydrated scan locally.
- Navigate to `/rapport/:id` with `agencyBypass: true` and `agencyScan` in route state.
- Report access should treat `agencyBypass` similarly to admin bypass for unlock purposes.
- Do not call admin-only unlock APIs for agency users unless a separate safe agency unlock endpoint exists.

## Data compatibility

All new data must be additive.

Do not remove or rename existing fields because:

- previous scans may be cached,
- PDF code already expects older field names,
- premium page normalization supports multiple legacy shapes.

When rendering new data, code must tolerate absent fields.

## Testing strategy

Targeted verification should include:

### SEO scanner tests

- Title too short, ideal, and too long.
- Meta description missing and ideal.
- Zero H1 and multiple H1.
- H2/H3 missing.
- Images missing alt text.
- Missing `html lang`.
- Robots and sitemap detection.
- Structured data and Organization detection.
- Twitter Card detection.
- AI visibility score and checks.

### Security scanner tests

- CSP missing and weak CSP with unsafe directives.
- HTTP methods with risky methods advertised.
- DNSSEC DS present and absent.
- CMS detection markers.
- WordPress endpoints visible.
- JS libraries detected.
- External CDN script without SRI.
- Compliance badges generated with non-certification language.

### Frontend tests

- Agency login redirection to `/agence`.
- Agency payment bypass visible and functional.
- Normal users do not see agency bypass.
- Premium report renders new SEO/security data when present.
- Premium report remains stable when new data is absent.

### PDF tests

- New SEO/security data appears in PDF model/template.
- PDF score parity remains unchanged.
- Existing PDF design components remain in use.
- Agency branding applies only with `agencyBranding.enabled`.
- Non-agency PDF output remains standard Webisafe.

### Manual verification

- Create `agence@test.com` in Supabase Auth with password `123agence123`.
- Confirm role `agence` in profile table.
- Log in and verify redirect to `/agence`.
- Save agency settings and reload.
- Run a scan.
- Use agency bypass on payment page.
- Open premium report.
- Download PDF and verify agency branding plus new data.

## Rollout order

1. Add scanner helpers and normalized output.
2. Add scanner tests.
3. Extend premium page rendering.
4. Extend PDF model and template.
5. Add agency role and routing.
6. Add agency settings persistence and fallback.
7. Add agency dashboard.
8. Add payment bypass.
9. Run targeted tests and build.

## Acceptance criteria

- SEO scan includes all requested technical and AI credibility checks.
- Security scan includes all requested HTTP methods, CSP quality, DNSSEC, CMS, WordPress, JS, SRI, and compliance preparation checks.
- New data appears on the premium report page.
- New data appears in premium PDF reports.
- PDF keeps the same design language.
- Agency user can access `/agence`.
- Agency settings affect PDFs only for agency downloads.
- Agency user can bypass payment and access premium audit.
- Normal users do not receive agency privileges.
- Existing admin behavior continues to work.
- Existing report data remains compatible.
