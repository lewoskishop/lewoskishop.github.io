#!/usr/bin/env node
/**
 * Verificador de Personal Access Token para el panel de administración.
 *
 *   node scripts/check-token.mjs <token>
 *   node scripts/check-token.mjs                (lo pide por stdin, no queda en el historial)
 *
 * Le dice si el token sirve para editar el repo y, si no, QUÉ LE FALTA.
 * Solo hace GET: no escribe nada ni modifica nada.
 */
import { readFileSync } from 'node:fs';

const REPO = 'maskotita/maskotita.github.io';
const API = 'https://api.github.com';
const token = (process.argv[2] ?? readFileSync(0, 'utf8')).trim();

const ok = (m) => console.log(`\x1b[32m${m}\x1b[0m`);
const bad = (m) => console.log(`\x1b[31m${m}\x1b[0m`);
const warn = (m) => console.log(`\x1b[33m${m}\x1b[0m`);
const dim = (m) => console.log(`\x1b[2m${m}\x1b[0m`);

if (!token) {
  bad('No recibí ningún token.');
  process.exit(1);
}

if (token.includes('ghp_') || token.includes('gho_') || token.includes('ghu_') || token.includes('ghs_') || token.includes('ghr_')) {
  warn('Ese parece un token CLÁSICO (ghp_...). Sirve, pero el fine-grained es más seguro.');
} else if (token.startsWith('github_pat_')) {
  dim('Token fine-grained detectado.');
} else {
  bad('El token no tiene el formato de GitHub (debería empezar por github_pat_ o ghp_).');
  bad('Copiá el token con Ctrl+C, sin comillas ni espacios.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'maskotita-token-check',
};

const get = async (url) => {
  const r = await fetch(url, { headers });
  let body = null;
  try {
    body = await r.json();
  } catch {}
  return { status: r.status, body, scopes: r.headers.get('x-oauth-scopes') ?? '' };
};

console.log('\n\x1b[1mVerificando token...\x1b[0m\n');

// 1) ¿El token existe y es válido?
const me = await get(`${API}/user`);
if (me.status !== 200) {
  bad(`El token fue rechazado por GitHub (HTTP ${me.status}).`);
  if (me.status === 401) {
    bad('  → El token es incorrecto, fue revocado, o expiró.');
    bad('  → Verificá que lo pegaste completo, sin espacios ni comillas.');
  } else if (me.status === 403) {
    bad('  → GitHub te bloqueó por abuso de la API (se llama "secondary rate limit").');
    bad('  → Esperá unos minutos y probá de nuevo.');
  }
  if (me.body?.message) dim(`  (GitHub dice: ${me.body.message})`);
  process.exit(1);
}
ok(`✓ Token válido. Pertenece a: ${me.body.login}`);

// 2) ¿Tiene acceso al repo?
const repo = await get(`${API}/repos/${REPO}`);
if (repo.status === 404) {
  bad(`✗ El token NO puede ver el repo ${REPO}.`);
  bad('  Causas posibles:');
  bad('   · El token es fine-grained y en "Repository access" elegiste');
  bad('     "Only select repositories" pero NO marcaste este repo.');
  bad('   · El repo es privado y el token no es collaborator.');
  bad('   · El nombre del repo está mal escrito.');
  process.exit(1);
}
if (repo.status !== 200) {
  bad(`✗ Error al consultar el repo (HTTP ${repo.status}).`);
  if (repo.body?.message) dim(`  (GitHub dice: ${repo.body.message})`);
  process.exit(1);
}

const perms = repo.body.permissions ?? {};
const canPush = perms.push === true;
const isAdmin = perms.admin === true;

if (canPush) {
  ok(`✓ Acceso al repo ${REPO} con permiso de ESCRITURA.`);
} else {
  bad(`✗ Acceso al repo ${REPO} pero SIN permiso de escritura.`);
  bad('  El panel no va a poder guardar los cambios.');
  bad('  → Fine-grained: editá el token y poné "Contents: Read and write".');
  bad('  → Clásico: el scope debe ser "repo" o "public_repo".');
}
dim(`  (permisos: admin=${!!perms.admin}, push=${!!perms.push}, pull=${!!perms.pull})`);

// 3) ¿Puede leer el contenido del panel?
const contents = await get(`${API}/repos/${REPO}/contents/src/content/products`);
if (contents.status === 200) {
  const n = Array.isArray(contents.body) ? contents.body.length : 0;
  ok(`✓ Puede leer src/content/products (${n} archivos). El panel va a mostrar los productos.`);
} else {
  warn(`! No pudo leer src/content/products (HTTP ${contents.status}).`);
  if (contents.body?.message) dim(`  (GitHub dice: ${contents.body.message})`);
}

// 4) Scopes, si es un token clásico
if (me.scopes) {
  console.log();
  const scopes = me.scopes.split(',').map((s) => s.trim()).filter(Boolean);
  dim(`Scopes del token: ${scopes.length ? scopes.join(', ') : '(ninguno)'}`);
  if (!scopes.includes('repo') && !scopes.includes('public_repo')) {
    bad('  → Le falta el scope "repo" (o "public_repo"). Editá el token y agregá ese scope.');
  }
}

// 5) ¿Puede abrir un Pull Request? (sólo hace falta con Editorial Workflow)
const pr = await get(`${API}/repos/${REPO}/pulls?per_page=1`);
if (pr.status === 200) {
  ok('✓ Puede crear Pull Requests (sirve si activás Editorial Workflow).');
} else {
  warn('! Sin permiso de Pull Requests.');
  warn('  → Sólo hace falta si activás "publish_mode: editorial_workflow" en config.yml.');
  warn('  → Fine-grained: sumá "Pull requests: Read and write".');
}

console.log();
if (canPush) {
  ok('\x1b[1mLISTO. Copiá el token y pegalo en el panel:\x1b[0m');
  console.log('  https://maskotita.github.io/admin  →  "Sign In Using Access Token"');
} else {
  bad('\x1b[1mEl token NO sirve para editar. Corregí los permisos y volvé a probar.\x1b[0m');
  process.exit(1);
}
console.log();
