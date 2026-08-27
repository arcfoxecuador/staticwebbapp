// Contratos de las rutas HTTP del panel.
//
// server.ts —1.365 líneas y 50 rutas— no tenía NINGUNA prueba, y no por
// descuido: importarlo abría un puerto y arrancaba el programador, así que era
// imposible. Los E2E simulaban las /api con page.route, o sea que la UI se
// verificaba contra una idea del servidor y no contra el servidor: si una ruta
// cambiaba de forma, el simulacro seguía mintiendo y todo quedaba verde.
//
// El barrido NO lleva una lista escrita a mano: enumera las rutas del router
// real. Una ruta nueva entra sola en la prueba, y si nace sin protección, falla
// sin que nadie tenga que acordarse de añadirla aquí.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { app } from "../src/server.js";
import { requireAuth, requireAdmin } from "../src/auth.js";

interface Ruta { metodo: string; ruta: string }

// Rutas reales registradas en Express, con los parámetros resueltos a un valor
// cualquiera (":slug" → "x") para poder llamarlas.
function rutasDelPanel(): Ruta[] {
  const stack = (app as unknown as { _router?: { stack: any[] } })._router?.stack ?? [];
  const out: Ruta[] = [];
  for (const capa of stack) {
    const r = capa?.route;
    if (!r?.path || typeof r.path !== "string") continue;
    for (const [metodo, activo] of Object.entries(r.methods ?? {})) {
      if (activo) out.push({ metodo: metodo.toUpperCase(), ruta: r.path.replace(/:[^/]+/g, "x") });
    }
  }
  return out;
}

let RUTAS: Ruta[] = [];
before(() => {
  RUTAS = rutasDelPanel();
});

// Públicas a propósito: el health check del despliegue y el login.
const PUBLICAS = new Set(["/healthz", "/login", "/logout", "/auth/microsoft", "/auth/microsoft/callback"]);
const esApi = (r: Ruta) => r.ruta.startsWith("/api/");
const esLectura = (r: Ruta) => r.metodo === "GET" || r.metodo === "HEAD";

test("el router expone rutas (si esto falla, el barrido no está probando nada)", () => {
  assert.ok(RUTAS.length >= 40, `solo se enumeraron ${RUTAS.length} rutas`);
  assert.ok(RUTAS.some((r) => r.ruta === "/api/theme"), "no se reconoce una ruta conocida");
});

test("ninguna lectura de /api responde sin sesión", async () => {
  const fugas: string[] = [];
  const objetivo = RUTAS.filter((r) => esApi(r) && esLectura(r) && !PUBLICAS.has(r.ruta));
  // Sin esto, un filtro que se quedara vacío daría verde sin probar nada.
  assert.ok(objetivo.length >= 20, `solo ${objetivo.length} lecturas barridas`);
  for (const r of objetivo) {
    const res = await request(app).get(r.ruta);
    if (res.status !== 401) fugas.push(`${r.metodo} ${r.ruta} → ${res.status}`);
  }
  assert.deepEqual(fugas, [], `rutas que contestan sin sesión:\n${fugas.join("\n")}`);
});

test("ninguna escritura de /api pasa sin token CSRF", async () => {
  // El CSRF corre ANTES que la sesión, así que sin sesión una mutación da 403
  // (no 401): están doblemente cerradas.
  const fugas: string[] = [];
  const objetivo = RUTAS.filter((r) => esApi(r) && !esLectura(r));
  assert.ok(objetivo.length >= 15, `solo ${objetivo.length} escrituras barridas`);
  for (const r of objetivo) {
    const m = r.metodo.toLowerCase() as "post" | "put" | "delete" | "patch";
    const res = await (request(app) as any)[m](r.ruta).send({});
    if (res.status !== 403) fugas.push(`${r.metodo} ${r.ruta} → ${res.status}`);
  }
  assert.deepEqual(fugas, [], `mutaciones sin CSRF que no dan 403:\n${fugas.join("\n")}`);
});

test("un token CSRF equivocado tampoco sirve", async () => {
  const res = await request(app).put("/api/theme").set("X-CSRF-Token", "inventado").send({});
  assert.equal(res.status, 403);
  assert.match(res.body.error, /CSRF/i);
});

test("/healthz es público y no filtra nada sensible", async () => {
  const res = await request(app).get("/healthz");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.deepEqual(Object.keys(res.body).sort(), ["status", "uptimeSeconds"]);
});

test("las cabeceras de seguridad viajan en todas las respuestas", async () => {
  const res = await request(app).get("/healthz");
  assert.match(res.headers["content-security-policy"] ?? "", /default-src 'self'/);
  assert.match(res.headers["content-security-policy"] ?? "", /frame-ancestors 'none'/);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.ok(res.headers["referrer-policy"], "falta Referrer-Policy");
});

test("la CSP no permite scripts en línea (un XSS almacenado no se ejecuta)", async () => {
  const csp = (await request(app).get("/healthz")).headers["content-security-policy"] ?? "";
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/, "'unsafe-inline' en script-src anula la CSP");
});

test("un cuerpo enorme se rechaza antes de procesarlo", async () => {
  const res = await request(app)
    .put("/api/theme")
    .set("Content-Type", "application/json")
    .send(JSON.stringify({ x: "a".repeat(2 * 1024 * 1024) }));
  assert.ok(res.status === 413 || res.status === 403, `esperaba 413 o 403, vino ${res.status}`);
});

// ── Las guardas, directamente ───────────────────────────────────────────────
// No se pueden ejercitar por HTTP sin una sesión real (el login es de Microsoft),
// así que se prueban como lo que son: middlewares.

const respuestaFalsa = () => {
  const r: any = { code: 0, body: null, redirigido: "" };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.redirect = (u: string) => { r.redirigido = u; return r; };
  return r;
};

test("requireAuth: sin sesión, /api recibe 401 en JSON", () => {
  const res = respuestaFalsa();
  let siguio = false;
  requireAuth({ path: "/api/theme", isAuthenticated: () => false } as any, res, () => { siguio = true; });
  assert.equal(siguio, false);
  assert.equal(res.code, 401);
  assert.equal(res.body.error, "No autenticado");
});

test("requireAuth: sin sesión, una página redirige al login (no un 401 crudo)", () => {
  const res = respuestaFalsa();
  requireAuth({ path: "/editor.html", isAuthenticated: () => false } as any, res, () => {});
  assert.equal(res.redirigido, "/login");
});

test("requireAuth: con sesión, deja pasar", () => {
  let siguio = false;
  requireAuth(
    { path: "/api/theme", isAuthenticated: () => true, user: { email: "a@b.c" } } as any,
    respuestaFalsa(),
    () => { siguio = true; },
  );
  assert.equal(siguio, true);
});

test("requireAdmin: un editor autenticado recibe 403, no 401", () => {
  const res = respuestaFalsa();
  let siguio = false;
  requireAdmin({ user: { role: "editor" } } as any, res, () => { siguio = true; });
  assert.equal(siguio, false);
  assert.equal(res.code, 403);
  assert.match(res.body.error, /administradores/i);
});

test("requireAdmin: sin usuario tampoco pasa", () => {
  const res = respuestaFalsa();
  requireAdmin({} as any, res, () => { throw new Error("no debía pasar"); });
  assert.equal(res.code, 403);
});

test("requireAdmin: un admin pasa", () => {
  let siguio = false;
  requireAdmin({ user: { role: "admin" } } as any, respuestaFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});
