import { readFile } from "./github.js";
import { BLOCK_MANIFEST, PAGE_LIST, type ManifestField } from "../generated/schema-manifest.js";
import { validateFields } from "./manifestValidate.js";
import { BLOCK_DESCRIPTIONS, RESERVED_FIELDS } from "./presentation.js";

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de bloques y utilidades para el Agente de Páginas.
//
// Las páginas editables son archivos JSON en src/content/pages/*.json, cada uno
// con { title, blocks: [...] }. Este catálogo es la BARRERA del lado del agente:
// define qué tipos de bloque existen y qué campos admite cada uno. El agente
// solo puede reordenar/agregar/editar bloques de este catálogo; nunca escribe
// .astro ni HTML libre. La validación final la hace el build de Astro (Zod) al
// abrir el PR, igual que con los blogs y el tema.
//
// El catálogo se DERIVA del manifiesto generado (../generated/schema-manifest.ts,
// que sale de astro-web/src/content/blocks.ts): así SIEMPRE refleja el esquema
// del sitio, sin sincronizar a mano. Las descripciones (texto para el agente)
// viven en ./presentation.ts.
// ─────────────────────────────────────────────────────────────────────────────

// Páginas editables por bloques (slug → label). Derivado del contenido vía
// codegen (PAGE_LIST = un archivo src/content/pages/<slug>.json por página, label
// = su `title`): el panel ya no mantiene esta lista a mano.
export const PAGES: Record<string, string> = Object.fromEntries(PAGE_LIST.map((p) => [p.slug, p.label]));

// Campos comunes a todos los bloques (el editor los maneja aparte; no son
// campos de contenido). validateBlock los admite siempre.
const COMMON = [...RESERVED_FIELDS];

export interface BlockType {
  description: string;
  required: string[];
  optional: string[];
}

export const BLOCK_CATALOG: Record<string, BlockType> = Object.fromEntries(
  BLOCK_MANIFEST.map((block) => {
    const fields = block.fields.filter((f) => !RESERVED_FIELDS.has(f.name));
    return [
      block.type,
      {
        description: BLOCK_DESCRIPTIONS[block.type] ?? "",
        required: fields.filter((f) => f.required).map((f) => f.name),
        optional: fields.filter((f) => !f.required).map((f) => f.name),
      } satisfies BlockType,
    ];
  }),
);

// SEO por página (opcional). Espeja el esquema `seo` de la colección "pages"
// en astro-web/src/content/config.ts (fuente de verdad del build). Todos los
// campos son opcionales; si faltan, cada .astro cae a sus valores por defecto.
export interface PageSeo {
  title?: string;
  description?: string;
  ogImage?: string;
}

export interface PageDoc {
  title: string;
  // Página oculta: el sitio la sigue compilando y responde por su URL directa,
  // pero sale del menú, del pie, del sitemap y de /llms.txt, y se sirve con
  // noindex. Es el equivalente de "oculta" en carreras y "borrador" en entradas.
  hidden?: boolean;
  // Metadatos SEO opcionales (título, descripción e imagen OG de la página).
  seo?: PageSeo;
  blocks: Array<Record<string, any>>;
}

// Límites SEO — DEBEN coincidir con el Zod de la colección "pages" (astro-web).
// El panel valida aquí (y el frontend replica los maxlength) para que nunca se
// guarde algo que el build rechazaría después.
export const SEO_LIMITS = { title: 70, description: 200, ogImage: 300 } as const;

// Valida y NORMALIZA el objeto seo entrante (del editor o del agente). Recorta
// espacios, descarta campos vacíos y exige tipos/longitudes válidos. Devuelve
// `undefined` si no queda nada (para no escribir un `seo: {}` inútil en disco).
export function validatePageSeo(raw: unknown): PageSeo | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("El campo 'seo' debe ser un objeto.");
  }
  const src = raw as Record<string, unknown>;
  const out: PageSeo = {};
  for (const key of ["title", "description", "ogImage"] as const) {
    const v = src[key];
    if (v == null || v === "") continue;
    if (typeof v !== "string") throw new Error(`seo.${key} debe ser texto.`);
    const trimmed = v.trim();
    if (!trimmed) continue;
    const max = SEO_LIMITS[key];
    if (trimmed.length > max) {
      throw new Error(`seo.${key} supera el máximo de ${max} caracteres (${trimmed.length}).`);
    }
    out[key] = trimmed;
  }
  return Object.keys(out).length ? out : undefined;
}

export function pagePath(slug: string): string {
  return `src/content/pages/${slug}.json`;
}

export function assertPage(slug: string): void {
  if (!PAGES[slug]) {
    throw new Error(`Página desconocida: "${slug}". Páginas válidas: ${Object.keys(PAGES).join(", ")}`);
  }
}

