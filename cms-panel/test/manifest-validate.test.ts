// Validación de TIPOS contra el manifiesto. El riesgo aquí no es solo dejar
// pasar basura: es RECHAZAR contenido que hoy está publicado y funciona. Por eso
// los casos válidos vienen del contenido real del sitio.
import { test } from "node:test";
import assert from "node:assert/strict";

import { validateFields, validateRequired } from "../src/lib/manifestValidate.js";
import { CAREER_MANIFEST, BLOCK_MANIFEST } from "../src/generated/schema-manifest.js";
import { validateBlock } from "../src/lib/pageBlocks.js";

const statsFields = BLOCK_MANIFEST.find((b) => b.type === "stats")!.fields;
const gridFields = BLOCK_MANIFEST.find((b) => b.type === "featureGrid")!.fields;

// ── Enums mixtos: el caso que rompería el sitio si se validara "de oído" ─────
test("stats.columns acepta el NÚMERO y 'auto' (como el Zod del sitio), no el texto", () => {
  // El Zod real es union(["auto", 2, 3, 4, 5, 6]); el contenido publicado usa 3.
  validateFields("stats", statsFields, { columns: 3 });
  validateFields("stats", statsFields, { columns: "auto" });
  assert.throws(() => validateFields("stats", statsFields, { columns: "3" }), /sin comillas/);
});

test("featureGrid.columns es numérico puro: '4' en texto se rechaza", () => {
  validateFields("grid", gridFields, { columns: 4 });
  assert.throws(() => validateFields("grid", gridFields, { columns: "4" }), /admite/);
  assert.throws(() => validateFields("grid", gridFields, { columns: 9 }), /admite/);
});

test("los enums de texto siguen funcionando", () => {
  validateFields("stats", statsFields, { anchor: "metricas", hidden: true });
  assert.throws(() => validateFields("stats", statsFields, { hidden: "sí" }), /true o false/);
});

// ── Carreras: el documento que se commiteaba sin ninguna validación ──────────
test("carrera: asignaturas debe ser número, no texto", () => {
  validateFields("carrera", CAREER_MANIFEST, { asignaturas: 20 });
  assert.throws(() => validateFields("carrera", CAREER_MANIFEST, { asignaturas: "20" }), /número sin comillas/);
});

test("carrera: las listas de texto rechazan un string suelto", () => {
  validateFields("carrera", CAREER_MANIFEST, { egreso: ["a", "b"] });
  assert.throws(() => validateFields("carrera", CAREER_MANIFEST, { egreso: "a, b" }), /lista de textos/);
});

test("carrera: un parche parcial es válido (no exige los obligatorios)", () => {
  validateFields("carrera", CAREER_MANIFEST, { title: "Nuevo título" });
  assert.throws(() => validateRequired("carrera", CAREER_MANIFEST, { title: "x" }), /obligatorio/);
});

test("validateFields ignora campos que el manifiesto no conoce", () => {
  validateFields("carrera", CAREER_MANIFEST, { campoInventado: 123 });
});

// ── Integración con validateBlock ───────────────────────────────────────────
test("careerShowcase.tabs.modalidades acepta los strings del enum, no objetos", () => {
  const ok = {
    _type: "careerShowcase",
    tabs: [{ label: "En línea", modalidades: ["En línea", "Híbrida"] }],
  };
  validateBlock({ ...ok });
  assert.throws(
    () => validateBlock({ ...ok, tabs: [{ label: "En línea", modalidades: [{ name: "En línea" }] }] }),
    /lista de textos/,
  );
  assert.throws(
    () => validateBlock({ ...ok, tabs: [{ label: "En línea", modalidades: ["Presencial"] }] }),
    /admite/,
  );
});

test("validateBlock ahora atrapa el tipo, no solo el nombre del campo", () => {
  const ok = { _type: "stats", items: [{ value: "10", label: "inicios" }], columns: 3 };
  validateBlock({ ...ok });
  assert.throws(() => validateBlock({ ...ok, columns: "3" }), /columns/);
});
