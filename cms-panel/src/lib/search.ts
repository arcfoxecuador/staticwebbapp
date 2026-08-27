import { readFile, listDir } from "./github.js";
import { PAGES, pagePath } from "./pageBlocks.js";
import { careerPath, listCareers } from "./careersForm.js";
import { BLOG_DIR, parsePostMarkdown } from "./posts.js";

// ─────────────────────────────────────────────────────────────────────────────
// Búsqueda global de CONTENIDO para la paleta de comandos (Cmd+K). No solo por
// título: indexa el texto de cada página, carrera y entrada, así el equipo
// encuentra "¿dónde dice X?" sin recordar en qué pantalla vive. El índice se
// arma leyendo el repo y se cachea con TTL corto (la búsqueda tolera ~30s de
// desfase; toda escritura de contenido lo invalida igual).
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "page" | "career" | "post";
  slug: string;
  title: string;
  snippet: string;
}

export interface IndexDoc { type: SearchResult["type"]; slug: string; title: string; haystack: string }

const TTL_MS = 30_000;
let cache: { at: number; branch: string; docs: IndexDoc[] } | null = null;

export function invalidateSearchIndex(): void {
  cache = null;
}

// Recolecta recursivamente todos los strings de un JSON de bloques (títulos,
// textos, descripciones, etiquetas de botón…) en un único texto buscable.
function collectStrings(v: unknown, out: string[]): void {
  if (v == null) return;
  if (typeof v === "string") { out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) collectStrings(x, out); return; }
  if (typeof v === "object") { for (const x of Object.values(v as Record<string, unknown>)) collectStrings(x, out); }
}

async function buildIndex(branch: string): Promise<IndexDoc[]> {
  const docs: IndexDoc[] = [];

  // Páginas (JSON de bloques).
  await Promise.all(Object.entries(PAGES).map(async ([slug, label]) => {
    try {
      const doc = JSON.parse(await readFile(pagePath(slug), branch)) as { title?: string };
      const parts: string[] = [];
      collectStrings(doc, parts);
      docs.push({ type: "page", slug, title: doc.title || label, haystack: parts.join(" ") });
    } catch { /* una página ilegible no rompe la búsqueda */ }
  }));

  // Carreras (JSON).
  await Promise.all(Object.entries(await listCareers(branch)).map(async ([slug, label]) => {
    try {
      const doc = JSON.parse(await readFile(careerPath(slug), branch)) as { title?: string };
      const parts: string[] = [];
      collectStrings(doc, parts);
      docs.push({ type: "career", slug, title: doc.title || label, haystack: parts.join(" ") });
    } catch { /* idem */ }
  }));

  // Entradas del blog (título + resumen + etiquetas + cuerpo).
  try {
    const entries = await listDir(BLOG_DIR, branch);
    await Promise.all(entries.filter((e) => e.name.endsWith(".md")).map(async (e) => {
      const slug = e.name.replace(/\.md$/, "");
      try {
        const post = parsePostMarkdown(slug, await readFile(e.path, branch));
        const tags = Array.isArray(post.tags) ? post.tags.join(" ") : "";
        docs.push({ type: "post", slug, title: post.title, haystack: `${post.title} ${post.excerpt ?? ""} ${tags} ${post.body}` });
      } catch { /* una entrada corrupta no rompe la búsqueda */ }
    }));
  } catch { /* sin blog, se busca en páginas y carreras igual */ }

  return docs;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Fragmento alrededor de la primera coincidencia (con elipsis), en una línea.
function makeSnippet(haystack: string, qn: string): string {
  const flat = haystack.replace(/\s+/g, " ").trim();
  const i = norm(flat).indexOf(qn);
  if (i === -1) return flat.slice(0, 120);
  const start = Math.max(0, i - 40);
  const end = Math.min(flat.length, i + qn.length + 70);
  return (start > 0 ? "…" : "") + flat.slice(start, end).trim() + (end < flat.length ? "…" : "");
}

// Emparejamiento PURO (sin red): filtra un índice ya construido por el término,
// insensible a mayúsculas y acentos, con fragmento donde coincide. Extraído para
// poder probarlo sin GitHub.
export function matchDocs(docs: IndexDoc[], query: string, limit = 20): SearchResult[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const qn = norm(q);
  const results: SearchResult[] = [];
  for (const d of docs) {
    if (norm(d.title).includes(qn) || norm(d.haystack).includes(qn)) {
      results.push({ type: d.type, slug: d.slug, title: d.title, snippet: makeSnippet(d.haystack, qn) });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export async function searchContent(branch: string, query: string, limit = 20): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];
  if (!cache || cache.branch !== branch || Date.now() - cache.at > TTL_MS) {
    cache = { at: Date.now(), branch, docs: await buildIndex(branch) };
  }
  return matchDocs(cache.docs, query, limit);
}
