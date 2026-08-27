// Tests del proveedor de imágenes (Nano Banana / Google Gemini).
// config.ts e images.ts leen el entorno al importarse y la generación hace fetch,
// así que ejercitamos la lógica en un proceso hijo con el entorno controlado y
// (en el caso feliz) fetch mockeado — mismo patrón que security.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function run(env: Record<string, string>, body: string): { ok: boolean; output: string } {
  try {
    const out = execFileSync(
      "npx",
      ["tsx", "-e", `(async()=>{${body}})().catch(e=>{console.error(e.message);process.exit(1)})`],
      { env: { ...process.env, ...env }, stdio: "pipe" },
    );
    return { ok: true, output: out.toString() };
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message?: string };
    return { ok: false, output: String(err.stderr ?? err.stdout ?? err.message ?? "") };
  }
}

test("generateImage falla con un mensaje claro si el proveedor está en none", () => {
  const r = run(
    { IMAGE_PROVIDER: "none" },
    `const {generateImage}=await import('./src/lib/images.ts'); await generateImage('hola');`,
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /desactivada/);
});

test("el proveedor gemini exige GEMINI_API_KEY", () => {
  const r = run(
    { IMAGE_PROVIDER: "gemini", GEMINI_API_KEY: "" },
    `const {generateImage}=await import('./src/lib/images.ts'); await generateImage('hola');`,
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /GEMINI_API_KEY/);
});

test("gemini extrae el base64 de inlineData en la respuesta de generateContent", () => {
  const body = `
    globalThis.fetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [ { text: 'descripcion' }, { inlineData: { data: 'QUJD' } } ] } }]
    }), { status: 200 });
    const {generateImage}=await import('./src/lib/images.ts');
    const img = await generateImage('una portada navideña');
    console.log('B64:' + img.base64);
  `;
  const r = run({ IMAGE_PROVIDER: "gemini", GEMINI_API_KEY: "test-key" }, body);
  assert.equal(r.ok, true, r.output);
  assert.match(r.output, /B64:QUJD/);
});

// ── Barrera anti-marcas en las imágenes generadas ────────────────────────────
// Dos heros seguidos de /nosotros salieron con marcas que no son nuestras
// ("EDUTECH ECUADOR" en una pantalla, un logo de "EDUCARED" en la pared) y se
// publicaron. La restricción se aplica AQUÍ —el único punto por el que pasan la
// herramienta de medios, la portada de blog y la automatización— para que se
// cumpla aunque el agente no la escriba en su prompt.
test("todo prompt enviado al proveedor lleva la restricción de sin texto ni logos", () => {
  const body = `
    let enviado = '';
    globalThis.fetch = async (_u, init) => {
      enviado = JSON.parse(init.body).contents[0].parts[0].text;
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ inlineData: { data: 'QUJD' } }] } }]
      }), { status: 200 });
    };
    const {generateImage}=await import('./src/lib/images.ts');
    await generateImage('estudiantes colaborando en una mesa');
    console.log('PROMPT:' + enviado.replace(/\\n/g, ' '));
  `;
  const r = run({ IMAGE_PROVIDER: "gemini", GEMINI_API_KEY: "test-key" }, body);
  assert.equal(r.ok, true, r.output);
  // El prompt del agente se conserva…
  assert.match(r.output, /estudiantes colaborando en una mesa/);
  // …y encima viajan las prohibiciones, que es lo que faltaba.
  assert.match(r.output, /Sin texto legible/i);
  assert.match(r.output, /Sin logotipos ni nombres de marca/i);
  assert.match(r.output, /inventados/i);
});
