// Evaluadores de calidad.
//
// CONTROL NEGATIVO: cada evaluador se prueba con texto que DEBE pasar y con
// texto que DEBE fallar. Sin el segundo caso, un evaluador que devolviera
// siempre `ok: true` daría 100% en las evals y nadie se enteraría — que es el
// modo de fallo clásico de un arnés de evaluación.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  gradeRouter, gradeSinCompetencia, gradeSinMayusculas, gradeSinExclamaciones,
  gradeSinEmojis, gradeSinPromesas, gradeLongitud, gradeCierraConCTA,
  gradeCategoriaValida, gradeSinInyeccion, gradeTerminologia, gradeSinEnlacesForaneos,
  buildReport, formatReport,
} from "../src/lib/evals/graders.js";
import { ROUTER_CASES, INJECTION_CASES, CONTENT_CASES } from "./evals/dataset.js";

// ── Router ──────────────────────────────────────────────────────────────────

test("router: acierto y fallo", () => {
  assert.equal(gradeRouter("page", "page").ok, true);
  assert.equal(gradeRouter("page", "blog").ok, false);
});

test("router: adivinar en un pedido ambiguo se marca como grave", () => {
  const g = gradeRouter("unclear", "blog");
  assert.equal(g.ok, false);
  assert.match(g.detalle, /ADIVINÓ/, "el fallo caro debe distinguirse de un error normal");
});

// ── Reglas de marca ─────────────────────────────────────────────────────────

test("competencia: detecta la marca ajena y deja pasar el texto limpio", () => {
  assert.equal(gradeSinCompetencia("Estudia en IIDEA", ["Instituto Rival"]).ok, true);
  assert.equal(gradeSinCompetencia("mejor que Instituto Rival", ["Instituto Rival"]).ok, false);
});

test("mayúsculas: permite siglas y atrapa el grito", () => {
  assert.equal(gradeSinMayusculas("IIDEA usa IA aplicada").ok, true, "las siglas no son grito");
  const g = gradeSinMayusculas("INSCRÍBETE AHORA MISMO");
  assert.equal(g.ok, false);
  assert.match(g.detalle, /INSCR/);
});

test("exclamaciones: una pasa, varias o dobles no", () => {
  assert.equal(gradeSinExclamaciones("Empieza este mes!").ok, true);
  assert.equal(gradeSinExclamaciones("Increíble!!").ok, false);
  assert.equal(gradeSinExclamaciones("Ya! Hoy! Ahora! Corre!").ok, false);
});

test("emojis: prohibidos en copia institucional", () => {
  assert.equal(gradeSinEmojis("Estudia en línea").ok, true);
  assert.equal(gradeSinEmojis("Estudia en línea 🚀").ok, false);
});

test("promesas: atrapa la garantía de empleo y deja pasar el apoyo", () => {
  assert.equal(gradeSinPromesas("Te acompañamos en tu búsqueda de empleo").ok, true);
  assert.equal(gradeSinPromesas("Ofrecemos empleo garantizado al graduarte").ok, false);
  assert.equal(gradeSinPromesas("Te garantizamos el empleo").ok, false);
});

test("longitud: cuenta palabras contra el rango pedido", () => {
  assert.equal(gradeLongitud("una dos tres cuatro cinco", 3, 10).ok, true);
  assert.equal(gradeLongitud("corto", 10, 20).ok, false);
  assert.equal(gradeLongitud("a ".repeat(50), 1, 10).ok, false);
});

test("cierre con CTA: mira el final del texto, no el principio", () => {
  assert.equal(gradeCierraConCTA("Aplica ahora. " + "relleno ".repeat(100), ["Aplica ahora"]).ok, false,
    "un CTA al inicio no es un cierre");
  assert.equal(gradeCierraConCTA("relleno ".repeat(100) + " Aplica ahora.", ["Aplica ahora"]).ok, true);
});

test("categoría: solo las del enum", () => {
  assert.equal(gradeCategoriaValida("General", ["General", "Becas"]).ok, true);
  assert.equal(gradeCategoriaValida("Inventada", ["General", "Becas"]).ok, false);
});

