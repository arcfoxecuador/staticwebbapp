// Cobertura de integración de la "costura" con Claude que ningún otro test toca:
// el router del asistente (routeIntent), el bucle del asistente (runAgent) y el
// redactor de la automatización (llmGenerateDraft). Todo corre contra un DOBLE
// de Anthropic — guioniza respuestas y graba peticiones — así se verifica la
// forma de la petición y el desempaquetado de la respuesta SIN red ni API key.

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { setAnthropicForTests } from "../src/lib/anthropic.js";
import { setBrandForTests } from "../src/lib/brand.js";
import { DEFAULT_BRAND } from "../src/lib/brandSchema.js";
import { routeIntent, runAgent, MAX_TOOL_ITERATIONS } from "../src/agents/run.js";
import { llmGenerateDraft } from "../src/lib/automation/llm.js";
import { blogAutomationSchema } from "../src/lib/blogAutomationSchema.js";
import { MODELS } from "../src/models.js";

interface Block { type: string; text?: string; name?: string; input?: unknown }
// stop_reason lo LEE runAgent para saber si la corrida se quedó sin pasos; sin
// declararlo aquí, guionizar ese caso no compilaba.
interface Msg { content: Block[]; usage?: { input_tokens?: number; output_tokens?: number }; stop_reason?: string }

// Doble de Anthropic: cola de respuestas guionizadas + grabación de peticiones.
class FakeAnthropic {
  createReqs: any[] = [];
  createQueue: Msg[] = [];
  runParams: any = null;
  runnerMsgs: Msg[] = [];

  messages = {
    create: async (params: any): Promise<Msg> => {
      this.createReqs.push(params);
      const r = this.createQueue.shift();
      if (!r) throw new Error("FakeAnthropic: sin respuesta guionizada en cola");
      return r;
    },
  };

  beta = {
    messages: {
      // Imita beta.messages.toolRunner: devuelve un async-iterable de mensajes.
      // No ejecuta herramientas (las corridas guionizadas no preparan cambios),
      // lo que mantiene el test hermético (sin GitHub).
      toolRunner: (params: any) => {
        this.runParams = params;
        const msgs = this.runnerMsgs;
        return {
          async *[Symbol.asyncIterator]() {
            for (const m of msgs) yield m;
          },
        };
      },
    },
  };
}

function useFake(): FakeAnthropic {
  const f = new FakeAnthropic();
  setAnthropicForTests(f as unknown as import("@anthropic-ai/sdk").default);
  setBrandForTests(DEFAULT_BRAND); // evita leer GitHub para la guía de marca
  return f;
}

afterEach(() => { setAnthropicForTests(null); setBrandForTests(null); });

const autoCfg = (over: Record<string, unknown> = {}) =>
  blogAutomationSchema.parse({
    enabled: true,
    topics: ["Becas"],
    schedule: { perWeek: 1, days: ["tue"], time: "09:00", timezone: "America/Guayaquil" },
    ...over,
  });

// ── Router del asistente (routeIntent) ───────────────────────────────────────
test("routeIntent clasifica cada categoría y cae en 'unclear' por defecto", async () => {
  const f = useFake();
  const cases: Array<[string, string]> = [
    ["blog", "blog"],
    ["design", "design"],
    ["page", "page"],
    ["media", "media"],
    ["unclear", "unclear"],
    ["algo que no calza", "unclear"],
  ];
  for (const [word] of cases) f.createQueue.push({ content: [{ type: "text", text: word }] });
  for (const [word, expected] of cases) {
    assert.equal(await routeIntent("haz algo"), expected, `"${word}" → ${expected}`);
  }
  // Router = modelo barato (haiku) y respuesta de una palabra.
  assert.equal(f.createReqs[0].model, MODELS.router);
  assert.ok(f.createReqs[0].max_tokens <= 20, "el router pide pocos tokens");
});

test("routeIntent incluye la conversación previa para resolver seguimientos", async () => {
  const f = useFake();
  f.createQueue.push({ content: [{ type: "text", text: "blog" }] });
  const intent = await routeIntent("hazlo más corto", [
    { role: "user", content: "escribe una nota sobre becas" },
    { role: "assistant", content: "Listo, la nota está creada." },
  ]);
  assert.equal(intent, "blog");
  const userMsg = f.createReqs[0].messages.at(-1).content as string;
  assert.match(userMsg, /Conversación previa/);
  assert.match(userMsg, /becas/); // el turno previo viaja en la petición
});

// ── Redactor de la automatización (llmGenerateDraft) ─────────────────────────
test("llmGenerateDraft desempaqueta el tool_use en un borrador estructurado", async () => {
  const f = useFake();
  const draft = { title: "T", excerpt: "E", body: "## B\ncuerpo", cat: "General", imgAlt: "alt", imagePrompt: "p" };
  f.createQueue.push({ content: [{ type: "tool_use", name: "draft", input: draft }] });

  const out = await llmGenerateDraft({ topic: "Becas", researchText: "datos frescos", config: autoCfg() });
  assert.deepEqual(out, draft);

  const req = f.createReqs[0];
  assert.equal(req.model, MODELS.automation); // sonnet por defecto
  assert.deepEqual(req.tool_choice, { type: "tool", name: "draft" }); // salida forzada
  assert.match(req.system, /redactor de blog/i);
  assert.match(req.messages[0].content, /Tema del blog: Becas/);
  assert.match(req.messages[0].content, /datos frescos/); // la investigación viaja al prompt
});

