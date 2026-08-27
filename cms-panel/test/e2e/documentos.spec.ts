import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { FORM_SCHEMA } from "../../src/lib/blockForms.js";

// Subir un PDF a la rendición de cuentas tiene DOS caminos en el panel: el
// editor del lienzo (donde se edita de verdad este bloque) y el cajón "Todos los
// ajustes". El primero se quedó sin control de subida cuando se añadió el de
// documentos —solo dejaba escribir una dirección a mano—, así que este archivo
// cubre los dos.

// Se parte de la página REAL (para probar la forma real del bloque), pero se
// vacían los `href` de sus documentos: la prueba necesita que el primero esté
// PENDIENTE para poder subirlo. Sin esto, publicar los PDFs en el contenido
// dejaba el test sin caso de partida y lo ponía en rojo.
const PAGE = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "../astro-web/src/content/pages/rendicion-de-cuentas.json"), "utf8"),
);
for (const b of PAGE.blocks ?? []) {
  for (const periodo of b.periods ?? []) {
    for (const fase of periodo.phases ?? []) {
      for (const doc of fase.docs ?? []) doc.href = null;
    }
  }
}
const SUBIDO = "/documentos/informe-2026-abc123def456.pdf";

async function mock(page: import("@playwright/test").Page, sink: { last?: any } = {}) {
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    const json = (d: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(d) });
    if (url.endsWith("/api/me")) return json({ name: "E2E", email: "e2e@iidea.edu.ec", csrf: "t", role: "admin" });
    if (url.endsWith("/api/forms")) {
      return json({ pages: { "rendicion-de-cuentas": PAGE.title }, schema: FORM_SCHEMA, catalog: {}, siteUrl: "", publish: { toProd: true, where: "el sitio", url: "" } });
    }
    if (url.includes("/api/pages/rendicion-de-cuentas")) return json({ ...PAGE, _sha: "t" });
    if (url.includes("/api/media/document")) {
      sink.last = JSON.parse(route.request().postData() || "{}");
      return json({ ok: true, path: SUBIDO, kind: "doc" });
    }
    if (url.includes("/api/media")) return json({ items: [{ name: "ficha.pdf", path: "/documentos/ficha.pdf", size: 2048, folder: "documentos", kind: "doc" }], folders: ["documentos"], siteUrl: "" });
    return json({ ok: true });
  });
}

const PDF = { name: "Informe 2026.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 contenido") };

test("rendición: se sube un PDF desde el lienzo y el documento pasa a Publicado", async ({ page }) => {
  const sink: { last?: any } = {};
  await mock(page, sink);
  await page.goto("/editor.html#page/rendicion-de-cuentas");
  await page.locator("#gb-canvas .vc-block").first().waitFor();

  const fila = page.locator(".b-acc-doc").first();
  await expect(fila.locator(".b-acc-doc-st")).toHaveText("Próximamente");
  await expect(fila.getByRole("button", { name: "⬆ Subir" })).toBeVisible();
  await expect(fila.getByRole("button", { name: "Biblioteca" })).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await fila.getByRole("button", { name: "⬆ Subir" }).click();
  (await chooser).setFiles(PDF);

  const primera = page.locator(".b-acc-doc").first();
  await expect(primera.locator(".b-acc-doc-st")).toHaveText("Publicado");
  await expect(primera.locator(".b-acc-href")).toHaveValue(SUBIDO);
  expect(sink.last.filename).toBe("Informe 2026.pdf");
  expect(Buffer.from(sink.last.data, "base64").toString()).toContain("%PDF");
});

test("rendición: 'Biblioteca' ofrece los documentos ya subidos, no imágenes", async ({ page }) => {
  await mock(page);
  await page.goto("/editor.html#page/rendicion-de-cuentas");
  await page.locator("#gb-canvas .vc-block").first().waitFor();

  await page.locator(".b-acc-doc").first().getByRole("button", { name: "Biblioteca" }).click();
  await expect(page.locator("#media-modal")).toBeVisible();
  await expect(page.locator("#media-modal .wp-modal-head strong")).toHaveText("Documentos");
  await page.locator("#media-modal-grid .media-item").first().click();
  await expect(page.locator(".b-acc-doc").first().locator(".b-acc-href")).toHaveValue("/documentos/ficha.pdf");
});

test("rendición: el cajón 'Todos los ajustes' también deja subir el PDF", async ({ page }) => {
  const sink: { last?: any } = {};
  await mock(page, sink);
  await page.goto("/editor.html#page/rendicion-de-cuentas");
  await page.locator("#gb-canvas .vc-block").first().waitFor();

  const bloque = page.locator("#gb-canvas .vc-block").nth(1);
  // La barra de herramientas del bloque solo existe con :hover o con el bloque
  // seleccionado (.vc-block:hover .vc-tools, .vc-block.sel .vc-tools). El hover
  // se pierde si el puntero acaba en otro sitio mientras el lienzo termina de
  // pintarse, y entonces el clic esperaba 30 s por un botón invisible: de ahí
  // que esta prueba fallara de forma intermitente. Se reintenta el hover.
  const ajustes = bloque.locator("button[title='Todos los ajustes']");
  await expect(async () => {
    await bloque.hover();
    await expect(ajustes).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await ajustes.click();
  await expect(page.locator("#vc-drawer.open")).toBeVisible();

  const campo = page.locator("#vc-drawer .ed-image-ctrl").filter({ has: page.locator(".ed-doc-state") }).first();
  await expect(campo).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await campo.getByRole("button", { name: "⬆ Subir" }).click();
  (await chooser).setFiles(PDF);
  await expect(campo.locator(".ed-doc-file")).toContainText("informe-2026-abc123def456.pdf");
});
