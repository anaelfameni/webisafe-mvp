import { readFileSync } from 'fs';
const src1 = fs.readFileSync('C:/Users/Anael FAMENI/.gemini/antigravity/webisafe/lib/pdfModel.js', 'utf-8');
const src2 = fs.readFileSync('C:/Users/Anael FAMENI/.gemini/antigravity/webisafe/lib/pdfTemplate.js', 'utf-8');

function findIssues(src, filename) {
  const lines = src.split('\n');
  const issues = [];
  lines.forEach((line, li) => {
    let j = 0;
    while (j < line.length) {
      const c = line[j];
      if (c === '\\') { j += 2; continue; }
      // skip double-quoted string
      if (c === '"') {
        j++;
        while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; }
        j++; continue;
      }
      // skip template literal (simplified)
      if (c === '`') {
        j++;
        while (j < line.length && line[j] !== '`') { if (line[j] === '\\') j++; j++; }
        j++; continue;
      }
      // find single-quoted string with embedded apostrophe
      if (c === "'") {
        const start = j; j++;
        while (j < line.length) {
          if (line[j] === '\\') { j += 2; continue; }
          if (line[j] === "'") {
            const nxt = line[j + 1];
            if (nxt && /[a-zA-Z\xc0-\xff]/.test(nxt)) {
              // embedded apostrophe (not closing quote)
              const ctx = line.substring(Math.max(0, start - 3), j + 15);
              issues.push({ file: filename, line: li + 1, col: j + 1, ctx });
              j++; // skip past it and continue reading same string
            } else {
              j++; break; // real closing quote
            }
          } else { j++; }
        }
        continue;
      }
      j++;
    }
  });
  return issues;
}

const all = [...findIssues(src1, 'pdfModel.js'), ...findIssues(src2, 'pdfTemplate.js')];
if (all.length === 0) {
  console.log('No remaining issues found!');
} else {
  all.forEach(x => console.log(x.file + ':' + x.line + ':' + x.col + '  ' + JSON.stringify(x.ctx)));
}
