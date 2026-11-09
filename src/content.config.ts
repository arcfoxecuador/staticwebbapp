/* ── EL CONTRATO DEL CONTENIDO ─────────────────────────────────────────────
   Zod es lo que hace que un artículo sin fecha o un servicio sin descripción
   ROMPAN LA CONSTRUCCIÓN en vez de publicarse mal. Es la única red que separa
   «alguien editó un markdown» de «alguien publicó una página».

   Los topes de caracteres no son decorativos:
     · `seoDescripcion` ≤ 165 — por encima, Google recorta la frase a mitad
     · `resumen` ≤ 200 — es lo que se pinta en la tarjeta de la rejilla

   Un tope superado falla la construcción con el número exacto, que es mucho más
   barato que descubrirlo en Search Console tres semanas después. */
/* `z` desde 'astro/zod' y no desde 'astro:content': Astro 6 deprecó esa segunda
   vía junto con el módulo 'astro:schema'. Funciona todavía, pero deja un aviso en
   `astro check` — y un aviso que se tolera es un aviso que tapa al siguiente. */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/* La forma de un campo `asset` de CMS. Está aquí, y no sólo en `imagenes.ts`,
   para que el respaldo local y el CMS validen contra la MISMA forma: así girar
   `ORIGEN` no cambia lo que es un contenido válido. */
const assetCms = z
  .object({
    filename: z.string().nullish(),
    alt: z.string().nullish(),
    title: z.string().nullish(),
  })
  .nullish();

const fotoLocal = z.object({
  archivo: z.string(),
  alt: z.string(),
});

const variante = z.object({
  etiqueta: z.string(),
  muestra: z.string().optional(),
  archivo: z.string(),
  alt: z.string(),
  /** Prefijo de la órbita (`t5-blanco`). Con `fotogramas` arma la secuencia
      sin listar cientos de archivos en el markdown. */
  orbita: z.string().optional(),
  fotogramas: z.number().int().positive().optional(),
});

const angulo = z.object({
  archivo: z.string(),
  alt: z.string(),
});

const modelos = defineCollection({
  loader: glob({ base: './src/content/modelos', pattern: '**/*.md' }),
  schema: z.object({
    nombre: z.string(),
    /** Ordena el catálogo. Sin esto el orden lo decide el nombre del archivo,
        que es un criterio que nadie eligió. */
    orden: z.number().default(0),
    /** Una línea. Es lo que se lee en la tarjeta antes de decidir entrar. */
    bajada: z.string(),
    /** La presentación de la ficha, debajo del nombre. Más larga que `bajada`. */
    descripcion: z.string().optional(),
    /** Los cuatro rasgos del tablero de portada, en el orden en que se leen. */
    atributos: z.array(z.string()).default([]),
    /** Los textos de cada escena de la ficha. Viven con el modelo porque el
        cliente los escribió por modelo; la página sólo los coloca. */
    textos: z
      .object({
        colores: z.string().optional(),
        interior: z.string().optional(),
        interiorTexto: z.string().optional(),
        tecnologia: z.string().optional(),
        tecnologiaIntro: z.string().optional(),
        cotizacion: z.string().optional(),
        cotizacionTexto: z.string().optional(),
      })
      .default({}),
    categoria: z.string().optional(),
    rotulo: z.string().optional(),
    /* El cliente aprobó la etiqueta de cada ficha con su propia puntuación: el
       S5 lleva «·» y el T1 no. Sin este campo se arma con `rotulo`. */
    rotuloFicha: z.string().optional(),
    /* Lo mismo en el banner de inicio: el T1 se aprobó sin «·». */
    separadorBanner: z.string().optional(),
    /** Los datos duros de la ficha: pares clave/valor. Es lo que hace que dos
        modelos se puedan comparar de un vistazo. */
    datos: z.array(z.object({ clave: z.string(), valor: z.string() })).default([]),
    cotas: z
      .array(z.object({ valor: z.string(), unidad: z.string().optional(), etiqueta: z.string() }))
      .default([]),
    variantes: z.array(variante).default([]),
    /** Una órbita fotográfica no se deduce del nombre del archivo: el orden
        editorial fija el sentido del arrastre y evita prometer un 3D que no existe. */
    angulos: z.array(angulo).default([]),
    galeria: z.array(fotoLocal).default([]),
    interior: z.array(variante).default([]),
    destacados: z
      .array(
        z.object({
          titulo: z.string(),
          /* En el tablero de la portada el rótulo va junto a OTRA foto que en
             la ficha: «Lectura del entorno» nombra asistencias, pero en la
             portada cae bajo el habitáculo. Este rótulo sólo cambia la
             portada; la ficha conserva el título que describe sus puntos. */
          tituloPortada: z.string().optional(),
          puntos: z.array(z.string()),
          archivo: z.string().optional(),
          alt: z.string().optional(),
        }),
      )
      .default([]),
    especificaciones: z
      .array(z.object({ grupo: z.string(), items: z.array(z.object({ clave: z.string(), valor: z.string() })) }))
      .default([]),
    /** `false` implica `noindex`, fuera del sitemap y fuera de la navegación. */
    publico: z.boolean().default(true),
    seoDescripcion: z.string().max(165),
    imagen: assetCms,
    /** Alt de la portada local. Sin él, imagenes.ts no pinta el archivo del repo. */
    alt: z.string().optional(),
    /** Apágalo cuando entre una fotografía real. */
    portadaGenerada: z.boolean().default(true),
  }),
});

