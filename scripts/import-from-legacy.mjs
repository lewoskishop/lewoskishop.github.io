#!/usr/bin/env node
/**
 * Importa artículos (y categorías implícitas) desde la tienda anterior
 * (LewoskiShop legacy en http://HOST:PORT) al formato Astro content de este repo.
 *
 * Uso:
 *   node scripts/import-from-legacy.mjs --host 192.168.1.203 --port 5000 --mode replace
 *   node scripts/import-from-legacy.mjs --host 192.168.1.203 --port 5000 --mode merge
 *
 * --mode replace: borra src/content/products/*.json (y no borra imágenes huérfanas automáticamente)
 * --mode merge:   conserva productos existentes; omite slugs que ya existen
 *
 * NOTAS: la tienda legacy no expone categoría/grupo en HTML; se infieren por reglas
 * sobre el nombre/descripción, alineadas a la taxonomía actual de LewoskiShop.
 * Revisá category/grupo de artículos ambiguos tras importar.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'src/content/products');
const IMAGES_DIR = path.join(ROOT, 'public/images/products');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const HOST = arg('host', '192.168.1.203');
const PORT = arg('port', '5000');
const MODE = arg('mode', 'merge'); // replace | merge
const BASE = `http://${HOST}:${PORT}`;

function slugify(s) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}
function parsePrice(text) {
  const n = (text || '').replace(/[^\d]/g, '');
  return n ? parseInt(n, 10) : 0;
}

const CAT_RULES = [
  [/\bcera(s)?\b/i, 'Ceras', 'velas'],
  [/\bpabilo|ojalillo|mecha\b/i, 'Pabilos', 'velas'],
  [/\bmolde\b/i, 'Moldes', 'ambos'],
  [/\besencia|fragancia|aroma\b/i, 'Esencias', 'ambos'],
  [/\bfrasco|envase|botella|vidrio|pote|tapa\b/i, 'Envases', 'ambos'],
  [/\bcolorante|pigmento|mica\b/i, 'Colorantes', 'ambos'],
  [/\bjab[oó]n|glicerina|base de jabon|cosm[eé]tica|shampoo\b/i, 'Jabones y Cosmética', 'jabones'],
  [/\bkit\b/i, 'Kits', 'velas'],
  [/\bbalanza|term[oó]metro|tijera|cuchara|pipeta|herramienta\b/i, 'Herramientas', 'ambos'],
  [/\baceite|manteca|alcohol|yeso|arcilla|aditivo|endurecedor\b/i, 'Materias Primas', 'ambos'],
];
function inferCategory(name, desc) {
  const t = `${name} ${desc}`;
  for (const [re, cat, grupo] of CAT_RULES) if (re.test(t)) return { category: cat, grupo };
  return { category: 'General', grupo: 'ambos' };
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return await res.text();
}
async function fetchBuf(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function extractHomeIds(html) {
  return [...new Set([...html.matchAll(/href="\/product\/(\d+)"/g)].map(m => parseInt(m[1], 10)))].sort((a,b)=>a-b);
}
async function discoverIds(homeHtml) {
  const ids = new Set(extractHomeIds(homeHtml));
  for (let i = 1; i <= 200; i++) {
    if (ids.has(i)) continue;
    try {
      const r = await fetch(`${BASE}/product/${i}`, { method:'HEAD', signal: AbortSignal.timeout(5000) });
      if (r.ok) ids.add(i);
    } catch {}
  }
  return [...ids].sort((a,b)=>a-b);
}

function parseDetail(html, id) {
  const name = decodeEntities((html.match(/<h2[^>]*>\s*([\s\S]*?)\s*<\/h2>/i)?.[1] || `Producto ${id}`).replace(/<[^>]+>/g,''));
  const descBlock = html.match(/<!-- Detalles del producto -->[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]
    || html.match(/<p[^>]*style="[^"]*color:#555[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const description = decodeEntities(descBlock.replace(/<[^>]+>/g,''));
  const price = parsePrice(html.match(/class="price"[\s\S]*?\$([\d\.\,]+)/i)?.[1] || html.match(/\$([\d\.\,]+)/)?.[1] || '0');
  const imgs = [...new Set([...html.matchAll(/(?:src|onclick="changeImage\(')(\/uploads\/[^"'\)]+)/g)].map(m=>m[1]))];
  const inStock = !/agotado|sin stock/i.test(html);
  return { id, name, description, price, imgs, inStock };
}

async function downloadImages(slug, srcs) {
  const out = [];
  let n = 1;
  for (const src of srcs.slice(0,3)) {
    const ext = path.extname(src).split('?')[0] || '.jpg';
    const fname = `${slug}-${n}${ext}`;
    try {
      const buf = await fetchBuf(`${BASE}${src}`);
      await fs.writeFile(path.join(IMAGES_DIR, fname), buf);
      out.push(`/images/products/${fname}`);
      n++;
    } catch (e) { console.warn('  img fail', src, e.message); }
  }
  return out.length ? out : [`/images/products/${slug}.jpg`];
}

function buildProduct(p, images) {
  const { category, grupo } = inferCategory(p.name, p.description);
  const short = (p.description || p.name).slice(0, 160);
  return {
    name: p.name,
    description: short || p.name,
    ...(p.description && p.description.length > 160 ? { longDescription: p.description } : {}),
    price: p.price || 1,
    category,
    brand: 'LewoskiShop',
    grupo,
    images,
    featured: false,
    inStock: p.inStock,
    tags: [],
  };
}

async function main() {
  if (!['replace','merge'].includes(MODE)) throw new Error('--mode replace|merge');
  await fs.mkdir(PRODUCTS_DIR, { recursive:true });
  await fs.mkdir(IMAGES_DIR, { recursive:true });

  if (MODE === 'replace') {
    const files = await fs.readdir(PRODUCTS_DIR);
    for (const f of files.filter(f=>f.endsWith('.json'))) await fs.unlink(path.join(PRODUCTS_DIR,f));
    console.log('Productos existentes eliminados.');
  }
  const existing = new Set((await fs.readdir(PRODUCTS_DIR)).filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')));

  console.log(`Conectando a ${BASE} ...`);
  const home = await fetchText(`${BASE}/`);
  const ids = await discoverIds(home);
  console.log(`IDs detectados: ${ids.length}`, ids);

  let ok=0, skip=0, fail=0;
  for (const id of ids) {
    try {
      const html = await fetchText(`${BASE}/product/${id}`);
      const p = parseDetail(html, id);
      const slug = slugify(p.name) || `producto-${id}`;
      if (MODE==='merge' && existing.has(slug)) { console.log('skip', slug); skip++; continue; }
      console.log('import', id, slug, '-', p.name);
      const images = await downloadImages(slug, p.imgs);
      const product = buildProduct(p, images);
      await fs.writeFile(path.join(PRODUCTS_DIR, `${slug}.json`), JSON.stringify(product,null,2)+'\n');
      ok++;
    } catch (e) { console.error('FAIL', id, e.message); fail++; }
  }
  console.log(`\nListo. importados=${ok} omitidos=${skip} fallos=${fail}`);
  console.log('Revisá category/grupo inferidos y corré: npm run build');
}
main().catch(e=>{ console.error(e); process.exit(1); });
