#!/usr/bin/env node
/** Builds the static GitHub Pages artifact without changing production routes or bundles. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { build } from 'esbuild';
import { demoFixture } from '../public/ts/demo/fixture';

const panelRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(panelRoot, 'public');
const outputRoot = path.join(panelRoot, 'dist', 'pages');

function copyFile(source: string, destination: string): void {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function render(template: string, destination: string, locals: Record<string, unknown>): void {
  const html = ejs.render(fs.readFileSync(template, 'utf8'), locals, {
    filename: template,
  });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, html, 'utf8');
}

async function main(): Promise<void> {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  execFileSync(process.execPath, [path.join(panelRoot, 'scripts', 'copy-fonts.js')], {
    cwd: panelRoot,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [path.join(panelRoot, 'scripts', 'build-css.mjs')], {
    cwd: panelRoot,
    stdio: 'inherit',
  });

  const panelCss = fs
    .readFileSync(path.join(publicRoot, 'css', 'panel.css'), 'utf8')
    .replaceAll('url("/fonts/', 'url("/3rr/fonts/');
  fs.mkdirSync(path.join(outputRoot, 'css'), { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'css', 'panel.css'), panelCss, 'utf8');
  copyFile(path.join(publicRoot, 'css', 'demo.css'), path.join(outputRoot, 'css', 'demo.css'));
  copyFile(path.join(publicRoot, '3rr-mark.svg'), path.join(outputRoot, '3rr-mark.svg'));
  for (const font of ['syne-latin-wght-normal.woff2', 'jetbrains-mono-latin-wght-normal.woff2']) {
    copyFile(path.join(publicRoot, 'fonts', font), path.join(outputRoot, 'fonts', font));
  }

  await build({
    entryPoints: [path.join(publicRoot, 'ts', 'demo', 'client.ts')],
    bundle: true,
    minify: true,
    outfile: path.join(outputRoot, 'js', 'demo.js'),
    target: ['es2020'],
  });

  const viewsRoot = path.join(panelRoot, 'views', 'demo');
  render(path.join(viewsRoot, 'fleet.ejs'), path.join(outputRoot, 'index.html'), {});
  render(path.join(viewsRoot, 'manage.ejs'), path.join(outputRoot, 'manage', 'index.html'), {
    server_id: demoFixture.server.id,
    hostname: demoFixture.server.hostname,
    host: demoFixture.server.host,
    port: demoFixture.server.port,
    connected: true,
    authenticated: true,
    hostname_error: null,
    requestedGameType: demoFixture.requested.gameType,
    requestedGameMode: demoFixture.requested.gameMode,
    requestedMap: demoFixture.requested.map,
    gameTypes: Object.keys(demoFixture.gameTypes),
    mapGroups: demoFixture.mapGroups,
  });
  fs.writeFileSync(path.join(outputRoot, '.nojekyll'), '', 'utf8');

  console.log(`Built static demo at ${path.relative(panelRoot, outputRoot)}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
