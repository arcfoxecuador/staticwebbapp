/* ── DE DÓNDE SALE UNA IMAGEN ──────────────────────────────────────────────
   El mismo papel que `contenido.ts` hace con el texto, y por la misma razón.

   EL ORDEN DE RESOLUCIÓN:

     1. el asset del CMS, si la entrada lo trae
     2. el archivo de `src/assets/<familia>/<slug>.<ext>`, que viaja en el repo
     3. sin imagen — el consumidor cae a su marca gráfica

   El paso 2 no es opcional: es lo que mantiene viva la promesa de
   `contenido.ts`. Si el CMS cae y se gira `ORIGEN` a 'colecciones', el sitio
   vuelve a construir CON sus fotografías. Sin respaldo local, ese rollback
   dejaría un hueco por cada imagen del sitio.

   Y ESTE MÓDULO NO CONSULTA LA RED. El asset llega dentro de la entrada que
   `coleccion()` ya trajo, así que resolver una imagen es síncrono y no añade ni
   una petición. */
import type { ImageMetadata } from 'astro';

/* Un glob por familia y no uno solo sobre `assets/**`. Globear todas las
   imágenes del sitio desde un módulo que importa media aplicación referencia
   archivos que ninguna página usa, y eso engorda la construcción con efectos
   invisibles. Las imágenes de PÁGINA (heroes, fondos, ilustraciones) se
   importan directamente donde se usan: no pasan por aquí, porque no pertenecen
   a una entrada de contenido.

   El patrón acepta las tres extensiones que produce `npm run imagenes`. */
const LOCALES = {
  modelos: import.meta.glob<{ default: ImageMetadata }>('../assets/modelos/*.{webp,avif,png,jpg}', {
    eager: true,
  }),
  articulos: import.meta.glob<{ default: ImageMetadata }>('../assets/articulos/*.{webp,avif,png,jpg}', {
    eager: true,
  }),
  equipo: import.meta.glob<{ default: ImageMetadata }>('../assets/equipo/*.{webp,avif,png,jpg}', {
    eager: true,
  }),
} as const;

const ARCHIVOS = import.meta.glob<{ default: ImageMetadata }>('../assets/**/*.{webp,avif,png,jpg}', {
  eager: true,
});

export type Familia = keyof typeof LOCALES;

/* La clave del glob se arma AQUÍ y en un solo sitio. Vite resuelve el glob en
   compilación, así que la plantilla tiene que coincidir carácter a carácter con
   el patrón de arriba — que es justo lo que se vuelve frágil cuando esta línea
   acaba copiada en tres componentes.

   Se prueban las extensiones en orden: primero los formatos modernos. */
const EXTENSIONES = ['webp', 'avif', 'png', 'jpg'] as const;
const buscarLocal = (familia: Familia, slug: string) => {
  for (const ext of EXTENSIONES) {
    const encontrado = LOCALES[familia][`../assets/${familia}/${slug}.${ext}`];
    if (encontrado) return encontrado.default;
  }
  return undefined;
};

/* EL TEXTO ALTERNATIVO DE LOS ARCHIVOS DEL REPOSITORIO.

   Describen EL ARCHIVO que está en `src/assets/`, no «la portada de tal cosa».
   Esa distinción es lo que hace correcto tenerlos en código: el día que una
   fotografía entre por el CMS, su descripción viaja DENTRO del asset, escrita
   por quien la sube y describiendo ESA imagen. Esta tabla describe archivos
   concretos y no caduca mientras esos archivos existan. */
const ALT_LOCAL: Partial<Record<Familia, Record<string, string>>> = {
  modelos: {
    t5: 'ARCFOX T5, SUV crossover 100% eléctrico, vista de tres cuartos.',
    t1: 'ARCFOX T1, SUV familiar 100% eléctrico.',
    s5: 'ARCFOX S5, SUV fastback 100% eléctrico.',
  },
};

/** Resuelve un archivo de `src/assets/` por su slug, para galerías y variantes
    declaradas en el frontmatter. Sin alt no hay imagen: misma regla que el resto. */
export function imagenPorArchivo(archivo: string, alt: string): ImageMetadata | undefined {
  if (!alt.trim()) return undefined;
  const slug = archivo.replace(/\.(webp|avif|png|jpg)$/, '');
  for (const [ruta, mod] of Object.entries(ARCHIVOS)) {
    if (ruta.includes(`/${slug}.`)) return mod.default;
  }
  return undefined;
}

/** La forma en que un CMS devuelve un campo de tipo asset. Se declara aquí, con
    los tres campos que de verdad se usan, en vez de importar el tipo del SDK. */
export type AssetCms = {
  filename?: string | null;
  alt?: string | null;
  title?: string | null;
  /** Muchos CMS lo entregan como «1600x1000». Ver `fuenteRemota()`. */
  meta_data?: { size?: string | null } | null;
} | null;

/* LA FUENTE, Y POR QUÉ ES UNA UNIÓN DISCRIMINADA Y NO TRES CAMPOS SUELTOS.

   Las props de `<Image>` no son un objeto con opcionales: son una unión de tres
   formas mutuamente excluyentes, y Astro las distingue por lo que traen.

     { src: ImageMetadata }              archivo del repositorio
     { src: string, width, height }      remoto, medido
     { src: string, inferSize: true }    remoto, que Astro medirá

   Un `src: ImageMetadata | string` con `width`/`height` opcionales NO encaja en
   ninguna de las tres, porque cada una exige un `src` concreto. No es un detalle
   de tipos que se pueda silenciar con un `as`: es la manera en que Astro sabe si
   tiene que salir a la red a medir un archivo.

   Con la unión ya discriminada, el consumidor la derrama entera:

       <Image {...foto.fuente} alt={foto.alt} widths={…} sizes={…} /> */
