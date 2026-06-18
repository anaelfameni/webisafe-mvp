const fs = require('fs');
const path = require('path');

const base = 'C:/Users/Anael FAMENI/.gemini/antigravity/webisafe';
const files = ['lib/pdfModel.js', 'lib/pdfTemplate.js'];

for (const f of files) {
  const fpath = path.join(base, f);
  let content = fs.readFileSync(fpath, 'utf8');

  // Match single-quoted strings; convert to double-quoted when they contain bare apostrophes
  const singleQuoteStringRe = /'([^'\\]|\\.)*'/g;

  content = content.replace(singleQuoteStringRe, (match) => {
    const inner = match.slice(1, -1);
    if (/[a-zA-ZÀ-ÿ]'[a-zA-ZÀ-ÿ]/.test(inner)) {
      const escaped = inner.replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    return match;
  });

  fs.writeFileSync(fpath, content, 'utf8');
  console.log('Done:', f);
}
