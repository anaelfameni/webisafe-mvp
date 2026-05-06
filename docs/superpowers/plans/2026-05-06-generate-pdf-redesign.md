# Generate PDF Premium Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `src/utils/generatePDF.js` pour produire un PDF premium complet, sombre, accentué et structuré selon la checklist Webisafe.

**Architecture:** Garder un seul fichier générateur pour respecter la structure actuelle, mais séparer clairement les helpers de normalisation, le modèle d’audit et les composants React PDF. `buildPdfAuditModel` devient la source unique des sections du rapport, et le rendu lit uniquement ce modèle normalisé.

**Tech Stack:** React, `@react-pdf/renderer`, tests Node/Vitest existants, JavaScript ES modules.

---

## File Structure

- Modify: `src/utils/generatePDF.js`
  - Préserver les exports publics.
  - Ajouter helpers de texte, statuts, métriques, sections et groupes de recommandations.
  - Refaire les pages PDF avec fond sombre uniforme, header/footer et pagination.
- Modify: `src/utils/generatePDF.test.js`
  - Adapter les tests à la conservation des accents.
  - Couvrir le modèle enrichi demandé.
- Reference only: `src/pages/Rapport.jsx`, `src/pages/Dashboard.jsx`
  - Vérifier que `generatePDF(scan)` reste compatible.

---

### Task 1: Update tests for accented text and enriched model

**Files:**
- Modify: `src/utils/generatePDF.test.js`

- [ ] **Step 1: Write the failing test for accent preservation**

```js
test('sanitizePdfText preserves French accents while removing unsupported symbols', () => {
  const result = sanitizePdfText("Rapport d’audit — Sécurité ✅ 📱 Côte d'Ivoire, à vérifier");
  assert.equal(result, "Rapport d'audit - Sécurité Côte d'Ivoire, à vérifier");
});
```

- [ ] **Step 2: Write the failing test for the enriched audit model**

```js
test('buildPdfAuditModel exposes required premium PDF sections when scan data exists', () => {
  const model = buildPdfAuditModel(sampleScan);
  assert.equal(model.cover.domain, 'mon-site.ci');
  assert.equal(model.sections.performance.metrics[0].label, 'Score performance');
  assert.equal(model.sections.security.metrics[0].label, 'Score sécurité');
  assert.equal(model.sections.advancedSecurity.title, 'Sécurité avancée');
  assert.equal(model.sections.seo.metrics[0].label, 'Score SEO');
  assert.equal(model.sections.ux.metrics[0].label, 'Score UX');
  assert.equal(model.actionPlan.groups.urgent.count, 1);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/utils/generatePDF.test.js`

Expected: FAIL because accents are currently stripped and the enriched model fields do not exist.

---

### Task 2: Rebuild normalization helpers and audit model

**Files:**
- Modify: `src/utils/generatePDF.js`

- [ ] **Step 1: Replace text sanitization rules**

```js
export function sanitizePdfText(value) {
  const source = String(value ?? '');
  return source
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 2: Add helpers for controlled values**

```js
function clean(value, fallback = '') {
  const text = sanitizePdfText(value);
  if (!text || text === 'undefined' || text === 'null') return fallback;
  return text;
}

function hasValue(value) {
  return value !== undefined && value !== null && clean(value) !== '';
}
```

- [ ] **Step 3: Build model sections from scan metrics**

Implement `buildPdfAuditModel(reportData)` so it returns:

```js
{
  cover: { domain, url, scanDateLabel, score, scoreLabel, scoreColor, categoryScores, executiveSummary, metadata },
  scores: { global, performance, security, advancedSecurity, seo, ux },
  sections: { performance, security, advancedSecurity, seo, ux },
  actionPlan: { counts, groups },
  recommendations,
  criticalAlerts
}
```

- [ ] **Step 4: Run model tests**

Run: `npx vitest run src/utils/generatePDF.test.js`

Expected: model assertions pass or fail only on rendering-unrelated fields that still need implementation.

---

### Task 3: Rebuild React PDF pages with uniform dark design

**Files:**
- Modify: `src/utils/generatePDF.js`

- [ ] **Step 1: Add reusable PDF components**

```js
function ScoreBar({ label, score }) { /* renders label, numeric score, colored progress bar */ }
function StatusBadge({ status }) { /* renders OK, À améliorer, Critique, Échec, Avertissement */ }
function SectionCard({ title, children }) { /* dark card with no white background */ }
function DataTable({ columns, rows, widths }) { /* wide readable columns */ }
```

- [ ] **Step 2: Replace page composition**

Render these pages in `WebisafePdfDocument`:

```js
h(CoverPage, { model }),
h(PerformancePage, { model }),
h(SecurityPage, { model }),
h(AdvancedSecurityPage, { model }),
h(SeoPage, { model }),
h(UxPage, { model }),
h(ActionPlanPage, { model }),
h(CtaPage, { model })
```

- [ ] **Step 3: Keep background uniform**

Use the same `styles.page.backgroundColor` and `styles.cover.backgroundColor` value for every `Page`, including CTA.

---

### Task 4: Verify PDF generation and compatibility

**Files:**
- Modify: `src/utils/generatePDF.js`
- Modify: `src/utils/generatePDF.test.js`

- [ ] **Step 1: Run targeted tests**

Run: `npx vitest run src/utils/generatePDF.test.js`

Expected: PASS.

- [ ] **Step 2: Run project build**

Run: `npm run build`

Expected: PASS without import/export errors.

- [ ] **Step 3: Inspect changed files only**

Run: `git diff -- src/utils/generatePDF.js src/utils/generatePDF.test.js docs/superpowers/specs/2026-05-06-generate-pdf-design.md docs/superpowers/plans/2026-05-06-generate-pdf-redesign.md`

Expected: Diff only includes planned PDF/spec/plan changes.
