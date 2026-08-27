import { listDir, readFile } from "./github.js";
import { buildBlogMarkdown, blogFrontmatterSchema, type BlogFrontmatter } from "./markdown.js";

// ─────────────────────────────────────────────────────────────────────────────
// Entradas del blog para la administración (vista "Entradas", estilo WordPress).
// Cada entrada es un Markdown en src/content/articulos/<slug>.md con el
// frontmatter de la colección de Astro. Aquí se parsea/serializa ese
// frontmatter para que el panel liste y edite entradas existentes
// (no solo crearlas por agente).
// El serializado reutiliza buildBlogMarkdown + blogFrontmatterSchema, así todo
// lo que se guarda desde el panel es válido para el build del sitio.
// ─────────────────────────────────────────────────────────────────────────────

export const BLOG_DIR = "src/content/articulos";

export function postPath(slug: string): string {
  return `${BLOG_DIR}/${slug}.md`;
}

// Los slugs vienen de la URL: solo se aceptan slugs de archivo válidos para
// que nadie pueda leer/borrar rutas arbitrarias del repo.
export function assertSlug(slug: string): void {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error(`Slug de entrada inválido: "${slug}"`);
}

export interface PostDoc extends BlogFrontmatter {
  slug: string;
  body: string;
}

// Parsea un valor escalar del frontmatter YAML que escribimos nosotros mismos
// (strings citadas, fechas sin citar, booleanos y arrays JSON). No es un parser
// YAML general: cubre exactamente el formato de buildBlogMarkdown y los .md
// del repo.
function parseValue(raw: string): unknown {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[")) {
    try {
      return JSON.parse(v);
    } catch {
      // Array con citas simples u otro formato laxo: separa por comas.
      return v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
  }
  if (v.startsWith('"') || v.startsWith("'")) {
    try {
      return JSON.parse(v.replace(/^'(.*)'$/s, '"$1"'));
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

export function parsePostMarkdown(slug: string, md: string): PostDoc {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`La entrada "${slug}" no tiene frontmatter válido.`);
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1 || /^\s/.test(line)) continue; // ignora líneas anidadas/raras
    const key = line.slice(0, idx).trim();
    fm[key] = parseValue(line.slice(idx + 1));
  }
  // El kit escribe en español (titulo, fecha, borrador…). El panel habla
  // title/date/draft. Las dos formas entran; se guarda en la del panel.
  if (fm.title == null && fm.titulo != null) fm.title = fm.titulo;
  if (fm.date == null && fm.fecha != null) fm.date = fm.fecha;
  if (fm.author == null && fm.autor != null) fm.author = fm.autor;
  if (fm.cat == null && fm.categoria != null) fm.cat = fm.categoria;
  if (fm.excerpt == null && (fm.resumen != null || fm.seoDescripcion != null)) {
    fm.excerpt = fm.resumen ?? fm.seoDescripcion;
  }
  if (fm.draft == null && fm.borrador != null) fm.draft = fm.borrador;
  if (fm.img == null || fm.img === "") fm.img = "/marca/logo.svg";
  if (fm.cat == null || fm.cat === "") fm.cat = "General";
  // Normaliza la fecha a YYYY-MM-DD (Astro acepta Date; nosotros escribimos string).
  if (fm.date != null) fm.date = String(fm.date).slice(0, 10);
  const parsed = blogFrontmatterSchema.parse(fm);
  return { slug, ...parsed, body: m[2].trim() };
}

export function serializePost(doc: PostDoc): string {
  const { slug: _slug, body, ...fm } = doc;
  return buildBlogMarkdown(blogFrontmatterSchema.parse(fm), body);
}

export interface PostSummary extends Omit<PostDoc, "body"> {}

// Cache con TTL corto del listado: cada carga de pantalla hacía N+1 lecturas a
// GitHub (una por entrada). Con el cache, las pantallas repetidas son
// instantáneas y no consumen rate limit; toda escritura lo invalida.
const LIST_TTL_MS = 30_000;
const listCache = new Map<string, { at: number; posts: PostSummary[] }>();

export function invalidatePostsCache(): void {
  listCache.clear();
}

// Lista todas las entradas con su frontmatter (lee cada .md del repo).
export async function listPosts(branch: string): Promise<PostSummary[]> {
  const cached = listCache.get(branch);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.posts;
  const entries = await listDir(BLOG_DIR, branch);
  const posts = await Promise.all(
    entries
      .filter((e) => e.name.endsWith(".md"))
      .map(async (e) => {
        const slug = e.name.replace(/\.md$/, "");
        try {
          const { body: _body, ...summary } = parsePostMarkdown(slug, await readFile(e.path, branch));
          return summary;
        } catch {
          return null; // una entrada corrupta no debe tumbar el listado
        }
      }),
  );
  const result = posts
    .filter((p): p is PostSummary => p != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  listCache.set(branch, { at: Date.now(), posts: result });
  return result;
}

export async function readPost(slug: string, branch: string): Promise<PostDoc> {
  assertSlug(slug);
  return parsePostMarkdown(slug, await readFile(postPath(slug), branch));
}
