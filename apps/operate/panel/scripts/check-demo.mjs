#!/usr/bin/env node
/** Validates the generated static artifact and its project-path references. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const panelRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(panelRoot, 'dist', 'pages');
const requiredFiles = [
  '.nojekyll',
  'index.html',
  'manage/index.html',
  '3rr-mark.svg',
  'css/panel.css',
  'css/demo.css',
  'js/demo.js',
  'fonts/syne-latin-wght-normal.woff2',
  'fonts/jetbrains-mono-latin-wght-normal.woff2',
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(outputRoot, relativePath)), `Missing ${relativePath}`);
}

const htmlFiles = ['index.html', 'manage/index.html'];
const html = htmlFiles
  .map((file) => fs.readFileSync(path.join(outputRoot, file), 'utf8'))
  .join('\n');
const javascript = fs.readFileSync(path.join(outputRoot, 'js', 'demo.js'), 'utf8');
const css = [
  fs.readFileSync(path.join(outputRoot, 'css', 'panel.css'), 'utf8'),
  fs.readFileSync(path.join(outputRoot, 'css', 'demo.css'), 'utf8'),
].join('\n');

assert.doesNotMatch(`${html}\n${javascript}`, /\/api\//, 'Demo contains a backend endpoint');
assert.doesNotMatch(html, /type=["']password["']/i, 'Demo contains a credential field');
assert.doesNotMatch(html, /\/auth\//, 'Demo contains an authentication route');
assert.doesNotMatch(
  html,
  /name=["'](?:password|secret|token)["']/i,
  'Demo contains a secret-shaped field'
);
assert.doesNotMatch(
  html,
  /(?:href|src)=["']\/(?!3rr(?:\/|["']))/i,
  'Demo contains a root-host link'
);
assert.doesNotMatch(css, /url\(["']?\/(?!3rr\/)/i, 'Demo CSS contains a root-host asset path');
assert.match(html, /href="\/3rr\/"/, 'Fleet navigation does not use the project path');
assert.match(html, /href="\/3rr\/manage\/"/, 'Manage navigation does not use the project path');
assert.match(
  html,
  /No authentication, RCON connection, command execution, or persistence occurs\./
);
assert.doesNotMatch(javascript, /localStorage\.setItem/, 'Demo persists non-theme state');

for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(outputRoot, file), 'utf8');
  for (const match of source.matchAll(/(?:href|src)="(\/3rr\/[^"#?]*)"/g)) {
    const target = match[1]?.replace(/^\/3rr\//, '');
    if (!target || target.endsWith('/')) continue;
    assert.ok(fs.existsSync(path.join(outputRoot, target)), `${file} references missing ${target}`);
  }
}

console.log(`Static demo artifact verified (${requiredFiles.length} required files).`);
