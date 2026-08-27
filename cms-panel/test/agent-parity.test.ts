// Arnés de regresión del Agente de Páginas ("parity + no kaboom").
//
// Garantía que protege: el agente puede hacer TODO lo que se hace a mano en el
// editor SIN que la página "explote". Se traduce en dos invariantes que este
// arnés verifica sobre cada herramienta que MUTA contenido:
//
//   1. Rechaza toda entrada inválida ANTES de preparar el commit (nunca deja
//      staged algo que el build de Astro (Zod) rechazaría → el sitio no rompe).
//   2. Aplica correctamente la entrada válida (paridad con la edición manual).
//
// Todo corre con un RunContext falso en memoria (staging), sin tocar GitHub ni
// la API de Anthropic: es rápido y determinista, apto para CI.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPageTools } from "../src/agents/pageTools.js";
import { validateBlocks, validatePageSeo, type PageDoc } from "../src/lib/pageBlocks.js";
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
    // El doble implementa RunContext ENTERO a propósito: si una herramienta
    // empieza a anotar el sha base, esto debe dejar de compilar aquí y no
    // reventar en ejecución.
    noteBase: () => {},
    baseShas: new Map(),
  };
}

function tool(ctx: RunContext, name: string) {
  const t = buildPageTools(ctx).find((x) => x.name === name);
  if (!t) throw new Error(`no existe la herramienta ${name}`);
  return t as unknown as { run: (input: unknown) => Promise<string> };
}

function stagedDoc(ctx: RunContext): PageDoc {
  return JSON.parse(ctx.readStaged(HOME_PATH)!.content) as PageDoc;
}

// Invariante central: lo que sea que el agente haya dejado preparado (staged)
// SIEMPRE pasa la barrera del panel (la misma que el build de Astro).
function assertNoKaboom(ctx: RunContext): void {
  const doc = stagedDoc(ctx);
  assert.doesNotThrow(() => validateBlocks(doc.blocks), "los bloques staged deben validar");
  assert.doesNotThrow(() => validatePageSeo(doc.seo), "el seo staged debe validar");
}

const baseDoc = (): PageDoc => ({
  title: "Inicio",
  blocks: [
    { _type: "hero", heading: "Hola", eyebrow: "IIDEA" },
    { _type: "stats", items: [{ value: "95%", label: "Empleabilidad" }, { value: "10", label: "Profes" }] },
  ],
});

// ── SEO por página (paridad con el cajón "SEO" del editor) ───────────────────
test("set_page_seo fija y valida los campos (paridad con el editor)", async () => {
  const ctx = fakeCtx(baseDoc());
  await tool(ctx, "set_page_seo").run({ page: "home", title: "Título SEO", description: "Descripción SEO" });
  assert.deepEqual(stagedDoc(ctx).seo, { title: "Título SEO", description: "Descripción SEO" });
  assertNoKaboom(ctx);
});

test("set_page_seo FUSIONA: envía solo un campo sin borrar los demás", async () => {
  const ctx = fakeCtx({ ...baseDoc(), seo: { title: "T", description: "D" } });
  await tool(ctx, "set_page_seo").run({ page: "home", description: "D2" });
  assert.deepEqual(stagedDoc(ctx).seo, { title: "T", description: "D2" });
});

test("set_page_seo borra un campo con cadena vacía (vuelve al default)", async () => {
  const ctx = fakeCtx({ ...baseDoc(), seo: { title: "T", description: "D" } });
  await tool(ctx, "set_page_seo").run({ page: "home", title: "" });
  assert.deepEqual(stagedDoc(ctx).seo, { description: "D" });
});

test("set_page_seo rechaza un título demasiado largo (no kaboom)", async () => {
  const ctx = fakeCtx(baseDoc());
  await assert.rejects(
    () => tool(ctx, "set_page_seo").run({ page: "home", title: "a".repeat(200) }),
    /title/,
  );
  // No debe haber quedado seo staged inválido.
  assert.equal(stagedDoc(ctx).seo, undefined);
});

test("get_page_seo devuelve el seo actual (vacío si no hay)", async () => {
  const ctx = fakeCtx(baseDoc());
  assert.equal(JSON.parse(await tool(ctx, "get_page_seo").run({ page: "home" })).title, undefined);
  await tool(ctx, "set_page_seo").run({ page: "home", title: "X" });
  assert.equal(JSON.parse(await tool(ctx, "get_page_seo").run({ page: "home" })).title, "X");
});

