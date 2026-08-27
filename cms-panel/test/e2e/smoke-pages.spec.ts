import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { FORM_SCHEMA } from "../../src/lib/blockForms.js";

// Smoke: carga CADA página real del sitio (astro-web/src/content/pages/*.json) en
// el editor visual, con el esquema REAL, y verifica que TODOS sus bloques se
// pintan sin caer al fallback de error. Atrapa un pintor que se rompa con datos
// reales (o una deriva de esquema) antes de que lo vea un usuario.

const PAGES_DIR = path.resolve(process.cwd(), "../astro-web/src/content/pages");
const pageFiles = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".json"));

for (const file of pageFiles) {
  const slug = file.replace(/\.json$/, "");
  const doc = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, file), "utf8"));

  test(`smoke: la página "${slug}" (${doc.blocks?.length ?? 0} bloques) se pinta sin errores`, async ({ page }) => {
    await page.route("**/api/**", (route) => {
      const url = route.request().url();
      const json = (d: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(d) });
      if (url.endsWith("/api/me")) return json({ name: "E2E", email: "e2e@iidea.edu.ec", csrf: "t", role: "admin" });
      if (url.endsWith("/api/forms")) {
        return json({ pages: { [slug]: doc.title }, schema: FORM_SCHEMA, catalog: {}, siteUrl: "", publish: { toProd: true, where: "el sitio", url: "" } });
      }
      if (url.includes(`/api/pages/${slug}`)) return json({ ...doc, _sha: "smoke" });
      return json({ ok: true });
    });

    await page.goto(`/editor.html#page/${slug}`);
    await page.locator("#gb-canvas .vc-block").first().waitFor();
    // Un bloque pintado por cada bloque del documento…
    await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(doc.blocks.length);
    // …y ninguno cayó al fallback "No se pudo previsualizar" (pintor roto).
    await expect(page.locator("#gb-canvas")).not.toContainText("No se pudo previsualizar");
  });
}
