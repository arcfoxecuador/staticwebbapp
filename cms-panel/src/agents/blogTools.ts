import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { fileExists } from "../lib/github.js";
import { generateImage, fetchImageAsBase64, optimizeImage, COVER_SIZE } from "../lib/images.js";
import { buildBlogMarkdown, blogFrontmatterSchema, assertCategory, slugify } from "../lib/markdown.js";
import { listPosts, readPost, postPath, parsePostMarkdown, serializePost, assertSlug } from "../lib/posts.js";
import { getCategories } from "../lib/categories.js";
import type { RunContext } from "./context.js";

// Herramientas del Agente de Blogs. Superficie acotada: solo archivos Markdown
// de la colección del blog (crear y editar) y sus portadas. Los cambios se
// PREPARAN en el contexto y run.ts los publica en un único commit al final.
export function buildBlogTools(ctx: RunContext) {
  // Lectura con overlay: si esta corrida ya preparó la entrada, se ve ESA versión.
  async function readPostCtx(slug: string) {
    const staged = ctx.readStaged(postPath(slug));
    if (staged && staged.encoding !== "base64") return parsePostMarkdown(slug, staged.content);
    return readPost(slug, ctx.branch);
  }

  // Resuelve la portada según el modo y la deja OPTIMIZADA (WebP 16:10) en
  // staging. Devuelve la ruta pública que va al frontmatter.
  async function resolveCover(
    slug: string,
    image: { mode: "generate" | "url" | "existing"; prompt?: string; url?: string; path?: string },
  ): Promise<string> {
    if (image.mode === "existing") {
      if (!image.path) throw new Error("Falta image.path para mode=existing");
      // El agente NO puede inventar una portada: la ruta debe existir de verdad
      // (en el repo o preparada en esta misma corrida).
      const stagedHere = ctx.readStaged(`public${image.path}`);
      if (!stagedHere && !(await fileExists(`public${image.path}`, ctx.branch))) {
        throw new Error(
          `La imagen "${image.path}" no existe en el sitio. No publiques con una ruta ` +
            `inventada: genera la portada con IA, usa una imagen de la biblioteca ` +
            `(list_media) o una que el equipo haya adjuntado.`,
        );
      }
      return image.path;
    }
    let base64: string;
    if (image.mode === "generate") {
      if (!image.prompt) throw new Error("Falta image.prompt para mode=generate");
      ctx.emit({ type: "step", message: "Generando imagen de portada con IA…" });
      base64 = (await generateImage(image.prompt)).base64;
    } else {
      if (!image.url) throw new Error("Falta image.url para mode=url");
      ctx.emit({ type: "step", message: "Descargando imagen…" });
      base64 = await fetchImageAsBase64(image.url);
    }
    // Optimización obligatoria: WebP a la proporción estándar de portada.
    // (Antes se commiteaban PNG de varios MB que rompían Core Web Vitals.)
    const webp = await optimizeImage(base64, { cover: COVER_SIZE });
    const imgPath = `/news/${slug}.webp`;
    ctx.stage({ path: `public${imgPath}`, content: webp, encoding: "base64" }, `portada ${imgPath}`);
    return imgPath;
  }

  const publishBlogPost = betaZodTool({
    name: "publish_blog_post",
    description:
      "Crea una nueva entrada del blog: escribe el Markdown con frontmatter válido " +
      "y prepara su imagen de portada (generada, descargada o existente). El cambio " +
      "se publica en un único commit al terminar la corrida.",
    inputSchema: z.object({
      title: z.string().describe("Título de la nota"),
      cat: z.string().describe("Categoría (debe ser una de las permitidas del sitio)"),
      date: z.string().describe("Fecha de publicación en formato YYYY-MM-DD"),
      excerpt: z.string().describe("Resumen breve (máx 280 caracteres) para el listado y SEO"),
      body: z.string().describe("Cuerpo de la nota en Markdown (sin el frontmatter)"),
      tags: z.array(z.string()).default([]).describe("Etiquetas para SEO"),
      imgAlt: z
        .string()
        .describe("Texto alternativo de la portada (describe la imagen; accesibilidad + SEO)"),
      image: z
        .object({
          mode: z
            .enum(["generate", "url", "existing"])
            .describe(
              "generate = crear con IA; url = descargar de un enlace; existing = usar una ruta /public ya subida (p.ej. una imagen adjunta por el equipo)",
            ),
          prompt: z.string().optional().describe("Prompt de la imagen (solo mode=generate)"),
          url: z.string().optional().describe("URL de la imagen (solo mode=url)"),
          path: z
            .string()
            .optional()
            .describe("Ruta pública ya existente, ej. /uploads/foto.webp (solo mode=existing)"),
        })
        .describe("Cómo obtener la imagen de portada"),
    }),
    run: async (input) => {
      const slug = slugify(input.title);
      ctx.emit({ type: "step", message: `Preparando la nota "${input.title}"…` });
      assertCategory(input.cat, await getCategories(ctx.branch));
      if (!ctx.readStaged(postPath(slug)) && (await fileExists(postPath(slug), ctx.branch))) {
        throw new Error(`Ya existe una entrada con el slug "${slug}". Cambia el título.`);
      }
      const imgPath = await resolveCover(slug, input.image);
      const fm = blogFrontmatterSchema.parse({
        title: input.title,
        cat: input.cat,
        date: input.date,
        excerpt: input.excerpt,
        img: imgPath,
        imgAlt: input.imgAlt,
        // Publica visible (no borrador): staging/producción ES la revisión.
        draft: false,
        tags: input.tags,
      });
      ctx.stage(
        { path: postPath(slug), content: buildBlogMarkdown(fm, input.body) },
        `nueva nota "${input.title}"`,
      );
      return `Nota "${input.title}" preparada (slug ${slug}). Se publicará al terminar, en /noticias/${slug}/.`;
    },
  });

  const listPostsTool = betaZodTool({
    name: "list_posts",
    description: "Lista las entradas del blog (slug, título, categoría, fecha, borrador). Úsalo para encontrar la entrada que el equipo quiere editar.",
    inputSchema: z.object({}),
    run: async () => {
      const posts = await listPosts(ctx.branch);
      return JSON.stringify(
        posts.map((p) => ({ slug: p.slug, title: p.title, cat: p.cat, date: p.date, draft: p.draft })),
        null,
        2,
      );
    },
  });

  const getPost = betaZodTool({
    name: "get_post",
    description: "Devuelve una entrada completa (frontmatter + cuerpo Markdown) para editarla con precisión.",
    inputSchema: z.object({ slug: z.string().describe("slug de la entrada (de list_posts)") }),
    run: async (input) => {
      assertSlug(input.slug);
      return JSON.stringify(await readPostCtx(input.slug), null, 2);
    },
  });

  const editPost = betaZodTool({
    name: "edit_post",
    description:
      "Edita una entrada existente (merge del patch sobre la versión actual). Sirve para corregir " +
      "textos, cambiar la portada (img/imgAlt con una ruta existente), publicar o despublicar " +
      "(draft), reprogramar la fecha, etc. Para el cuerpo pasa el Markdown COMPLETO ya modificado.",
    inputSchema: z.object({
      slug: z.string(),
      patch: z
        .object({
          title: z.string().optional(),
          cat: z.string().optional(),
          date: z.string().optional(),
          excerpt: z.string().optional(),
          img: z.string().optional().describe("Ruta pública existente (p.ej. /uploads/foto.webp)"),
          imgAlt: z.string().optional(),
          draft: z.boolean().optional().describe("true = borrador (despublicar), false = publicada"),
          author: z.string().optional(),
          tags: z.array(z.string()).optional(),
          body: z.string().optional().describe("Cuerpo Markdown completo (reemplaza el actual)"),
        })
        .describe("Solo los campos a cambiar"),
    }),
    run: async (input) => {
      assertSlug(input.slug);
      const current = await readPostCtx(input.slug);
      if (input.patch.cat) assertCategory(input.patch.cat, await getCategories(ctx.branch));
      if (input.patch.img && input.patch.img !== current.img) {
        const stagedHere = ctx.readStaged(`public${input.patch.img}`);
        if (!stagedHere && !(await fileExists(`public${input.patch.img}`, ctx.branch))) {
          throw new Error(`La imagen "${input.patch.img}" no existe en el sitio. Usa una ruta real (list_media).`);
        }
      }
      const updated = { ...current, ...input.patch, slug: input.slug };
      ctx.stage({ path: postPath(input.slug), content: serializePost(updated) }, `editar nota "${updated.title}"`);
      const changed = Object.keys(input.patch).join(", ");
      return `Entrada "${updated.title}" actualizada (${changed}). Se publicará al terminar la corrida.`;
    },
  });

  return [publishBlogPost, listPostsTool, getPost, editPost];
}
