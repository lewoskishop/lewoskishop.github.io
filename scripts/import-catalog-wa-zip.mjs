#!/usr/bin/env node
/**
 * Importa/actualiza el catálogo del sitio desde un export de WhatsApp (ZIP descomprimido).
 * Espera en --src una carpeta con items.json (o items.csv) y un subdirectorio images/.
 *
 * Comportamiento: actualiza/crea los productos del ZIP para que queden igual al catálogo
 * (categorías, precios, imágenes, stock) y oculta (inStock=false) los que no estén en el ZIP,
 * sin borrarlos. Sincroniza las categorías del CMS (public/admin/config.yml) al ZIP.
 *
 * Uso:
 *   node scripts/import-catalog-wa-zip.mjs --src /ruta/catalog-gabi-lewoski [--mode merge|replace] [--dry-run]
 *   (--mode se acepta por compatibilidad; el comportamiento es siempre de sincronización al ZIP)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'src/content/products');
const IMAGES_DIR = path.join(ROOT, 'public/images/products');
const CMS_CONFIG = path.join(ROOT, 'public/admin/config.yml');

function arg(name, def){ const i=process.argv.indexOf(`--${name}`); return i>=0 && process.argv[i+1] ? process.argv[i+1] : def; }
const has = (n)=>process.argv.includes(`--${n}`);
const SRC = arg('src', '/tmp/opencode/catalog-gabi-lewoski/catalog-gabi-lewoski');
const MODE = arg('mode', 'merge');
const DRY = has('dry-run');

function slugify(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'producto'; }
function parsePrice(p){
  if (p == null) return 0;
  if (typeof p === 'number') return Math.round(p);
  const s = String(p);
  // "ARS 12,000.00" -> 12000
  const cleaned = s.replace(/[^0-9.,]/g,'').replace(/,/g,'');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

const COLLECTION_MAP = {
  'insumos para velas':      { category: 'Velas' },
  'insumos aromas':          { category: 'Aromas' },
  'insumos jabón':           { category: 'Cosmética y Jabones' },
  'insumos jabon':           { category: 'Cosmética y Jabones' },
  'cosmética':               { category: 'Cosmética y Jabones' },
  'cosmetica':               { category: 'Cosmética y Jabones' },
  'envases varios':          { category: 'Envases' },
  'flores, brillos y decoración': { category: 'Deco' },
  'flores, brillos y decoracion': { category: 'Deco' },
  'flores':                  { category: 'Moldes Flores' },
  'animales':                { category: 'Moldes Animales' },
  'navidad':                 { category: 'Navidad' },
  'moldes p yeso/resina/concreto': { category: 'Molde Yeso' },
};
const CAT_RULES = [
  [/\bnavid/i,'Navidad'],
  [/\bcera(s)?\b|\bpabilo|ojalillo|mecha\b/i,'Velas'],
  [/\besencia|fragancia|aroma\b/i,'Aromas'],
  [/\bfrasco|envase|botella|vidrio|pote|tapa|difusor|botellita|petaca|anchoero|morronero/i,'Envases'],
  [/\bjab[oó]n|glicerina|base de jabon/i,'Cosmética y Jabones'],
  [/\bcosm[eé]tica|shampoo|manteca|aceite esencial\b/i,'Cosmética y Jabones'],
  [/\bflor(es)?\b/i,'Moldes Flores'],
  [/\banimal(es)?\b/i,'Moldes Animales'],
  [/\byeso|resina|concreto\b/i,'Molde Yeso'],
  [/\bmolde\b/i,'Moldes'],
  [/\bcolorante|pigmento|mica|glitter|brillo|decor/i,'Deco'],
];
function infer(name, desc, collection){
  const key = (collection||'').trim().toLowerCase();
  if (key && COLLECTION_MAP[key]) return { ...COLLECTION_MAP[key] };
  const t = `${name||''} ${desc||''} ${collection||''}`;
  for(const [re,c] of CAT_RULES) if(re.test(t)) return {category:c};
  return {category:'General'};
}

async function loadItems(){
  const jsonPath = path.join(SRC,'items.json');
  try {
    const raw = JSON.parse(await fs.readFile(jsonPath,'utf8'));
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.products)) return raw.products;
  } catch(e){ /* try csv */ }
  const csvPath = path.join(SRC,'items.csv');
  const text = await fs.readFile(csvPath,'utf8');
  // csv simple (las columnas relevantes no suelen llevar comas complejas; fallback básico)
  const [headLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const head = headLine.replace(/^\uFEFF/,'').split(',');
  const idx = (n)=>head.indexOf(n);
  return lines.map(line=>{
    // parseo CSV básico respetando comillas
    const cols=[]; let cur='',q=false; for(let i=0;i<line.length;i++){const ch=line[i]; if(ch==='"'){if(q && line[i+1]==='"'){cur+='"';i++;} else q=!q;} else if(ch===',' && !q){cols.push(cur);cur='';} else cur+=ch;} cols.push(cur);
    const g=(n)=>cols[idx(n)]??'';
    return {id:g('id'), title:g('title'), description:g('description')||null, price:g('price_text')||g('price'), collection:g('collections')||g('collection'), image:g('image'), images:(g('images')||g('image')).split('|').filter(Boolean)};
  });
}

