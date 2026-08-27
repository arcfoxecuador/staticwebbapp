// Esquema de la guía de marca: normaliza hacia adelante, valida medidas de
// imagen y trae un borrador por defecto usable.

import { test } from "node:test";
import assert from "node:assert/strict";

import { brandSchema, DEFAULT_BRAND, IMAGE_SIZES } from "../src/lib/brandSchema.js";

test("DEFAULT_BRAND es un borrador válido y completo", () => {
  const b = brandSchema.parse(DEFAULT_BRAND);
  assert.ok(b.voice.tone.length > 0);
  assert.ok(b.voice.do.length >= 1 && b.voice.dont.length >= 1);
  assert.ok(b.valueProps.length >= 1);
  assert.ok(b.imageGuide.length >= 1);
});

test("todas las medidas del imageGuide por defecto son válidas", () => {
  for (const slot of DEFAULT_BRAND.imageGuide) {
    assert.ok((IMAGE_SIZES as readonly string[]).includes(slot.size), `medida inválida: ${slot.size}`);
    assert.ok(slot.use.length > 0);
  }
});

test("rellena valores faltantes con defaults (normalización hacia adelante)", () => {
  const b = brandSchema.parse({});
  assert.equal(typeof b.voice.tone, "string");
  assert.deepEqual(b.valueProps, []);
  assert.deepEqual(b.imageGuide, []);
});

test("DEFAULT_BRAND trae el perfil completo (identidad, oferta, personas, CTAs)", () => {
  const b = DEFAULT_BRAND;
  assert.ok(b.identity.legalName.length > 0);
  assert.ok(b.offering.modality.length > 0);
  assert.ok(b.personas.length >= 1 && b.personas[0].name.length > 0);
  assert.ok(b.differentiators.length >= 1);
  assert.ok(b.terminology.length >= 1 && b.terminology[0].prefer.length > 0);
  assert.ok(b.ctas.length >= 1 && b.ctas[0].label.length > 0);
  assert.ok(b.seoKeywords.length >= 1);
  assert.ok(b.compliance.length >= 1);
});

test("un JSON antiguo (sin las secciones nuevas) sigue siendo válido", () => {
  const b = brandSchema.parse({ voice: { tone: "x" }, mission: "m", rules: ["r"] });
  assert.deepEqual(b.personas, []);
  assert.deepEqual(b.ctas, []);
  assert.equal(b.identity.country, "");
  assert.deepEqual(b.offering.programAreas, []);
});

test("una persona sin nombre o un CTA sin etiqueta son rechazados", () => {
  assert.throws(() => brandSchema.parse({ personas: [{ name: "", description: "x" }] }));
  assert.throws(() => brandSchema.parse({ ctas: [{ label: "", when: "x" }] }));
});

test("una medida de imagen desconocida es rechazada", () => {
  assert.throws(() => brandSchema.parse({ imageGuide: [{ use: "x", size: "gigante" }] }));
});

test("un slot de imagen sin 'use' es rechazado", () => {
  assert.throws(() => brandSchema.parse({ imageGuide: [{ use: "", size: "wide" }] }));
});
