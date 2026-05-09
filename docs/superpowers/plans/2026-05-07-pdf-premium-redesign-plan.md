# PDF Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaire le PDF Webisafe avec la direction C Premium stunning, supprimer les blocs d'alertes répétitifs et conserver un PDF léger.

**Architecture:** La refonte reste concentrée dans `lib/pdfTemplate.js`. `lib/generatePdf.js` reste inchangé car il est déjà optimisé sans Chart.js/canvas. Les tests et mesures utilisent les commandes Node/Vitest existantes.

**Tech Stack:** JavaScript ESM, template HTML/CSS, Puppeteer, Vitest.

---

## File Structure

- Modify: `lib/pdfTemplate.js`
  - Supprimer `Alertes à traiter en priorité` dans `executivePage`.
  - Supprimer `Alertes à surveiller` dans `actionPage`.
  - Ajouter des helpers HTML légers pour hero section, stat cards, insight cards et section shell premium.
  - Remplacer le CSS compact par un système visuel premium sombre Webisafe, sans canvas ni script.
- Verify: `lib/generatePdf.js`
  - Ne pas modifier sauf régression constatée.
- Test: `src/utils/generatePDF.test.js`, `src/utils/paymentEmails.test.js`
  - Lancer les tests existants.

### Task 1: Remove repeated alert sections

**Files:**
- Modify: `lib/pdfTemplate.js:127-129`
- Modify: `lib/pdfTemplate.js:190-193`

- [ ] **Step 1: Verify current alert text exists**

Run: `node -e "import('./lib/pdfTemplate.js').then(({buildTemplate})=>{const html=buildTemplate({url:'https://example.com',score:65,scores:{performance:67,security:94,advanced_security:82,seo:20,ux:70},metrics:{performance:{score:67},security:{score:94},seo:{score:20},ux:{score:70}},recommendations:[]}); console.log({priority:html.includes('Alertes à traiter en priorité'),watch:html.includes('Alertes à surveiller')});})"`

Expected before implementation: at least one value may be true depending on model alerts.

- [ ] **Step 2: Remove the blocks**

Change `executivePage` so it returns content without the `alerts` constant and without appending `${alerts}`.

Change `actionPage` so it does not create or prepend the `alerts` panel.

- [ ] **Step 3: Verify removed text**

Run: `node -e "import('./lib/pdfTemplate.js').then(({buildTemplate})=>{const html=buildTemplate({url:'https://example.com',score:65,scores:{performance:67,security:30,advanced_security:82,seo:20,ux:70},metrics:{performance:{score:67},security:{score:30,missing_headers:[{header:'Content-Security-Policy',message:'Header absent',severity:'Critique'}]},seo:{score:20},ux:{score:70}},recommendations:[]}); console.log(JSON.stringify({priority:html.includes('Alertes à traiter en priorité'),watch:html.includes('Alertes à surveiller')}));})"`

Expected: `{"priority":false,"watch":false}`.

### Task 2: Implement premium section structure

**Files:**
- Modify: `lib/pdfTemplate.js`

- [ ] **Step 1: Add lightweight visual helpers**

Add helpers for `sectionHero`, `scoreSummaryGrid`, `insightCard`, `sectionBody`, and `keyValueList`. These must return HTML strings only.

- [ ] **Step 2: Apply helpers to pages**

Update `page`, `coverPage`, `executivePage`, `performancePage`, `securityPage`, `advancedPage`, `seoPage`, `uxPage`, `actionPage`, and `closingPage` to use stronger section hierarchy.

- [ ] **Step 3: Keep data intact**

Ensure metrics, tables, recommendations, detected improvements, Webisafe contact and domain remain present.

### Task 3: Replace CSS with premium lightweight design

**Files:**
- Modify: `lib/pdfTemplate.js:200-229`

- [ ] **Step 1: Replace duplicated CSS overrides**

Use one coherent CSS block. Keep `@page`, `.page`, `.cover`, `.page-header`, `.page-footer`, `.panel`, `.metric`, `.score-box`, `.badge`, `.two-cols`, `.metric-grid`, tables, action cards and CTA styles.

- [ ] **Step 2: Preserve performance constraints**

Do not add `<canvas>`, external fonts, external images, Chart.js, SVG filters, blur filters or script tags.

### Task 4: Verify output

**Files:**
- Verify: `lib/pdfTemplate.js`
- Verify: `lib/generatePdf.js`

- [ ] **Step 1: Generate and measure PDF**

Run: `node -e "import('./lib/generatePdf.js').then(async ({generatePdf})=>{const sample={url:'https://jumia.co',scanDate:'2026-05-07T02:45:00.000Z',score:65,scores:{performance:67,security:94,advanced_security:82,seo:20,ux:70},metrics:{performance:{score:67,lcp:3100,page_weight_mb:3.2,opportunities:[{title:'Réduire le JavaScript inutilisé',description:'Supprimez le code non utilisé.',savings_ms:850}]},security:{score:94,https:true,missing_headers:[{header:'Content-Security-Policy',message:'Header absent',severity:'À corriger'}]},seo:{score:20,has_description:false,has_canonical:false},ux:{score:70,issues:[{message:'Images sans texte alternatif',impact:'Accessibilité réduite',severity:'À corriger'}]}},recommendations:[{priorite:4,categorie:'Performance',action:'Activer le cache navigateur',explication:'Mettre en cache les ressources statiques.',impact:'Navigation plus rapide'}]}; const started=Date.now(); const pdf=await generatePdf(sample); const text=pdf.toString('latin1'); console.log(JSON.stringify({bytes:pdf.length,mb:(pdf.length/1024/1024).toFixed(2),pages:(text.match(/\\/Type\\s*\\/Page\\b/g)||[]).length,images:(text.match(/\\/Subtype\\s*\\/Image/g)||[]).length,elapsedMs:Date.now()-started}));})"`

Expected: PDF generated successfully, images remain `0` or very low, size remains much smaller than the original 2.23 MB.

- [ ] **Step 2: Verify HTML constraints**

Run: `node -e "import('./lib/pdfTemplate.js').then(({buildTemplate})=>{const html=buildTemplate({url:'https://jumia.co',score:65,scores:{performance:67,security:94,advanced_security:82,seo:20,ux:70},metrics:{performance:{score:67},security:{score:94},seo:{score:20},ux:{score:70}},recommendations:[]}); console.log(JSON.stringify({priority:html.includes('Alertes à traiter en priorité'),watch:html.includes('Alertes à surveiller'),canvas:html.includes('<canvas'),script:html.includes('<script'),domain:html.includes('webisafe.vercel.app')}));})"`

Expected: `priority:false`, `watch:false`, `canvas:false`, `script:false`, `domain:true`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/utils/generatePDF.test.js src/utils/paymentEmails.test.js`

Expected: all tests pass.
