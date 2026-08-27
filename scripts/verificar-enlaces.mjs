/* ── EL VERIFICADOR DE ENLACES ─────────────────────────────────────────────
   Comprueba que cada enlace interno de `dist/` apunta a algo que existe.

   POR QUÉ EXISTE. Un enlace roto dentro del propio sitio no avisa de nada: no
   rompe la construcción, no sale en la consola y sólo lo descubre quien lo pulsa
   —o el rastreador, que lo apunta y lo reporta semanas después—. Los dos sitios
   donde aparece son siempre los mismos, y los dos son los peores:

     · EL PIE, que se repite en todas las páginas. Un «Privacidad» escrito antes
       de que exista la página multiplica un 404 por el número de páginas.
     · LA NAVEGACIÓN, cuando se añade la entrada del menú antes que la página.

   Este caso concreto ya pasó en esta plantilla: el pie y el banner de cookies
   enlazaban a `/privacidad` y a `/terminos`, que nunca se generaron.

   LO QUE NO COMPRUEBA, y es deliberado: los enlaces externos. Verificarlos
   obligaría a salir a la red en cada construcción, con lo que el resultado
   dependería de si un servidor ajeno responde hoy — y un `check` que falla por
   algo que no está en el repositorio es un `check` que se acaba ignorando.

   Va dentro de `npm run check`, DESPUÉS de `astro build`. */
import { readFileSync, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';

async function htmls(dir) {
  const salida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await htmls(ruta)));
    else if (entrada.name.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

const HREF = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;

/* Una ruta puede existir de tres formas distintas en una salida estática, y las
   tres son válidas: `/contacto` puede ser `contacto.html` (lo que produce
   `build.format: 'file'`), `contacto/index.html` (el formato de directorio) o un
   archivo con su propia extensión, como `/robots.txt`. */
function resuelve(ruta) {
  const limpia = ruta.replace(/[?#].*$/, '').replace(/\/$/, '') || '/index';
  const base = join(DIST, limpia);
  return (
    existsSync(base) ||
    existsSync(`${base}.html`) ||
    existsSync(join(base, 'index.html'))
  );
}

const roto = new Map();

for (const archivo of await htmls(DIST)) {
  const html = readFileSync(archivo, 'utf8');
  const nombre = relative(DIST, archivo);

  for (const [, href] of html.matchAll(HREF)) {
    /* Externos, anclas de la misma página y los esquemas que no son navegación
       —correo, teléfono, WhatsApp— no se comprueban aquí. */
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (resuelve(href)) continue;

    const destino = href.replace(/[?#].*$/, '');
    if (!roto.has(destino)) roto.set(destino, new Set());
    roto.get(destino).add(nombre);
  }
}

if (roto.size) {
  const total = [...roto.values()].reduce((n, s) => n + s.size, 0);
  console.error(
    `\n✗ ${roto.size} destino(s) interno(s) inexistente(s), enlazados ${total} vez/veces\n`,
  );
  for (const [destino, paginas] of roto) {
    const lista = [...paginas];
    /* Un destino enlazado desde muchas páginas casi siempre viene del pie o de la
       cabecera. Decirlo ahorra el rato de buscarlo página por página. */
    const donde =
      lista.length > 3
        ? `${lista.slice(0, 3).join(', ')} y ${lista.length - 3} más — si sale en casi todas, está en el pie o en la cabecera`
        : lista.join(', ');
    console.error(`  · ${destino}\n      desde: ${donde}\n`);
  }
  process.exit(1);
}

console.log('✓ todos los enlaces internos de dist/ apuntan a una página que existe');
