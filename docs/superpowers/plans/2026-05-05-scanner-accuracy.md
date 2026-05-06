# Scanner Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Webisafe scanner scores more accurate without whitelisting or artificially boosting known domains.

**Architecture:** Add shared server helpers for WAF/captcha detection and issue severity, make SEO/UX return partial results when HTML is blocked, improve security headers fallback, and align frontend score normalization with backend weights. The backend remains the source of truth while the frontend avoids contradictory hard caps.

**Tech Stack:** Node.js ES modules, Cheerio, Vite/React frontend utilities.

---

## File Structure

- Create: `server/utils/protectionDetection.js` — shared HTML/URL detection for captcha, WAF, bot protection and meta refresh challenges.
- Create: `server/utils/issueSeverity.js` — shared constants/helpers for issue severities and score caps.
- Modify: `server/scanners/seoScanner.js` — detect protected pages and return partial SEO results without false failures.
- Modify: `server/scanners/uxScanner.js` — detect protected pages and return partial UX results without treating captcha as page UX.
- Modify: `server/scanners/securityScanner.js` — add `HEAD` to `GET` fallback and severity metadata for missing headers.
- Modify: `server/controllers/scanController.js` — expose protection metadata and confidence/partial warning in scan response.
- Modify: `src/utils/api.js` — align score weights with backend and soften frontend caps.

## Tasks

### Task 1: Shared protection and severity helpers

**Files:**
- Create: `server/utils/protectionDetection.js`
- Create: `server/utils/issueSeverity.js`

- [ ] Create `protectionDetection.js` with `detectProtectionPage({ url, finalUrl, html, headers })`.
- [ ] Detect `/.well-known/sgcaptcha`, `captcha`, `recaptcha`, `hcaptcha`, `cf-challenge`, `cloudflare`, `bot protection`, and meta refresh challenges.
- [ ] Create `issueSeverity.js` with severity constants and `getSeverityCap(issues)`.

### Task 2: SEO and UX partial protection handling

**Files:**
- Modify: `server/scanners/seoScanner.js`
- Modify: `server/scanners/uxScanner.js`

- [ ] Import `detectProtectionPage` in both scanners.
- [ ] After fetching HTML, detect protection pages before normal analysis.
- [ ] For protected SEO page, return `score: null`, `partial: true`, `protection_detected`, and unknown structural fields as `null` instead of `false`.
- [ ] For protected UX page, return `score: null`, `partial: true`, `protection_detected`, no UX issues, and `tap_targets_ok: null`.

### Task 3: Security header fallback and severity metadata

**Files:**
- Modify: `server/scanners/securityScanner.js`

- [ ] Change `checkSecurityHeaders` to try `HEAD` first.
- [ ] If `HEAD` fails or returns no useful headers, retry with `GET`.
- [ ] Add `severity` to missing headers.
- [ ] Keep critical security failures strongly penalized and avoid lowering real-risk detection.

### Task 4: Controller response confidence metadata

**Files:**
- Modify: `server/controllers/scanController.js`

- [ ] Add scan confidence calculation from scanner partial/protection flags.
- [ ] Expose `scan_confidence` and `protection_detected` in response.
- [ ] Add a critical/non-critical alert warning for WAF/captcha partial scan.

### Task 5: Frontend score normalization alignment

**Files:**
- Modify: `src/utils/api.js`

- [ ] Align frontend global weights with backend: performance 35, security 30, SEO 25, UX 10.
- [ ] Stop counting unknown/unverified values as failures.
- [ ] Remove `has_sitemap` as a failure unless explicitly verified false.
- [ ] Replace harsh count-based cap with severity-aware softened caps.
- [ ] Preserve strong penalties for malware, HTTPS false, exposed sensitive files, high UX issues, and bad Core Web Vitals.

### Task 6: Verification

**Files:**
- No new files required.

- [ ] Run a syntax/build verification command available in the project.
- [ ] If no tests exist, run the project lint/build script from `package.json`.
- [ ] Review diffs to ensure no unrelated user edits were overwritten.

## Self-review

- Spec coverage: backend/frontend alignment, WAF/captcha partials, severity-based scoring, header fallback and no whitelist are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: shared field names are `partial`, `protection_detected`, `scan_confidence`, and `headers_manquants[].severity`.
