// El destino de publicación de los agentes (config.publish) deriva de
// baseBranch vs prodBranch. Por defecto ambas son "main" → publican DIRECTO a
// producción ("modo normal"); el staging-first se activa con GITHUB_BASE_BRANCH.
// config.ts lee el entorno al importarse, así que cargamos en un proceso hijo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function publish(env: Record<string, string>): { toProd: boolean; where: string; url: string } {
  const out = execFileSync(
    "npx",
    ["tsx", "-e", "import('./src/config.ts').then(m=>console.log(JSON.stringify(m.config.publish)))"],
    { env: { ...process.env, ...env }, stdio: "pipe" },
  );
  return JSON.parse(out.toString().trim());
}

test("por defecto publica DIRECTO al sitio (base = prod = main)", () => {
  const p = publish({ GITHUB_PROD_BRANCH: "main", SITE_URL: "https://iidea.edu.ec", STAGE_URL: "" });
  assert.equal(p.toProd, true);
  assert.equal(p.where, "el sitio");
  assert.equal(p.url, "https://iidea.edu.ec");
});

test("con GITHUB_BASE_BRANCH=stage entra el modo staging", () => {
  const p = publish({
    GITHUB_BASE_BRANCH: "stage",
    GITHUB_PROD_BRANCH: "main",
    STAGE_URL: "https://stage.iidea.edu.ec",
    SITE_URL: "https://iidea.edu.ec",
  });
  assert.equal(p.toProd, false);
  assert.equal(p.where, "staging");
  assert.equal(p.url, "https://stage.iidea.edu.ec");
});