// ── add_block: acepta lo válido, rechaza lo inválido (no kaboom) ─────────────
test("add_block agrega un bloque válido del catálogo", async () => {
  const ctx = fakeCtx(baseDoc());
  await tool(ctx, "add_block").run({ page: "home", type: "ctaBanner", data: { heading: "Aplica ya" } });
  const doc = stagedDoc(ctx);
  assert.equal(doc.blocks.at(-1)!._type, "ctaBanner");
  assertNoKaboom(ctx);
});

test("add_block rechaza un tipo inexistente (no lo prepara)", async () => {
  const ctx = fakeCtx(baseDoc());
  await assert.rejects(() => tool(ctx, "add_block").run({ page: "home", type: "carrusel3d", data: {} }), /desconocido/i);
  assert.equal(stagedDoc(ctx).blocks.length, 2, "no se agregó nada");
});

test("add_block rechaza un campo ajeno al bloque (no kaboom)", async () => {
  const ctx = fakeCtx(baseDoc());
  await assert.rejects(
    () => tool(ctx, "add_block").run({ page: "home", type: "hero", data: { heading: "Ok", inventado: 1 } }),
    /no admite/i,
  );
});

// ── Contenido libre (richContent): gestión de piezas por el agente ──────────
test("richContent: crear el bloque y agregar piezas válidas de distintos kinds", async () => {
  const ctx = fakeCtx(baseDoc());
  await tool(ctx, "add_block").run({ page: "home", type: "richContent", data: { background: "tint", items: [] } });
  const idx = stagedDoc(ctx).blocks.length - 1;
  for (const value of [
    { kind: "heading", text: "Primeros pasos", level: "h2" },
    { kind: "text", text: "Un párrafo con <b>énfasis</b>." },
    { kind: "list", items: ["uno", "dos"], ordered: false },
    { kind: "button", label: "Aplica", href: "#aplica", style: "primary" },
  ]) {
    await tool(ctx, "edit_list_item").run({ page: "home", index: idx, field: "items", op: "add", value });
  }
  assert.equal(stagedDoc(ctx).blocks[idx].items.length, 4);
  assertNoKaboom(ctx);
});

test("richContent: rechaza una pieza con kind inválido (no kaboom)", async () => {
  const ctx = fakeCtx(baseDoc());
  await tool(ctx, "add_block").run({ page: "home", type: "richContent", data: { items: [] } });
  const idx = stagedDoc(ctx).blocks.length - 1;
  await assert.rejects(
    () => tool(ctx, "edit_list_item").run({ page: "home", index: idx, field: "items", op: "add", value: { kind: "video3d" } }),
    /desconocido|inválid|no admit/i,
  );
  assertNoKaboom(ctx);
});

// ── Reordenar / ocultar / quitar (paridad con las herramientas del lienzo) ──
test("move_block, toggle_block y remove_block mantienen el documento válido", async () => {
  const ctx = fakeCtx(baseDoc());
  await tool(ctx, "move_block").run({ page: "home", index: 1, to: 0 });
  assert.equal(stagedDoc(ctx).blocks[0]._type, "stats");
  await tool(ctx, "toggle_block").run({ page: "home", index: 0, hidden: true });
  assert.equal(stagedDoc(ctx).blocks[0].hidden, true);
  await tool(ctx, "remove_block").run({ page: "home", index: 0 });
  assert.equal(stagedDoc(ctx).blocks.length, 1);
  assertNoKaboom(ctx);
});

// ── Secuencia realista completa: sigue validando al final ───────────────────
test("secuencia mixta de ediciones deja el documento publicable", async () => {
  const ctx = fakeCtx(baseDoc());
  await tool(ctx, "set_page_seo").run({ page: "home", title: "Inicio — IIDEA", description: "Educación superior online." });
  await tool(ctx, "add_block").run({ page: "home", type: "richContent", data: { items: [{ kind: "text", text: "Bienvenida." }] } });
  await tool(ctx, "edit_list_item").run({ page: "home", index: 1, op: "replace", at: 0, value: { value: "97%" } });
  await tool(ctx, "move_block").run({ page: "home", index: 0, to: 1 });
  assertNoKaboom(ctx);
});
