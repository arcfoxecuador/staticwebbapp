/* ── EL VERIFICADOR DEL DESPLIEGUE ─────────────────────────────────────────
   Comprueba que `staticwebapp.config.json` llega a `dist/` y dice lo que tiene
   que decir.

   POR QUÉ EXISTE. Azure Static Web Apps exige ese archivo EN LA RAÍZ de
   `output_location`. Si no está, no hay error de construcción, no hay aviso y
   el despliegue sale verde: el sitio se publica **sin las cabeceras de
   seguridad, sin la caché inmutable de `/_astro` y sin la página 404**. Es
   exactamente el mismo tipo de fallo que persigue `verificar-scripts-inline`:
   invisible, y descubierto semanas después por casualidad.

   Y por eso no basta con comprobar que el archivo existe en `public/`. Lo que
   importa es que exista en `dist/`, que es lo que se sube. Va después de
   `astro build`, dentro de `npm run check`. */
import { readFileSync, existsSync } from 'node:fs';

const RUTA = 'dist/staticwebapp.config.json';

/* Las cabeceras que el sitio no puede perder. Cada una responde a un ataque
   concreto, así que la lista no es decorativa: si alguien la recorta, esto
   falla y hay que justificarlo por escrito en el commit. */
const CABECERAS = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
];

/** Azure rechaza el archivo por encima de este tamaño y el sitio se despliega
    sin ninguna de sus reglas. */
const MAXIMO = 20 * 1024;

const fallos = [];

if (!existsSync(RUTA)) {
  fallos.push(
    `falta ${RUTA}. Tiene que vivir en public/, que es lo que Astro copia a dist/;` +
      ' en la raíz del repositorio Azure no lo encuentra'
  );
} else {
  const crudo = readFileSync(RUTA, 'utf8');

  if (Buffer.byteLength(crudo) > MAXIMO) {
    fallos.push(`${RUTA} pasa de 20 KB: Azure lo rechaza entero`);
  }

  let config;
  try {
    config = JSON.parse(crudo);
  } catch (error) {
    fallos.push(`${RUTA} no es JSON válido: ${error.message}`);
  }

  if (config) {
    const globales = config.globalHeaders ?? {};
    for (const cabecera of CABECERAS) {
      if (!globales[cabecera]) fallos.push(`falta la cabecera ${cabecera} en globalHeaders`);
    }

    /* La caché inmutable de `/_astro` no es una optimización opcional: esos
       archivos llevan un hash en el nombre, así que sin ella el visitante que
       vuelve se los descarga otra vez enteros. */
    const astro = (config.routes ?? []).find((ruta) => ruta.route === '/_astro/*');
    if (!astro?.headers?.['Cache-Control']?.includes('immutable')) {
      fallos.push('falta la caché inmutable de /_astro en routes');
    }

    /* Sin esto Azure sirve su propia página de error, en inglés y sin la marca,
       mientras la 404 del sitio existe y nadie la ve.

       No se exige `/404.html`: los deploys de una sola página no la tienen —la
       poda se la lleva— y ahí la respuesta correcta es `/index.html`. Lo que sí
       se exige es que el destino EXISTA, que es el fallo que Azure no avisa. */
    const destino = config.responseOverrides?.['404']?.rewrite;
    if (!destino) {
      fallos.push('responseOverrides.404 no está definido');
    } else if (!existsSync(`dist${destino}`)) {
      fallos.push(`la 404 apunta a ${destino} y ese archivo no existe en dist/`);
    }
  }
}

/* ── El dominio de los deploys podados ─────────────────────────────────────
   En un deploy de una página, `dist-landing.mjs` reescribe `robots.txt` y
   `sitemap.xml` con el dominio de ESE sitio. Si la variable de entorno llega
   vacía —y una variable de GitHub Actions sin definir llega vacía, no
   ausente—, ahí acaba un `<loc>/</loc>` que ningún buscador puede seguir.
   Se comprueba sólo cuando hubo poda: el sitio completo genera su sitemap con
   el plugin de Astro y no pasa por aquí. */
if (existsSync('dist/sitemap.xml') && !existsSync('dist/sitemap-index.xml')) {
  const loc = readFileSync('dist/sitemap.xml', 'utf8').match(/<loc>([^<]*)<\/loc>/)?.[1] ?? '';
  if (!/^https?:\/\/[^/]+\//.test(loc)) {
    fallos.push(`el sitemap del deploy podado no lleva dominio: <loc>${loc}</loc> — revisa SITE_URL`);
  }
}

if (fallos.length) {
  console.error('✗ configuración de despliegue incompleta:');
  for (const fallo of fallos) console.error(`  · ${fallo}`);
  process.exit(1);
}

console.log('✓ staticwebapp.config.json llega a dist/ con cabeceras, caché y 404');
