// Tests de edit_list_item (edición de listas a prueba de fallos). La herramienta
// quita/reemplaza/agrega UN ítem sin reenviar el array completo, ubicándolo por
// texto ('match') o índice ('at'), y devuelve el estado resultante para que el
// agente confirme antes de declarar éxito. Se prueba con un RunContext falso
// cuya página ya está "preparada" (staging), así no toca GitHub.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPageTools } from "../src/agents/pageTools.js";
import type { RunContext } from "../src/agents/context.js";

const HOME_PATH = "src/content/pages/home.json";

function fakeCtx(doc: unknown): RunContext {
  const staged = new Map<string, { path: string; content: string }>();
  staged.set(HOME_PATH, { path: HOME_PATH, content: JSON.stringify(doc) });
  return {
    branch: "main",
    emit: () => {},
    staged: staged as RunContext["staged"],
    actions: [],
    stage(change) {
      staged.set(change.path, change as { path: string; content: string });
    },
    readStaged(path) {
      return staged.get(path) as ReturnType<RunContext["readStaged"]>;
    },
    // Control de concurrencia: aquí la página ya viene "preparada", así que la
    // lectura no toca GitHub y nunca se anota una base. Se incluyen para que el
    // doble cumpla el contrato completo de RunContext.
    baseShas: new Map<string, string | null>(),
    noteBase() {},
  };
}

function tool(ctx: RunContext, name: string) {
  const t = buildPageTools(ctx).find((x) => x.name === name);
  if (!t) throw new Error(`no existe la herramienta ${name}`);
  return t as unknown as { run: (input: unknown) => Promise<string> };
}

function stagedDoc(ctx: RunContext): any {
  return JSON.parse(ctx.readStaged(HOME_PATH)!.content);
}

const statsBlock = () => ({
  _type: "stats",
  items: [
    { value: "Cada mes", label: "Nuevas fechas de inicio" },
    { value: "95%", label: "Mejora su empleabilidad" },
    { value: "10", label: "Profesores listos" },
    { value: "100%", label: "Online" },
  ],
});

test("edit_list_item quita el ítem correcto por texto ('match')", async () => {
  const ctx = fakeCtx({ title: "Inicio", blocks: [statsBlock()] });
  const res = await tool(ctx, "edit_list_item").run({
    page: "home",
    index: 0,
    op: "remove",
    match: "Profesores listos",
  });
  const items = stagedDoc(ctx).blocks[0].items;
  assert.equal(items.length, 3, "debe quedar con 3 ítems");
  assert.ok(!items.some((i: any) => i.label === "Profesores listos"), "el ítem borrado no debe seguir");
  // El estado devuelto (verificación) refleja el conteo real.
  assert.match(res, /de 4 a 3 ítems/);
});

test("edit_list_item aborta si el texto coincide con varios (no borra a ciegas)", async () => {
  const ctx = fakeCtx({
    title: "Inicio",
    blocks: [{ _type: "stats", items: [{ value: "1", label: "Online" }, { value: "2", label: "Online síncrono" }] }],
  });
  await assert.rejects(
    () => tool(ctx, "edit_list_item").run({ page: "home", index: 0, op: "remove", match: "Online" }),
    /coincide con varios/,
  );
  // No debe haber tocado la lista.
  assert.equal(stagedDoc(ctx).blocks[0].items.length, 2);
});

test("edit_list_item reemplaza un ítem por índice ('at') haciendo merge", async () => {
  const ctx = fakeCtx({ title: "Inicio", blocks: [statsBlock()] });
  await tool(ctx, "edit_list_item").run({
    page: "home",
    index: 0,
    op: "replace",
    at: 1,
    value: { value: "97%" },
  });
  const item = stagedDoc(ctx).blocks[0].items[1];
  assert.equal(item.value, "97%", "el valor se reemplaza");
  assert.equal(item.label, "Mejora su empleabilidad", "el resto del ítem se conserva (merge)");
});

test("edit_list_item agrega un ítem en la posición pedida", async () => {
  const ctx = fakeCtx({ title: "Inicio", blocks: [statsBlock()] });
  await tool(ctx, "edit_list_item").run({
    page: "home",
    index: 0,
    op: "add",
    at: 0,
    value: { value: "6", label: "Carreras" },
  });
  const items = stagedDoc(ctx).blocks[0].items;
  assert.equal(items.length, 5);
  assert.equal(items[0].label, "Carreras");
});

test("edit_list_item explica qué listas hay si el campo no es una lista", async () => {
  const ctx = fakeCtx({ title: "Inicio", blocks: [statsBlock()] });
  await assert.rejects(
    () => tool(ctx, "edit_list_item").run({ page: "home", index: 0, field: "pasos", op: "remove", at: 0 }),
    /Listas disponibles: items/,
  );
});
