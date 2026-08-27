/* ── PODA DEL DIST PARA EL DOMINIO TEASER ────────────────────────────────
   Tras `astro build`, deja `dist/` listo para publicar sólo la landing en un
   dominio aparte (p. ej. followdafox.com). El sitio principal no pasa por aquí:
   si `SOLO_LANDING` no es `'1'`, el script sale sin tocar nada.

   POR QUÉ NO BASTA CON UN PROYECTO APARTE. La landing comparte tipografías,
   tokens, componentes y el pipeline de imágenes con el sitio completo; duplicar
   el repo multiplicaría el drift. La poda post-build recorta lo que el teaser
   no debe mostrar — fotos de modelos aún no lanzados, rutas del catálogo,
   sitemap del sitio entero — sin un segundo código fuente.

   Se invoca desde `npm run build:vercel` cuando Vercel despliega el teaser. */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  readdirSync,
  rmdirSync,
  statSync,
} from 'node:fs';
import { join, relative, dirname, normalize } from 'node:path';

const DIST = 'dist';
const ASTRO = join(DIST, '_astro');
const INDEX = join(DIST, 'index.html');
const LANDING = join(DIST, 'landing.html');

if (process.env.SOLO_LANDING !== '1') process.exit(0);

/* En el teaser el dominio lo fija Vercel con SITE_URL; el fallback es el
   dominio público del teaser, no el del sitio principal. */
const SITE = (process.env.SITE_URL ?? 'https://followdafox.com').replace(/\/+$/, '');

if (!existsSync(LANDING)) {
  console.error(
    `[dist-landing] Falta ${LANDING}. Construye con SOLO_LANDING=1 y asegúrate de que existe src/pages/landing.astro.`,
  );
  process.exit(1);
}

/* La landing pasa a ser la home del teaser; el index.html del sitio completo
   sobra y confundiría al hosting con cleanUrls. */
if (existsSync(INDEX)) unlinkSync(INDEX);
renameSync(LANDING, INDEX);

/* ── HTML, sitemap y llms del sitio entero ─────────────────────────────── */
function borrarHtmlSobrante(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === '_astro') continue;
      borrarHtmlSobrante(ruta);
      if (readdirSync(ruta).length === 0) rmdirSync(ruta);
    } else if (entrada.name.endsWith('.html') && ruta !== INDEX) {
      unlinkSync(ruta);
    }
  }
}

borrarHtmlSobrante(DIST);

for (const nombre of readdirSync(DIST)) {
  const ruta = join(DIST, nombre);
  if (!statSync(ruta).isFile()) continue;
  if ((nombre.startsWith('sitemap') && nombre.endsWith('.xml')) || nombre === 'llms.txt') {
    unlinkSync(ruta);
  }
}

/* ── Referencias reales del HTML que queda ───────────────────────────────
   Recorremos src/href/srcset y url(...) en CSS inlined y enlazado. Sólo
   archivos bajo `/_astro/` entran en la poda: marca, favicon y og viven fuera
   y no arrastran fotos de modelos no lanzados. */
const referenciados = new Set();
const cssPendientes = [];

/** Devuelve la ruta relativa dentro de `_astro/`, o null si apunta fuera. */
function resolverEnAstro(ref, desde = '') {
  if (!ref || ref.startsWith('data:') || ref.startsWith('#')) return null;
  if (/^https?:\/\//i.test(ref)) return null;

  let limpio = ref.split(/[?#]/)[0];
  if (limpio.startsWith('/_astro/')) return limpio.slice('/_astro/'.length);

  if (desde && !limpio.startsWith('/')) {
    const resuelta = normalize(join(dirname(desde), limpio)).replace(/\\/g, '/');
    if (resuelta.startsWith('..')) return null;
    return resuelta;
  }

  return null;
}

function registrar(ref, desde = '') {
  const rel = resolverEnAstro(ref, desde);
  if (!rel || referenciados.has(rel)) return;
  referenciados.add(rel);

  const absoluta = join(ASTRO, rel);
  if (existsSync(absoluta) && absoluta.endsWith('.css')) cssPendientes.push(rel);
}

function extraerUrls(css, desde) {
  for (const [, url] of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    registrar(url.trim(), desde);
  }
}

function extraerDelHtml(html) {
  for (const [, valor] of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    registrar(valor);
  }
  for (const [, valor] of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const trozo of valor.split(',')) {
      const url = trozo.trim().split(/\s+/)[0];
      if (url) registrar(url);
    }
  }
  for (const bloque of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    extraerUrls(bloque[1], '');
  }
}

const html = readFileSync(INDEX, 'utf8');
extraerDelHtml(html);

while (cssPendientes.length > 0) {
  const rel = cssPendientes.pop();
  const ruta = join(ASTRO, rel);
  if (!existsSync(ruta)) continue;
  extraerUrls(readFileSync(ruta, 'utf8'), rel);
}

function podarAstro(dir) {
  if (!existsSync(dir)) return;

  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      podarAstro(ruta);
      if (readdirSync(ruta).length === 0) rmdirSync(ruta);
    } else {
      const rel = relative(ASTRO, ruta).replace(/\\/g, '/');
      if (!referenciados.has(rel)) unlinkSync(ruta);
    }
  }
}

podarAstro(ASTRO);

/* ── SEO mínimo del teaser: una URL, un sitemap ────────────────────────── */
writeFileSync(
  join(DIST, 'robots.txt'),
  `# ${new URL(SITE).hostname}
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`,
);

writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
  </url>
</urlset>
`,
);

console.log(`[dist-landing] dist/ podado para ${SITE} — ${referenciados.size} archivos en _astro/`);
