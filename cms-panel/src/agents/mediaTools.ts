import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { listDir, listDirAll } from "../lib/github.js";
import { generateImage, fetchImageAsBase64, optimizeImage, hashedName, IMAGE_PRESETS, PRESET_HINT, type ImagePreset } from "../lib/images.js";
import type { RunContext } from "./context.js";

// Valida una carpeta de destino (un nivel bajo /uploads). Mismo criterio que el
// panel: minúsculas, números y guiones — sin barras ni puntos, así no hay
// escape de directorio. Devuelve "" (raíz) si no se indica.
function cleanFolder(f?: string): string {
  const v = (f ?? "").trim().toLowerCase();
  if (v && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(v)) {
    throw new Error(`Carpeta inválida "${f}": usa minúsculas, números y guiones (un solo nivel).`);
  }
  return v;
}
const uploadPath = (folder: string, name: string) => (folder ? `/uploads/${folder}/${name}` : `/uploads/${name}`);

// Herramientas de MEDIOS del asistente. Permiten generar/descargar imágenes a
// la biblioteca (public/uploads) y consultar qué imágenes existen, para que
// cualquier agente use rutas REALES en portadas, heros y tarjetas. Todo lo que
// entra pasa por el optimizador (WebP) y se publica en el commit final.
export function buildMediaTools(ctx: RunContext) {
  const listMedia = betaZodTool({
    name: "list_media",
    description:
      "Lista las imágenes disponibles en la biblioteca del sitio (rutas públicas como " +
      "/uploads/foto.webp o /news/portada.webp), incluidas las preparadas en esta corrida. " +
      "Úsalo para elegir una imagen REAL en vez de inventar rutas.",
    inputSchema: z.object({}),
    run: async () => {
      const isImg = (n: string) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(n);
      // uploads: archivos en la raíz + un nivel de subcarpetas; news heredado.
      const uploads = await listDirAll("public/uploads", ctx.branch);
      const subdirs = uploads.filter((e) => e.type === "dir").map((e) => e.name);
      const subFiles = (await Promise.all(subdirs.map((d) => listDir(`public/uploads/${d}`, ctx.branch)))).flat();
      const newsFiles = await listDir("public/news", ctx.branch);
      const existing = [...uploads.filter((e) => e.type === "file"), ...subFiles, ...newsFiles]
        .filter((f) => isImg(f.name))
        .map((f) => f.path.replace(/^public/, ""));
      const stagedNow = [...ctx.staged.keys()]
        .filter((p) => p.startsWith("public/uploads/") || p.startsWith("public/news/"))
        .map((p) => p.replace(/^public/, ""));
      return JSON.stringify({
        images: [...new Set([...stagedNow, ...existing])],
        folders: [...new Set(subdirs)].sort(),
        hint: "Para organizar, pasa 'folder' (una carpeta bajo /uploads) al generar o importar una imagen.",
      }, null, 2);
    },
  });

  const generateImageTool = betaZodTool({
    name: "generate_image",
    description:
      "Genera una imagen con IA y la deja en la biblioteca (public/uploads) optimizada en WebP. " +
      "Devuelve la ruta pública para usarla en entradas, páginas o carreras.\n" +
      "Elige 'size' según DÓNDE irá la imagen (se recorta a esa proporción):\n" +
      "· wide (16:9): fondo de hero o banner ancho de página.\n" +
      "· cover (16:10): portada de una entrada o noticia.\n" +
      "· landscape (4:3): imagen lateral de un hero, o sección de texto+imagen.\n" +
      "· portrait (4:5): foto de persona (testimonio, equipo).\n" +
      "· square (1:1): logo, avatar o ícono.\n" +
      "· natural: sin recorte (imagen libre). Si dudas, revisa la guía de marca.",
    inputSchema: z.object({
      prompt: z.string().describe("Prompt visual detallado (estilo, escena, luz)"),
      filename: z.string().describe("Nombre base descriptivo, ej. 'campus-virtual'"),
      // Obligatorio a propósito: el alt se piensa AQUÍ, cuando el modelo todavía
      // tiene en la cabeza la escena que pidió. Si se dejara para después, el
      // campo imageAlt del bloque se queda vacío y la imagen le desaparece a
      // quien usa lector de pantalla.
      alt: z
        .string()
        .describe(
          "Texto alternativo de la imagen: UNA frase en español que describa lo que se ve " +
            "(personas, acción, lugar), sin empezar con 'Imagen de' ni repetir el titular de la sección",
        ),
      size: z.enum(["wide", "cover", "landscape", "portrait", "square", "natural"]).default("natural")
        .describe("Medida/proporción según el lugar de destino (ver arriba)"),
      cover: z.boolean().default(false).describe("Compatibilidad: equivale a size='cover' (portada 16:10)"),
      folder: z.string().optional().describe("Carpeta opcional bajo /uploads para organizar (minúsculas y guiones), ej. 'carreras' o 'noticias'"),
    }),
    run: async (input) => {
      const folder = cleanFolder(input.folder);
      // Medida efectiva: 'size' manda; 'cover=true' (heredado) equivale a 'cover'.
      const size = (input.size !== "natural" ? input.size : input.cover ? "cover" : "natural") as ImagePreset | "natural";
      ctx.emit({ type: "step", message: `Generando imagen "${input.filename}"…` });
      // Pista de encuadre al modelo según la proporción objetivo (mejor composición).
      const prompt = size !== "natural" ? `${input.prompt}\n\n${PRESET_HINT[size]}` : input.prompt;
      const raw = (await generateImage(prompt)).base64;
      const webp = await optimizeImage(raw, size !== "natural" ? { cover: IMAGE_PRESETS[size] } : { maxWidth: 1920 });
      const name = hashedName(webp, input.filename);
      const path = uploadPath(folder, name);
      ctx.stage({ path: `public${path}`, content: webp, encoding: "base64" }, `generar imagen ${path}`);
      // El alt se devuelve junto a la ruta porque la biblioteca son archivos en
      // git, sin base de datos donde guardarlo: vive en el campo imageAlt/imgAlt
      // del bloque, la carrera o la nota. Repetirlo aquí evita que el agente
      // rellene la ruta y se olvide del texto.
      return (
        `Imagen generada (${size}) y preparada en ${path}. Se publica al terminar la corrida.\n` +
        `Al colocarla, usa la ruta ${path} Y este texto alternativo en el campo de alt ` +
        `(imageAlt en un bloque o carrera, imgAlt en una nota): "${input.alt}"`
      );
    },
  });

  const importImage = betaZodTool({
    name: "import_image_from_url",
    description:
      "Descarga una imagen desde una URL pública, la optimiza (WebP) y la deja en la biblioteca " +
      "(public/uploads). Devuelve la ruta pública.",
    inputSchema: z.object({
      url: z.string().describe("URL http(s) pública de la imagen"),
      filename: z.string().describe("Nombre base descriptivo, ej. 'equipo-docente'"),
      // Mismo criterio que en generate_image: sin alt, la imagen no se publica bien.
      alt: z
        .string()
        .describe(
          "Texto alternativo de la imagen: UNA frase en español que describa lo que se ve " +
            "(personas, acción, lugar), sin empezar con 'Imagen de'",
        ),
      folder: z.string().optional().describe("Carpeta opcional bajo /uploads para organizar (minúsculas y guiones), ej. 'carreras'"),
    }),
    run: async (input) => {
      const folder = cleanFolder(input.folder);
      ctx.emit({ type: "step", message: "Descargando imagen…" });
      const raw = await fetchImageAsBase64(input.url);
      const webp = await optimizeImage(raw, { maxWidth: 1920 });
      const name = hashedName(webp, input.filename);
      const path = uploadPath(folder, name);
      ctx.stage({ path: `public${path}`, content: webp, encoding: "base64" }, `importar imagen ${path}`);
      return (
        `Imagen importada y preparada en ${path}. Se publica al terminar la corrida.\n` +
        `Al colocarla, usa la ruta ${path} Y este texto alternativo en el campo de alt ` +
        `(imageAlt en un bloque o carrera, imgAlt en una nota): "${input.alt}"`
      );
    },
  });

  return [listMedia, generateImageTool, importImage];
}