// Lee la página desde la rama de trabajo si existe; si no, desde la rama base.
export async function readPage(slug: string, branch: string): Promise<PageDoc> {
  assertPage(slug);
  let raw: string;
  try {
    raw = await readFile(pagePath(slug), branch);
  } catch {
    raw = await readFile(pagePath(slug));
  }
  const doc = JSON.parse(raw) as PageDoc;
  if (!Array.isArray(doc.blocks)) throw new Error(`La página "${slug}" no tiene un array blocks.`);
  return doc;
}

// Manifiesto por tipo de bloque (para validar estructuras profundas como las
// piezas del contenido libre, que el catálogo plano no captura).
const MANIFEST_BY_TYPE: Record<string, { type: string; fields: ManifestField[] }> = Object.fromEntries(
  BLOCK_MANIFEST.map((b) => [b.type, b]),
);

// Valida una lista de UNIÓN discriminada (p.ej. richContent.items): cada ítem
// debe declarar un `kind` conocido y traer los campos obligatorios de esa pieza,
// sin campos ajenos. Es la barrera que hace que el "contenido libre" siga siendo
// seguro para el agente y el editor (nada inválido llega al build).
function validateVariantField(block: Record<string, any>, field: ManifestField): void {
  const items = block[field.name];
  if (items === undefined) return; // opcional (tiene default [])
  if (!Array.isArray(items)) {
    throw new Error(`El campo "${field.name}" debe ser una lista de piezas.`);
  }
  const key = field.variantKey as string;
  const byValue = new Map((field.variants ?? []).map((v) => [v.value, v]));
  items.forEach((item: any, i: number) => {
    if (!item || typeof item !== "object") throw new Error(`Pieza #${i}: debe ser un objeto.`);
    const kind = item[key];
    const variant = byValue.get(kind);
    if (!variant) {
      throw new Error(`Pieza #${i}: ${key} "${kind}" desconocido. Válidos: ${[...byValue.keys()].join(", ")}`);
    }
    const allowed = new Set([key, ...variant.fields.map((f) => f.name)]);
    for (const k of Object.keys(item)) {
      if (!allowed.has(k)) throw new Error(`Pieza #${i} (${kind}): campo "${k}" no admitido. Válidos: ${[...allowed].join(", ")}`);
    }
    for (const f of variant.fields) {
      if (f.required && item[f.name] === undefined) {
        throw new Error(`Pieza #${i} (${kind}): falta el campo obligatorio "${f.name}".`);
      }
    }
  });
}

// Valida un bloque contra el catálogo: tipo conocido, campos conocidos y
// requeridos presentes. Para bloques con piezas (unión discriminada) valida cada
// pieza. Lanza un error claro si algo no encaja.
export function validateBlock(block: Record<string, any>): void {
  const type = block?._type;
  const spec = BLOCK_CATALOG[type];
  if (!spec) {
    throw new Error(`Tipo de bloque desconocido: "${type}". Tipos válidos: ${Object.keys(BLOCK_CATALOG).join(", ")}`);
  }
  const allowed = new Set([...spec.required, ...spec.optional, ...COMMON, "_type"]);
  for (const key of Object.keys(block)) {
    if (!allowed.has(key)) {
      throw new Error(`El bloque "${type}" no admite el campo "${key}". Campos válidos: ${[...spec.required, ...spec.optional].join(", ") || "(ninguno)"}`);
    }
  }
  for (const req of spec.required) {
    if (block[req] === undefined) {
      throw new Error(`El bloque "${type}" requiere el campo "${req}".`);
    }
  }
  // Validación profunda de piezas (contenido libre y cualquier unión futura).
  const manifest = MANIFEST_BY_TYPE[type];
  if (manifest) {
    for (const f of manifest.fields) {
      if (f.variants && f.variantKey) validateVariantField(block, f);
    }
    // TIPOS, no solo nombres: `columns: "4"` en texto pasaba este control y
    // reventaba el build del sitio después de commitear.
    validateFields(`El bloque "${type}"`, manifest.fields, block);
  }
}

export function validateBlocks(blocks: Array<Record<string, any>>): void {
  blocks.forEach((b, i) => {
    try {
      validateBlock(b);
    } catch (e) {
      throw new Error(`Bloque #${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}

// Resumen humano de un bloque para listados.
export function summarizeBlock(block: Record<string, any>): string {
  const txt = block.heading || block.title || block.eyebrow || (Array.isArray(block.items) ? `${block.items.length} ítems` : "");
  const hidden = block.hidden ? " [oculto]" : "";
  return `${block._type}${txt ? ` — "${String(txt).replace(/\n/g, " ").slice(0, 60)}"` : ""}${hidden}`;
}

export function serializePage(doc: PageDoc): string {
  return JSON.stringify(doc, null, 2) + "\n";
}
