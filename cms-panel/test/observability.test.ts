// Trazas de corrida de agente.
//
// Antes de esto, de una corrida solo quedaba un error suelto si reventaba. Estas
// pruebas fijan el contrato de la línea `agent_run`: que salga SIEMPRE (también
// cuando la corrida falla, que es cuando más importa), que mida las herramientas
// y que no filtre PII.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  startRunTrace,
  instrumentTools,
  setLogSinkForTests,
  type RunTrace,
} from "../src/lib/observability.js";
import { routeIntent } from "../src/agents/run.js";
import { setAnthropicForTests } from "../src/lib/anthropic.js";

type Linea = Record<string, unknown>;

function capturar(): Linea[] {
  const lineas: Linea[] = [];
  setLogSinkForTests((_lvl, record) => lineas.push(record));
  return lineas;
}
const soloRun = (l: Linea[]) => l.filter((x) => x.evt === "agent_run");

afterEach(() => setLogSinkForTests(null));

test("cada corrida emite una línea de inicio y una final", () => {
  const lineas = capturar();
  startRunTrace("page").finish("ok");
  assert.equal(lineas.filter((l) => l.evt === "agent_run_start").length, 1);
  assert.equal(soloRun(lineas).length, 1);
});

test("la línea final lleva lo necesario para agregar costo y salud", () => {
  const lineas = capturar();
  const t = startRunTrace("blog", { origen: "panel" });
  t.finish("ok", { model: "claude-opus-4-8", tokensIn: 1200, tokensOut: 340, turnos: 3, archivos: 2 });

  const l = soloRun(lineas)[0];
  assert.equal(l.kind, "blog");
  assert.equal(l.outcome, "ok");
  assert.equal(l.model, "claude-opus-4-8");
  assert.equal(l.tokensIn, 1200);
  assert.equal(l.tokensOut, 340);
  assert.equal(l.origen, "panel");
  assert.ok(typeof l.durationMs === "number", "sin duración no se puede detectar lentitud");
  assert.ok(typeof l.runId === "string" && (l.runId as string).length > 0);
});

test("no se emite el correo de quien la pidió (el commit ya lo registra)", () => {
  const lineas = capturar();
  startRunTrace("page", { origen: "panel" }).finish("ok");
  const serializado = JSON.stringify(lineas);
  assert.doesNotMatch(serializado, /@/, "la traza no debe llevar PII");
});

test("finish es idempotente: una corrida no puede contarse dos veces", () => {
  const lineas = capturar();
  const t = startRunTrace("design");
  t.finish("ok");
  t.finish("error");
  assert.equal(soloRun(lineas).length, 1);
});

test("cada corrida tiene su propio identificador", () => {
  capturar();
  assert.notEqual(startRunTrace("page").runId, startRunTrace("page").runId);
});

test("el router queda trazado: es la llamada de IA más frecuente del sistema", async () => {
  const lineas = capturar();
  setAnthropicForTests({
    messages: { create: async () => ({ content: [{ type: "text", text: "design" }], usage: { input_tokens: 40, output_tokens: 2 } }) },
  } as any);
  try {
    assert.equal(await routeIntent("ponlo navideño", []), "design");
  } finally {
    setAnthropicForTests(null);
  }

  const l = soloRun(lineas).find((x) => x.kind === "router");
  assert.ok(l, "el router debe emitir su propia traza");
  assert.equal(l!.intencion, "design");
  assert.equal(l!.reconocido, true, "distingue 'dijo unclear' de 'no entendimos la respuesta'");
  assert.equal(l!.tokensIn, 40);
});

test("una respuesta ininteligible del router se marca como no reconocida", async () => {
  const lineas = capturar();
  setAnthropicForTests({
    messages: { create: async () => ({ content: [{ type: "text", text: "???" }], usage: {} }) },
  } as any);
  try {
    assert.equal(await routeIntent("...", []), "unclear", "cae a unclear, que es el default seguro");
  } finally {
    setAnthropicForTests(null);
  }
  const l = soloRun(lineas).find((x) => x.kind === "router");
  assert.equal(l!.reconocido, false, "sin esto, un router roto parecería un router prudente");
});

// ── Instrumentación de herramientas ─────────────────────────────────────────

const herramientaFalsa = (name: string, run: (...a: any[]) => any) => ({
  type: "custom",
  name,
  description: "d",
  input_schema: {},
  parse: (x: unknown) => x,
  run,
});

test("mide cuántas veces se llamó cada herramienta y cuántas fallaron", async () => {
  const lineas = capturar();
  const t = startRunTrace("page");
  const [leer, escribir] = instrumentTools(
    [
      herramientaFalsa("get_block", async () => "ok"),
      herramientaFalsa("edit_block", async () => { throw new Error("conflicto"); }),
    ],
    t,
  );

  await leer.run();
  await leer.run();
  await assert.rejects(() => escribir.run());
  t.finish("ok");

  const tools = soloRun(lineas)[0].tools as Record<string, string>;
  assert.match(tools.get_block, /^2\//, `esperaba 2 llamadas, vino ${tools.get_block}`);
  assert.match(tools.edit_block, /1✗/, "el fallo debe quedar marcado");
  assert.equal(soloRun(lineas)[0].toolCalls, 3);
  assert.equal(soloRun(lineas)[0].toolFails, 1);
});

test("instrumentar conserva la forma de la herramienta y propaga el error", async () => {
  setLogSinkForTests(() => {});
  const t = startRunTrace("page");
  const [h] = instrumentTools([herramientaFalsa("x", async () => { throw new Error("boom"); })], t);

  assert.equal(h.name, "x");
  assert.equal(h.type, "custom");
  assert.equal(typeof h.parse, "function", "betaZodTool necesita conservar parse");
  await assert.rejects(() => h.run(), /boom/, "el error debe llegar al agente, no tragarse");
});

test("una herramienta sin run pasa intacta en vez de romperse", () => {
  setLogSinkForTests(() => {});
  const t: RunTrace = startRunTrace("page");
  const raro = { name: "sin_run" } as any;
  assert.equal(instrumentTools([raro], t)[0], raro);
});

test("los argumentos llegan sin alterarse a la herramienta original", async () => {
  setLogSinkForTests(() => {});
  const t = startRunTrace("page");
  let visto: unknown = null;
  const [h] = instrumentTools([herramientaFalsa("y", async (a: unknown) => { visto = a; return "ok"; })], t);
  await h.run({ slug: "becas", index: 2 });
  assert.deepEqual(visto, { slug: "becas", index: 2 });
});
