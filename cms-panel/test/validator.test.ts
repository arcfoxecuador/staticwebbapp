// Tests del VALIDADOR del agente (la barrera del lado del panel). validateBlock
// rechaza lo que el build de Astro (Zod) también rechazaría, pero antes de
// commitear. defaultBlock debe producir bloques que el validador acepte.

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateBlock, validateBlocks, validatePageSeo, SEO_LIMITS } from "../src/lib/pageBlocks.js";
import { FORM_SCHEMA, defaultBlock } from "../src/lib/blockForms.js";

test("acepta un bloque válido (incluido un campo nuevo del esquema)", () => {
  assert.doesNotThrow(() => validateBlock({ _type: "hero", heading: "Hola" }));
  // intakeBadge llegó al esquema vía codegen; el validador ya lo conoce.
  assert.doesNotThrow(() => validateBlock({ _type: "hero", heading: "Hola", intakeBadge: true }));
  // Los campos comunes (hidden/anchor) siempre se admiten.
  assert.doesNotThrow(() => validateBlock({ _type: "hero", heading: "Hola", hidden: true, anchor: "#x" }));
});

test("rechaza tipo desconocido", () => {
  assert.throws(() => validateBlock({ _type: "noExiste", heading: "x" }), /desconocido/i);
});

test("rechaza un campo no permitido", () => {
  assert.throws(() => validateBlock({ _type: "hero", heading: "x", inventado: 1 }), /no admite/i);
});

test("rechaza si falta un campo obligatorio", () => {
  assert.throws(() => validateBlock({ _type: "hero" }), /requiere/i);
});

test("validateBlocks identifica el índice del bloque malo", () => {
  const blocks = [{ _type: "hero", heading: "ok" }, { _type: "hero" }];
  assert.throws(() => validateBlocks(blocks), /Bloque #1/);
});

test("contenido libre: acepta piezas válidas y bloque vacío", () => {
  assert.doesNotThrow(() => validateBlock({ _type: "richContent" }));
  assert.doesNotThrow(() => validateBlock({ _type: "richContent", background: "tint", items: [] }));
  assert.doesNotThrow(() =>
    validateBlock({
      _type: "richContent",
      items: [
        { kind: "heading", text: "Título", level: "h2" },
        { kind: "text", text: "Un párrafo con <b>negrita</b>." },
        { kind: "image", src: "/uploads/x.webp", alt: "foto" },
        { kind: "button", label: "Aplica", href: "#aplica" },
        { kind: "buttons", items: [{ label: "A", href: "/a" }] },
        { kind: "list", items: ["uno", "dos"], ordered: false },
        { kind: "spacer", size: "md" },
      ],
    }),
  );
});

test("contenido libre: rechaza pieza con kind desconocido", () => {
  assert.throws(() => validateBlock({ _type: "richContent", items: [{ kind: "carousel" }] }), /desconocido/i);
});

test("contenido libre: rechaza pieza a la que le falta un campo obligatorio", () => {
  // heading requiere text; image requiere src; button requiere label y href.
  assert.throws(() => validateBlock({ _type: "richContent", items: [{ kind: "heading" }] }), /obligatorio|falta/i);
  assert.throws(() => validateBlock({ _type: "richContent", items: [{ kind: "image", alt: "x" }] }), /obligatorio|falta/i);
});

test("contenido libre: rechaza campo ajeno dentro de una pieza", () => {
  assert.throws(() => validateBlock({ _type: "richContent", items: [{ kind: "text", text: "x", color: "red" }] }), /no admitido/i);
});

test("defaultBlock siembra arrays/selects válidos para cada tipo", () => {
  // defaultBlock crea un esqueleto: siembra arrays (con ≥1 elemento, para cumplir
  // .min(1)) y selects (primera opción). Los campos de texto obligatorios los
  // rellena la persona en el editor antes de guardar, así que NO se siembran aquí.
  for (const type of Object.keys(FORM_SCHEMA)) {
    const block = defaultBlock(type) as Record<string, unknown>;
    assert.equal(block._type, type);
    for (const f of FORM_SCHEMA[type].fields) {
      if (f.type === "array") {
        assert.ok(Array.isArray(block[f.name]) && (block[f.name] as unknown[]).length >= 1, `${type}.${f.name} debe sembrarse con ≥1 elemento`);
      }
      if (f.type === "select") {
        // Las opciones numéricas (columnas) se siembran como número (el esquema
        // del sitio usa z.literal(2|3|…)); el resto como texto.
        const val = block[f.name];
        assert.ok(f.options?.includes(String(val)), `${type}.${f.name} debe tomar una opción válida`);
        if (/^\d+$/.test(f.options?.[0] ?? "")) assert.equal(typeof val, "number", `${type}.${f.name} numérico debe ser number`);
      }
    }
  }
});

// ── SEO por página (validatePageSeo) ─────────────────────────────────────────
test("seo: sin datos → undefined (no se escribe seo vacío en disco)", () => {
  assert.equal(validatePageSeo(undefined), undefined);
  assert.equal(validatePageSeo(null), undefined);
  assert.equal(validatePageSeo({}), undefined);
  assert.equal(validatePageSeo({ title: "", description: "  " }), undefined);
});

test("seo: acepta y recorta campos válidos", () => {
  const out = validatePageSeo({ title: "  Estudiantes  ", description: "Desc", ogImage: "/og.png" });
  assert.deepEqual(out, { title: "Estudiantes", description: "Desc", ogImage: "/og.png" });
});

test("seo: omite campos vacíos pero conserva los presentes", () => {
  assert.deepEqual(validatePageSeo({ title: "Solo título", description: "" }), { title: "Solo título" });
});

test("seo: rechaza longitudes fuera de límite (coincide con el Zod del build)", () => {
  assert.throws(() => validatePageSeo({ title: "a".repeat(SEO_LIMITS.title + 1) }), /title/);
  assert.throws(() => validatePageSeo({ description: "a".repeat(SEO_LIMITS.description + 1) }), /description/);
  assert.throws(() => validatePageSeo({ ogImage: "a".repeat(SEO_LIMITS.ogImage + 1) }), /ogImage/);
});

test("seo: rechaza tipos no-string y no-objeto", () => {
  assert.throws(() => validatePageSeo({ title: 123 }), /texto/);
  assert.throws(() => validatePageSeo("no soy objeto"), /objeto/);
  assert.throws(() => validatePageSeo([1, 2]), /objeto/);
});

test("seo: acepta exactamente el límite (borde)", () => {
  const out = validatePageSeo({ title: "a".repeat(SEO_LIMITS.title) });
  assert.equal(out?.title?.length, SEO_LIMITS.title);
});
