// Tests de endurecimiento (punto 4):
// 1) redact() oculta el token de GitHub de cualquier mensaje de error/log.
// 2) config.ts exige SESSION_SECRET en producción y rechaza el valor por defecto.
//
// El #2 se prueba cargando config.ts en un proceso hijo con un entorno
// controlado, porque la validación corre una sola vez al importar el módulo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { redact } from "../src/lib/github.js";
import { requireAdmin } from "../src/auth.js";

// Arranca config.ts en un hijo con el entorno dado. Devuelve si arrancó y su salida.
function loadConfig(env: Record<string, string>): { ok: boolean; output: string } {
  try {
    execFileSync("npx", ["tsx", "-e", "import('./src/config.ts').catch(e=>{console.error(e.message);process.exit(1)})"], {
      env: { ...process.env, ...env },
      stdio: "pipe",
    });
    return { ok: true, output: "" };
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message?: string };
    return { ok: false, output: String(err.stderr ?? err.stdout ?? err.message ?? "") };
  }
}

test("redact() oculta tokens con formato GitHub", () => {
  const leak = "GitHub POST /repos → 401: token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345 inválido";
  const safe = redact(leak);
  assert.ok(!safe.includes("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"), "el token no debe aparecer");
  assert.ok(safe.includes("[REDACTED]"));
});

test("config exige SESSION_SECRET en producción (rechaza el default)", () => {
  const r = loadConfig({ NODE_ENV: "production", SESSION_SECRET: "cambia-esto-en-produccion" });
  assert.equal(r.ok, false, "el arranque debió fallar con el secreto por defecto");
  assert.match(r.output, /SESSION_SECRET/);
});

test("config arranca en producción con un SESSION_SECRET válido", () => {
  const r = loadConfig({ NODE_ENV: "production", SESSION_SECRET: "0a1b2c3d4e5f60718293a4b5c6d7e8f9-largo-y-aleatorio" });
  assert.equal(r.ok, true, r.output);
});

// ── requireAdmin: la barrera de autorización de las acciones globales ────────
// Protege PUT /api/theme, PUT /api/categories, DELETE /api/media, POST /api/promote
// y GET /api/agent/usage. Es autoritativa del lado del servidor: el rol viene de
// la sesión (M365 + roleFor), no del cliente, así que no se puede falsificar.
function fakeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(obj: unknown) { this.body = obj; return this; },
  };
}

test("requireAdmin deja pasar a un admin (next, sin responder)", () => {
  const res = fakeRes();
  let nexted = false;
  requireAdmin({ user: { role: "admin" } } as never, res as never, () => { nexted = true; });
  assert.equal(nexted, true, "debe llamar a next()");
  assert.equal(res.statusCode, 0, "no debe responder");
});

test("requireAdmin bloquea a un editor con 403 (sin llamar next)", () => {
  const res = fakeRes();
  let nexted = false;
  requireAdmin({ user: { role: "editor" } } as never, res as never, () => { nexted = true; });
  assert.equal(nexted, false, "no debe continuar la cadena");
  assert.equal(res.statusCode, 403);
  assert.match((res.body as { error: string }).error, /administradores/i);
});

test("requireAdmin bloquea a una sesión sin rol (defensivo)", () => {
  const res = fakeRes();
  let nexted = false;
  requireAdmin({} as never, res as never, () => { nexted = true; });
  assert.equal(nexted, false);
  assert.equal(res.statusCode, 403);
});
