import { readFile, commitFiles } from "./github.js";
import { config } from "../config.js";
import { BLOG_CATEGORIES as MANIFEST_CATEGORIES } from "../generated/schema-manifest.js";

// ─────────────────────────────────────────────────────────────────────────────
// Categorías del blog EN VIVO. La fuente de verdad es
// astro-web/src/config/blog-categories.json (el sitio la tipa en
// content/blog-categories.ts y valida el frontmatter con z.enum). El panel la lee y la
// EDITA aquí (pantalla "Categorías"), sin regenerar el codegen: el manifiesto
// queda solo como respaldo si GitHub no responde.
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES_PATH = "src/config/blog-categories.json";

const TTL_MS = 30_000;
let cache: { at: number; cats: string[] } | null = null;

export function invalidateCategoriesCache(): void {
  cache = null;
}

export async function getCategories(branch = config.github.baseBranch): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cats;
  try {
    const raw = await readFile(CATEGORIES_PATH, branch);
    const cats = validateCategories(JSON.parse(raw));
    cache = { at: Date.now(), cats };
    return cats;
  } catch {
    // Respaldo: la lista congelada por codegen (mejor eso que romper el panel).
    return [...MANIFEST_CATEGORIES];
  }
}

// Valida la lista completa: strings únicas, no vacías, tamaño razonable.
export function validateCategories(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Las categorías deben ser una lista con al menos una.");
  }
  const cats = input.map((c) => String(c).trim());
  for (const c of cats) {
    if (!c) throw new Error("Hay una categoría vacía.");
    if (c.length > 40) throw new Error(`Categoría demasiado larga: "${c}" (máx. 40).`);
  }
  if (new Set(cats.map((c) => c.toLowerCase())).size !== cats.length) {
    throw new Error("Hay categorías repetidas.");
  }
  return cats;
}

export async function saveCategories(input: unknown, message: string): Promise<string[]> {
  const cats = validateCategories(input);
  await commitFiles(
    [{ path: CATEGORIES_PATH, content: JSON.stringify(cats, null, 2) + "\n" }],
    message,
    config.github.baseBranch,
  );
  cache = { at: Date.now(), cats };
  return cats;
}
