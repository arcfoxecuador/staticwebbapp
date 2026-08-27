// Tests del esquema de FUENTE ÚNICA: garantizan que el catálogo y los
// formularios del panel se derivan bien del manifiesto generado (que sale de
// astro-web/src/content/blocks.ts) y que la presentación cubre todos los campos.
//
// Ejecutar:  npm test   (usa tsx + el test runner de Node, sin dependencias extra)

import { test } from "node:test";
import assert from "node:assert/strict";

import { BLOCK_MANIFEST, CAREER_MANIFEST, CAREER_LIST } from "../src/generated/schema-manifest.js";
import { BLOCK_CATALOG, PAGES } from "../src/lib/pageBlocks.js";
import { FORM_SCHEMA } from "../src/lib/blockForms.js";
import { CAREER_FORM } from "../src/lib/careersForm.js";
import { FIELD_PRESENTATION, BLOCK_LABELS, OMIT, RESERVED_FIELDS } from "../src/lib/presentation.js";

const blockTypes = BLOCK_MANIFEST.map((b) => b.type);
const formNames = (t: string) => FORM_SCHEMA[t].fields.map((f) => f.name);

test("catálogo y formularios cubren los 19 bloques del manifiesto", () => {
  assert.equal(BLOCK_MANIFEST.length, 19);
  assert.deepEqual(Object.keys(BLOCK_CATALOG).sort(), [...blockTypes].sort());
  assert.deepEqual(Object.keys(FORM_SCHEMA).sort(), [...blockTypes].sort());
  for (const t of blockTypes) assert.ok(BLOCK_LABELS[t], `falta etiqueta humana para "${t}"`);
});

test("se corrigen los descuadres histórico de formularios (variant/align)", () => {
  // Antes el panel no exponía estos campos aunque el sitio sí los tenía.
  assert.ok(formNames("hero").includes("variant"), "hero debe exponer variant");
  assert.ok(formNames("featureGrid").includes("align"), "featureGrid debe exponer align");
});

test("el catálogo deriva required/optional del esquema (no a mano)", () => {
  // hero: solo heading es obligatorio; el resto opcional (sin hidden/anchor).
  assert.deepEqual(BLOCK_CATALOG.hero.required, ["heading"]);
  assert.ok(BLOCK_CATALOG.hero.optional.includes("variant"));
  assert.ok(!BLOCK_CATALOG.hero.optional.includes("hidden"));
  // leadForm: todo su texto es editable y TODO es opcional — una página que no
  // traiga estos campos (p.ej. el formulario embebido en una carrera) sigue
  // valiendo y el componente pone su texto por defecto.
  assert.deepEqual(BLOCK_CATALOG.leadForm.required, []);
  for (const f of ["heading", "bullets", "nameStep", "timingOptions", "success"]) {
    assert.ok(BLOCK_CATALOG.leadForm.optional.includes(f), `leadForm debe exponer "${f}"`);
  }
});

test("careerShowcase.tabs.modalidades es lista de enum, no array de objetos", () => {
  const tabs = BLOCK_MANIFEST.find((b) => b.type === "careerShowcase")!.fields.find((f) => f.name === "tabs");
  const modalidades = tabs?.item?.find((f) => f.name === "modalidades");
  assert.equal(modalidades?.kind, "stringlist");
  assert.deepEqual(modalidades?.options, ["En línea", "Dual", "Híbrida"]);
  const tabsField = FORM_SCHEMA.careerShowcase.fields.find((f) => f.name === "tabs");
  const formModalidades = tabsField?.item?.find((f) => f.name === "modalidades");
  assert.equal(formModalidades?.type, "tags");
  assert.deepEqual(formModalidades?.options, ["En línea", "Dual", "Híbrida"]);
});

test("los enums del esquema llegan como opciones de select", () => {
  const bg = FORM_SCHEMA.hero.fields.find((f) => f.name === "background");
  assert.deepEqual(bg?.options, ["brand", "dark"]);
  const cols = FORM_SCHEMA.stats.fields.find((f) => f.name === "columns");
  assert.deepEqual(cols?.options, ["auto", "2", "3", "4", "5", "6"]);
  const side = FORM_SCHEMA.hero.fields.find((f) => f.name === "imageSide");
  assert.deepEqual(side?.options, ["left", "right"]);
});

