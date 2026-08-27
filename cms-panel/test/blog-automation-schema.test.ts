// La config de automatización es la puerta "sin kaboom": el panel valida con este
// esquema antes de escribir blog-automation.json.

import { test } from "node:test";
import assert from "node:assert/strict";

import { blogAutomationSchema, DEFAULT_AUTOMATION } from "../src/lib/blogAutomationSchema.js";

test("parse({}) devuelve una config completa por defecto", () => {
  assert.equal(DEFAULT_AUTOMATION.enabled, false);
  assert.equal(DEFAULT_AUTOMATION.schedule.perWeek, 1);
  assert.deepEqual(DEFAULT_AUTOMATION.schedule.days, ["tue"]);
  assert.equal(DEFAULT_AUTOMATION.competitors.lookbackDays, 30);
  assert.equal(DEFAULT_AUTOMATION.generation.maxWords, 1200);
  assert.deepEqual(DEFAULT_AUTOMATION.topics, []);
});

test("acepta una config válida completa", () => {
  assert.doesNotThrow(() =>
    blogAutomationSchema.parse({
      enabled: true,
      schedule: { perWeek: 3, days: ["mon", "wed", "fri"], time: "07:30", timezone: "America/Guayaquil" },
      topics: ["Becas", "Empleabilidad"],
      sources: [{ url: "https://x.com/feed", required: true, keywordFilter: "beca", newerThanDays: 30, crawlDepth: 1, maxResults: 5 }],
      competitors: { domains: ["rival.com"], lookbackDays: 14, postsPerCompetitor: 3 },
      generation: { minWords: 800, maxWords: 1400, tone: "cercano", language: "es" },
    }),
  );
});

test("rellena defaults de una fuente parcial (solo url)", () => {
  const c = blogAutomationSchema.parse({ sources: [{ url: "https://x.com/feed" }] });
  assert.equal(c.sources[0].required, false);
  assert.equal(c.sources[0].maxResults, 10);
  assert.equal(c.sources[0].crawlDepth, 0);
});

test("rechaza perWeek fuera de 1–7", () => {
  assert.throws(() => blogAutomationSchema.parse({ schedule: { perWeek: 8 } }));
});

test("rechaza una hora inválida", () => {
  assert.throws(() => blogAutomationSchema.parse({ schedule: { time: "25:00" } }));
});

test("rechaza una lista de días vacía", () => {
  assert.throws(() => blogAutomationSchema.parse({ schedule: { days: [] } }));
});

test("rechaza una URL de fuente inválida", () => {
  assert.throws(() => blogAutomationSchema.parse({ sources: [{ url: "no-es-url" }] }));
});

test("rechaza maxWords < minWords", () => {
  assert.throws(() => blogAutomationSchema.parse({ generation: { minWords: 2000, maxWords: 500 } }));
});