/* El panel CMS escribe title/date/draft (nombres del panel IIDEA). El kit
   usa titulo/fecha/borrador. Las dos formas son válidas: el preprocess
   las unifica para que el build no falle cuando entra una nota desde el panel. */
const articulos = defineCollection({
  loader: glob({ base: './src/content/articulos', pattern: '**/*.md' }),
  schema: z.preprocess((crudo) => {
    const d = (crudo ?? {}) as Record<string, unknown>;
    const resumen = String(d.resumen ?? d.excerpt ?? '');
    return {
      ...d,
      titulo: d.titulo ?? d.title,
      fecha: d.fecha ?? d.date,
      autor: d.autor ?? d.author,
      categoria: d.categoria ?? d.cat,
      resumen: resumen.slice(0, 200),
      seoDescripcion: String(d.seoDescripcion ?? resumen).slice(0, 165),
      borrador: d.borrador ?? d.draft ?? false,
    };
  }, z.object({
    titulo: z.string(),
    /** `z.coerce.date()` y no `z.string()`: las páginas ordenan con
        `+b.data.fecha - +a.data.fecha` y llaman a `.toISOString()`. */
    fecha: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    /** Sin firma no hay artículo. La autoría es una señal de E-E-A-T y lo que
        permite que un motor generativo atribuya lo que cita. */
    autor: z.string(),
    cargo: z.string().optional(),
    categoria: z.string().optional(),
    resumen: z.string().max(200),
    seoDescripcion: z.string().max(165),
    portada: assetCms,
    portadaAlt: z.string().optional(),
    portadaGenerada: z.boolean().default(true),
    /** Preguntas del artículo. Alimentan su `FAQPage`: son la vía más directa
        para que una respuesta concreta acabe citada. */
    faq: z.array(z.object({ p: z.string(), r: z.string() })).default([]),
    borrador: z.boolean().default(false),
  })),
});

const equipo = defineCollection({
  loader: glob({ base: './src/content/equipo', pattern: '**/*.md' }),
  schema: z.object({
    nombre: z.string(),
    cargo: z.string(),
    orden: z.number().default(0),
    /** Sólo las personas con `bio` entran al JSON-LD: un `Person` cuyo único
        dato es el nombre no le da al motor nada que citar. */
    bio: z.string().optional(),
    /* `z.url()` y no `z.string().url()`: en zod 4 los validadores de formato son
       de primer nivel y la versión encadenada quedó deprecada. */
    linkedin: z.url().optional(),
    retrato: assetCms,
    retratoAlt: z.string().optional(),
    retratoGenerado: z.boolean().default(true),
  }),
});

export const collections = { modelos, articulos, equipo };
