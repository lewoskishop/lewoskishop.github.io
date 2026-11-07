#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'src/content/products');
const IMAGES_DIR = path.join(ROOT, 'public/images/products');
const BASE = 'http://192.168.1.203:5000';
const REMOTE_UPLOADS = process.env.REMOTE_UPLOADS || '/home/fsosa/tiendanube/uploads';
// SSH opcional (para copiar desde disco del servidor). Configurar por entorno:
//   SSH_HOST=fsosa@192.168.1.203  SSHPASS=...  (requiere sshpass)
// Si no hay SSH, hace fallback por HTTP desde BASE.
const SSH_HOST = process.env.SSH_HOST || '';
const SSHPASS = process.env.SSHPASS || '';

function slugify(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function decodeEntities(s){return s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
async function fetchText(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000)}); if(!r.ok) throw new Error(r.status+' '+url); return r.text();}
function parseDetail(html,id){
  const name=decodeEntities((html.match(/<h2[^>]*>\s*([\s\S]*?)\s*<\/h2>/i)?.[1]||`Producto ${id}`).replace(/<[^>]+>/g,''));
  const re1 = /\/(uploads\/[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp))/g;
  const imgs=[...new Set([...html.matchAll(re1)].map(m=>m[1].replace('uploads/','')))];
  return {id,name,imgs};
}
async function discoverIds(){
  const home=await fetchText(`${BASE}/`); const ids=new Set([...home.matchAll(/href="\/product\/(\d+)"/g)].map(m=>+m[1]));
  for(let i=1;i<=200;i++){if(ids.has(i))continue; try{const r=await fetch(`${BASE}/product/${i}`,{method:'HEAD',signal:AbortSignal.timeout(5000)}); if(r.ok) ids.add(i);}catch{} }
  return [...ids].sort((a,b)=>a-b);
}
function copyRemote(remoteFile) {
  if (!SSH_HOST) throw new Error('SSH_HOST not set');
  const args = SSHPASS
    ? ['-p', SSHPASS, 'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', SSH_HOST, `cat ${REMOTE_UPLOADS}/${remoteFile}`]
    : ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', SSH_HOST, `cat ${REMOTE_UPLOADS}/${remoteFile}`];
  const bin = SSHPASS ? 'sshpass' : 'ssh';
  return execFileSync(bin, args, { maxBuffer: 30 * 1024 * 1024 });
}

async function main(){
  await fs.mkdir(IMAGES_DIR,{recursive:true});
  const ids=await discoverIds();
  let ok=0, fail=0;
  for(const id of ids){
    try{
      const html=await fetchText(`${BASE}/product/${id}`);
      const p=parseDetail(html,id);
      const slug=slugify(p.name)||`producto-${id}`;
      const jpath=path.join(PRODUCTS_DIR,`${slug}.json`);
      let prod; try{ prod=JSON.parse(await fs.readFile(jpath,'utf8')); }catch{ console.warn('no json',slug); continue; }
      const out=[];
      let n=1;
      for(const src of p.imgs.slice(0,3)){
        const ext=path.extname(src)||'.jpg';
        const fname=`${slug}-${n}${ext}`;
        try{
          const buf=copyRemote(src, fname);
          if(!buf||buf.length<100) throw new Error('empty');
          await fs.writeFile(path.join(IMAGES_DIR,fname), buf);
          out.push(`/images/products/${fname}`);
          n++;
        }catch(e){
          // fallback to HTTP
          try{ const r=await fetch(`${BASE}/uploads/${src}`); const b=Buffer.from(await r.arrayBuffer()); if(b.length>100){await fs.writeFile(path.join(IMAGES_DIR,fname),b); out.push(`/images/products/${fname}`); n++; continue;} }catch{}
          console.warn('  img fail', slug, src, e.message);
        }
      }
      if(out.length){ prod.images=out; await fs.writeFile(jpath, JSON.stringify(prod,null,2)+'\n'); console.log('ok', slug, out.length); ok++; }
      else { console.warn('no imgs', slug); fail++; }
    }catch(e){ console.error('FAIL', id, e.message); fail++; }
  }
  console.log(`\nListo. reparados=${ok} fallos=${fail}`);
}
main().catch(e=>{console.error(e);process.exit(1);});