test("llmGenerateDraft incluye la guía de voz de marca en el sistema", async () => {
  const f = useFake();
  f.createQueue.push({ content: [{ type: "tool_use", name: "draft", input: { title: "T", excerpt: "E", body: "B", cat: "General", imgAlt: "a", imagePrompt: "p" } }] });
  await llmGenerateDraft({ topic: "Becas", researchText: "x", config: autoCfg() });
  assert.match(f.createReqs[0].system as string, /GUÍA DE MARCA/);
});

test("llmGenerateDraft aplica los ajustes POR TEMA sobre los globales", async () => {
  const f = useFake();
  const draft = { title: "T", excerpt: "E", body: "B", cat: "General", imgAlt: "a", imagePrompt: "p" };
  f.createQueue.push({ content: [{ type: "tool_use", name: "draft", input: draft }] });
  const cfg = autoCfg({ topics: ["Becas"], topicOverrides: { Becas: { tone: "formal y técnico", minWords: 1500, maxWords: 1800 } } });
  await llmGenerateDraft({ topic: "Becas", researchText: "x", config: cfg });
  const sys = f.createReqs[0].system as string;
  assert.match(sys, /tono formal y técnico/);
  assert.match(sys, /de 1500 a 1800 palabras/);
});

test("llmGenerateDraft usa los ajustes globales si el tema no tiene override", async () => {
  const f = useFake();
  f.createQueue.push({ content: [{ type: "tool_use", name: "draft", input: { title: "T", excerpt: "E", body: "B", cat: "General", imgAlt: "a", imagePrompt: "p" } }] });
  const cfg = autoCfg({ topics: ["Otro"], topicOverrides: { Becas: { tone: "formal" } } });
  await llmGenerateDraft({ topic: "Otro", researchText: "x", config: cfg });
  assert.match(f.createReqs[0].system as string, /tono profesional y cercano/); // global por defecto
});

test("llmGenerateDraft lanza si el modelo no devuelve un borrador estructurado", async () => {
  const f = useFake();
  f.createQueue.push({ content: [{ type: "text", text: "no puedo" }] }); // sin tool_use
  await assert.rejects(
    () => llmGenerateDraft({ topic: "X", researchText: "", config: autoCfg({ topics: ["X"] }) }),
    /no devolvió un borrador/,
  );
});

// ── Bucle del asistente (runAgent) ───────────────────────────────────────────
test("runAgent enruta al modelo/sistema correctos y SUMA los tokens de todos los turnos", async () => {
  const f = useFake();
  f.runnerMsgs = [
    { content: [{ type: "text", text: "" }], usage: { input_tokens: 100, output_tokens: 40 } },
    { content: [{ type: "text", text: "Listo, cambié el título." }], usage: { input_tokens: 20, output_tokens: 10 } },
  ];
  const res = await runAgent("blog", "cambia el título", { emit: () => {} });

  assert.equal(res.reply, "Listo, cambié el título."); // texto del ÚLTIMO mensaje
  assert.deepEqual(res.usage, { input: 120, output: 50 }); // suma de ambos turnos
  assert.equal(f.runParams.model, MODELS.blog);
  assert.match(f.runParams.system, /Agente de Blogs/);
  assert.equal(f.runParams.messages.at(-1).content, "cambia el título");
});

test("runAgent acota el bucle de herramientas con max_iterations", async () => {
  const f = useFake();
  f.runnerMsgs = [{ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }];
  await runAgent("page", "algo", { emit: () => {} });
  // Sin este tope, un ciclo que no converge llama al modelo hasta agotar la
  // ventana de contexto: el gate de presupuesto solo mira AL EMPEZAR.
  assert.equal(f.runParams.max_iterations, MAX_TOOL_ITERATIONS);
});

test("runAgent avisa cuando se queda sin pasos, en vez de decir 'Listo.'", async () => {
  const f = useFake();
  // stop_reason "tool_use" en el último mensaje = el bucle se cortó por el tope
  // con el modelo todavía pidiendo herramientas: la tarea quedó a medias.
  f.runnerMsgs = [
    { content: [{ type: "text", text: "Voy por la tercera sección" }], stop_reason: "tool_use", usage: { input_tokens: 5, output_tokens: 5 } },
  ];
  const res = await runAgent("page", "reordena todo", { emit: () => {} });

  assert.equal(res.ranOutOfSteps, true);
  assert.match(res.reply, /sin pasos/i);
  assert.match(res.reply, new RegExp(String(MAX_TOOL_ITERATIONS)));
  assert.doesNotMatch(res.reply, /^Listo\.$/);
});

