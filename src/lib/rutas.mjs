/* Dos constantes y una función, en `.mjs` por una razón concreta:
   `astro.config.mjs` las importa, y desde ahí no se puede importar TypeScript.
   Todo lo demás vive en `site.ts`, que reexporta lo que hace falta para que
   ningún componente tenga que saber que este archivo existe. */
import { readdirSync, readFileSync, existsSync } from 'node:fs';

/** El dominio de producción, sin barra final. Es el origen de canonical,
    sitemap, robots, llms.txt y de cada URL absoluta del JSON-LD.
    `SITE_URL` permite al mismo repo desplegar el teaser en otro dominio sin
    tocar código; sin variable cae al dominio principal. */
export const SITE = (process.env.SITE_URL || 'https://arcfox.com.ec').replace(/\/+$/, '');

/* Rutas que NO se indexan ni entran al sitemap. El filtro es por coincidencia
   parcial, así que '/gracias' cubre también '/gracias?x=1'.

   Aquí van las páginas de utilidad (gracias, resultados de formulario) y
   cualquier contenido que exista pero no deba promocionarse. Añadir o quitar
   una ruta de esta lista tiene tres efectos a la vez, y por eso viven juntas:
   el `noindex` del <head>, la exclusión del sitemap y la del robots.txt.

   `/landing` sólo va aquí en el sitio principal: existe como ruta interna pero
   no se promociona. En el dominio teaser (`SOLO_LANDING=1`) ES la home pública;
   marcarla noindex mataría la única página indexable del despliegue. */
export const RUTAS_NO_INDEXABLES =
  process.env.SOLO_LANDING === '1' ? ['/gracias'] : ['/gracias', '/landing'];

/* ── LAS RUTAS DESPUBLICADAS DE LAS COLECCIONES ─────────────────────────────
   Un servicio con `publico: false` y un artículo con `borrador: true` ya salen
   con `noindex` —la página lo pone al construirse—, pero eso NO los saca del
   sitemap: `@astrojs/sitemap` sólo ve la URL, nunca el `<head>`. El resultado es
   la contradicción clásica: una URL anunciada en el sitemap que, al visitarla,
   pide no ser indexada. Search Console la reporta como «excluida por etiqueta
   noindex» y, mientras dure, gasta rastreo en páginas que nadie quiere.

   POR QUÉ SE LEE EL FRONTMATTER A MANO Y NO CON LA COLECCIÓN. Porque
   `astro.config.mjs` se evalúa ANTES de que exista `astro:content`: importarlo
   ahí no es que esté mal visto, es que no resuelve. Las alternativas eran
   mantener la lista escrita a mano —y entonces cada borrador nuevo entra al
   sitemap hasta que alguien se acuerde— o esto: catorce líneas de lectura de
   texto, sin dependencias, que no pueden quedar desincronizadas porque leen la
   misma verdad que zod valida después.

   El parseo es a propósito tonto: busca la línea exacta dentro del frontmatter y
   no interpreta YAML. Es todo lo que hace falta para un booleano, y un parser de
   verdad sería una dependencia nueva para leer dos campos.

   SI GIRAS `ORIGEN` A 'cms', esta función deja de ver la verdad: el estado de
   publicación pasa a vivir en el panel y aquí sólo queda el respaldo. Entonces
   hay que sustituirla por una consulta a la API — y el día que se olvide, el
   sitemap volverá a anunciar borradores. */
const DESPUBLICADAS = [
  { dir: 'src/content/modelos', ruta: '/modelos', campo: 'publico', cuando: 'false' },
  { dir: 'src/content/articulos', ruta: '/bitacora', campo: 'borrador', cuando: 'true' },
];

export function rutasDespublicadas() {
  const rutas = [];

  for (const { dir, ruta, campo, cuando } of DESPUBLICADAS) {
    if (!existsSync(dir)) continue;

    for (const archivo of readdirSync(dir)) {
      if (!archivo.endsWith('.md') && !archivo.endsWith('.mdx')) continue;

      const texto = readFileSync(`${dir}/${archivo}`, 'utf8');
      /* Sólo el frontmatter: `publico: false` escrito en el cuerpo de un
         artículo es prosa, no metadato. */
      const frontmatter = texto.split(/^---\s*$/m)[1] ?? '';
      const linea = new RegExp(`^${campo}:\\s*${cuando}\\s*$`, 'm');
      if (linea.test(frontmatter)) {
        rutas.push(`${ruta}/${archivo.replace(/\.mdx?$/, '')}`);
      }
    }
  }

  return rutas;
}
