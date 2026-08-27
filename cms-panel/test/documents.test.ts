import { test } from "node:test";
import assert from "node:assert/strict";

import { assertDocument, hashedDocName, DOC_EXTENSIONS, MAX_DOC_BYTES } from "../src/lib/documents.js";
import { DOC_RE, mediaKindOf, isMedia } from "../src/lib/media.js";

// Bytes mínimos con la firma real de cada formato.
const pdf = (extra = 0) => Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(extra)]).toString("base64");
const zip = () => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("resto")]).toString("base64");
const ole = () => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.from("x")]).toString("base64");

test("DOC_RE reconoce las extensiones de documento", () => {
  for (const ok of ["informe.pdf", "FICHA.PDF", "a.doc", "b.docx", "c.xls", "d.xlsx", "e.ppt", "f.pptx"]) {
    assert.ok(DOC_RE.test(ok), ok);
  }
  for (const no of ["a.png", "b.webp", "c.txt", "d.exe", "e.zip", "f.html"]) {
    assert.ok(!DOC_RE.test(no), no);
  }
});

test("mediaKindOf clasifica imágenes y documentos", () => {
  assert.equal(mediaKindOf("/uploads/foto.webp"), "image");
  assert.equal(mediaKindOf("/documentos/informe.pdf"), "doc");
  assert.equal(mediaKindOf("/algo/readme.md"), null);
  assert.ok(isMedia("/documentos/informe.pdf"));
  assert.ok(!isMedia("/algo/script.js"));
});

test("assertDocument acepta cada formato con su firma real", () => {
  assert.equal(assertDocument(pdf(), "informe.pdf").ext, "pdf");
  assert.equal(assertDocument(zip(), "ficha.docx").ext, "docx");
  assert.equal(assertDocument(zip(), "aranceles.xlsx").ext, "xlsx");
  assert.equal(assertDocument(zip(), "charla.pptx").ext, "pptx");
  assert.equal(assertDocument(ole(), "viejo.doc").ext, "doc");
  assert.equal(assertDocument(ole(), "viejo.xls").ext, "xls");
});

test("assertDocument rechaza una extensión fuera de la lista", () => {
  assert.throws(() => assertDocument(pdf(), "malicioso.exe"), /Formato no permitido/);
  assert.throws(() => assertDocument(pdf(), "pagina.html"), /Formato no permitido/);
  assert.throws(() => assertDocument(pdf(), "sinextension"), /Formato no permitido/);
});

test("assertDocument rechaza contenido que no coincide con la extensión", () => {
  // Un ejecutable renombrado a .pdf: la extensión cuela, la firma no.
  const fake = Buffer.from("MZ\x90\x00ejecutable").toString("base64");
  assert.throws(() => assertDocument(fake, "informe.pdf"), /no parece un \.pdf real/);
  // Un PDF de verdad renombrado a .docx tampoco pasa (docx es ZIP).
  assert.throws(() => assertDocument(pdf(), "ficha.docx"), /no parece un \.docx real/);
});

test("assertDocument rechaza vacío y exceso de tamaño", () => {
  assert.throws(() => assertDocument("", "informe.pdf"), /vacío/);
  const enorme = pdf(MAX_DOC_BYTES + 1);
  assert.throws(() => assertDocument(enorme, "informe.pdf"), /demasiado grande/);
});

test("hashedDocName conserva la extensión y deduplica por contenido", () => {
  const bytes = Buffer.from("%PDF-1.7 contenido");
  const a = hashedDocName(bytes, "Informe Rendición de Cuentas 2026.pdf", "pdf");
  const b = hashedDocName(bytes, "Informe Rendición de Cuentas 2026.pdf", "pdf");
  assert.equal(a, b, "el mismo contenido da el mismo nombre (dedupe)");
  assert.match(a, /^informe-rendicion-de-cuentas-2026-[0-9a-f]{12}\.pdf$/);
  // Contenido distinto → nombre distinto, aunque el original se llame igual.
  const c = hashedDocName(Buffer.from("%PDF-1.7 otro"), "Informe Rendición de Cuentas 2026.pdf", "pdf");
  assert.notEqual(a, c);
});

test("hashedDocName sanea nombres imposibles", () => {
  const bytes = Buffer.from("%PDF-x");
  assert.match(hashedDocName(bytes, "../../etc/passwd.pdf", "pdf"), /^etc-passwd-[0-9a-f]{12}\.pdf$/);
  assert.match(hashedDocName(bytes, "....pdf", "pdf"), /^documento-[0-9a-f]{12}\.pdf$/);
});

test("DOC_EXTENSIONS coincide con lo que acepta DOC_RE", () => {
  for (const ext of DOC_EXTENSIONS) assert.ok(DOC_RE.test(`archivo.${ext}`), ext);
});
