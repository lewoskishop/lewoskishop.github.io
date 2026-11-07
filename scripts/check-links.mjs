#!/usr/bin/env node
/**
 * Verificador de links internos del sitio construido.
 *
 *   npm run build && node scripts/check-links.mjs
 *
 * Recorre dist/ y comprueba que cada href interno apunte a una página que
 * exista. Reporta los rotos con el archivo donde aparecen.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const DIST = 'dist';
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.html')) files.push(full);
  }
}
if (!existsSync(DIST)) {
  console.error('No existe dist/. Corré `npm run build` primero.');
  process.exit(1);
}
walk(DIST);

/** Rutas que existen en el sitio, normalizadas sin slash final. */
const rutas = new Set();
for (const file of files) {
  const url = '/' + relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  rutas.add(url.replace(/\/$/, '') || '/');
}

const rotos = new Map();
const HREF = /href="([^"#?][^"]*)"/g;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  let m;
  while ((m = HREF.exec(html)) !== null) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const limpio = href.split('#')[0].split('?')[0];
    if (!limpio) continue;

    let destino = limpio.replace(/\/$/, '') || '/';
    // /productos/foo  ->  dist/productos/foo/index.html
    const existe =
      rutas.has(destino) || existsSync(join(DIST, destino, 'index.html')) || existsSync(join(DIST, destino));

    if (!existe) {
      if (!rotos.has(destino)) rotos.set(destino, []);
      rotos.get(destino).push(relative(DIST, file));
    }
  }
}

console.log(`\nRevisadas ${files.length} páginas.`);
if (rotos.size === 0) {
  console.log('\x1b[32m✓ Ningún link interno roto.\x1b[0m\n');
  process.exit(0);
}

console.log(`\x1b[31m✗ ${rotos.size} link(s) rotos:\x1b[0m\n`);
for (const [ruta, origenes] of [...rotos.entries()].sort()) {
  console.log(`  ${ruta}`);
  for (const o of [...new Set(origenes)].slice(0, 4)) console.log(`      ← ${o}`);
}
console.log();
process.exit(1);
