import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const filesToCheck = ['src/pages/Dashboard.jsx', 'src/hooks/useAuth.js'];
const mojibakePattern = /Ã|Â|â/;

for (const relativePath of filesToCheck) {
  test(`text content in ${relativePath} does not contain mojibake sequences`, () => {
    const fileContents = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
    assert.equal(mojibakePattern.test(fileContents), false);
  });
}
