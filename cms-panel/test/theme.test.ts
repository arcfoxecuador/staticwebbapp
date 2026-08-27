// Tests del esquema del tema (themeSchema). Cubre el bloque tracking: el Project ID
// de Microsoft Clarity (alfanumérico) y el ID del Meta Pixel (solo dígitos). Ambos
// rechazan símbolos/mayúsculas —que podrían inyectar scripts en el <head>— y el
// bloque entero es opcional para no romper temas viejos.

import { test } from "node:test";
import assert from "node:assert/strict";

import { themeSchema } from "../src/lib/themeSchema.js";

const baseTheme = {
  themeId: "default",
  colors: { ink: "#01154a", cloud: "#f4f6fb", accent: [{ color: "#3a4fe3", at: 0 }, { color: "#f0617e", at: 100 }] },
  promoBanner: { enabled: false },
  seasonal: { effect: "none" as const },
};

test("acepta un Project ID de Clarity válido", () => {
  const t = themeSchema.parse({ ...baseTheme, tracking: { clarityId: "xjb3c8v9s9" } });
  assert.equal(t.tracking?.clarityId, "xjb3c8v9s9");
});

test("el bloque tracking es opcional (temas viejos siguen validando)", () => {
  assert.doesNotThrow(() => themeSchema.parse(baseTheme));
});

test("clarityId vacío es válido (desactiva Clarity)", () => {
  const t = themeSchema.parse({ ...baseTheme, tracking: { clarityId: "" } });
  assert.equal(t.tracking?.clarityId, "");
});

test("rechaza un clarityId con símbolos o mayúsculas (evita inyección en el <head>)", () => {
  for (const bad of ['abc"><script>', "ABC-123", "id con espacios", "x".repeat(21)]) {
    assert.throws(() => themeSchema.parse({ ...baseTheme, tracking: { clarityId: bad } }), /Clarity/);
  }
});

test("acepta un ID de Meta Pixel válido y también vacío (lo desactiva)", () => {
  const t = themeSchema.parse({ ...baseTheme, tracking: { metaPixelId: "1806601677174645" } });
  assert.equal(t.tracking?.metaPixelId, "1806601677174645");
  assert.equal(themeSchema.parse({ ...baseTheme, tracking: { metaPixelId: "" } }).tracking?.metaPixelId, "");
});

test("rechaza un metaPixelId que no sea solo dígitos (evita inyección en el <head>)", () => {
  for (const bad of ["18066016771746a5", "'});alert(1);//", "180 660 167", "1".repeat(21)]) {
    assert.throws(() => themeSchema.parse({ ...baseTheme, tracking: { metaPixelId: bad } }), /Meta Pixel/);
  }
});
