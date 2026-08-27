import { test, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

// Auditoría de accesibilidad automática (axe-core) sobre las pantallas
// principales del panel. Falla el CI si aparece una violación de impacto
// SERIO o CRÍTICO (contraste, roles, nombres accesibles, etc.), así una
// regresión de a11y no llega a producción. Corre en el job E2E existente.

const FORMS = {
  pages: { prueba: "Prueba E2E" },
  siteUrl: "",
  publish: { toProd: true, where: "el sitio", url: "" },
  catalog: {},
  schema: {
    hero: {
      label: "Hero (encabezado)",
      fields: [
        { name: "background", type: "select", label: "Fondo", options: ["brand", "dark", "light"] },
        { name: "align", type: "select", label: "Alineación", options: ["left", "center"] },
        { name: "heading", type: "textarea", label: "Título" },
        { name: "description", type: "textarea", label: "Descripción" },
        { name: "image", type: "image", label: "Imagen" },
      ],
    },
    stats: {
      label: "Métricas",
      fields: [
        { name: "columns", type: "select", label: "Columnas", options: ["2", "3", "4"] },
        { name: "items", type: "array", label: "Métricas", addLabel: "Agregar métrica", item: [
          { name: "value", type: "text", label: "Valor" },
          { name: "label", type: "text", label: "Etiqueta" },
        ] },
      ],
    },
  },
};

const PAGE = {
  title: "Prueba E2E", _sha: "e2e",
  blocks: [
    { _type: "hero", background: "brand", align: "left", heading: "Título", description: "desc" },
    { _type: "stats", columns: 3, items: [{ value: "1", label: "uno" }] },
  ],
};

async function mock(page: Page, role = "admin"): Promise<void> {
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (d: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(d) });
    if (url.endsWith("/api/me")) return json({ name: "E2E", email: "e2e@iidea.edu.ec", csrf: "t", role });
    if (url.endsWith("/api/team")) return json({ me: { email: "e2e@iidea.edu.ec", name: "E2E", role }, allowedDomain: "iidea.edu.ec", allowedEmails: ["invitado@gmail.com"], adminEmails: ["jefe@iidea.edu.ec"], everyoneAdmin: false, tenant: "organizations" });
    if (url.includes("/api/brand")) return json({ voice: { tone: "cercano", do: ["Frases cortas"], dont: ["Relleno"] }, audience: "Estudiantes", mission: "M", vision: "V", valueProps: ["100% online"], keyPhrases: ["Empieza este mes"], boilerplate: "IIDEA…", rules: ["No nombres a la competencia"], sources: "Sitio oficial", imageGuide: [{ use: "Portada", size: "cover", notes: "16:10" }] });
    if (url.endsWith("/api/forms")) return json(FORMS);
    if (url.includes(`/api/pages/prueba`)) return json({ ...PAGE, _sha: "a11y" });
    if (url.includes("/api/media/usage")) return json({ usages: [] });
    if (url.includes("/api/media")) return json({ items: [{ name: "a.webp", path: "/uploads/a.webp", size: 1000, folder: "" }], folders: [], siteUrl: "" });
    if (url.includes("/api/automation/competitors")) return json({ gaps: [], recentTitles: [], competitors: [] });
    if (url.includes("/api/automation")) return json({
      enabled: false, schedule: { perWeek: 1, days: ["tue"], time: "09:00", timezone: "America/Guayaquil" },
      topics: ["Becas"], sources: [], competitors: { domains: [], lookbackDays: 30, postsPerCompetitor: 5 },
      generation: { minWords: 900, maxWords: 1200, tone: "profesional", language: "es" },
    });
    if (url.includes("/api/settings")) return json({
      contact: { phone: "+593", phoneLabel: "+593", whatsapp: "593", email: "a@b.ec", becasEmail: "b@b.ec", address: "Quito" },
      social: { facebook: "https://facebook.com/x", instagram: "https://instagram.com/x" },
      urls: { aulaVirtual: "https://a.ec", video: "https://y.com", apply: "#a" },
      nav: [{ label: "Inicio", href: "/" }],
    });
    if (url.includes("/api/theme")) return json({
      themeId: "default", label: "Base", colors: { ink: "#01154a", cloud: "#f4f6fb", accent: [{ color: "#3a4fe3", at: 0 }, { color: "#f0617e", at: 100 }] },
      promoBanner: { enabled: false, text: "", ctaLabel: "", ctaHref: "", bg: "#01154a", fg: "#ffffff" },
      seasonal: { effect: "none", intensity: "medium" }, tracking: { clarityId: "" },
    });
    // Fechas de inicio: una pasada y dos futuras (el esquema exige que quede
    // alguna futura, así que se calculan desde hoy y no caducan solas).
    if (url.includes("/api/intakes")) {
      const iso = (n: number) => { const h = new Date(); const d = new Date(h.getFullYear(), h.getMonth() + n, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-12`; };
      return json({ _note: "calendario", intakes: [iso(-3), iso(2), iso(5)], _sha: "i" });
    }
    if (url.includes("/api/categories")) return json({ categories: ["General", "Becas"], usage: { General: 1, Becas: 0 } });
    if (url.includes("/api/agent/usage")) return json({ tokens: { total: 1000, input: 700, output: 300 }, budget: 0, estCostUsd: "0.01", byUser: [], limits: { ratePerHour: 30 }, month: "2026-07" });
    if (url.includes("/api/deploy-status")) return json({ state: "success", branch: "main" });
    if (/\/api\/posts\/[^/?]+/.test(url) && method === "GET") return json({ slug: "nota-1", title: "Nota", cat: "General", date: "2026-01-01", author: "Ana", tags: [], body: "Cuerpo", draft: false, img: "/uploads/a.webp", imgAlt: "alt", _sha: "p" });
    if (url.includes("/api/posts")) return json({ posts: [{ slug: "nota-1", title: "Nota", author: "Ana", draft: false, date: "2026-01-01" }], categories: ["General", "Becas"] });
    if (url.includes("/api/careers/")) return json({ title: "Ingeniería", _sha: "c" });
    if (url.includes("/api/careers")) return json({ careers: { ingenieria: "Ingeniería" }, form: { fields: [{ name: "title", type: "text", label: "Título" }] } });
    if (url.includes("/api/revisions")) return json({ revisions: [] });
    return json({ ok: true });
  });
}

// Pantalla → selector que confirma que terminó de pintarse antes de auditar.
const SCREENS: Array<{ hash: string; ready: string }> = [
  { hash: "dashboard", ready: "#glance" },
  { hash: "posts", ready: ".wp-list-table" },
  { hash: "pages", ready: ".vc-cards, .wp-list-table, .postbox" },
  { hash: "media", ready: ".media-grid" },
  { hash: "categories", ready: ".cat-manage" },
  { hash: "automation", ready: ".ba-toggle" },
  // Las dos pantallas de IA: el asistente (registro en vivo, selector de modo)
  // y la cola de revisión. Antes quedaban fuera de la auditoría.
  { hash: "agent", ready: ".wp-agent .mode-btn" },
  { hash: "review", ready: ".review-list" },
  { hash: "settings", ready: ".postbox" },
  { hash: "team", ready: ".team-list" },
  { hash: "brand", ready: ".brand-slots" },
  { hash: "appearance", ready: ".theme-editor" },
  { hash: "intakes", ready: ".intake-row" },
  { hash: "page/prueba", ready: "#gb-canvas .vc-block" },
  { hash: "post/nota-1", ready: ".post-body-box" },
];

for (const s of SCREENS) {
  test(`a11y: "${s.hash}" sin violaciones serias/críticas`, async ({ page }) => {
    await mock(page);
    await page.goto(`/editor.html#${s.hash}`);
    await page.locator(s.ready).first().waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const summary = bad.map((v) => `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.help}`).join("\n");
    expect(bad, `Violaciones a11y en #${s.hash}:\n${summary}`).toEqual([]);
  });
}

// El botón "Cerrar menú" hacía fallar la auditoría de #posts SOLO en CI: hereda
// su fondo de .adminmenu, que es position:fixed, y axe no siempre resuelve el
// fondo a través de un ancestro fijo — caía al de página (#f0f0f1) y calculaba
// 2,05:1 sobre un fondo que el elemento nunca tiene (el real es 6,81:1).
//
// Esta prueba fija la CAUSA, no el síntoma: mientras el fondo sea explícito y
// opaco, el cálculo es determinista en cualquier entorno.
test("el botón de plegar menú declara su propio fondo (a11y determinista)", async ({ page }) => {
  await mock(page);
  await page.goto("/editor.html#posts");
  await page.locator(".collapse-menu").first().waitFor();

  const bg = await page.locator(".collapse-menu").first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);

  expect(bg, "sin fondo propio, axe lo mide contra el fondo de página").not.toBe("rgba(0, 0, 0, 0)");
  expect(bg, "debe ser el color del menú lateral (#1d2327)").toBe("rgb(29, 35, 39)");
});