test("ningún campo de formulario sale sin etiqueta", () => {
  const walk = (fields: { name: string; label: string; item?: any[]; variants?: any[] }[], where: string) => {
    for (const f of fields) {
      assert.ok(f.label && f.label.length > 0, `campo sin etiqueta en ${where}.${f.name}`);
      if (f.item) walk(f.item, `${where}.${f.name}`);
      if (f.variants) for (const v of f.variants) walk(v.fields, `${where}.${f.name}.${v.value}`);
    }
  };
  for (const t of blockTypes) walk(FORM_SCHEMA[t].fields, t);
  walk(CAREER_FORM.fields, "career");
});

test("la presentación cubre cada campo del manifiesto (guarda contra drift)", () => {
  // Si se agrega un campo en blocks.ts y se regenera, este test falla hasta que
  // alguien le ponga su etiqueta en español → no se publica un campo sin nombre.
  const missing: string[] = [];
  const check = (fields: typeof BLOCK_MANIFEST[number]["fields"], prefix: string) => {
    for (const mf of fields) {
      if (RESERVED_FIELDS.has(mf.name)) continue;
      const path = `${prefix}.${mf.name}`;
      if (OMIT.has(path)) continue;
      // Array de UNIÓN (p.ej. richContent.items): sus campos viven bajo
      // "<bloque>.<kind>", así que se revisan por variante más abajo.
      if ((mf as any).variants) {
        if (FIELD_PRESENTATION[path]?.label) { /* la lista tiene etiqueta propia */ }
        for (const v of (mf as any).variants) check(v.fields, `${prefix}.${v.value}`);
        continue;
      }
      if (mf.kind === "array" && (!mf.item || mf.item.length === 0)) continue; // p.ej. titulacion
      if (!FIELD_PRESENTATION[path]?.label) missing.push(path);
      if (mf.item) check(mf.item, path);
    }
  };
  for (const b of BLOCK_MANIFEST) check(b.fields, b.type);
  check(CAREER_MANIFEST, "career");
  assert.deepEqual(missing, [], `faltan etiquetas de presentación para: ${missing.join(", ")}`);
});

test("PAGES y las carreras se derivan del contenido (codegen), no a mano", () => {
  assert.equal(Object.keys(PAGES).length, 16, "deben salir 16 páginas del contenido");
  assert.equal(PAGES["oferta"], "Oferta Académica");
  // Las tres secciones institucionales (normativa, investigación y vinculación)
  // son páginas de bloques como cualquier otra: se editan desde el panel.
  assert.equal(PAGES["normativa"], "Normativa y transparencia");
  assert.equal(PAGES["investigacion"], "Investigación e innovación");
  assert.equal(PAGES["vinculacion"], "Vinculación con la sociedad");
  // La política de privacidad también es una página de bloques: su texto legal
  // se corrige desde el panel, sin tocar código.
  assert.equal(PAGES["politica-de-privacidad"], "Política de privacidad y cookies");
  assert.equal(PAGES["rendicion-de-cuentas"], "Rendición de Cuentas");
  // La 404 también es una página de bloques: su copia se edita desde el panel
  // en vez de estar escrita dentro del .astro.
  assert.equal(PAGES["404"], "Página no encontrada");
  // El panel LEE las carreras del repo (ya puede crearlas), así que el manifiesto
  // solo es la semilla; lo que se comprueba aquí es que el codegen la derive.
  assert.equal(CAREER_LIST.length, 6, "deben salir 6 carreras del contenido");
  assert.equal(CAREER_LIST.find((c) => c.slug === "administracion-empresas")?.label, "Administración");
});

test("el formulario de carrera omite el slug y conserva la malla anidada", () => {
  const names = CAREER_FORM.fields.map((f) => f.name);
  assert.ok(!names.includes("slug"), "el slug no debe editarse desde el panel");
  const malla = CAREER_FORM.fields.find((f) => f.name === "malla");
  assert.equal(malla?.type, "object");
  assert.deepEqual(malla?.item?.map((f) => f.name), ["intro", "ejes", "periodos"]);
  assert.equal(CAREER_FORM.fields.find((f) => f.name === "egreso")?.type, "textlist");
});
