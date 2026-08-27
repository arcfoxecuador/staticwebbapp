import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { assertPublicHttpUrl, hashedName, optimizeImage, COVER_SIZE } from "../src/lib/images.js";
import { validateCategories } from "../src/lib/categories.js";

test("assertPublicHttpUrl bloquea hosts privados/internos (SSRF)", () => {
  assert.doesNotThrow(() => assertPublicHttpUrl("https://example.com/foto.png"));
  for (const bad of [
    "http://localhost/x.png",
    "http://127.0.0.1/x.png",
    "http://10.0.0.5/x.png",
    "http://192.168.1.1/x.png",
    "http://169.254.169.254/latest/meta-data", // metadata de la nube
    "http://172.16.0.1/x.png",
    "http://mi-servicio.internal/x.png",
    "ftp://example.com/x.png",
    "file:///etc/passwd",
    "no-es-una-url",
  ]) {
    assert.throws(() => assertPublicHttpUrl(bad), `debería rechazar ${bad}`);
  }
});

test("hashedName es estable por contenido (dedupe) y saneado", () => {
  const b64 = Buffer.from("contenido-de-imagen").toString("base64");
  const a = hashedName(b64, "Mi Foto Ñoña!!.JPG");
  const b = hashedName(b64, "Mi Foto Ñoña!!.JPG");
  assert.equal(a, b, "mismo contenido + nombre → mismo archivo");
  assert.match(a, /^mi-foto-nona-[0-9a-f]{12}\.webp$/);
  const c = hashedName(Buffer.from("otro-contenido").toString("base64"), "Mi Foto Ñoña!!.JPG");
  assert.notEqual(a, c, "contenido distinto → archivo distinto");
});

test("optimizeImage convierte a WebP y recorta portadas a 16:10", async () => {
  // PNG sintético de 3000×1000 (más ancho que el tope).
  const png = await sharp({
    create: { width: 3000, height: 1000, channels: 3, background: { r: 10, g: 20, b: 200 } },
  })
    .png()
    .toBuffer();
  const general = Buffer.from(await optimizeImage(png.toString("base64")), "base64");
  const gMeta = await sharp(general).metadata();
  assert.equal(gMeta.format, "webp");
  assert.equal(gMeta.width, 1920, "ancho topado a 1920");

  const cover = Buffer.from(await optimizeImage(png.toString("base64"), { cover: COVER_SIZE }), "base64");
  const cMeta = await sharp(cover).metadata();
  assert.equal(cMeta.format, "webp");
  assert.equal(cMeta.width, COVER_SIZE.width);
  assert.equal(cMeta.height, COVER_SIZE.height, "portadas normalizadas a 16:10");
});

test("validateCategories exige lista única, no vacía y con tope de largo", () => {
  assert.deepEqual(validateCategories(["Admisiones", "Becas"]), ["Admisiones", "Becas"]);
  assert.throws(() => validateCategories([]), /al menos una/);
  assert.throws(() => validateCategories(["A", "a"]), /repetidas/);
  assert.throws(() => validateCategories(["", "B"]), /vacía/);
  assert.throws(() => validateCategories(["x".repeat(41)]), /larga/);
  assert.throws(() => validateCategories("no-lista" as unknown), /lista/);
});
