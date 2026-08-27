import { test } from "node:test";
import assert from "node:assert/strict";

import { intakesSchema, normalizeIntakes, intakesPerYear, nextIntake } from "../src/lib/intakesSchema.js";

// Fechas relativas a hoy: el esquema exige que quede al menos una futura, así
// que el test no puede depender de años fijos (caducaría solo).
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const enMeses = (n: number) => {
  const h = new Date();
  return iso(new Date(h.getFullYear(), h.getMonth() + n, 15));
};

test("acepta un calendario válido y conserva la nota", () => {
  const v = intakesSchema.parse({ _note: "documentación", intakes: [enMeses(1), enMeses(2)] });
  assert.equal(v._note, "documentación");
  assert.equal(v.intakes.length, 2);
});

test("rechaza un formato de fecha que no sea AAAA-MM-DD", () => {
  assert.throws(() => intakesSchema.parse({ intakes: ["13/01/2026", enMeses(1)] }), /AAAA-MM-DD/);
});

test("rechaza una fecha que no existe en el calendario", () => {
  assert.throws(() => intakesSchema.parse({ intakes: ["2026-02-31", enMeses(1)] }), /no existe/);
  assert.throws(() => intakesSchema.parse({ intakes: ["2026-13-01", enMeses(1)] }), /no existe/);
});

test("rechaza una lista vacía", () => {
  assert.throws(() => intakesSchema.parse({ intakes: [] }), /al menos una fecha/);
});

test("rechaza fechas repetidas", () => {
  const f = enMeses(1);
  assert.throws(() => intakesSchema.parse({ intakes: [f, f] }), /repetidas/);
});

test("rechaza un calendario en el que ya pasaron todas las fechas", () => {
  // Es el fallo que el esquema existe para impedir: el sitio anunciaría como
  // "próximo inicio" una fecha vencida.
  assert.throws(() => intakesSchema.parse({ intakes: [enMeses(-6), enMeses(-2)] }), /al menos una fecha futura/);
});

test("acepta fechas pasadas mientras quede alguna futura (histórico)", () => {
  const v = intakesSchema.parse({ intakes: [enMeses(-6), enMeses(3)] });
  assert.equal(v.intakes.length, 2);
});

test("normalizeIntakes ordena y quita duplicados", () => {
  const a = enMeses(1), b = enMeses(2), c = enMeses(3);
  const v = normalizeIntakes({ intakes: [c, a, b, a] });
  assert.deepEqual(v.intakes, [a, b, c]);
});

test("intakesPerYear cuenta solo los próximos 12 meses", () => {
  const dates = [enMeses(-2), enMeses(1), enMeses(5), enMeses(11), enMeses(18)];
  assert.equal(intakesPerYear(dates), 3); // excluye la pasada y la de 18 meses
});

test("nextIntake devuelve la primera fecha futura, o null si no queda ninguna", () => {
  assert.equal(nextIntake([enMeses(5), enMeses(2)]), enMeses(2));
  assert.equal(nextIntake([enMeses(-3), enMeses(-1)]), null);
});

test("el intakes.json real del sitio pasa el esquema", async () => {
  // Guarda contra que el archivo del repo se desincronice del validador: si
  // alguien lo edita a mano y rompe el formato, este test lo dice.
  const raw = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../../astro-web/src/config/intakes.json", import.meta.url), "utf8"),
  );
  const parsed = intakesSchema.parse(JSON.parse(raw));
  assert.ok(parsed.intakes.length > 0);
});
