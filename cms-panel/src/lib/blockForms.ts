// ─────────────────────────────────────────────────────────────────────────────
// Esquema de FORMULARIOS para el editor visual del panel.
//
// FUENTE ÚNICA: ya NO se escribe a mano. Se DERIVA del manifiesto generado
// (../generated/schema-manifest.ts, que sale de astro-web/src/content/blocks.ts)
// combinado con la capa de presentación (./presentation.ts: etiquetas, controles
// y ayudas en español). Así nunca se descuadra con el esquema del sitio: si se
// agrega o cambia un campo en blocks.ts y se regenera (npm run codegen), el
// formulario aparece solo, sin tocar este archivo.
//
// El frontend (editor.js) consume FORM_SCHEMA vía /api/forms y genera los
// formularios automáticamente. La forma de `Field` se mantiene idéntica.
// ─────────────────────────────────────────────────────────────────────────────

import { BLOCK_MANIFEST, type ManifestField } from "../generated/schema-manifest.js";
import { BLOCK_LABELS, FIELD_PRESENTATION, OMIT, RESERVED_FIELDS, VARIANT_LABELS } from "./presentation.js";

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "checkbox"
  | "select"
  | "image"
  | "doc" // ruta a un documento publicado (PDF/Word/Excel) elegido en la biblioteca
  | "cta" // objeto { label, href }
  | "tags" // array de strings (chips)
  | "textlist" // array de strings (cada uno su propio campo)
  | "object" // objeto anidado con subcampos (item: Field[])
  | "array" // array de objetos (item: Field[])
  | "variants"; // array de UNIÓN discriminada: cada ítem es una "pieza" tipada

export interface FieldVariant {
  value: string; // valor del discriminador (kind), p.ej. "heading"
  label: string; // etiqueta humana de la pieza
  fields: Field[]; // campos de esa pieza
}

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  options?: string[]; // para select
  item?: Field[]; // para array/object (campos de cada elemento)
  help?: string;
  addLabel?: string; // para array
  variantKey?: string; // para "variants": nombre del discriminador (kind)
  variants?: FieldVariant[]; // para "variants": piezas y sus campos
}

export interface FormSpec {
  label: string; // nombre humano del bloque
  fields: Field[];
}

// Control por defecto para cada tipo del manifiesto. La presentación puede
// forzar otro control (p.ej. un string que se edita como área de texto o imagen).
function controlFor(mf: ManifestField, control?: FieldType, presOptions?: string[]): { type: FieldType; options?: string[] } {
  if (control) return { type: control, options: presOptions ?? mf.options };
  switch (mf.kind) {
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "checkbox" };
    case "enum":
      return { type: "select", options: mf.options };
    case "cta":
      return { type: "cta" };
    case "stringlist":
      return { type: "tags", options: mf.options };
    case "array":
      return { type: "array" };
    case "object":
      return { type: "object" };
    case "string":
    default:
      return { type: "text" };
  }
}

// Convierte un campo del manifiesto en un Field del formulario (o null si no se
// muestra: campo común, omitido, o sin control posible).
export function buildField(mf: ManifestField, path: string): Field | null {
  if (RESERVED_FIELDS.has(mf.name)) return null; // hidden/anchor → los maneja el editor aparte
  if (OMIT.has(path)) return null; // p.ej. career.slug
  if (mf.kind === "unknown") return null;

  const pres = FIELD_PRESENTATION[path] ?? {};

  // Array de UNIÓN discriminada (p.ej. richContent.items): cada ítem es una pieza
  // tipada. Los campos de cada pieza se resuelven bajo "<bloque>.<kind>".
  if (mf.variants && mf.variantKey) {
    const block = path.split(".")[0];
    const variants: FieldVariant[] = mf.variants.map((v) => ({
      value: v.value,
      label: VARIANT_LABELS[`${block}.${v.value}`] ?? v.value,
      fields: buildFields(v.fields, `${block}.${v.value}`),
    }));
    return {
      name: mf.name,
      label: pres.label ?? mf.name,
      type: "variants",
      variantKey: mf.variantKey,
      variants,
      addLabel: pres.addLabel ?? "Agregar",
      ...(pres.help ? { help: pres.help } : {}),
    };
  }

  const { type, options } = controlFor(mf, pres.control, pres.options);

  const field: Field = { name: mf.name, label: pres.label ?? mf.name, type };
  if (options && options.length) field.options = options;
  if (pres.help) field.help = pres.help;

  if (type === "array" || type === "object") {
    const item = buildFields(mf.item ?? [], path);
    // Array sin subcampos renderizables (p.ej. malla.titulacion) → no se edita;
    // se conserva tal cual al guardar.
    if (type === "array" && item.length === 0) return null;
    field.item = item;
    if (type === "array") field.addLabel = pres.addLabel ?? "Agregar";
  }

  return field;
}

// Construye la lista de campos de un objeto/bloque. `prefix` es la ruta padre
// (p.ej. "hero" o "career.malla") para resolver la presentación de cada campo.
export function buildFields(fields: ManifestField[], prefix: string): Field[] {
  const out: Field[] = [];
  for (const mf of fields) {
    const field = buildField(mf, `${prefix}.${mf.name}`);
    if (field) out.push(field);
  }
  return out;
}

// Formularios de todos los bloques, derivados del manifiesto. El orden de campos
// sigue al de blocks.ts (la fuente de verdad).
export const FORM_SCHEMA: Record<string, FormSpec> = Object.fromEntries(
  BLOCK_MANIFEST.map((block) => [
    block.type,
    { label: BLOCK_LABELS[block.type] ?? block.type, fields: buildFields(block.fields, block.type) } satisfies FormSpec,
  ]),
);

// Valor por defecto de un campo (para construir un bloque nuevo válido).
function defaultValue(f: Field): unknown {
  switch (f.type) {
    case "checkbox":
      return false;
    case "number":
      return 1;
    case "select": {
      // Opciones numéricas (columnas 2–6) van como número; el resto como texto.
      const first = f.options?.[0] ?? "";
      return /^\d+$/.test(first) ? Number(first) : first;
    }
    case "cta":
      return { label: "", href: "" };
    case "tags":
    case "textlist":
      return [];
    case "variants":
      // Contenedor de piezas: empieza vacío (se agregan desde el editor/agente).
      return [];
    case "array":
      // Siembra un elemento para cumplir validaciones .min(1) del sitio.
      return [Object.fromEntries((f.item ?? []).map((sf) => [sf.name, defaultValue(sf)]))];
    default:
      return "";
  }
}

// Construye un bloque nuevo con valores por defecto válidos para su tipo.
export function defaultBlock(type: string): Record<string, unknown> {
  const spec = FORM_SCHEMA[type];
  if (!spec) throw new Error(`Tipo de bloque desconocido: ${type}`);
  const block: Record<string, unknown> = { _type: type };
  for (const f of spec.fields) {
    // Solo sembramos los campos esenciales (arrays/select/variants); el resto van
    // vacíos y se omiten al guardar si quedan en blanco.
    if (f.type === "array" || f.type === "select" || f.type === "variants") block[f.name] = defaultValue(f);
  }
  return block;
}
