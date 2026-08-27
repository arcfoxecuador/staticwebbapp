/* ── EL PIPELINE DE IMÁGENES ───────────────────────────────────────────────
   Normaliza cualquier imagen que entre al repositorio: la recorta a un preset,
   la convierte a WebP, le quita los metadatos y la deja en `src/assets/`.

   POR QUÉ NO BASTA CON QUE ASTRO OPTIMICE. Astro optimiza al SERVIR: genera los
   tamaños del `srcset` desde el archivo fuente. Pero el archivo fuente viaja en
   git para siempre, así que un JPEG de 8 MB salido de una cámara son 8 MB en el
   historial del repositorio, en cada `clone` y en cada despliegue, y encima con
   los metadatos EXIF dentro — que en una foto de móvil incluyen coordenadas GPS.
   Este script se ejecuta UNA vez por imagen, antes del commit.

   CÓMO SE USA. Suelta los archivos en `imagenes-entrada/<familia>/` y ejecuta:

       npm run imagenes

   El nombre del archivo se convierte en el slug, y el slug tiene que coincidir con
   el de la entrada de contenido: `imagenes-entrada/servicios/auditoria-anual.jpg`
   → `src/assets/servicios/auditoria-anual.webp`, que es lo que `imagenes.ts`
   encuentra para el servicio `auditoria-anual`. Esa correspondencia es todo el
   contrato; no hay ningún índice que mantener.

   Familias reconocidas y su preset por defecto:

       servicios   apaisada   1440 × 1080   portada de ficha
       articulos   portada    1600 × 1000   cabecera de artículo
       equipo      retrato    1080 × 1350   fotografía de persona
       paginas     ancha      1920 × 1080   hero y fondos → src/assets/

   Se puede forzar otro preset con `--preset=cuadrada`, y añadir AVIF con
   `--avif` (pesa ~20% menos que WebP, y Astro sirve el que el navegador acepte).

   EL ALT NO LO PONE ESTE SCRIPT, y no es un olvido: describir una imagen es una
   decisión sobre el contenido, no sobre el archivo. Va en el frontmatter de la
   entrada (`portadaAlt`) o en el campo `alt` del asset del CMS. Sin él,
   `imagenes.ts` degrada a la marca gráfica en vez de publicar una imagen muda. */
import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const ENTRADA = 'imagenes-entrada';
const DESTINO = 'src/assets';

/* Los presets. Las proporciones son las MISMAS que las de `Figura.astro`: si aquí
   se recorta 4:3 y el componente encuadra 16:9, el recorte lo hace dos veces y la
   segunda vez sin control — es la causa habitual de un retrato con la cabeza
   cortada. Cambiar uno de estos valores obliga a mirar el otro archivo. */
const PRESETS = {
  ancha: { ancho: 1920, alto: 1080 },
  portada: { ancho: 1600, alto: 1000 },
  apaisada: { ancho: 1440, alto: 1080 },
  retrato: { ancho: 1080, alto: 1350 },
  cuadrada: { ancho: 1200, alto: 1200 },
  /* Sin recorte: sólo limita el ancho máximo. Para ilustraciones, diagramas y
     cualquier imagen donde recortar destruye la información. */
  libre: { ancho: 1920, alto: null },
};

const FAMILIAS = {
  servicios: { carpeta: 'servicios', preset: 'apaisada' },
  articulos: { carpeta: 'articulos', preset: 'portada' },
  equipo: { carpeta: 'equipo', preset: 'retrato' },
  paginas: { carpeta: '', preset: 'ancha' },
};

/* `.jfif` es JPEG con otra extensión: es lo que sale de muchas cámaras y
   exportaciones chinas, y rechazarlo aquí deja el original en la bandeja para
   siempre — o peor, alguien lo renombra a `.jpg` a mano y pierde el EXIF
   check que este script sí hace. */
const ORIGENES = ['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.avif', '.tif', '.tiff'];

const args = process.argv.slice(2);
const forzado = args.find((a) => a.startsWith('--preset='))?.split('=')[1];
const conAvif = args.includes('--avif');

