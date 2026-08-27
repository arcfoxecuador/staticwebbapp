// Tests del freno de uso del Asistente IA (rate limit + presupuesto mensual).
// El env se fija ANTES de importar el módulo, porque config lee process.env al
// cargarse; por eso el import es dinámico.

import { test } from "node:test";
import assert from "node:assert/strict";

process.env.AGENT_RATE_PER_HOUR = "3";
process.env.AGENT_RATE_GLOBAL_PER_HOUR = "1000";
process.env.AGENT_MONTHLY_TOKEN_BUDGET = "1000";

const { checkAgentAllowed, reserveAgentSlot, recordAgentRun, agentUsageStats } = await import(
  "../src/lib/agentBudget.js"
);

test("rate limit por usuario: bloquea tras N peticiones por hora", () => {
  const email = "a@iidea.edu.ec";
  for (let i = 0; i < 3; i++) {
    assert.equal(checkAgentAllowed(email).ok, true, `petición ${i + 1} debería permitirse`);
    reserveAgentSlot(email);
  }
  const gate = checkAgentAllowed(email);
  assert.equal(gate.ok, false, "la 4ª petición debe bloquearse");
  assert.equal(gate.status, 429);
});

test("el límite de un usuario no afecta a otro", () => {
  assert.equal(checkAgentAllowed("b@iidea.edu.ec").ok, true);
});

test("presupuesto mensual: bloquea al superar el techo de tokens", () => {
  recordAgentRun("c@iidea.edu.ec", "blog", 700, 400); // 1100 > 1000
  assert.equal(checkAgentAllowed("d@iidea.edu.ec").ok, false, "el presupuesto es global");
});

test("la telemetría refleja el consumo registrado", () => {
  const s = agentUsageStats();
  assert.ok(s.tokens.total >= 1100, "debe contar los tokens registrados");
  assert.equal(s.tokens.input >= 700, true);
  assert.ok(Array.isArray(s.recent) && s.recent.length >= 1);
});
