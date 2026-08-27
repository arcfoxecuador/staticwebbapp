// Crear una carrera desde el panel escribe un JSON que el build del sitio tiene
// que aceptar. Si a la plantilla le falta un campo obligatorio, el commit rompe
// la web entera — así que la plantilla se valida aquí contra el mismo manifiesto
// que usa la ruta, y se comprueba que nace invisible.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newCareer, careerPath } from "../src/lib/careersForm.js";
import { CAREER_MANIFEST } from "../src/generated/schema-manifest.js";
import { validateFields } from "../src/lib/manifestValidate.js";

test("la plantilla de carrera nueva pasa la validación del manifiesto", () => {
  const data = newCareer("contabilidad", "Contabilidad");
  assert.doesNotThrow(() => validateFields('La carrera "Contabilidad"', CAREER_MANIFEST, data));
});

test("la plantilla trae TODOS los campos obligatorios del esquema", () => {
  const data = newCareer("contabilidad", "Contabilidad");
  const faltan = CAREER_MANIFEST.filter((f) => f.required && !(f.name in data)).map((f) => f.name);
  assert.deepEqual(faltan, [], `faltan campos obligatorios: ${faltan.join(", ")}`);
});

test("nace oculta y como próximamente (nadie la ve a medio llenar)", () => {
  const data = newCareer("contabilidad", "Contabilidad");
  assert.equal(data.hidden, true);
  assert.equal(data.proximamente, true);
});

test("el slug del archivo es el que se pide, no el título", () => {
  const data = newCareer("contabilidad", "Contabilidad");
  assert.equal(data.slug, "contabilidad");
  assert.equal(careerPath("contabilidad"), "src/content/careers/contabilidad.json");
});

test("el título del usuario llega al documento y al título oficial", () => {
  const data = newCareer("gestion-ambiental", "Gestión Ambiental");
  assert.equal(data.title, "Gestión Ambiental");
  assert.match(String(data.titulo), /Gestión Ambiental/);
});

test("un campo con el tipo equivocado sí es rechazado (la barrera funciona)", () => {
  const data = { ...newCareer("contabilidad", "Contabilidad"), creditos: {} };
  assert.throws(() => validateFields('La carrera "Contabilidad"', CAREER_MANIFEST, data));
});
