/* ── EL VERIFICADOR DE COHERENCIA ──────────────────────────────────────────
   Lee `dist/` y comprueba que el sitio no se desvió del contrato de diseño:
   paleta, escala tipográfica, ritmo de superficies, un solo h1, alt, motion.

   Va dentro de `npm run check`, DESPUÉS de `astro build`. Sin dependencias.

   Distingue el HTML del CSS inlined: un `text-[14px]` de Boton o un
   `overflow: hidden` en un honeypot de 1 px no son el contrato roto. */
import { readFileSync, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';
const hallazgo = [];

async function htmls(dir) {
  const salida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await htmls(ruta)));
    else if (entrada.name.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

async function cssDelDist() {
  const archivos = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) await walk(ruta);
      else if (e.name.endsWith('.css')) archivos.push(ruta);
    }
  };
  if (existsSync(DIST)) await walk(DIST);
  return archivos;
}

function sinEstilos(html) {
  return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

function cuerpo(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return main ? main[1] : html;
}

const permitidos = new Set(['ffffff', 'fff', '000000', '000']);
for (const css of await cssDelDist()) {
  const texto = readFileSync(css, 'utf8');
  for (const [, hex] of texto.matchAll(/--color-[a-z-]+:\s*#([0-9a-fA-F]{3,8})/g)) {
    permitidos.add(hex.toLowerCase());
    if (hex.length === 3) {
      permitidos.add(hex.toLowerCase().split('').map((c) => c + c).join(''));
    }
  }
}

const FUERA_ESCALA = /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/;
const ARBITRARIO = /\btext-\[(?!14px|15px|17px)[^\]]+\]/;
const ANIMADOS = /\b(?:revela|revela-grupo|revela-titular|revela-cifra|revela-imagen|deriva|deriva-fondo|deriva-hero|tira|tira-indice|traza)\b/;

for (const archivo of await htmls(DIST)) {
  const html = readFileSync(archivo, 'utf8');
  const marcado = sinEstilos(html);
  const nombre = relative(DIST, archivo);

  const h1 = [...marcado.matchAll(/<h1\b/gi)];
  if (h1.length > 1) hallazgo.push(`${nombre}: ${h1.length} <h1> — una página, un titular`);
  if (h1.length === 0 && !nombre.includes('404')) hallazgo.push(`${nombre}: no hay <h1>`);

  const niveles = [...marcado.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < niveles.length; i++) {
    if (niveles[i] - niveles[i - 1] > 1) {
      hallazgo.push(`${nombre}: salto de encabezado h${niveles[i - 1]} → h${niveles[i]}`);
      break;
    }
  }

  const campos = [...marcado.matchAll(/data-campo="([^"]+)"/g)].map((m) => m[1]);
  for (let i = 1; i < campos.length; i++) {
    if (campos[i] === campos[i - 1] && campos[i] !== 'suelo') {
      hallazgo.push(`${nombre}: dos secciones seguidas con data-campo="${campos[i]}" — aplana la página`);
    }
  }

  const clases = [...marcado.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
  if (clases.some((c) => FUERA_ESCALA.test(c) || ARBITRARIO.test(c))) {
    hallazgo.push(`${nombre}: tamaño tipográfico fuera de la escala del kit (text-xl / text-[…])`);
  }

  for (const [, hex] of marcado.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    if (!permitidos.has(hex.toLowerCase())) {
      hallazgo.push(`${nombre}: hexadecimal #${hex} que no sale de los tokens`);
    }
  }

  for (const img of marcado.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = img[1];
    if (!/\balt=/.test(attrs)) hallazgo.push(`${nombre}: <img> sin alt`);
    else if (/\balt="\s*"/.test(attrs)) hallazgo.push(`${nombre}: <img> con alt vacío`);
    if (!/\bwidth=/.test(attrs) || !/\bheight=/.test(attrs)) {
      hallazgo.push(`${nombre}: <img> sin width/height — CLS`);
    }
  }

  const vacias = [
    ...marcado.matchAll(
      /<section\b[^>]*>\s*(?:<div[^>]*>\s*)?(?:<h[1-3][^>]*>[^<]+<\/h[1-3]>)\s*(?:<\/div>)?\s*<\/section>/gi,
    ),
  ];
  if (vacias.length) hallazgo.push(`${nombre}: sección con encabezado y nada debajo`);

  if (/\boverflow-hidden\b/.test(marcado) && ANIMADOS.test(marcado)) {
    hallazgo.push(`${nombre}: overflow:hidden junto a un elemento animado — usa clip`);
  }

  const acentos = [...cuerpo(marcado).matchAll(/data-variante="primario"/g)];
  if (acentos.length > 2) {
    hallazgo.push(`${nombre}: demasiados CTA de acento en el contenido (${acentos.length}) — uno o dos, el resto en fantasma`);
  }
}

if (hallazgo.length) {
  console.error(`\n✗ ${hallazgo.length} hallazgo(s) de coherencia en dist/\n`);
  for (const h of hallazgo) console.error(`  · ${h}`);
  process.exit(1);
}

console.log('✓ dist/ respeta paleta, escala, ritmo, un h1 y el alt');