test("runAgent NO marca ranOutOfSteps en una corrida que termina bien", async () => {
  const f = useFake();
  f.runnerMsgs = [
    { content: [{ type: "text", text: "Hecho." }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } },
  ];
  const res = await runAgent("page", "cambia un título", { emit: () => {} });
  assert.equal(res.ranOutOfSteps, false);
  assert.equal(res.reply, "Hecho.");
});

test("runAgent inyecta la guía de marca (voz + medidas de imagen) en el sistema", async () => {
  const f = useFake();
  f.runnerMsgs = [{ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }];
  await runAgent("page", "algo", { emit: () => {} });
  const sys = f.runParams.system as string;
  assert.match(sys, /GUÍA DE MARCA/);
  // Contexto completo: identidad/oferta, terminología y reglas obligatorias.
  assert.match(sys, /IDENTIDAD Y OFERTA/);
  assert.match(sys, /Modalidad: 100% online/);
  assert.match(sys, /TERMINOLOGÍA/);
  assert.match(sys, /REGLAS DE CONTENIDO \(obligatorias\)/);
  assert.match(sys, /No menciones a la competencia/);
  assert.match(sys, /MEDIDAS DE IMAGEN/); // page puede generar imágenes
  assert.match(sys, /size "cover"/); // un slot del imageGuide por defecto
});

test("runAgent: el agente de MEDIOS recibe medidas de imagen pero no la voz", async () => {
  const f = useFake();
  f.runnerMsgs = [{ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }];
  await runAgent("media", "genera una imagen", { emit: () => {} });
  const sys = f.runParams.system as string;
  assert.match(sys, /MEDIDAS DE IMAGEN/);
  assert.doesNotMatch(sys, /GUÍA DE MARCA/); // medios no redacta textos
});

test("runAgent: distintos tipos reciben modelos/sistemas distintos", async () => {
  for (const [kind, model, sysRe] of [
    ["design", MODELS.design, /apariencia|diseño/i],
    ["page", MODELS.page, /página|contenido/i],
    ["media", MODELS.media, /medios|imágenes|biblioteca/i],
  ] as const) {
    const f = useFake();
    f.runnerMsgs = [{ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }];
    await runAgent(kind, "algo", { emit: () => {} });
    assert.equal(f.runParams.model, model, `${kind} → ${model}`);
    assert.match(f.runParams.system, sysRe, `${kind} system`);
  }
});

test("runAgent sin cambios preparados NO publica (flush no-op, sin GitHub)", async () => {
  const f = useFake();
  f.runnerMsgs = [{ content: [{ type: "text", text: "No hubo nada que cambiar." }], usage: { input_tokens: 5, output_tokens: 5 } }];
  const events: Array<{ type: string }> = [];
  const res = await runAgent("page", "no hagas nada", { emit: (e) => events.push(e) });
  assert.equal(res.reply, "No hubo nada que cambiar.");
  // Sin archivos preparados no hay commit → ni evento "pr" (publicado) ni "step" de publicación.
  assert.ok(!events.some((e) => e.type === "pr"), "no debe anunciar publicación");
});

test("runAgent cae en 'Listo.' si el modelo no devuelve texto", async () => {
  const f = useFake();
  f.runnerMsgs = [{ content: [{ type: "tool_use", name: "x", input: {} }], usage: { input_tokens: 3, output_tokens: 2 } }];
  const res = await runAgent("blog", "algo", { emit: () => {} });
  assert.equal(res.reply, "Listo.");
});

test("runAgent reporta el uso turno a turno (para contabilizar una corrida que revienta)", async () => {
  const f = useFake();
  f.runnerMsgs = [
    { content: [{ type: "text", text: "" }], usage: { input_tokens: 100, output_tokens: 40 } },
    { content: [{ type: "text", text: "listo" }], usage: { input_tokens: 20, output_tokens: 10 } },
  ];
  const parciales: Array<{ input: number; output: number }> = [];
  await runAgent("blog", "algo", { emit: () => {}, onUsage: (u) => parciales.push({ ...u }) });
  // Un aviso por turno, con el ACUMULADO: si el bucle muere en el 2.º, el
  // servidor ya tiene el gasto del 1.º y no lo reporta como cero.
  assert.deepEqual(parciales, [{ input: 100, output: 40 }, { input: 120, output: 50 }]);
});

test("routeIntent reporta el gasto del router (antes no se contaba en ningún sitio)", async () => {
  const f = useFake();
  f.createQueue.push({ content: [{ type: "text", text: "blog" }], usage: { input_tokens: 300, output_tokens: 5 } });
  let uso: { input: number; output: number } | null = null;
  const intent = await routeIntent("escribe una nota", [], (u) => { uso = u; });
  assert.equal(intent, "blog");
  assert.deepEqual(uso, { input: 300, output: 5 });
});

test("los agentes que generan imágenes reciben la prohibición de logos y texto", async () => {
  const f = useFake();
  f.runnerMsgs = [{ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }];
  await runAgent("media", "genera una foto del equipo", { emit: () => {} });
  const sys = f.runParams.system as string;
  // La guía de marca puede estar a medio rellenar; estas reglas van siempre.
  assert.match(sys, /SIN texto legible/i);
  assert.match(sys, /SIN logotipos ni marcas/i);
});
