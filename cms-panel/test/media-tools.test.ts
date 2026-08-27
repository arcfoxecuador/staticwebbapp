// Herramientas de MEDIOS del asistente: la carpeta de destino se valida ANTES de
// cualquier trabajo de red (generación/descarga), así que una carpeta inválida se
// rechaza sin gastar una llamada — y sin permitir escapes de directorio.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildMediaTools } from "../src/agents/mediaTools.js";
import type { RunContext } from "../src/agents/context.js";

function fakeCtx(): RunContext {
  return {
    branch: "main",
    emit: () => {},
    staged: new Map() as RunContext["staged"],
    actions: [],
    stage: () => {},
    readStaged: () => undefined as ReturnType<RunContext["readStaged"]>,
    // El doble debe implementar RunContext ENTERO: si una herramienta empieza a
    // anotar el sha base, esta prueba tiene que compilar o reventar aquí, no en
    // ejecución.
    noteBase: () => {},
    baseShas: new Map(),
  };
}

function tool(name: string) {
  const t = buildMediaTools(fakeCtx()).find((x) => x.name === name);
  if (!t) throw new Error(`no existe la herramienta ${name}`);
  return t as unknown as {
    run: (input: unknown) => Promise<string>;
    // Lo que realmente viaja al modelo: el JSON Schema de la herramienta.
    input_schema: { properties: Record<string, unknown>; required?: string[] };
  };
}

// Carpetas que siguen siendo inválidas TRAS normalizar (minúsculas + trim):
// espacios, barras, puntos y traversal. (MAYÚSCULAS o espacios al borde se
// normalizan a válidas a propósito, así que no van aquí.)
const BAD = ["carpeta mala", "../etc", "carreras/sub", "a/b", "..", "con.punto", "/abs", "a_b"];

test("generate_image rechaza carpetas inválidas antes de generar", async () => {
  for (const folder of BAD) {
    await assert.rejects(
      () => tool("generate_image").run({ prompt: "x", filename: "y", folder }),
      /inválida/i,
      `debería rechazar la carpeta "${folder}"`,
    );
  }
});

test("import_image_from_url rechaza carpetas inválidas antes de descargar", async () => {
  for (const folder of BAD) {
    await assert.rejects(
      () => tool("import_image_from_url").run({ url: "https://x/y.png", filename: "y", folder }),
      /inválida/i,
      `debería rechazar la carpeta "${folder}"`,
    );
  }
});

// Accesibilidad: una imagen sin texto alternativo desaparece para quien usa un
// lector de pantalla. Como la biblioteca son archivos en git (sin base de datos
// donde guardar el alt), el único momento fiable para pedirlo es al crear la
// imagen — y por eso el campo NO puede volverse opcional.
for (const name of ["generate_image", "import_image_from_url"]) {
  test(`${name} exige el texto alternativo`, () => {
    const schema = tool(name).input_schema;
    assert.ok(schema.properties.alt, `${name} debe pedir un 'alt'`);
    assert.ok(
      schema.required?.includes("alt"),
      `el 'alt' de ${name} debe ser obligatorio, no opcional`,
    );
  });
}
