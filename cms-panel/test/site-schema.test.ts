// El esquema de ajustes del sitio es la puerta "sin kaboom": el panel valida con
// él antes de escribir site.json, así que un ajuste inválido nunca llega al repo.

import { test } from "node:test";
import assert from "node:assert/strict";

import { siteSchema } from "../src/lib/siteSchema.js";

const VALID = {
  contact: { phone: "+593997127287", phoneLabel: "+593 99 712 7287", whatsapp: "593997127287", email: "a@iidea.edu.ec", becasEmail: "b@iidea.edu.ec", address: "Quito" },
  social: { facebook: "https://facebook.com/iidea", instagram: "" },
  urls: { aulaVirtual: "https://aula.iidea.edu.ec", video: "", apply: "#aplica" },
  nav: [{ label: "Inicio", href: "/" }],
};

test("acepta ajustes válidos", () => {
  assert.doesNotThrow(() => siteSchema.parse(VALID));
});

test("acepta un menú con hijos y bandera careers", () => {
  assert.doesNotThrow(() => siteSchema.parse({ ...VALID, nav: [{ label: "Nosotros", href: "/nosotros", careers: true, children: [{ label: "Becas", href: "/becas" }] }] }));
});

test("rechaza whatsapp con símbolos o espacios", () => {
  assert.throws(() => siteSchema.parse({ ...VALID, contact: { ...VALID.contact, whatsapp: "+593 99 712" } }));
});

test("rechaza correo inválido", () => {
  assert.throws(() => siteSchema.parse({ ...VALID, contact: { ...VALID.contact, email: "no-es-correo" } }));
});

test("rechaza URL de Aula Virtual inválida", () => {
  assert.throws(() => siteSchema.parse({ ...VALID, urls: { ...VALID.urls, aulaVirtual: "aula" } }));
});

test("rechaza un menú vacío", () => {
  assert.throws(() => siteSchema.parse({ ...VALID, nav: [] }));
});

test("rechaza un elemento de menú sin etiqueta", () => {
  assert.throws(() => siteSchema.parse({ ...VALID, nav: [{ label: "", href: "/" }] }));
});

test("header.showAulaVirtual es opcional y booleano (oculta el botón sin borrar la URL)", () => {
  const s = siteSchema.parse({ ...VALID, header: { showAulaVirtual: false } });
  assert.equal(s.header?.showAulaVirtual, false);
  // Un site.json anterior a este campo sigue validando: el botón se muestra.
  assert.doesNotThrow(() => siteSchema.parse(VALID));
  assert.throws(() => siteSchema.parse({ ...VALID, header: { showAulaVirtual: "no" } }));
});

test("cookies: acepta los textos del aviso y rechaza uno vacío", () => {
  const s = siteSchema.parse({ ...VALID, cookies: { title: "Tú decides", acceptAll: "Aceptar todas" } });
  assert.equal(s.cookies?.acceptAll, "Aceptar todas");
  assert.doesNotThrow(() => siteSchema.parse(VALID));
  assert.throws(() => siteSchema.parse({ ...VALID, cookies: { acceptAll: "  " } }));
});

test("footer.creditHref debe ser una URL si se envía", () => {
  const s = siteSchema.parse({
    ...VALID,
    footer: {
      keepInTouchTitle: "Mantente al día",
      keepInTouchText: "Novedades",
      keepInTouchCta: "WhatsApp",
      creditPrefix: "Powered by",
      creditName: "ROISense",
      creditHref: "https://www.roisense.com/",
    },
  });
  assert.equal(s.footer?.creditName, "ROISense");
  assert.doesNotThrow(() => siteSchema.parse(VALID));
  assert.throws(() => siteSchema.parse({
    ...VALID,
    footer: { keepInTouchTitle: "A", keepInTouchText: "B", keepInTouchCta: "C", creditHref: "roisense" },
  }));
});

test("header: acepta los rótulos de los botones y rechaza uno vacío", () => {
  const s = siteSchema.parse({
    ...VALID,
    header: { showAulaVirtual: false, aulaLabel: "Campus", applyLabel: "Quiero información", applyHref: "/#aplica" },
  });
  assert.equal(s.header?.applyLabel, "Quiero información");
  assert.equal(s.header?.applyHref, "/#aplica");
  assert.throws(() => siteSchema.parse({ ...VALID, header: { applyLabel: "   " } }));
});
