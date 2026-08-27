import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePostMarkdown, serializePost, assertSlug, postPath } from "../src/lib/posts.js";
import { BLOG_CATEGORIES, assertCategory, slugify } from "../src/lib/markdown.js";

// Frontmatter en el formato real de los .md del repo (strings citadas, fecha
// sin citar, boolean y array JSON).
const SAMPLE = `---
title: "Abierta la nueva admisión: empieza este mes, no en seis"
cat: "${BLOG_CATEGORIES[0]}"
date: 2026-06-12
excerpt: "Con varias fechas de inicio al año, no esperas un semestre para comenzar."
img: "/news/2.png"
draft: false
author: "Equipo IIDEA"
tags: ["admisiones", "fechas de inicio"]
---

Cuerpo de la nota en **Markdown**.

## Sección

Texto final.
`;

test("parsePostMarkdown lee el frontmatter real del repo", () => {
  const post = parsePostMarkdown("mi-nota", SAMPLE);
  assert.equal(post.slug, "mi-nota");
  assert.equal(post.title, "Abierta la nueva admisión: empieza este mes, no en seis");
  assert.equal(post.cat, BLOG_CATEGORIES[0]);
  assert.equal(post.date, "2026-06-12");
  assert.equal(post.img, "/news/2.png");
  assert.equal(post.draft, false);
  assert.equal(post.author, "Equipo IIDEA");
  assert.deepEqual(post.tags, ["admisiones", "fechas de inicio"]);
  assert.ok(post.body.startsWith("Cuerpo de la nota"));
  assert.ok(post.body.includes("## Sección"));
});

test("serializePost → parsePostMarkdown es un ciclo estable (roundtrip)", () => {
  const post = parsePostMarkdown("mi-nota", SAMPLE);
  const md = serializePost(post);
  const again = parsePostMarkdown("mi-nota", md);
  assert.deepEqual(again, post);
  // Y volver a serializar produce exactamente el mismo archivo.
  assert.equal(serializePost(again), md);
});

test("parsePostMarkdown normaliza fechas tipo ISO largo", () => {
  const md = SAMPLE.replace("date: 2026-06-12", "date: 2026-06-12T00:00:00.000Z");
  assert.equal(parsePostMarkdown("x", md).date, "2026-06-12");
});

test("parsePostMarkdown rechaza contenido sin frontmatter", () => {
  assert.throws(() => parsePostMarkdown("x", "Sin frontmatter"), /frontmatter/);
});

test("la membresía de categoría se valida al guardar (lista viva), no al leer", () => {
  // Leer una entrada con una categoría retirada no debe romper el listado…
  const md = SAMPLE.replace(`cat: "${BLOG_CATEGORIES[0]}"`, 'cat: "Categoría Retirada"');
  assert.doesNotThrow(() => parsePostMarkdown("x", md));
  // …pero guardar con una categoría fuera de la lista viva sí se rechaza.
  assert.throws(() => assertCategory("Categoría Retirada", BLOG_CATEGORIES), /Categoría desconocida/);
});

test("assertSlug solo acepta slugs de archivo seguros", () => {
  assertSlug("mi-nota-2026");
  assert.throws(() => assertSlug("../secreto"), /inválido/);
  assert.throws(() => assertSlug("a/b"), /inválido/);
  assert.throws(() => assertSlug("Mayúsculas"), /inválido/);
  assert.throws(() => assertSlug(""), /inválido/);
});

test("postPath apunta a la colección del blog", () => {
  assert.equal(postPath("mi-nota"), "src/content/articulos/mi-nota.md");
});

test("imgAlt viaja en el frontmatter (accesibilidad de la portada)", () => {
  const post = parsePostMarkdown("mi-nota", SAMPLE);
  const withAlt = { ...post, imgAlt: "Estudiante frente a una laptop en un campus virtual" };
  const md = serializePost(withAlt);
  assert.match(md, /imgAlt: "Estudiante frente/);
  const again = parsePostMarkdown("mi-nota", md);
  assert.equal(again.imgAlt, withAlt.imgAlt);
  // Sin alt no se escribe la línea (el sitio usa el título como respaldo).
  assert.ok(!serializePost(post).includes("imgAlt:"));
});

// El slug es la URL pública de la nota. Cortarlo a ciegas en 60 caracteres dejaba
// direcciones partidas a mitad de palabra ("...da-el-salto-a-un-mej"), que se ven
// rotas en Google y al compartirlas por WhatsApp.
test("slugify recorta por palabra completa, nunca a mitad de una", () => {
  const largo = slugify(
    "Becas IIDEA: estudia tu carrera online y da el salto a un mejor empleo este año",
  );
  assert.ok(largo.length <= 60, `el slug no debe pasar de 60: ${largo}`);
  assert.ok(!largo.endsWith("-"), "no debe terminar en guion");
  // Cada trozo debe ser una palabra entera del título original.
  const palabras = new Set(
    "becas iidea estudia tu carrera online y da el salto a un mejor empleo este ano".split(" "),
  );
  for (const p of largo.split("-")) {
    assert.ok(palabras.has(p), `"${p}" es un fragmento, no una palabra del título`);
  }
});

test("slugify normaliza acentos, mayúsculas y signos", () => {
  assert.equal(slugify("Admisión: ¡empieza este mes!"), "admision-empieza-este-mes");
  assert.equal(slugify("  Guía  de   IA  "), "guia-de-ia");
});

test("slugify corta igual si una sola palabra ya pasa del límite", () => {
  const s = slugify("a".repeat(80));
  assert.equal(s.length, 60, "sin guiones donde cortar, se recorta a 60");
});
