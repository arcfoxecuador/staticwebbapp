import { test } from "node:test";
import assert from "node:assert/strict";

import { mediaFolderOf, IMG_RE } from "../src/lib/media.js";

test("mediaFolderOf deriva la carpeta desde la ruta pública", () => {
  assert.equal(mediaFolderOf("/logo.png"), ""); // raíz
  assert.equal(mediaFolderOf("/carreras/banner.webp"), "carreras");
  assert.equal(mediaFolderOf("/programas/software.png"), "programas");
  assert.equal(mediaFolderOf("/news/portada.png"), "news");
  assert.equal(mediaFolderOf("/uploads/foo/y.webp"), "uploads/foo"); // subcarpeta anidada
});

test("IMG_RE reconoce las extensiones de imagen", () => {
  for (const ok of ["a.png", "b.JPG", "c.jpeg", "d.webp", "e.gif", "f.svg", "g.avif"]) assert.ok(IMG_RE.test(ok), ok);
  for (const no of ["a.txt", "b.md", "c.pdf", "d.mp4"]) assert.ok(!IMG_RE.test(no), no);
});
