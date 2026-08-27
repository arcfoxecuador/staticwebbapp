// Motor de investigación: parsers puros + investigación de fuentes/competencia
// con un fetch simulado (sin red).

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseFeed, parseSitemap, discoverFeedUrl, htmlToText, keywords, topicGaps } from "../src/lib/research/parse.js";
import { isAllowed } from "../src/lib/research/robots.js";
import { researchSource } from "../src/lib/research/sources.js";
import { researchCompetitors } from "../src/lib/research/competitors.js";
import { sourceSchema } from "../src/lib/blogAutomationSchema.js";

// ── fetch simulado: mapa URL → cuerpo (404 si no está) ───────────────────────
function mockFetch(routes: Record<string, { status?: number; body: string }>): typeof fetch {
  return (async (input: unknown) => {
    const url = String(input);
    const r = routes[url];
    const status = r ? r.status ?? 200 : 404;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (r ? r.body : ""),
    } as Response;
  }) as unknown as typeof fetch;
}

const src = (over: Record<string, unknown>) => sourceSchema.parse(over);
const NOW = () => new Date("2026-07-20T12:00:00Z");

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Fuente</title>
<item><title>Becas 2026 abiertas</title><link>https://f.com/becas</link><pubDate>Wed, 15 Jul 2026 10:00:00 GMT</pubDate><description>Nuevas becas para estudiantes</description></item>
<item><title>Feria de empleo antigua</title><link>https://f.com/empleo</link><pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate><description>evento pasado</description></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Comp</title>
<entry><title>Marketing digital para pymes</title><link rel="alternate" href="https://rival.com/mkt-pymes"/><updated>2026-07-10T00:00:00Z</updated><summary>guía</summary></entry>
<entry><title>Marketing digital con IA</title><link href="https://rival.com/mkt-ia"/><published>2026-07-05T00:00:00Z</published></entry>
</feed>`;

// ── parsers puros ────────────────────────────────────────────────────────────
test("parseFeed lee ítems RSS (título, enlace, fecha)", () => {
  const items = parseFeed(RSS);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Becas 2026 abiertas");
  assert.equal(items[0].link, "https://f.com/becas");
  assert.equal(items[0].date?.getUTCFullYear(), 2026);
});

test("parseFeed lee Atom y toma el link rel=alternate", () => {
  const items = parseFeed(ATOM);
  assert.equal(items.length, 2);
  assert.equal(items[0].link, "https://rival.com/mkt-pymes");
  assert.equal(items[1].link, "https://rival.com/mkt-ia");
});

test("parseSitemap devuelve enlaces con lastmod", () => {
  const sm = `<urlset><url><loc>https://x.com/a</loc><lastmod>2026-07-01</lastmod></url><url><loc>https://x.com/b</loc></url></urlset>`;
  const out = parseSitemap(sm);
  assert.equal(out.length, 2);
  assert.equal(out[0].link, "https://x.com/a");
  assert.equal(out[1].date, null);
});

test("discoverFeedUrl resuelve un feed declarado en el HTML", () => {
  const html = `<head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head>`;
  assert.equal(discoverFeedUrl(html, "https://site.com/blog"), "https://site.com/feed.xml");
});

test("htmlToText quita etiquetas y scripts", () => {
  assert.equal(htmlToText("<p>Hola <b>mundo</b></p><script>x()</script>"), "Hola mundo");
});

test("topicGaps resalta temas de la competencia ausentes en los míos", () => {
  const titles = ["Marketing digital para pymes", "Marketing digital con IA", "Publicidad en redes"];
  const gaps = topicGaps(titles, ["Becas y ayudas"]);
  assert.ok(gaps.includes("marketing"), `esperaba 'marketing' en ${gaps}`);
  assert.ok(gaps.includes("digital"));
  assert.ok(!gaps.includes("becas"));
});

test("keywords normaliza acentos y quita stopwords", () => {
  const k = keywords("La Metodología dual con Inteligencia");
  assert.ok(k.includes("metodologia"));
  assert.ok(k.includes("inteligencia"));
  assert.ok(!k.includes("con"));
});

// ── robots.txt ───────────────────────────────────────────────────────────────
test("isAllowed respeta Disallow del grupo *", () => {
  const robots = "User-agent: *\nDisallow: /privado";
  assert.equal(isAllowed(robots, "/privado/x"), false);
  assert.equal(isAllowed(robots, "/publico"), true);
  assert.equal(isAllowed("", "/lo-que-sea"), true);
});

// ── researchSource ───────────────────────────────────────────────────────────
test("researchSource: feed + filtro de palabras + fecha", async () => {
  const s = src({ url: "https://f.com/rss.xml", keywordFilter: "becas", newerThanDays: 30, maxResults: 10 });
  const res = await researchSource(s, { fetchFn: mockFetch({ "https://f.com/rss.xml": { body: RSS } }), now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1); // "empleo antigua" cae por fecha; solo "becas" por palabra
  assert.equal(res.items[0].title, "Becas 2026 abiertas");
});

test("researchSource: HTML con feed descubierto", async () => {
  const html = `<head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head><body>hola</body>`;
  const s = src({ url: "https://site.com/blog" });
  const res = await researchSource(s, {
    fetchFn: mockFetch({ "https://site.com/blog": { body: html }, "https://site.com/rss.xml": { body: RSS } }),
    now: NOW,
  });
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 2);
});

test("researchSource: HTML sin feed → la página como un ítem", async () => {
  const s = src({ url: "https://plain.com/page" });
  const res = await researchSource(s, { fetchFn: mockFetch({ "https://plain.com/page": { body: "<title>Título</title><p>cuerpo</p>" } }), now: NOW });
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].title, "Título");
});

test("researchSource: fuente requerida que falla → ok:false", async () => {
  const s = src({ url: "https://down.com/rss", required: true });
  const res = await researchSource(s, { fetchFn: mockFetch({}), now: NOW }); // 404
  assert.equal(res.ok, false);
  assert.equal(res.required, true);
  assert.ok(res.error);
});

test("researchSource: robots.txt bloquea → ok:false", async () => {
  const s = src({ url: "https://blocked.com/secreto/post" });
  const res = await researchSource(s, {
    fetchFn: mockFetch({ "https://blocked.com/robots.txt": { body: "User-agent: *\nDisallow: /secreto" } }),
    now: NOW,
  });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /robots/i);
});

// ── researchCompetitors ──────────────────────────────────────────────────────
test("researchCompetitors: encuentra feed por ruta común + calcula huecos", async () => {
  const routes = {
    "https://rival.com/": { body: "<html>sin feed declarado</html>" },
    "https://rival.com/feed": { body: ATOM },
  };
  const res = await researchCompetitors(
    { domains: ["rival.com"], lookbackDays: 60, postsPerCompetitor: 5 },
    ["Becas y ayudas"],
    { fetchFn: mockFetch(routes), now: NOW },
  );
  assert.equal(res.competitors[0].ok, true);
  assert.equal(res.competitors[0].posts.length, 2);
  assert.ok(res.gaps.includes("marketing"), `huecos: ${res.gaps}`);
});