async function copyImages(slug, refs){
  const out=[];
  let n=1;
  for(const ref of (refs||[]).slice(0,3)){
    const rel = String(ref||'').replace(/^[.\/]+/,'');
    if(!rel) continue;
    const srcPath = path.join(SRC, rel);
    let buf;
    try{ buf = await fs.readFile(srcPath); }catch{
      // intentar solo nombre de archivo en images/
      try{ buf = await fs.readFile(path.join(SRC,'images', path.basename(rel))); }catch{ console.warn(`  img faltante: ${rel}`); continue; }
    }
    if(!buf || buf.length<100){ console.warn(`  img vacía: ${rel}`); continue; }
    const ext = path.extname(rel).toLowerCase() || '.jpg';
    const fname = `${slug}-${n}${ext}`;
    if(!DRY){ await fs.mkdir(IMAGES_DIR,{recursive:true}); await fs.writeFile(path.join(IMAGES_DIR,fname), buf); }
    out.push(`/images/products/${fname}`);
    n++;
  }
  return out;
}

function yamlVal(v){
  return /[:#{}\[\],&*?|<>=!%@`"'\n]/.test(v) || v !== v.trim() ? JSON.stringify(v) : v;
}

async function syncCmsCategories(categories){
  const list = [...new Set(categories.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  if(!list.length) return;
  let text;
  try{ text = await fs.readFile(CMS_CONFIG,'utf8'); }catch(e){ console.warn('  CMS: no se pudo leer config.yml:', e.message); return; }
  const marker = '\n      - label: Categorías';
  let start = text.indexOf(marker);
  if(start < 0) start = text.indexOf('\n      - label: Categoría');
  if(start < 0){ console.warn('  CMS: no se encontró el campo de categorías en config.yml'); return; }
  const after = text.indexOf('\n        options:', start);
  if(after < 0){
    console.log(`  CMS: categorías del catálogo (${list.length}): ${list.join(', ')}.`);
    return;
  }
  const hintIdx = text.indexOf('\n        hint:', after);
  if(hintIdx < 0){ console.warn('  CMS: no se encontró fin de options de categorías'); return; }
  const optionsBlock = '\n        options:\n' + list.map(c => `          - { label: ${yamlVal(c)}, value: ${yamlVal(c)} }`).join('\n');
  const next = text.slice(0, after) + optionsBlock + text.slice(hintIdx);
  if(next === text){ console.log(`  CMS: categorías ya alineadas (${list.length}).`); return; }
  if(!DRY) await fs.writeFile(CMS_CONFIG, next);
  console.log(`${DRY?'[dry] ':''}CMS: categorías sincronizadas (${list.join(', ')}).`);
}

async function main(){
  // --mode se acepta por compatibilidad; siempre sincroniza al ZIP y oculta los ausentes.
  const items = await loadItems();
  console.log(`Fuente: ${SRC} | productos: ${items.length} | modo: ${MODE}${DRY?' | DRY-RUN':''}`);
  if(!items.length){ console.log('Nada para importar.'); return; }

  if(!DRY){ await fs.mkdir(PRODUCTS_DIR,{recursive:true}); await fs.mkdir(IMAGES_DIR,{recursive:true}); }

  let ok=0, skip=0, fail=0, hidden=0;
  const zipCategories = new Set();
  const zipSlugs = new Set();

  for(const it of items){
    try{
      const name = String(it.title || it.name || '').trim();
      const desc = (it.description == null ? '' : String(it.description)).trim();
      const collection = (Array.isArray(it.collections) && it.collections[0]) || it.collection || '';
      const {category} = infer(name, desc, collection);
      if(category) zipCategories.add(category);
      if(!name){ skip++; continue; }
      const id = String(it.id || slugify(name));
      const slug = slugify(id) || slugify(name);
      zipSlugs.add(slug);
      const price = parsePrice(it.price_text ?? it.price);
      const refs = Array.isArray(it.images) && it.images.length ? it.images : (it.image ? [it.image] : []);
      const images = await copyImages(slug, refs);
      const product = {
        name,
        description: (desc || name).slice(0,160),
        ...(desc && desc.length>160 ? {longDescription: desc} : {}),
        price: price>0 ? price : 1,
        category,
        categories: [category],
        brand: 'LewoskiShop',
        images: images.length ? images : [`/images/products/${slug}.jpg`],
        featured: false,
        inStock: true,
        tags: [],
      };
      if(!DRY) await fs.writeFile(path.join(PRODUCTS_DIR, `${slug}.json`), JSON.stringify(product,null,2)+'\n');
      console.log(`${DRY?'[dry] ':''}${slug} - ${name} [${category}]`);
      ok++;
    }catch(e){ console.error('FAIL', it && (it.id||it.title), e.message); fail++; }
  }

  // Productos que no están en el ZIP: no se borran, se ocultan (inStock=false)
  const productFiles = (await fs.readdir(PRODUCTS_DIR).catch(()=>[])).filter(f=>f.endsWith('.json'));
  for(const f of productFiles){
    const slug = f.replace(/\.json$/,'');
    if(zipSlugs.has(slug)) continue;
    try{
      const p = path.join(PRODUCTS_DIR, f);
      const data = JSON.parse(await fs.readFile(p,'utf8'));
      if(data.inStock === false){ hidden++; continue; }
      data.inStock = false;
      if(!DRY) await fs.writeFile(p, JSON.stringify(data,null,2)+'\n');
      console.log(`${DRY?'[dry] ':''}oculto: ${slug}`);
      hidden++;
    }catch(e){ console.warn(`  no se pudo ocultar ${slug}: ${e.message}`); }
  }

  await syncCmsCategories([...zipCategories]);
  console.log(`\nListo. escritos/actualizados=${ok} omitidos=${skip} ocultos=${hidden} fallos=${fail}${DRY?' (dry-run)':''}`);
  console.log('Sugerido: npm run build');
}
main().catch(e=>{ console.error(e.message||e); process.exit(1); });
