/* ── LA IMAGEN DE COMPARTICIÓN ─────────────────────────────────────────────
   Genera `public/og/portada.jpg`, la imagen que se ve cuando alguien pega un
   enlace del sitio en WhatsApp, LinkedIn o Slack.

   POR QUÉ HACE FALTA UN SCRIPT Y NO VALE UN SVG. `BaseHead.astro` apunta a
   `/og/portada.jpg` en TODAS las páginas, así que si el archivo no existe, cada
   enlace compartido sale con una tarjeta gris y sin imagen — el sitio parece roto
   justo donde más se mira. Y no se puede resolver con un SVG: LinkedIn, WhatsApp y
   Slack rechazan `image/svg+xml` en `og:image`. Tiene que ser un ráster.

   1200 × 630 es la medida canónica de Open Graph. Por debajo, Twitter degrada la
   tarjeta a `summary` pequeña; por encima, se recorta.

   Es un PLACEHOLDER TIPOGRÁFICO decente, no un diseño. Cuando exista la imagen
   real, sustituye el archivo y no ejecutes más este script: el `og:image` no
   cambia de nombre, así que nada más hay que tocar.

       npm run og

   Se ejecuta a mano y no en el build. Generarla en cada construcción gastaría
   sharp y un archivo nuevo en cada despliegue para producir siempre lo mismo. */
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

/* Los tokens los sustituye el instalador del kit, igual que en `global.css`.
   Se escriben aquí y no se importan de `site.ts` porque este script es Node puro:
   `site.ts` es TypeScript y usa `import.meta.env`, que fuera de Vite no existe. */
const NOMBRE = 'ARCFOX';
const TAGLINE = 'Distintos por naturaleza';
const COLOR_MARCA = '#0b0d12';
const COLOR_ACENTO = '#f4f6f8';

const ANCHO = 1200;
const ALTO = 630;

/* El texto se escapa: un `&` o un `<` en el nombre de la empresa rompería el SVG
   y sharp fallaría con un error de parseo que no menciona la causa. */
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* `font-family` con familias del SISTEMA y no la tipografía de marca: sharp
   renderiza el SVG con las fuentes instaladas en la máquina que ejecuta el
   script, no con las del proyecto. Pedir "Bricolage Grotesque" aquí da un
   resultado distinto en tu portátil y en un contenedor de CI — y silenciosamente,
   cayendo a una fuente cualquiera. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLOR_MARCA}"/>
  <rect x="80" y="470" width="120" height="4" fill="${COLOR_ACENTO}"/>
  <text x="80" y="300" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="84" font-weight="700" letter-spacing="-2">${esc(NOMBRE)}</text>
  <text x="80" y="380" fill="#ffffff" fill-opacity="0.75" font-family="Helvetica, Arial, sans-serif" font-size="34">${esc(TAGLINE)}</text>
</svg>`;

await mkdir('public/og', { recursive: true });

/* JPEG y no WebP: Open Graph lo entienden todos los clientes, y en 2026 todavía
   hay integraciones que no leen WebP en una previsualización. Progresivo y con
   `mozjpeg` para que pese ~60 kB en vez de ~180. */
await sharp(Buffer.from(svg))
  .jpeg({ quality: 88, progressive: true, mozjpeg: true })
  .toFile('public/og/portada.jpg');

console.log('✓ public/og/portada.jpg generada (1200×630). Sustitúyela por el diseño real cuando exista.');