export type Fuente =
  | { src: ImageMetadata }
  | { src: string; width: number; height: number }
  | { src: string; inferSize: true };

export type Imagen = {
  /** Listo para derramar en `<Image>`. */
  fuente: Fuente;
  /** `string` y no `string | undefined` a propósito: si no hay texto
      alternativo NO hay imagen, así que tener un `Imagen` en la mano ya
      garantiza su alt. La garantía pasa a ser del tipo y no de la disciplina de
      quien edite después. */
  alt: string;
  /** Viaja como `data-generada` en el marcado. Ver `Figura.astro`. */
  generada: boolean;
};

/* LAS MEDIDAS, EN TRES INTENTOS Y POR ESTE ORDEN.

   `<Image>` exige medidas para una imagen remota. La alternativa de Astro
   —`inferSize`— baja el archivo EN CONSTRUCCIÓN sólo para preguntarle cuánto
   mide: funciona, pero son N descargas que se pagan en cada despliegue, con una
   dependencia de red en la ruta crítica del build.

     1. `meta_data.size`, que llega como «1600x1000». Gratis.
     2. El segmento `WxH` de la URL, si el CMS lo pone.
     3. `inferSize`, la red de seguridad. Cuesta una descarga, no una imagen rota.

   El patrón exige la forma `<n>x<n>` y no un número cualquiera. Cuidado con
   esto: varios CMS meten el TAMAÑO EN BYTES en un segmento de la ruta, y un
   patrón laxo leería «2310949» como el ancho en píxeles. Un cero cae al
   siguiente intento en vez de emitir una imagen de ancho cero. */
function fuenteRemota(url: string, asset: AssetCms): Fuente {
  const candidatos = [asset?.meta_data?.size, url.match(/\/(\d+x\d+)\//)?.[1]];
  for (const c of candidatos) {
    const m = c?.match(/^(\d+)x(\d+)$/);
    const width = Number(m?.[1] ?? 0);
    const height = Number(m?.[2] ?? 0);
    if (width > 0 && height > 0) return { src: url, width, height };
  }
  return { src: url, inferSize: true };
}

/* LOS ANCHOS DEL `srcset`, RECORTADOS AL ANCHO REAL DE LA FUENTE.

   Con una imagen del repositorio Astro hace esto solo: conoce el archivo, así
   que de `widths={[400, 800, 1200]}` sobre un archivo de 768 emite `400w, 768w`
   y no promete lo que no tiene.

   Con una imagen REMOTA no lo hace: recorta el ráster pero deja los
   descriptores intactos, así que el HTML anuncia `1200w` apuntando a un archivo
   de 768 píxeles. No rompe nada visible, pero es un descriptor que miente y el
   navegador elige mal en pantallas anchas.

   Esto reproduce lo que hace Astro con un archivo local: se quedan los
   candidatos que caben, y si alguno se pasaba se añade el ancho real en su
   lugar. Si ninguno se pasaba, la lista se devuelve intacta. */
export function anchos(fuente: Fuente, candidatos: number[]): number[] {
  const real = 'width' in fuente ? fuente.width : undefined;
  if (!real) return candidatos;
  if (!candidatos.some((c) => c > real)) return candidatos;
  return [...new Set([...candidatos.filter((c) => c <= real), real])];
}

/** Resuelve la imagen de una entrada de contenido. Síncrono.

    `alt` de las opciones es el texto alternativo DEL RESPALDO. Sobre un asset
    del CMS gana el `alt` del propio asset, porque lo escribió quien subió esa
    imagen y describe ESA imagen y no la que había antes.

    SIN ALT NO HAY IMAGEN, y la regla vive aquí y sólo aquí. Repartida entre el
    `alt ?` de tres componentes, se olvida en el cuarto. Una portada sin
    describir en una rejilla de veinte tarjetas deja a un lector de pantalla con
    una cuadrícula muda, así que la ausencia de alt degrada a la marca gráfica en
    vez de publicar una imagen anónima. */
export function imagenDeEntrada(
  familia: Familia,
  slug: string,
  opciones: { asset?: AssetCms; alt?: string | null; generada?: boolean } = {},
): Imagen | undefined {
  /* `?? true` y no `?? false`: es la respuesta segura. Una imagen generada no
     puede publicarse SIN acreditar por un olvido; lo que sí puede es acreditarse
     de más, y eso no engaña a nadie. */
  const generada = opciones.generada ?? true;
  const respaldo = (opciones.alt ?? '').trim();

  const remoto = opciones.asset?.filename?.trim();
  if (remoto) {
    const alt = (opciones.asset?.alt ?? '').trim() || respaldo;
    if (!alt) return undefined;
    return { fuente: fuenteRemota(remoto, opciones.asset ?? null), alt, generada };
  }

  const local = buscarLocal(familia, slug);
  if (!local) return undefined;

  const alt = respaldo || (ALT_LOCAL[familia]?.[slug] ?? '');
  if (!alt) return undefined;
  return { fuente: { src: local }, alt, generada };
}

/** ¿Existe imagen para esta entrada? Sin construir el objeto. Lo necesita
    cualquier componente que pinte SÓLO las filas que tienen fotografía. */
export function tieneImagen(
  familia: Familia,
  slug: string,
  opciones: { asset?: AssetCms; alt?: string | null } = {},
): boolean {
  return imagenDeEntrada(familia, slug, opciones) !== undefined;
}
