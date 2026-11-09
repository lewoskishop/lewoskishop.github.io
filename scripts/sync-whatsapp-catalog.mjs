#!/usr/bin/env node
/**
 * Sincroniza el catálogo de WhatsApp (wa.me/c/5492613655365) hacia
 * src/content/products/ (formato Astro de este repo).
 *
 * LIMITACIÓN IMPORTANTE:
 *   El catálogo público wa.me/c/<número> se renderiza en la app/web de
 *   WhatsApp y NO expone un JSON/HTML estático raspable con HTTP simple.
 *   Por eso este script NO puede "scrapear" wa.me/c de forma confiable.
 *
 * Modos soportados (fuente de datos real):
 *   --source json:/ruta/catalogo.json   Importa desde un volcado JSON
 *                                        (formato: array de productos, ver abajo).
 *   --source api                         Usa la Graph API (WhatsApp Business/Commerce).
 *                                        Requiere env: WA_GRAPH_TOKEN, WA_CATALOG_ID
 *                                        (y opcional WA_GRAPH_VERSION=v21.0).
 *
 *   Sin --source / --source wa           Intenta detectar datos (fallará con wa.me/c) y
 *                                        muestra instrucciones.
 *
 * Formato JSON esperado (--source json:...): array de objetos, ej.:
 *   [{ "name":"...", "description":"...", "price":1234, "currency":"ARS",
 *      "image_url":"https://...", "category":"Ceras", "grupo":"velas", "in_stock":true }]
 * Campos mínimos: name, price. El resto se completa con defaults compatibles.
 *
 * Opciones:
 *   --mode merge|replace   (default: merge) merge no borra existentes; replace limpia.
 *   --dry-run              No escribe archivos, solo reporta.
 *   --catalog 5492613655365  (informativo)
 *
 * Uso diario (cron): ver scripts/sync-whatsapp-catalog.sh
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'src/content/products');
const IMAGES_DIR = path.join(ROOT, 'public/images/products');
const WA_CATALOG_URL = 'https://wa.me/c/5492613655365';

function arg(name, def){ const i=process.argv.indexOf(`--${name}`); return i>=0 && process.argv[i+1] ? process.argv[i+1] : def; }
const has = (n)=>process.argv.includes(`--${n}`);
const SOURCE = arg('source', 'wa');
const MODE = arg('mode', 'merge');
const DRY = has('dry-run');

function slugify(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'producto'; }
const CAT_RULES = [
  [/\bcera(s)?\b/i,'Ceras','velas'],[/\bpabilo|ojalillo|mecha\b/i,'Pabilos','velas'],
  [/\bmolde\b/i,'Moldes','ambos'],[/\besencia|fragancia|aroma\b/i,'Esencias','ambos'],
  [/\bfrasco|envase|botella|vidrio|pote|tapa|difusor/i,'Envases','ambos'],
  [/\bcolorante|pigmento|mica\b/i,'Colorantes','ambos'],
  [/\bjab[oó]n|glicerina|base de jabon|cosm[eé]tica|shampoo\b/i,'Jabones y Cosmética','jabones'],
  [/\bkit\b/i,'Kits','velas'],[/\bbalanza|term[oó]metro|tijera|cuchara|pipeta|varilla\b/i,'Herramientas','ambos'],
  [/\baceite|manteca|alcohol|yeso|arcilla|aditivo|endurecedor|dpg\b/i,'Materias Primas','ambos'],
  [/\bcuenco|mate\b/i,'Accesorios','ambos'],
];
function infer(name, desc){ const t=`${name||''} ${desc||''}`; for(const [re,c,g] of CAT_RULES) if(re.test(t)) return {category:c,grupo:g}; return {category:'General',grupo:'ambos'}; }
function rawImageUrls(p){
  if (Array.isArray(p.images) && p.images.length) return p.images;
  if (Array.isArray(p.image_urls) && p.image_urls.length) return p.image_urls;
  if (Array.isArray(p.image_url) && p.image_url.length) return p.image_url;
  const one = p.image_url || p.image || p.thumbnail;
  return one ? [one] : [];
}
function extFrom(url, buf){
  try{ const m = new URL(url).pathname.match(/\.(jpe?g|png|webp|gif|avif)/i); if(m) return '.'+m[1].toLowerCase().replace('jpeg','jpg'); }catch{}
  if (buf && buf[0]==0xff && buf[1]==0xd8) return '.jpg';
  if (buf && buf[0]==0x89 && buf[1]==0x50) return '.png';
  if (buf && buf.slice(0,4).toString()==='RIFF') return '.webp';
  return '.jpg';
}
async function downloadImages(slug, urls){
  const out = [];
  let n=1;
  for (const raw of (urls||[]).slice(0,3)){
    const url = String(raw||'').trim();
    if (!url) continue;
    // ya local
    if (url.startsWith('/images/')) { out.push(url); n++; continue; }
    const fnameBase = `${slug}-${n}`;
    try {
      if (/^https?:\/\//i.test(url)) {
        if (DRY) { out.push(url); n++; continue; }
        const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!r.ok) throw new Error(`${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 200) throw new Error('empty');
        const ext = extFrom(url, buf);
        const fname = `${fnameBase}${ext}`;
        await fs.mkdir(IMAGES_DIR,{recursive:true});
        await fs.writeFile(path.join(IMAGES_DIR,fname), buf);
        out.push(`/images/products/${fname}`);
        console.log(`  img ok ${fname}`);
      } else if (path.isAbsolute(url) || /^[.]/.test(url)) {
        if (DRY) { out.push(url); n++; continue; }
        const src = path.isAbsolute(url) ? url : path.join(ROOT,url);
        const buf = await fs.readFile(src);
        const ext = extFrom(url, buf);
        const fname = `${fnameBase}${ext}`;
        await fs.mkdir(IMAGES_DIR,{recursive:true});
        await fs.writeFile(path.join(IMAGES_DIR,fname), buf);
        out.push(`/images/products/${fname}`);
      } else {
        out.push(url);
      }
    } catch(e){ console.warn(`  img fail ${url}: ${e.message}`); }
    n++;
  }
  return out;
}
async function toProduct(p){
  const name = String(p.name || p.title || '').trim();
  const desc = String(p.description || p.short_description || name).trim();
  const inf = infer(name, desc);
  const price = Number(p.price ?? p.price_amount ?? p.amount) || 0;
  const slug = slugify(name);
  const urls = rawImageUrls(p);
  const images = await downloadImages(slug, urls);
  return {
    name,
    description: desc.slice(0,160) || name,
    ...(desc.length>160 ? {longDescription: desc} : {}),
    price: price > 0 ? Math.round(price) : 1,
    category: p.category || inf.category,
    brand: p.brand || 'LewoskiShop',
    grupo: ['velas','jabones','ambos'].includes(p.grupo) ? p.grupo : inf.grupo,
    images: images.length ? images : [`/images/products/${slug}.jpg`],
    featured: !!p.featured,
    inStock: p.inStock ?? p.in_stock ?? p.availability !== 'out of stock',
    tags: Array.isArray(p.tags) ? p.tags : [],
  };
}

async function fetchJsonSource(src){
  if (src.startsWith('json:')) {
    const f = src.slice(5);
    return JSON.parse(await fs.readFile(path.isAbsolute(f)?f:path.join(ROOT,f),'utf8'));
  }
  if (src === 'api') {
    const token = process.env.WA_GRAPH_TOKEN;
    const catalogId = process.env.WA_CATALOG_ID;
    const ver = process.env.WA_GRAPH_VERSION || 'v21.0';
    if (!token || !catalogId) throw new Error('Faltan WA_GRAPH_TOKEN y/o WA_CATALOG_ID para --source api');
    let url = `https://graph.facebook.com/${ver}/${catalogId}/products?fields=name,description,price,currency,image_url,url,availability,brand&limit=200&access_token=${token}`;
    const all=[];
    while(url){
      const r = await fetch(url); const j = await r.json();
      if (j.error) throw new Error(`Graph API: ${j.error.message||JSON.stringify(j.error)}`);
      for(const it of (j.data||[])) all.push(it);
      url = j.paging?.next || null;
    }
    return all;
  }
  // wa.me/c no es raspable
  console.error(`No se puede leer automáticamente ${WA_CATALOG_URL} (catálogo renderizado por WhatsApp, sin API pública).`);
  console.error('Opciones:');
  console.error('  1) WhatsApp Business/Cloud API: node scripts/sync-whatsapp-catalog.mjs --source api  (requiere WA_GRAPH_TOKEN, WA_CATALOG_ID)');
  console.error('  2) Volcado JSON: node scripts/sync-whatsapp-catalog.mjs --source json:catalogo.json');
  process.exit(2);
}

async function main(){
  if(!['merge','replace'].includes(MODE)) throw new Error('--mode merge|replace');
  const items = await fetchJsonSource(SOURCE);
  const list = Array.isArray(items) ? items : (items.products||items.data||[]);
  console.log(`Fuente: ${SOURCE} | productos: ${list.length} | modo: ${MODE}${DRY?' | DRY-RUN':''}`);
  if(!list.length){ console.log('Nada para importar.'); return; }
  if(!DRY){ await fs.mkdir(PRODUCTS_DIR,{recursive:true}); await fs.mkdir(IMAGES_DIR,{recursive:true}); }
  if(MODE==='replace' && !DRY){
    for(const f of (await fs.readdir(PRODUCTS_DIR)).filter(f=>f.endsWith('.json'))) await fs.unlink(path.join(PRODUCTS_DIR,f));
  }
  const existing = new Set((await fs.readdir(PRODUCTS_DIR).catch(()=>[])).filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')));
  let ok=0, skip=0;
  for(const raw of list){
    const prod = await toProduct(raw);
    if(!prod.name){ skip++; continue; }
    const slug = slugify(prod.name);
    if(MODE==='merge' && existing.has(slug)){ skip++; continue; }
    if(!DRY) await fs.writeFile(path.join(PRODUCTS_DIR,`${slug}.json`), JSON.stringify(prod,null,2)+'\n');
    console.log(`${DRY?'[dry] ':''}${slug} - ${prod.name}`);
    ok++;
  }
  console.log(`Listo. escritos=${ok} omitidos=${skip}${DRY?' (dry-run)':''}`);
}
main().catch(e=>{ console.error(e.message||e); process.exit(1); });
