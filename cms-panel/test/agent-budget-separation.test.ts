// El gasto de FONDO (blogs automáticos) e imágenes se mide APARTE del contador
// que corta a los editores. Si se sumaran al mismo, el blog semanal agotaría el
// presupuesto mensual y dejaría al equipo sin asistente: el efecto contrario al
// que busca el límite.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  recordAgentRun,
  recordBackgroundRun,
  recordImageGenerated,
  agentUsageStats,
} from "../src/lib/agentBudget.js";

test("la automatización NO suma al contador que gatea a las personas", () => {
  const antes = agentUsageStats();
  recordBackgroundRun(500_000, 20_000); // un blog generoso
  const despues = agentUsageStats();

  // El contador de personas no se mueve…
  assert.equal(despues.tokens.total, antes.tokens.total, "el blog no debe gastar la cuota del equipo");
  // …pero el gasto SÍ queda registrado y visible.
  assert.equal(despues.automation.tokens.total, antes.automation.tokens.total + 520_000);
  assert.equal(despues.automation.runs, antes.automation.runs + 1);
});

test("una corrida de una persona sí suma a su contador", () => {
  const antes = agentUsageStats();
  recordAgentRun("ana@iidea.edu.ec", "page", 1000, 200);
  const despues = agentUsageStats();
  assert.equal(despues.tokens.total, antes.tokens.total + 1200);
  assert.ok(despues.byUser.some((u) => u.email === "ana@iidea.edu.ec"));
});

test("las imágenes se cuentan por unidades (no van por tokens)", () => {
  const antes = agentUsageStats().images.generated;
  recordImageGenerated();
  recordImageGenerated();
  assert.equal(agentUsageStats().images.generated, antes + 2);
});
