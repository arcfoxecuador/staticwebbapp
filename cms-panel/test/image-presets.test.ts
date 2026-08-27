// Medidas de imagen: optimizeImage recorta a la proporción del preset elegido.
// Es pura (sharp, sin red), así que se prueba directo.

import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

import { optimizeImage, IMAGE_PRESETS, COVER_SIZE } from "../src/lib/images.js";

// Imagen de prueba (cuadrada, sólida) como base64 PNG.
async function testImage(w = 900, h = 900): Promise<string> {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 80, b: 200 } } }).png().toBuffer();
  return buf.toString("base64");
}
async function dims(base64: string): Promise<{ width: number; height: number }> {
  const m = await sharp(Buffer.from(base64, "base64")).metadata();
  return { width: m.width ?? 0, height: m.height ?? 0 };
}

test("cada preset recorta a sus dimensiones exactas (fit cover)", async () => {
  const src = await testImage();
  for (const [name, size] of Object.entries(IMAGE_PRESETS)) {
    const out = await optimizeImage(src, { cover: size });
    assert.deepEqual(await dims(out), { width: size.width, height: size.height }, `preset ${name}`);
  }
});

test("las proporciones son las esperadas (wide 16:9, cover 16:10, portrait 4:5, square 1:1)", () => {
  const ratio = (s: { width: number; height: number }) => +(s.width / s.height).toFixed(3);
  assert.equal(ratio(IMAGE_PRESETS.wide), +(16 / 9).toFixed(3));
  assert.equal(ratio(IMAGE_PRESETS.cover), 1.6);
  assert.equal(ratio(IMAGE_PRESETS.landscape), +(4 / 3).toFixed(3));
  assert.equal(ratio(IMAGE_PRESETS.portrait), 0.8);
  assert.equal(ratio(IMAGE_PRESETS.square), 1);
});

test("COVER_SIZE es un alias del preset 'cover' (compatibilidad)", () => {
  assert.deepEqual(COVER_SIZE, IMAGE_PRESETS.cover);
});

test("sin preset (maxWidth) NO agranda una imagen pequeña", async () => {
  const src = await testImage(600, 600);
  const out = await optimizeImage(src, { maxWidth: 1920 });
  assert.deepEqual(await dims(out), { width: 600, height: 600 });
});
