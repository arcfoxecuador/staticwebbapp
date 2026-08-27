// Barrera anti-competencia: NINGÚN agente puede nombrar o comparar con otras
// instituciones.
//
// La regla existía solo en brand.json, que es editable desde la pantalla Marca:
// borrar esa línea dejaba a los agentes sin barrera sin que nadie se enterara.
// Y el agente de Medios ni siquiera recibía la guía de marca. El riesgo es
// concreto porque la automatización inyecta un bloque con dominios y titulares
// de otros institutos en el mismo prompt con el que redacta.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { setAnthropicForTests } from "../src/lib/anthropic.js";
import { setBrandForTests } from "../src/lib/brand.js";
import { brandSchema, DEFAULT_BRAND } from "../src/lib/brandSchema.js";
import { runAgent, type AgentKind } from "../src/agents/run.js";
import { llmGenerateDraft } from "../src/lib/automation/llm.js";
import { blogAutomationSchema } from "../src/lib/blogAutomationSchema.js";
import { researchToPrompt } from "../src/lib/research/index.js";

class Fake {
  runParams: any = null;
  createReqs: any[] = [];
  messages = { create: async (p: any) => { this.createReqs.push(p); return { content: [{ type: "tool_use", name: "draft", input: { title: "T", excerpt: "E", body: "B", cat: "General", imgAlt: "a", imagePrompt: "p" } }] }; } };
  beta = { messages: { toolRunner: (p: any) => { this.runParams = p; return { async *[Symbol.asyncIterator]() { yield { content: [{ type: "text", text: "ok" }], usage: {} }; } }; } } };
}
const useFake = (brand = DEFAULT_BRAND) => {
  const f = new Fake();
  setAnthropicForTests(f as any);
  setBrandForTests(brand);
  return f;
};
afterEach(() => { setAnthropicForTests(null); setBrandForTests(null); });

const esperaProhibiciones = (sys: string, quien: string) => {
  assert.match(sys, /NUNCA nombres a la competencia/i, `${quien}: falta la prohibición de nombrar`);
  assert.match(sys, /NUNCA compares con otros/i, `${quien}: falta la prohibición de comparar`);
};

// ── Los CUATRO agentes del asistente ────────────────────────────────────────
for (const kind of ["blog", "design", "page", "media"] as AgentKind[]) {
  test(`el agente "${kind}" recibe la prohibición de nombrar a la competencia`, async () => {
    const f = useFake();
    await runAgent(kind, "haz algo", { emit: () => {} });
    esperaProhibiciones(f.runParams.system as string, kind);
  });
}

// ── El redactor de la automatización (la vía de mayor riesgo) ───────────────
test("el redactor automático la recibe, y ya no se le pide 'diferenciarte de la competencia'", async () => {
  const f = useFake();
  await llmGenerateDraft({
    topic: "Becas",
    researchText: "x",
    config: blogAutomationSchema.parse({ enabled: true, topics: ["Becas"], schedule: { perWeek: 1, days: ["tue"], time: "09:00", timezone: "America/Guayaquil" } }),
  });
  const sys = f.createReqs[0].system as string;
  esperaProhibiciones(sys, "automatización");
  assert.doesNotMatch(sys, /diferenciarte de la competencia/i, "invitaba a compararse");
});

// ── La barrera NO puede depender de brand.json (que es editable) ────────────
test("sigue en pie aunque un admin borre la regla de la guía de marca", async () => {
  const sinReglas = brandSchema.parse({ ...DEFAULT_BRAND, rules: [], compliance: [] });
  const f = useFake(sinReglas);
  await runAgent("blog", "escribe una nota", { emit: () => {} });
  esperaProhibiciones(f.runParams.system as string, "guía de marca vacía");
});

// ── Los datos de competencia viajan con su propia advertencia ───────────────
test("el bloque de competencia del prompt lleva pegada su prohibición", () => {
  const txt = researchToPrompt({
    sources: [],
    competitors: {
      competitors: [{ domain: "otro-instituto.edu.ec", ok: true, posts: [{ title: "Su artículo", link: "https://otro-instituto.edu.ec/a" }] }],
      recentTitles: ["Su artículo"],
      gaps: ["Empleabilidad"],
    },
    generatedAt: "",
  } as any);
  assert.match(txt, /MATERIAL INTERNO, NO PUBLICABLE/);
  assert.match(txt, /Prohibido nombrar estos sitios/i);
  // Y los "huecos" se presentan como tema propio, no como comparación.
  assert.match(txt, /temas que aún no cubrimos/i);
  assert.doesNotMatch(txt, /la competencia los toca y tú no/i);
});
