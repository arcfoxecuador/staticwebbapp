// El agente no debe PISAR lo que una persona guardó mientras él trabajaba.
//
// Una corrida dura minutos. El panel ya se protege del agente (baseSha + 409),
// pero al revés no había nada: flushRun commiteaba al final sin comparar shas,
// así que el trabajo de la persona desaparecía en silencio del archivo.
import { test } from "node:test";
import assert from "node:assert/strict";

import { createRunContext } from "../src/agents/context.js";

test("noteBase guarda solo la PRIMERA lectura (es la base de toda la corrida)", () => {
  const ctx = createRunContext("main", () => {});
  ctx.noteBase("src/content/pages/home.json", "sha-1");
  // Una segunda lectura del mismo archivo no debe mover la base: lo que el
  // agente editó se construyó sobre la primera.
  ctx.noteBase("src/content/pages/home.json", "sha-2");
  assert.equal(ctx.baseShas.get("src/content/pages/home.json"), "sha-1");
});

test("el contexto registra la base por archivo, de forma independiente", () => {
  const ctx = createRunContext("main", () => {});
  ctx.noteBase("a.json", "sha-a");
  ctx.noteBase("b.json", "sha-b");
  assert.equal(ctx.baseShas.get("a.json"), "sha-a");
  assert.equal(ctx.baseShas.get("b.json"), "sha-b");
  assert.equal(ctx.baseShas.size, 2);
});

test("un archivo leído pero NO editado no participa del control", () => {
  const ctx = createRunContext("main", () => {});
  ctx.noteBase("solo-lectura.json", "sha-x");
  ctx.noteBase("editado.json", "sha-y");
  ctx.stage({ path: "editado.json", content: "{}" }, "editar");
  // flushRun solo compara los que están preparados: mirar los demás produciría
  // conflictos falsos (el agente lee varias páginas para orientarse).
  const aComprobar = [...ctx.baseShas.keys()].filter((p) => ctx.staged.has(p));
  assert.deepEqual(aComprobar, ["editado.json"]);
});
