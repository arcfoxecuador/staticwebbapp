// Búsqueda global de contenido: emparejamiento puro (matchDocs), sin GitHub.
// El endpoint y la UI se cubren en el E2E; aquí se prueban la insensibilidad a
// acentos/mayúsculas, el fragmento con elipsis y los bordes (min. de caracteres,
// límite de resultados).

import { test } from "node:test";
import assert from "node:assert/strict";

import { matchDocs, type IndexDoc } from "../src/lib/search.js";

const DOCS: IndexDoc[] = [
  { type: "page", slug: "estudiantes", title: "Estudiantes", haystack: "Información sobre becas y ayudas económicas para estudiar" },
  { type: "career", slug: "ingenieria", title: "Ingeniería en Software", haystack: "Malla, aranceles y perfil de egreso del programa" },
  { type: "post", slug: "bienvenida", title: "Bienvenida", haystack: "Un texto normal sin términos particulares" },
];

test("matchDocs encuentra por CONTENIDO, no solo por título", () => {
  const r = matchDocs(DOCS, "becas");
  assert.equal(r.length, 1);
  assert.equal(r[0].slug, "estudiantes");
  assert.equal(r[0].type, "page");
});

test("matchDocs encuentra por TÍTULO", () => {
  const r = matchDocs(DOCS, "ingeniería");
  assert.equal(r.length, 1);
  assert.equal(r[0].slug, "ingenieria");
});

test("matchDocs es insensible a mayúsculas y acentos", () => {
  assert.equal(matchDocs(DOCS, "INFORMACION").length, 1); // sin tilde, en mayúsculas
  assert.equal(matchDocs(DOCS, "económicas")[0]?.slug, "estudiantes");
});

test("matchDocs devuelve un fragmento con la coincidencia", () => {
  const r = matchDocs(DOCS, "aranceles");
  assert.match(r[0].snippet, /aranceles/);
});

test("matchDocs ignora consultas de menos de 2 caracteres", () => {
  assert.deepEqual(matchDocs(DOCS, "b"), []);
  assert.deepEqual(matchDocs(DOCS, " "), []);
});

test("matchDocs respeta el límite de resultados", () => {
  const many: IndexDoc[] = Array.from({ length: 10 }, (_, i) => ({ type: "post", slug: `p${i}`, title: `Nota ${i}`, haystack: "contiene la palabra beca repetida" }));
  assert.equal(matchDocs(many, "beca", 3).length, 3);
});

test("matchDocs no devuelve documentos sin coincidencia", () => {
  assert.deepEqual(matchDocs(DOCS, "xyzzy"), []);
});
