// Los rótulos de la plantilla de carrera se comparten entre las SEIS carreras:
// un campo vacío deja el mismo hueco seis veces. El esquema es la puerta que
// impide que eso llegue al repo, igual que con el tema o los ajustes del sitio.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { careerLabelsSchema } from "../src/lib/careerLabelsSchema.js";

const REAL = new URL("../../astro-web/src/config/career-labels.json", import.meta.url);
const cargar = async () => JSON.parse(await fs.readFile(REAL, "utf8"));

test("el archivo real del sitio pasa el esquema", async () => {
  const data = await cargar();
  assert.doesNotThrow(() => careerLabelsSchema.parse(data));
});

test("rechaza un rótulo vacío (dejaría un hueco en las seis carreras)", async () => {
  const data = await cargar();
  data.egreso.heading = "   ";
  assert.throws(() => careerLabelsSchema.parse(data), /no puede quedar vacío/);
});

test("rechaza un campo desconocido (evita basura en el JSON del sitio)", async () => {
  const data = await cargar();
  data.inventado = { algo: "x" };
  assert.throws(() => careerLabelsSchema.parse(data));
});

test("rechaza un texto más largo de lo que soporta el diseño", async () => {
  const data = await cargar();
  data.hero.primaryCta = "x".repeat(200);
  assert.throws(() => careerLabelsSchema.parse(data));
});

test("recorta los espacios sobrantes al guardar", async () => {
  const data = await cargar();
  data.malla.titulacion = "  Titulación  ";
  assert.equal(careerLabelsSchema.parse(data).malla.titulacion, "Titulación");
});

test("conserva la nota de aranceles con su HTML (lleva el enlace a becas)", async () => {
  const data = await cargar();
  const out = careerLabelsSchema.parse(data);
  assert.match(out.aranceles.nota, /<a href="\/becas"/);
});

test("están TODOS los grupos que consume la plantilla", async () => {
  const out = careerLabelsSchema.parse(await cargar());
  for (const g of [
    "hero", "campos", "modalidades", "tituloOficial", "pilares", "egreso",
    "malla", "campoOcupacional", "aranceles", "cierre", "noticia",
  ]) {
    assert.ok(g in out, `falta el grupo "${g}"`);
  }
});
