// Tests de multi-tenant (punto 2, slice 1): la identidad del cliente vive en
// client.config.json y alimenta los prompts de los agentes y la taxonomía de blog,
// sin strings de IIDEA incrustados en el código.

import { test } from "node:test";
import assert from "node:assert/strict";

import { config } from "../src/config.js";
import { BLOG_SYSTEM, DESIGN_SYSTEM, PAGE_SYSTEM } from "../src/agents/run.js";
import { blogFrontmatterSchema, assertCategory, BLOG_CATEGORIES } from "../src/lib/markdown.js";

test("los prompts de los agentes se arman desde client.config.json", () => {
  const c = config.client;
  assert.ok(c.orgName.length > 0, "client.orgName no debe estar vacío");
  assert.ok(BLOG_SYSTEM.includes(c.orgName), "el prompt de blog debe nombrar al cliente");
  assert.ok(BLOG_SYSTEM.includes(c.voiceTone), "el prompt de blog debe llevar la voz del cliente");
  assert.ok(DESIGN_SYSTEM.includes(c.orgShort), "el prompt de diseño debe nombrar al cliente");
  assert.ok(PAGE_SYSTEM.includes(c.orgShort), "el prompt de páginas debe nombrar al cliente");
});

test("los presets de temporada del Agente de Diseño salen de client.config.json", () => {
  const presets = config.client.themePresets;
  assert.ok(Array.isArray(presets) && presets.length > 0, "debe haber al menos un preset");
  // Cada preset configurado aparece en el prompt del Agente de Diseño.
  for (const p of presets) {
    assert.ok(DESIGN_SYSTEM.includes(p.id), `el prompt de diseño debe listar el preset "${p.id}"`);
    assert.ok(DESIGN_SYSTEM.includes(p.label), `el prompt de diseño debe listar la etiqueta "${p.label}"`);
    assert.ok(p.accent.length >= 2, `el preset "${p.id}" debe tener ≥2 paradas de acento`);
  }
});

test("las categorías de blog son fuente única (el sitio) y se validan al guardar", () => {
  assert.ok(BLOG_CATEGORIES.length > 0, "deben llegar categorías del manifiesto");
  // La membresía se valida contra la lista VIVA (assertCategory) al crear/editar,
  // no en el esquema: así las categorías editadas desde el panel aplican sin codegen.
  assert.doesNotThrow(() => assertCategory(BLOG_CATEGORIES[0], BLOG_CATEGORIES));
  assert.throws(() => assertCategory("CategoríaInexistente", BLOG_CATEGORIES), /Categoría desconocida/);
});

test("el autor por defecto del blog sale del cliente", () => {
  const fm = blogFrontmatterSchema.parse({ title: "t", cat: BLOG_CATEGORIES[0], date: "2026-01-01", excerpt: "e", img: "/x.png" });
  assert.equal(fm.author, config.client.authorDefault);
});