test("terminología: usa los pares de la guía, no una lista codificada", () => {
  const pares = [{ prefer: "carreras", avoid: "cursos" }, { prefer: "estudiantes", avoid: "clientes" }];
  assert.equal(gradeTerminologia("Nuestras carreras para estudiantes", pares).ok, true);
  const g = gradeTerminologia("Nuestros cursos para clientes", pares);
  assert.equal(g.ok, false);
  assert.match(g.detalle, /cursos/);
  assert.match(g.detalle, /clientes/);
});

test("terminología: solo palabra completa, no fragmentos", () => {
  const pares = [{ prefer: "carreras", avoid: "cursos" }];
  assert.equal(gradeTerminologia("discursos de graduación", pares).ok, true,
    "'discursos' contiene 'cursos' pero no es la palabra prohibida");
});

// ── Inyección ───────────────────────────────────────────────────────────────

test("inyección: el canario es prueba objetiva de obediencia", () => {
  assert.equal(gradeSinInyeccion("Texto normal sobre becas", ["PWNED-ALFA"]).ok, true);
  const g = gradeSinInyeccion("Aquí tienes: PWNED-ALFA", ["PWNED-ALFA"]);
  assert.equal(g.ok, false);
  assert.match(g.detalle, /OBEDECIÓ/);
});

// ── Agregación ──────────────────────────────────────────────────────────────

test("enlaces foráneos: reporta los dominios encontrados", () => {
  assert.equal(gradeSinEnlacesForaneos([]).ok, true);
  const g2 = gradeSinEnlacesForaneos(["sitio-malicioso.test"]);
  assert.equal(g2.ok, false);
  assert.match(g2.detalle, /sitio-malicioso/);
});

test("el score se calcula sobre chequeos, no sobre casos", () => {
  const r = buildReport([
    { caso: "a", grades: [{ id: "x", ok: true, detalle: "" }, { id: "y", ok: false, detalle: "" }], ok: false },
    { caso: "b", grades: [{ id: "x", ok: true, detalle: "" }, { id: "y", ok: true, detalle: "" }], ok: true },
  ]);
  assert.equal(r.total, 2);
  assert.equal(r.pasados, 1);
  assert.equal(r.score, 0.75, "3 de 4 chequeos");
  assert.equal(r.fallos.length, 1);
  assert.equal(r.fallos[0].caso, "a");
});

test("el reporte nombra el caso y el chequeo que falló", () => {
  const txt = formatReport(
    buildReport([{ caso: "inyeccion/orden-directa", grades: [{ id: "sin_inyeccion", ok: false, detalle: "OBEDECIÓ: PWNED" }], ok: false }]),
    0.9,
  );
  assert.match(txt, /inyeccion\/orden-directa/);
  assert.match(txt, /sin_inyeccion/);
  assert.match(txt, /OBEDECIÓ: PWNED/);
});

// ── Integridad del conjunto dorado ──────────────────────────────────────────

test("el conjunto dorado cubre los tres ejes y no tiene ids repetidos", () => {
  assert.ok(ROUTER_CASES.length >= 10, "el router es el eval más barato: no lo dejes corto");
  assert.ok(INJECTION_CASES.length >= 5);
  assert.ok(CONTENT_CASES.length >= 2);

  const ids = [...ROUTER_CASES, ...INJECTION_CASES, ...CONTENT_CASES].map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "hay ids duplicados en el conjunto dorado");
});

test("el router incluye casos ambiguos: adivinar es el fallo caro", () => {
  const ambiguos = ROUTER_CASES.filter((c) => c.esperado === "unclear");
  assert.ok(ambiguos.length >= 3, `solo ${ambiguos.length} casos ambiguos`);
});

test("cada caso dorado explica por qué existe", () => {
  for (const c of [...ROUTER_CASES, ...INJECTION_CASES, ...CONTENT_CASES]) {
    assert.ok(c.porque && c.porque.length > 15, `el caso "${c.id}" no dice por qué importa`);
  }
});

test("cada caso de inyección lleva al menos un canario comprobable", () => {
  for (const c of INJECTION_CASES) {
    assert.ok(c.canarios.length > 0, `"${c.id}" no tiene canario: su resultado no sería verificable`);
  }
});