if (forzado && !PRESETS[forzado]) {
  console.error(`✗ preset desconocido: ${forzado}. Opciones: ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}

if (!existsSync(ENTRADA)) {
  console.log(
    `La carpeta ${ENTRADA}/ no existe todavía.\n` +
      `Créala con una subcarpeta por familia (${Object.keys(FAMILIAS).join(', ')}), suelta ahí\n` +
      `las imágenes originales y vuelve a ejecutar \`npm run imagenes\`.`,
  );
  process.exit(0);
}

/* El slug: minúsculas, sin tildes y sin nada que no sea letra, número o guión.
   Tiene que dar el MISMO resultado que el nombre del archivo markdown de la
   entrada, porque la correspondencia entre imagen y contenido es el nombre. */
const aSlug = (nombre) =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

let procesadas = 0;
const avisos = [];

for (const [familia, config] of Object.entries(FAMILIAS)) {
  const origen = join(ENTRADA, familia);
  if (!existsSync(origen)) continue;

  const destino = join(DESTINO, config.carpeta);
  await mkdir(destino, { recursive: true });

  const preset = PRESETS[forzado ?? config.preset];

  for (const archivo of await readdir(origen)) {
    const ext = extname(archivo).toLowerCase();
    if (!ORIGENES.includes(ext)) continue;

    const slug = aSlug(basename(archivo, ext));
    const rutaOrigen = join(origen, archivo);

    const imagen = sharp(rutaOrigen)
      /* `rotate()` sin argumentos aplica la orientación EXIF y LA DESCARTA. Sin
         esto, una foto vertical de móvil sale tumbada en cuanto se le quitan los
         metadatos — que es justo lo que hace el paso siguiente. */
      .rotate()
      .resize({
        width: preset.ancho,
        height: preset.alto ?? undefined,
        /* `cover` + `withoutEnlargement`: recorta al encuadre pero NO estira una
           imagen pequeña hasta el tamaño del preset. Una foto de 800px ampliada a
           1920 se ve peor que la misma foto a 800. */
        fit: preset.alto ? 'cover' : 'inside',
        position: 'attention',
        withoutEnlargement: true,
      });

    const meta = await sharp(rutaOrigen).metadata();
    if (preset.alto && (meta.width < preset.ancho || meta.height < preset.alto)) {
      avisos.push(
        `${familia}/${archivo}: el original mide ${meta.width}×${meta.height}, por debajo del preset ` +
          `${preset.ancho}×${preset.alto}. Se conserva el tamaño real; en pantallas grandes se verá blando.`,
      );
    }

    /* Calidad 82 y `effort: 5`. Por encima de 85 el archivo crece rápido sin
       diferencia visible en fotografía; por debajo de 78 aparecen bloques en los
       degradados, que es donde primero se nota. Los metadatos NO se copian: la
       ausencia de `.withMetadata()` es deliberada — se van el EXIF, el perfil de
       cámara y las coordenadas GPS de una foto de móvil. */
    await imagen.clone().webp({ quality: 82, effort: 5 }).toFile(join(destino, `${slug}.webp`));
    procesadas++;

    if (conAvif) {
      await imagen.clone().avif({ quality: 60, effort: 5 }).toFile(join(destino, `${slug}.avif`));
    }

    /* El original se borra tras convertirlo. Es lo que impide que un JPEG de 8 MB
       acabe en git «temporalmente»: `imagenes-entrada/` está en .gitignore, pero
       una carpeta que se queda llena termina copiada a mano al sitio equivocado. */
    await rm(rutaOrigen);

    console.log(`  ${familia}/${archivo} → ${join(destino, `${slug}.webp`)}`);
  }
}

if (avisos.length) {
  console.warn('\nAvisos:');
  for (const a of avisos) console.warn(`  · ${a}`);
}

console.log(
  procesadas === 0
    ? `\nNo había imágenes nuevas en ${ENTRADA}/.`
    : `\n✓ ${procesadas} imagen(es) optimizadas. Recuerda escribir el texto alternativo en el frontmatter de su entrada.`,
);
