#!/usr/bin/env node
/** Minimal local server that mounts dist/pages at the production project path. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const panelRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(panelRoot, 'dist', 'pages');
const port = Number(process.env.DEMO_PORT ?? 3218);
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
  if (url.pathname === '/3rr' || url.pathname === '/3rr/manage') {
    response.writeHead(301, { Location: `${url.pathname}/` });
    response.end();
    return;
  }
  if (!url.pathname.startsWith('/3rr/')) {
    response.writeHead(404).end('Not found');
    return;
  }
  let relativePath = decodeURIComponent(url.pathname.slice('/3rr/'.length));
  if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
  const filePath = path.resolve(outputRoot, relativePath);
  if (!filePath.startsWith(`${outputRoot}${path.sep}`) || !fs.existsSync(filePath)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static demo server listening on http://127.0.0.1:${String(port)}/3rr/`);
});
