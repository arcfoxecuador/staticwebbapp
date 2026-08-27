// El agente de blogs no puede publicar con una portada inventada: la ruta de
// imagen debe existir de verdad en el repo. La verificación es fileExists()
// (github.ts), que consulta la API de GitHub. Mockeamos fetch en un proceso hijo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function run(body: string): { ok: boolean; output: string } {
  try {
    const out = execFileSync(
      "npx",
      ["tsx", "-e", `(async()=>{${body}})().catch(e=>{console.error(e.message);process.exit(1)})`],
      { env: { ...process.env, GITHUB_TOKEN: "test-token" }, stdio: "pipe" },
    );
    return { ok: true, output: out.toString() };
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message?: string };
    return { ok: false, output: String(err.stderr ?? err.stdout ?? err.message ?? "") };
  }
}

test("fileExists devuelve false si la imagen NO existe (404) — ruta inventada", () => {
  const r = run(
    `globalThis.fetch = async () => new Response('{"message":"Not Found"}', { status: 404 });
     const { fileExists } = await import('./src/lib/github.ts');
     console.log('R:' + await fileExists('public/news/no-existe-1.png'));`,
  );
  assert.equal(r.ok, true, r.output);
  assert.match(r.output, /R:false/);
});

test("fileExists devuelve true si la imagen SÍ existe (200)", () => {
  const r = run(
    `globalThis.fetch = async () => new Response(JSON.stringify({ content: 'eA==', encoding: 'base64' }), { status: 200 });
     const { fileExists } = await import('./src/lib/github.ts');
     console.log('R:' + await fileExists('public/estudiar-online.webp'));`,
  );
  assert.equal(r.ok, true, r.output);
  assert.match(r.output, /R:true/);
});
