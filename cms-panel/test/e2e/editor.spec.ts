import { test, expect, type Page } from "@playwright/test";

// Suite "humo" del editor de páginas: carga la UI real con /api simuladas y
// verifica los flujos que las pruebas unitarias no cubren (renderizar el lienzo,
// editar in-situ, agregar piezas/ítems y guardar el JSON correcto).

// Esquema con la forma real que entrega /api/forms (incluye el campo "variants"
// del bloque de contenido libre). Es un subconjunto suficiente para el humo.
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
        { name: "imageSide", type: "select", label: "Lado de la imagen", options: ["left", "right"] },
        { name: "eyebrow", type: "text", label: "Etiqueta" },
        { name: "heading", type: "textarea", label: "Título" },
        { name: "description", type: "textarea", label: "Descripción" },
        { name: "primaryCta", type: "cta", label: "Botón principal" },
        { name: "image", type: "image", label: "Imagen" },
      ],
    },
    stats: {
      label: "Métricas",
      fields: [
        { name: "columns", type: "select", label: "Columnas", options: ["2", "3", "4"] },
        {
          name: "items",
          type: "array",
          label: "Métricas",
          addLabel: "Agregar métrica",
          item: [
            { name: "value", type: "text", label: "Valor" },
            { name: "label", type: "text", label: "Etiqueta" },
          ],
        },
      ],
    },
    richContent: {
      label: "Contenido libre",
      fields: [
        { name: "background", type: "select", label: "Fondo", options: ["light", "tint", "brand", "dark"] },
        { name: "align", type: "select", label: "Alineación", options: ["left", "center"] },
        {
          name: "items",
          type: "variants",
          label: "Piezas",
          variantKey: "kind",
          addLabel: "Agregar pieza",
          variants: [
            { value: "heading", label: "Título", fields: [{ name: "text", type: "textarea", label: "Texto del título" }, { name: "level", type: "select", label: "Nivel", options: ["h2", "h3"] }] },
            { value: "text", label: "Texto", fields: [{ name: "text", type: "textarea", label: "Texto" }] },
            { value: "button", label: "Botón", fields: [{ name: "label", type: "text", label: "Texto" }, { name: "href", type: "text", label: "Enlace" }, { name: "style", type: "select", label: "Estilo", options: ["primary", "secondary"] }] },
          ],
        },
      ],
    },
  },
};

const PAGE = {
  title: "Prueba E2E",
  _sha: "e2e",
  blocks: [
    { _type: "hero", background: "brand", align: "left", eyebrow: "E2E", heading: "Título inicial", description: "desc", primaryCta: { label: "Aplica", href: "#a" } },
    { _type: "stats", columns: 3, items: [{ value: "1", label: "uno" }, { value: "2", label: "dos" }] },
    { _type: "richContent", background: "light", align: "left", items: [{ kind: "text", text: "parrafo inicial" }] },
  ],
};

interface Sink {
  last?: any;
  deleted?: string[];
}

async function mockApi(page: Page, sink: Sink, deployState: unknown = { state: "pending" }, pageDoc: unknown = PAGE, role = "admin"): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();
    const json = (data: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    if (url.endsWith("/api/me")) return json({ name: "E2E", email: "e2e@iidea.edu.ec", csrf: "t", role });
    if (url.endsWith("/api/team")) return json({
      me: { email: "e2e@iidea.edu.ec", name: "E2E", role },
      allowedDomain: "iidea.edu.ec",
      allowedEmails: ["invitado@gmail.com"],
      adminEmails: ["jefe@iidea.edu.ec"],
      everyoneAdmin: false,
      tenant: "organizations",
    });
    if (url.endsWith("/api/forms")) return json(FORMS);
    if (url.includes("/api/pages/")) {
      if (method !== "GET") {
        sink.last = JSON.parse(req.postData() || "{}");
        return json({ ok: true, sha: "n" });
      }
      return json(JSON.parse(JSON.stringify(pageDoc)));
    }
    if (url.includes("/api/automation/competitors")) {
      return json({
        gaps: ["Empleabilidad", "Prácticas profesionales"],
        recentTitles: ["Cómo conseguir prácticas", "Ferias de empleo 2026"],
        competitors: [
          { domain: "rival.com", ok: true, error: undefined, posts: [{ title: "Cómo conseguir prácticas", link: "https://rival.com/a", date: "2026-07-01T00:00:00Z" }] },
        ],
      });
    }
    if (url.includes("/api/automation")) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true }); }
      return json({
        enabled: false,
        schedule: { perWeek: 1, days: ["tue"], time: "09:00", timezone: "America/Guayaquil" },
        topics: ["Becas y ayudas"],
        sources: [],
        competitors: { domains: [], lookbackDays: 30, postsPerCompetitor: 5 },
        generation: { minWords: 900, maxWords: 1200, tone: "profesional y cercano", language: "es" },
      });
    }
    if (url.includes("/api/settings")) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, url: "", sha: "sha-settings-2" }); }
      return json({
        _sha: "sha-settings-1",
        contact: { phone: "+593997127287", phoneLabel: "+593 99 712 7287", whatsapp: "593997127287", email: "admisiones@iidea.edu.ec", becasEmail: "becas@iidea.edu.ec", address: "Quito, Ecuador" },
        social: { facebook: "https://facebook.com/iidea", instagram: "https://instagram.com/iidea" },
        urls: { aulaVirtual: "https://aula.iidea.edu.ec", video: "https://youtube.com/watch?v=x", apply: "#aplica" },
        nav: [
          { label: "Inicio", href: "/" },
          { label: "Nosotros", href: "/nosotros", children: [{ label: "Quiénes somos", href: "/nosotros" }, { label: "Becas", href: "/becas" }] },
          { label: "Oferta Académica", href: "/oferta", careers: true },
        ],
        footer: { institutoLinks: [{ label: "Nosotros", href: "/nosotros" }, { label: "Becas", href: "/becas" }] },
      });
    }
    if (url.includes("/api/media/rename")) {
      const body = JSON.parse(req.postData() || "{}"); sink.last = body;
      const dir = String(body.from || "").slice(0, String(body.from || "").lastIndexOf("/") + 1);
      return json({ ok: true, path: dir + body.name });
    }
    if (url.includes("/api/media/usage")) return json({ usages: [] });
    if (url.includes("/api/media")) {
      if (method === "POST") { const body = JSON.parse(req.postData() || "{}"); sink.last = body; return json({ ok: true, path: body.replacePath || `/uploads/${body.folder ? body.folder + "/" : ""}x.webp`, replaced: !!body.replacePath }); }
      if (method === "DELETE") { (sink.deleted ||= []).push(new URL(url).searchParams.get("path") || ""); return json({ ok: true }); }
      return json({
        items: [
          { name: "a.webp", path: "/uploads/a.webp", size: 1000, folder: "" },
          { name: "b.webp", path: "/uploads/carreras/b.webp", size: 2000, folder: "carreras" },
        ],
        folders: ["carreras"], siteUrl: "",
      });
    }
    if (url.includes("/api/revisions/content")) return json({ title: "Ingeniería (revisión previa)" });
    if (url.includes("/api/revisions")) {
      return json({ revisions: url.includes("type=career")
        ? [{ sha: "aaa1111", date: "2026-01-02T00:00:00Z", message: "edición actual" }, { sha: "bbb2222", date: "2025-12-01T00:00:00Z", message: "versión previa" }]
        : [] });
    }
    if (url.includes("/api/deploy-status")) return json(deployState);
    if (/\/api\/posts\/[^/?]+/.test(url)) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, slug: "nota-1", sha: "n" }); }
      return json({ slug: "nota-1", title: "Nota de prueba", cat: "General", date: "2026-01-01", author: "Ana Torres", tags: [], body: "Cuerpo", draft: false, _sha: "p" });
    }
    if (url.includes("/api/automation/run")) { sink.last = { ran: true }; return json({ ok: true, slug: "auto-nuevo-2026-07-21", title: "Nuevo borrador IA", topic: "Empleabilidad" }); }
    if (url.includes("/api/posts")) {
      return json({
        posts: [
          { slug: "nota-1", title: "Nota de prueba", author: "Ana Torres", draft: false },
          { slug: "nota-2", title: "Otra", author: "Equipo IIDEA", draft: false },
          { slug: "auto-becas-2026-07-21", title: "Becas IIDEA: guía 2026", author: "Equipo IIDEA", draft: true, autoGenerated: true, automationTopic: "Becas", date: "2026-07-21", excerpt: "Todo sobre las becas del instituto." },
        ],
        categories: ["General", "Becas"],
      });
    }
    if (/\/api\/careers\/[^/?]+/.test(url)) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, sha: "n" }); }
      return json({ title: "Ingeniería en Software", _sha: "c" });
    }
    if (url.includes("/api/career-labels")) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, sha: "cl" }); }
      return json({ ...{"hero": {"breadcrumbOferta": "Oferta Académica", "primaryCta": "Postula ahora", "secondaryCta": "Ver el plan de estudios", "fichaTitulo": "Datos de la carrera", "proximamente": "Próximamente"}, "campos": {"titulo": "Título", "nivel": "Nivel", "modalidad": "Modalidad", "duracion": "Duración", "carga": "Carga", "creditos": "Créditos", "asignaturas": "Asignaturas", "resolucion": "Resolución", "proximoInicio": "Próx. inicio", "formacionLaboral": "Formación laboral real"}, "modalidades": {"enLinea": "100% en línea", "dual": "Dual · en línea + empresa", "hibrida": "Híbrida · presencial + en línea"}, "tituloOficial": {"eyebrow": "Título que obtienes"}, "pilares": {"eyebrow": "¿Por qué IIDEA?", "heading": "Una carrera construida para el mercado real, no para el aula."}, "egreso": {"eyebrow": "Perfil de egreso", "heading": "Lo que podrás hacer al graduarte"}, "malla": {"eyebrow": "Malla curricular", "heading": "Del fundamento a la estrategia", "titulacion": "Titulación", "descargaCta": "Descargar la malla oficial (PDF)", "descargaNota": "Documento presentado al CES"}, "campoOcupacional": {"eyebrow": "¿Dónde vas a trabajar?", "heading": "Roles que se contratan hoy", "sectores": "Sectores"}, "aranceles": {"eyebrow": "Inversión 2026-II", "heading": "Una carrera que se paga por período", "verTabla": "Ver tabla completa →", "porPeriodo": "Arancel por período", "total": "Arancel total", "nota": "Matrícula: hasta el 10% del arancel por período. ¿Aplica una beca? Consúltala en <a href=\"/becas\" class=\"font-semibold text-grad\">becas</a>."}, "cierre": {"eyebrow": "IA First · 2026", "headingSufijo": ": la carrera que el mercado contrata antes de graduarte.", "textoEnLinea": "100% en línea. Currículo co-diseñado con empleadores e inserción laboral anticipada.", "textoDual": "Formación dual en empresa formadora. Currículo co-diseñado con empleadores e inserción laboral anticipada.", "textoHibrida": "Modalidad híbrida flexible. Currículo co-diseñado con empleadores e inserción laboral anticipada.", "statAsignaturas": "Asignaturas orientadas al mercado", "statPeriodos": "Períodos para graduarte", "statPractica": "Formación práctica en empresa", "statPortafolio": "Portafolio técnico verificable", "statEnLinea": "En línea · portafolio verificado"}, "noticia": {"volver": "← Noticias"}}, _sha: "cl" });
    }
    if (url.includes("/api/careers")) {
      if (method === "POST") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, slug: "contabilidad" }); }
      return json({
        careers: { ingenieria: "Ingeniería en Software", contabilidad: "Contabilidad" },
        states: {
          ingenieria: { hidden: false, proximamente: false, routeSlug: "ingenieria" },
          contabilidad: { hidden: true, proximamente: true, routeSlug: "contabilidad" },
        },
        form: { fields: [{ name: "title", type: "text", label: "Título de la carrera" }] },
      });
    }
    if (url.includes("/api/brand")) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true }); }
      return json({
        identity: { legalName: "Instituto IIDEA", type: "Instituto Superior Tecnológico", tagline: "Empieza este mes", foundedYear: "", city: "", country: "Ecuador", accreditation: "" },
        offering: { modality: "100% online", methodology: "dual con IA", startDates: "10 al año", programAreas: ["Software"] },
        audience: "Estudiantes en Ecuador",
        personas: [{ name: "Adulto que trabaja", description: "Estudia sin dejar el empleo" }],
        voice: { tone: "cercano", do: ["Frases cortas"], dont: ["Promesas exageradas"] },
        mission: "Educación online accesible", vision: "Ser referente",
        valueProps: ["100% online"], differentiators: ["Empiezas casi cualquier mes"], keyPhrases: ["Empieza este mes"], boilerplate: "IIDEA es un instituto…",
        terminology: [{ prefer: "carreras", avoid: "cursos", note: "" }],
        rules: ["No menciones a la competencia por su nombre"], compliance: ["No garantices empleo"], sources: "Sitio oficial de IIDEA",
        ctas: [{ label: "Aplica ahora", when: "cierre" }], seoKeywords: ["carreras online Ecuador"],
        imageGuide: [{ use: "Portada de una entrada", size: "cover", notes: "16:10" }],
      });
    }
    if (url.includes("/api/theme")) {
      if (method !== "GET") { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, url: "", sha: "sha-theme-2" }); }
      return json({
        _sha: "sha-theme-1",
        themeId: "default", label: "IIDEA — base",
        colors: { ink: "#01154a", cloud: "#f4f6fb", accent: [{ color: "#3a4fe3", at: 0 }, { color: "#f0617e", at: 100 }] },
        promoBanner: { enabled: false, text: "", ctaLabel: "", ctaHref: "", bg: "#01154a", fg: "#ffffff" },
        seasonal: { effect: "none", intensity: "medium" },
        tracking: { clarityId: "xjb3c8v9s9" },
      });
    }
    if (url.includes("/api/categories")) {
      if (method !== "GET") { const body = JSON.parse(req.postData() || "{}"); sink.last = body; return json({ ok: true, categories: body.categories }); }
      return json({ categories: ["General", "Becas"], usage: { General: 2, Becas: 0 }, _sha: "sha-cats-1" });
    }
    if (url.includes("/api/trash/restore")) { sink.last = JSON.parse(req.postData() || "{}"); return json({ ok: true, slug: "borrada-1" }); }
    if (url.includes("/api/trash")) {
      return json({ items: [{ slug: "borrada-1", title: "Entrada borrada", date: "2026-01-01", deletedAt: "2026-07-20T00:00:00Z", parentSha: "abc1234" }] });
    }
    if (url.includes("/api/promote")) { sink.last = { promoted: true }; return json({ ok: true, alreadyUpToDate: false, url: "" }); }
    if (url.includes("/api/agent/usage")) {
      return json({ tokens: { total: 12000, input: 8000, output: 4000 }, budget: 0, estCostUsd: "0.12", byUser: [], limits: { ratePerHour: 30 }, month: "2026-07" });
    }
    if (url.includes("/api/search")) {
      const q = new URL(url).searchParams.get("q") || "";
      return json({ results: q.length >= 3 ? [
        { type: "page", slug: "estudiantes", title: "Estudiantes", snippet: `…texto que menciona ${q} para estudiantes…` },
        { type: "post", slug: "nota-1", title: "Nota de prueba", snippet: `…el cuerpo contiene ${q} en un párrafo…` },
      ] : [] });
    }
    return json({ ok: true });
  });
}

test("carga el editor y renderiza las secciones", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(3);
});

test("edita un título en el lienzo y guarda el cambio", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block .b-h").first().waitFor();
  await page.evaluate(() => {
    const h = document.querySelector("#gb-canvas .vc-block .b-h") as HTMLElement;
    h.focus();
    h.innerText = "Título editado E2E";
    h.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  await page.click(".gb-save");
  await expect.poll(() => sink.last?.blocks?.[0]?.heading).toBe("Título editado E2E");
});

test("contenido libre: los ítems de lista renderizan su HTML (negrita/enlaces), no las etiquetas", async ({ page }) => {
  const doc = {
    title: "Prueba E2E", _sha: "e2e",
    blocks: [
      { _type: "richContent", background: "light", align: "left", items: [
        { kind: "list", ordered: true, items: ["Activa tu <b>Aula Virtual</b>", "Revisa el <a href=\"/admisiones\">calendario</a>"] },
      ] },
    ],
  };
  await mockApi(page, {}, { state: "pending" }, doc);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .b-rc-li").first().waitFor();
  // El <b> y el <a> se pintan como elementos reales (como en el sitio, set:html),
  // no como texto literal con las etiquetas visibles.
  await expect(page.locator("#gb-canvas .b-rc-litext b")).toHaveText("Aula Virtual");
  await expect(page.locator("#gb-canvas .b-rc-litext a")).toHaveText("calendario");
  await expect(page.locator("#gb-canvas")).not.toContainText("<a href");
});

test("agrega una pieza al bloque de contenido libre y guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#page/prueba");
  await page.locator(".b-addpiece .b-add").waitFor();
  await page.locator(".b-addpiece .b-add").click(); // abre el menú de piezas
  await page.locator(".b-addpiece-opt", { hasText: "Texto" }).first().click();
  await page.click(".gb-save");
  await expect.poll(() => sink.last?.blocks?.[2]?.items?.length).toBeGreaterThanOrEqual(2);
  await expect.poll(() => sink.last?.blocks?.[2]?.items?.at(-1)?.kind).toBe("text");
});

test("agrega una métrica y la guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block").nth(1).locator(".b-add", { hasText: "Agregar métrica" }).click();
  await page.click(".gb-save");
  await expect.poll(() => sink.last?.blocks?.[1]?.items?.length).toBeGreaterThanOrEqual(3);
});

test("edita el SEO de la página y lo guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#vc-seo").waitFor();
  await page.click("#vc-seo"); // abre el cajón de SEO
  // input[type=text] y no input a secas: el cajón abre con la casilla de
  // visibilidad arriba, así que el primer input ya no es el título SEO.
  const titleInput = page.locator("#vc-drawer-body input[type='text']").first();
  await titleInput.waitFor();
  await titleInput.fill("Título SEO de prueba");
  await page.locator("#vc-drawer-body textarea").first().fill("Descripción SEO de prueba");
  await page.click("#vc-drawer-close"); // cierra el cajón (los datos ya están en doc.seo)
  // El cajón sale con una transición de .2s y hasta que termina TAPA el botón
  // "Actualizar" (ambos arriba a la derecha): sin esta espera el clic caía sobre
  // el cajón y el guardado no llegaba a dispararse.
  await expect(page.locator("#vc-drawer")).not.toBeInViewport();
  await page.click(".gb-save");
  await expect.poll(() => sink.last?.seo?.title).toBe("Título SEO de prueba");
  await expect.poll(() => sink.last?.seo?.description).toBe("Descripción SEO de prueba");
});

test("oculta la página desde el cajón y lo guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#vc-seo").waitFor();
  await page.click("#vc-seo");
  const oculta = page.locator("#vc-hidden");
  await oculta.waitFor();
  await expect(oculta).not.toBeChecked(); // una página normal arranca visible
  await oculta.check();
  await page.click("#vc-drawer-close");
  await expect(page.locator("#vc-drawer")).not.toBeInViewport();
  await page.click(".gb-save");
  await expect.poll(() => sink.last?.hidden).toBe(true);
});

test("deshacer/rehacer revierte y reaplica un cambio estructural", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block").first().waitFor();
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(3);
  // Deshacer arranca deshabilitado (no hay pasos previos).
  await expect(page.locator("#vc-undo")).toBeDisabled();

  // Duplica la primera sección → 4 bloques, y "Deshacer" se habilita.
  await page.locator("#gb-canvas .vc-block").first().locator(".vc-tools button[aria-label='Duplicar']").click();
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(4);
  await expect(page.locator("#vc-undo")).toBeEnabled();

  // Deshacer → vuelve a 3; Rehacer → vuelve a 4.
  await page.click("#vc-undo");
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(3);
  await page.click("#vc-redo");
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(4);

  // Guardar tras rehacer persiste el estado con la sección duplicada.
  await page.click(".gb-save");
  await expect.poll(() => sink.last?.blocks?.length).toBe(4);
});

test("el modal de confirmación cancela y elimina una sección", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block").first().waitFor();
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(3);
  const delBtn = () => page.locator("#gb-canvas .vc-block").first().locator(".vc-tools button[aria-label='Eliminar']");

  // Cancelar mantiene la sección (no hay confirm() nativo que Playwright acepte solo).
  await delBtn().click();
  await page.locator(".cm-box").waitFor();
  await page.locator(".cm-box .button", { hasText: "Cancelar" }).click();
  await expect(page.locator(".cm-box")).toHaveCount(0);
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(3);

  // Aceptar (botón peligro) elimina la sección.
  await delBtn().click();
  await page.locator(".cm-box .button-danger").click();
  await expect(page.locator("#gb-canvas .vc-block")).toHaveCount(2);
});

test("avisa (suave) al guardar si una imagen no tiene texto alternativo", async ({ page }) => {
  const sink: Sink = {};
  const PAGE_IMG = {
    title: "Prueba E2E",
    _sha: "e2e",
    blocks: [
      // hero con imagen pero SIN imageAlt → debe disparar el aviso.
      { _type: "hero", background: "brand", align: "left", eyebrow: "E2E", heading: "H", description: "d", image: "/uploads/x.webp", primaryCta: { label: "A", href: "#a" } },
    ],
  };
  await mockApi(page, sink, { state: "success" }, PAGE_IMG);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block").first().waitFor();

  // Guardar → aparece el aviso; "Volver y añadirlo" cancela (no se guarda).
  await page.click(".gb-save");
  await expect(page.locator(".cm-box")).toContainText("texto alternativo");
  await page.locator(".cm-box .button", { hasText: "Volver" }).click();
  expect(sink.last).toBeUndefined();

  // Guardar otra vez y aceptar → se guarda igualmente (aviso NO bloqueante).
  await page.click(".gb-save");
  await page.locator(".cm-box .button", { hasText: "Guardar de todas formas" }).click();
  await expect.poll(() => sink.last?.blocks?.length).toBe(1);
});

test("la paleta de comandos (Ctrl+K) filtra y navega, y el botón Buscar la abre", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas").waitFor();

  // Ctrl+K abre la paleta; filtra por texto.
  await page.keyboard.press("Control+k");
  await expect(page.locator(".cmdk-box")).toBeVisible();
  await page.locator(".cmdk-input").fill("Prueba");
  const item = page.locator(".cmdk-item", { hasText: "Página: Prueba E2E" });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.locator(".cmdk-back")).toHaveCount(0); // se cierra al elegir
  await expect(page.locator("#gb-canvas")).toBeVisible();

  // El botón "Buscar" de la barra de administración también la abre; Esc cierra.
  await page.click("#ab-search");
  await expect(page.locator(".cmdk-box")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cmdk-back")).toHaveCount(0);
});

test("la paleta busca DENTRO del contenido (no solo por título) y navega al resultado", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas").waitFor();
  await page.keyboard.press("Control+k");
  await expect(page.locator(".cmdk-box")).toBeVisible();
  // Escribir 3+ caracteres dispara la búsqueda de contenido (con retardo).
  await page.locator(".cmdk-input").fill("becas");
  // Aparecen resultados de contenido, con fragmento donde coincide el término.
  const hit = page.locator(".cmdk-item.has-snippet", { hasText: "Estudiantes" });
  await expect(hit).toBeVisible();
  await expect(hit.locator(".cmdk-snippet")).toContainText("becas");
  // Elegir el resultado navega a esa página.
  await hit.click();
  await expect(page).toHaveURL(/#page\/estudiantes/);
});

test("la paleta no busca contenido con menos de 3 caracteres", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas").waitFor();
  await page.keyboard.press("Control+k");
  await page.locator(".cmdk-input").fill("be"); // < 3 → sin resultados de contenido
  await expect(page.locator(".cmdk-item.has-snippet")).toHaveCount(0);
});

test("atajos: la tecla ? abre la chuleta y Esc la cierra", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#dashboard");
  await page.locator("#glance").waitFor();
  await page.keyboard.press("Shift+Slash"); // "?"
  await expect(page.locator(".sc-box")).toBeVisible();
  await expect(page.locator(".sc-table")).toContainText("Guardar");
  await expect(page.locator(".sc-table kbd", { hasText: "K" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sc-back")).toHaveCount(0);
});

test("atajos: la paleta de comandos ofrece 'Atajos de teclado'", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#dashboard");
  await page.locator("#glance").waitFor();
  await page.keyboard.press("Control+k");
  await page.locator(".cmdk-input").fill("atajos");
  await page.locator(".cmdk-item", { hasText: "Atajos de teclado" }).click();
  await expect(page.locator(".sc-box")).toBeVisible();
});

test("atajos: '?' no interrumpe cuando se está escribiendo", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#dashboard");
  await page.locator("#qd-title").waitFor();
  await page.locator("#qd-title").click();
  await page.keyboard.type("¿Título?"); // el ? escrito no debe abrir la chuleta
  await expect(page.locator(".sc-box")).toHaveCount(0);
  await expect(page.locator("#qd-title")).toHaveValue("¿Título?");
});

test("páginas: el selector de secciones es una galería con miniaturas y filtra", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-ins button").first().click();
  await page.locator("#ed-picker .bp-card").first().waitFor();
  // Cada tarjeta tiene su miniatura wireframe (SVG).
  await expect(page.locator("#ed-picker .bp-card svg.bp-thumb").first()).toBeVisible();
  expect(await page.locator("#ed-picker .bp-card").count()).toBeGreaterThanOrEqual(3);
  // La búsqueda sigue filtrando (el esquema E2E tiene "Métricas").
  await page.locator("#ed-picker-search").fill("métric");
  await expect(page.locator("#ed-picker .bp-card:not([hidden])")).toHaveCount(1);
});

test("páginas: rendición de cuentas se edita in-situ (fases + documentos)", async ({ page }) => {
  const doc = { title: "P", _sha: "e", blocks: [{ _type: "accountabilityTabs", heading: "Rendición", periods: [{ year: "2026", phases: [{ number: 1, title: "Organización", description: "desc", docs: [{ title: "Acta", href: null }] }] }] }] };
  await mockApi(page, {}, { state: "pending" }, doc);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .b-acc-phase").first().waitFor();
  await expect(page.locator("#gb-canvas .b-acc-year")).toContainText("2026");
  await expect(page.locator("#gb-canvas .b-acc-doc-st.pend")).toContainText("Próximamente");
  // Añadir un documento crea una fila nueva.
  await expect(page.locator("#gb-canvas .b-acc-doc")).toHaveCount(1);
  await page.locator("#gb-canvas .b-add-sm", { hasText: "Documento" }).click();
  await expect(page.locator("#gb-canvas .b-acc-doc")).toHaveCount(2);
});

test("páginas: una imagen sin texto alternativo muestra el aviso", async ({ page }) => {
  const doc = { title: "P", _sha: "e", blocks: [{ _type: "hero", background: "brand", align: "left", imageSide: "right", heading: "H", image: "/uploads/x.webp", imageAlt: "" }] };
  await mockApi(page, {}, { state: "pending" }, doc);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .b-alt-warn").waitFor();
  await expect(page.locator("#gb-canvas .b-alt-warn")).toContainText("Sin texto alternativo");
});

test("páginas: los bloques dinámicos explican su función", async ({ page }) => {
  const doc = { title: "P", _sha: "e", blocks: [{ _type: "careerShowcase", eyebrow: "OFERTA", heading: "Nuestras carreras" }] };
  await mockApi(page, {}, { state: "pending" }, doc);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .b-dynamic").waitFor();
  await expect(page.locator("#gb-canvas .b-dynamic")).toContainText("automáticamente");
  await expect(page.locator("#gb-canvas .b-dynamic a[href='#careers']")).toBeVisible();
});

test("páginas: el hero usa un control de Disposición y 'Imagen de fondo' muestra la imagen", async ({ page }) => {
  const doc = { title: "P", _sha: "e", blocks: [{ _type: "hero", background: "brand", align: "left", imageSide: "right", eyebrow: "E", heading: "Título", description: "d", primaryCta: { label: "A", href: "#a" }, image: "/uploads/foto.webp" }] };
  await mockApi(page, {}, { state: "pending" }, doc);
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .b").first().click();
  // Un solo control "Disposición" con 3 opciones (en vez de Imagen + Alineación separados).
  const seg = page.locator(".vc-group", { hasText: "Disposición" });
  await expect(seg.locator(".vc-seg button")).toHaveCount(3);
  // Por defecto la imagen va al lado (grid), no de fondo.
  await expect(page.locator("#gb-canvas .b-hero-grid")).toHaveCount(1);
  await expect(page.locator("#gb-canvas .b-hero-hasbg")).toHaveCount(0);
  // "Imagen de fondo" → la imagen pasa a ser el fondo del hero (antes desaparecía).
  await seg.locator("button", { hasText: "Imagen de fondo" }).click();
  await expect(page.locator("#gb-canvas .b-hero-hasbg")).toHaveCount(1);
  await expect(page.locator("#gb-canvas .b-hero-grid")).toHaveCount(0);
});

test("asistente: chips de sugerencia (role-aware) precargan el prompt", async ({ page }) => {
  // Admin: ve el modo/sugerencia de Diseño.
  await mockApi(page, {}, { state: "pending" }, PAGE, "admin");
  await page.goto("/editor.html#agent");
  await page.locator("#ag-suggest .ag-chip").first().waitFor();
  expect(await page.locator("#ag-suggest .ag-chip").count()).toBeGreaterThanOrEqual(6);
  await expect(page.locator(".mode-btn[data-kind='design']")).toHaveCount(1);
  // Clic en un chip precarga el prompt.
  const chip = page.locator("#ag-suggest .ag-chip", { hasText: "preguntas frecuentes" });
  await chip.click();
  await expect(page.locator("#ag-prompt")).toHaveValue(/preguntas frecuentes/);
});

test("asistente: la tarjeta 'cómo funciona' se puede ocultar y recuperar", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#agent");
  const intro = page.locator(".ai-intro");
  // Visible en la primera visita: es el modelo mental para quien no conoce el panel.
  await expect(intro).toBeVisible();
  await expect(intro.locator(".ai-steps li")).toHaveCount(3);
  await intro.locator(".ai-intro-x").click();
  await expect(intro).toBeHidden();
  // La preferencia sobrevive a una recarga…
  await page.reload();
  await expect(page.locator(".ai-intro")).toBeHidden();
  // …y el botón de la cabecera la devuelve.
  await page.locator("#ag-how").click();
  await expect(page.locator(".ai-intro")).toBeVisible();
});

test("asistente: el modo activo se comunica con aria-pressed, no solo con color", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#agent");
  const auto = page.locator(".mode-btn[data-kind='auto']");
  const blog = page.locator(".mode-btn[data-kind='blog']");
  await expect(auto).toHaveAttribute("aria-pressed", "true");
  await expect(blog).toHaveAttribute("aria-pressed", "false");
  // La descripción bajo los botones explica en texto qué hace el modo elegido.
  await expect(page.locator("#ag-mode-desc")).toContainText("Recomendado");
  await blog.click();
  await expect(blog).toHaveAttribute("aria-pressed", "true");
  await expect(auto).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#ag-mode-desc")).toContainText("nota nueva");
});

test("asistente: el registro es una región viva y explica el estado vacío", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#agent");
  const log = page.locator("#ag-log");
  // Sin esto, el avance del agente es invisible para un lector de pantalla.
  await expect(log).toHaveAttribute("aria-live", "polite");
  await expect(log).toHaveAttribute("role", "log");
  await expect(log.locator(".ag-empty")).toBeVisible();
  await expect(log.locator(".entry")).toHaveCount(0);
});

test("un editor nunca ve enlaces a pantallas de solo-admin", async ({ page }) => {
  await mockApi(page, {}, { state: "success" }, PAGE, "editor");
  // Enlazar a #automation / #brand / #appearance desde una pantalla que el editor
  // SÍ puede abrir lo lleva al aviso "Solo administradores": callejón sin salida.
  for (const hash of ["dashboard", "agent", "review"]) {
    await page.goto(`/editor.html#${hash}`);
    await page.locator(".wrap").waitFor();
    for (const admin of ["#automation", "#brand", "#appearance", "#settings"]) {
      await expect(
        page.locator(`#wp-content a[href="${admin}"]`),
        `#${hash} enlaza a ${admin}, que un editor no puede abrir`,
      ).toHaveCount(0);
    }
  }
});

test("asistente: los editores NO ven diseño (ni modo ni sugerencia)", async ({ page }) => {
  await mockApi(page, {}, { state: "pending" }, PAGE, "editor");
  await page.goto("/editor.html#agent");
  await page.locator("#ag-suggest .ag-chip").first().waitFor();
  await expect(page.locator(".mode-btn[data-kind='design']")).toHaveCount(0);
  await expect(page.locator("#ag-suggest .ag-chip", { hasText: "navideño" })).toHaveCount(0);
});

test("escritorio: no ofrece las pantallas ocultas (HIDDEN_VIEWS)", async ({ page }) => {
  // Automatización y cola de revisión están ocultas: el Escritorio no debe
  // seguir anunciándolas por otra puerta (tarjeta de estado o bienvenida).
  await mockApi(page, {}, { state: "success" });
  await page.goto("/editor.html#dashboard");
  await page.locator(".welcome-panel").waitFor();
  await expect(page.locator("#auto-status")).toHaveCount(0);
  await expect(page.locator(".welcome-panel a[href='#automation']")).toHaveCount(0);
  await expect(page.locator(".welcome-panel a[href='#review']")).toHaveCount(0);
});

test("asistente: Enter envía, Shift+Enter hace salto de línea, y hay tooltips", async ({ page }) => {
  await mockApi(page, {}, { state: "pending" });
  await page.goto("/editor.html#agent");
  const prompt = page.locator("#ag-prompt");
  await prompt.waitFor();
  // Usabilidad: tooltips en los modos + pista de teclado.
  await expect(page.locator(".mode-btn[data-kind='blog']")).toHaveAttribute("title", /notas/i);
  await expect(page.locator(".ag-hint")).toBeVisible();
  // Shift+Enter NO envía: inserta salto de línea.
  await prompt.click();
  await prompt.pressSequentially("linea1");
  await prompt.press("Shift+Enter");
  await prompt.pressSequentially("linea2");
  await expect(prompt).toHaveValue(/linea1\nlinea2/);
  await expect(page.locator("#ag-log .entry")).toHaveCount(0);
  // Enter envía: la entrada del usuario aparece en el registro (send disparado).
  await prompt.press("Enter");
  await expect(page.locator("#ag-log")).toContainText("linea1");
});

test("carreras: mismo chrome que páginas (vc-topbar), Ctrl+S y estado en vivo", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#career/ingenieria");
  // Mismo chrome que el editor de páginas: vc-shell + vc-topbar + botón Actualizar.
  await page.locator(".vc-shell .vc-topbar").waitFor();
  await expect(page.locator(".vc-topbar .gb-save")).toBeVisible();
  // Ctrl+S guarda la carrera (atajo unificado).
  await page.keyboard.press("Control+s");
  await expect.poll(() => sink.last?.title).toBe("Ingeniería en Software");
  // Estado de publicación en vivo (UX-3 también en carreras).
  await expect(page.locator("#publish-status")).toContainText("en vivo", { timeout: 5000 });
});

test("carreras: editor visual — hero editable + alternar visibilidad", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#career/ingenieria");
  // El título se edita EN EL LIENZO (hero), no en un campo de formulario.
  await page.locator(".cv-hero .cv-title").waitFor();
  await expect(page.locator(".cv-hero .cv-title")).toHaveText("Ingeniería en Software");
  await expect(page.locator(".cv-hero .cv-title")).toHaveAttribute("contenteditable", "true");
  // Alternar visibilidad → Actualizar envía hidden=true (se oculta sin borrar).
  await expect(page.locator("#career-visibility")).toContainText("Visible");
  await page.click("#career-visibility");
  await expect(page.locator("#career-visibility")).toContainText("Oculta");
  await page.keyboard.press("Control+s");
  await expect.poll(() => sink.last?.hidden).toBe(true);
});

test("los avisos son accesibles: error = role alert + aria-live asertivo", async ({ page }) => {
  await mockApi(page, {});
  // Forzar un error al guardar (400) para inspeccionar el aviso de error.
  await page.route("**/api/pages/**", async (route) => {
    if (route.request().method() !== "GET") return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Fallo de prueba" }) });
    return route.fallback();
  });
  await page.goto("/editor.html#page/prueba");
  await page.locator(".gb-save").waitFor();
  await page.click(".gb-save");
  const n = page.locator("#screen-notice .notice.err");
  await expect(n).toHaveAttribute("role", "alert");
  await expect(n).toContainText("Fallo de prueba");
  await expect(page.locator("#screen-notice")).toHaveAttribute("aria-live", "assertive");
});

test("editor usable en móvil (390px, táctil): sin desborde y '+' tappable", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  try {
    await mockApi(page, {});
    await page.goto("/editor.html#page/prueba");
    await page.locator("#gb-canvas .vc-block").first().waitFor();
    // Sin scroll horizontal de la página (todo cabe).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    // El "+" para añadir sección es visible en táctil (crítico: sin hover) y abre
    // el selector de secciones.
    const ins = page.locator(".vc-ins button").first();
    await expect(ins).toBeVisible();
    await ins.click();
    await expect(page.locator("#ed-picker")).toBeVisible();
  } finally {
    await ctx.close();
  }
});

test("a11y: los cambios de estructura se anuncian y Alt+flechas reordena", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block").first().waitFor();
  const live = page.locator("#sr-live");
  await expect(live).toHaveAttribute("aria-live", "polite");
  // Duplicar la primera sección (la copia queda seleccionada) → se anuncia.
  await page.locator("#gb-canvas .vc-block").first().locator(".vc-tools button[aria-label='Duplicar']").click();
  await expect(live).toContainText("duplicada");
  // Reordenar con teclado la sección seleccionada (Alt+↑) → anuncia la posición.
  await page.keyboard.press("Alt+ArrowUp");
  await expect(live).toContainText("movida a la posición");
});

test("carreras: el historial carga una revisión previa", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#career/ingenieria");
  await page.locator(".vc-topbar #career-history").waitFor();
  await page.click("#career-history");
  await expect(page.locator("#vc-drawer .revisions-list li")).toHaveCount(2);
  // "Cargar" una revisión previa re-dibuja el formulario con su título.
  await page.locator("#vc-drawer .rev-load").first().click();
  await expect(page.locator(".vc-crumb")).toContainText("revisión previa");
});

test("entradas: el campo Autor sugiere autores existentes", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#post/nota-1");
  const author = page.locator("#post-author");
  await author.waitFor();
  await expect(author).toHaveValue("Ana Torres");
  // El datalist se llena con los autores usados en el blog.
  await expect(page.locator("#post-author-list option")).toHaveCount(2);
  const values = await page.locator("#post-author-list option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  expect(values).toContain("Equipo IIDEA");
  expect(values).toContain("Ana Torres");
});

test("entradas: vista previa muestra la entrada como artículo (con distintivo de borrador)", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#post/nota-1");
  await page.locator(".pv-open").waitFor();
  // Marcar como borrador para ver el distintivo en la vista previa.
  await page.selectOption("#post-status", "draft");
  await page.locator(".pv-open").click();
  await expect(page.locator(".pv-back")).toBeVisible();
  // El artículo se renderiza dentro del iframe aislado.
  const frame = page.frameLocator(".pv-frame");
  await expect(frame.locator("h1.pv-title")).toContainText("Nota de prueba");
  await expect(frame.locator(".pv-body")).toContainText("Cuerpo");
  await expect(frame.locator(".pv-badge")).toContainText("Borrador");
  // Esc cierra la vista previa.
  await page.keyboard.press("Escape");
  await expect(page.locator(".pv-back")).toHaveCount(0);
});

test("medios: la biblioteca filtra por carpetas", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#media");
  await page.locator(".media-folders .media-folder-chip").first().waitFor();
  await expect(page.locator(".media-folder-chip", { hasText: "Todas (2)" })).toBeVisible();
  await expect(page.locator(".media-folder-chip", { hasText: "Carreras (1)" })).toBeVisible();
  await expect(page.locator(".media-grid .media-item")).toHaveCount(2);
  // Filtrar a "carreras" deja solo su imagen.
  await page.locator(".media-folder-chip", { hasText: "Carreras (1)" }).click();
  await expect(page.locator(".media-grid .media-item")).toHaveCount(1);
});

test("medios: seleccionar en lote y eliminar las marcadas", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#media");
  await page.locator(".media-grid .media-cell").first().waitFor();
  // Las dos imágenes de /uploads son seleccionables (admin). Marcar ambas.
  await expect(page.locator(".media-check")).toHaveCount(2);
  await page.locator(".media-check").first().check();
  await page.locator(".media-check").nth(1).check();
  // La barra de lote aparece con el conteo.
  await expect(page.locator(".media-selbar")).toBeVisible();
  // "Archivos", en masculino: la biblioteca ya no es solo de imágenes.
  await expect(page.locator(".media-selbar")).toContainText("2 seleccionados");
  // Eliminar seleccionados → confirmar → DELETE por cada ruta marcada.
  await page.locator(".media-selbar .button-danger").click();
  await page.locator(".cm-box .button-danger").click();
  await expect.poll(() => sink.deleted?.length).toBe(2);
  expect(sink.deleted).toContain("/uploads/a.webp");
  expect(sink.deleted).toContain("/uploads/carreras/b.webp");
});

test("medios: reemplazar una imagen conserva su ruta (POST con replacePath)", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#media");
  await page.locator(".media-grid .media-item").first().click();
  await page.locator("[data-replace]").waitFor();
  // "Reemplazar imagen…" abre el selector de archivo; se elige uno nuevo.
  const chooser = page.waitForEvent("filechooser");
  await page.locator("[data-replace]").click();
  await (await chooser).setFiles({ name: "nueva.png", mimeType: "image/png", buffer: Buffer.from([1, 2, 3]) });
  // El POST lleva replacePath = la ruta ORIGINAL (no cambia, referencias intactas).
  await expect.poll(() => sink.last?.replacePath).toBe("/uploads/a.webp");
  await expect(page.locator("#screen-notice .notice.ok")).toContainText("reemplazada");
});

test("medios: renombrar una imagen no usada cambia su nombre de archivo", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#media");
  await page.locator(".media-grid .media-item").first().click();
  await page.locator("[data-rename]").click();
  const input = page.locator("#media-rename-input");
  await expect(input).toHaveValue("a.webp");
  await input.fill("banner-nuevo.webp");
  await page.locator("[data-rename-save]").click();
  // El POST lleva la ruta original + el nombre nuevo (misma carpeta).
  await expect.poll(() => sink.last?.from).toBe("/uploads/a.webp");
  await expect.poll(() => sink.last?.name).toBe("banner-nuevo.webp");
  await expect(page.locator("#screen-notice .notice.ok")).toContainText("renombrada");
});

test("medios: arrastrar y soltar imágenes las sube", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#media");
  await page.locator("#wp-content .media-grid .media-cell").first().waitFor();
  // Simula soltar un archivo de imagen sobre la rejilla del contenido (no el modal).
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array([1, 2, 3, 4])], "soltada.png", { type: "image/png" }));
    document.querySelector("#wp-content .media-grid")!.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));
  });
  await expect.poll(() => sink.last?.filename).toBe("soltada.png");
});

test("el menú lateral está segmentado en grupos", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#pages");
  await page.locator("#wp-menu .menu-group").first().waitFor();
  const groups = await page.locator("#wp-menu .menu-group").allTextContents();
  expect(groups).toContain("Contenido");
  expect(groups).toContain("Biblioteca");
  expect(groups).toContain("Herramientas");
  // Páginas, Carreras y Entradas quedan juntas bajo "Contenido".
  await expect(page.locator("#wp-menu .menu-item[data-view='careers']")).toBeVisible();
});

test("ajustes del sitio: carga datos, edita el menú y guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#settings");
  await page.locator(".nav-editor .nav-item-card").first().waitFor();
  // Contacto precargado desde site.json.
  await expect(page.locator(".postbox", { hasText: "Contacto" }).locator(".form-input").nth(2)).toHaveValue("593997127287");
  // Menú: 3 elementos, "Nosotros" con un subenlace.
  await expect(page.locator(".nav-item-card")).toHaveCount(3);
  await expect(page.locator(".nav-children .nav-child-row")).toHaveCount(2);
  // Añadir un elemento y guardar → el payload lleva 4.
  await page.locator(".nav-editor > .button", { hasText: "Añadir elemento" }).click();
  await expect(page.locator(".nav-item-card")).toHaveCount(4);
  await page.locator(".settings-save .button-primary").click();
  await expect.poll(() => sink.last?.nav?.length).toBe(4);
  await expect.poll(() => sink.last?.contact?.whatsapp).toBe("593997127287");
});

test("ajustes del sitio: reordena un subenlace y un enlace del pie, y edita el botón de la cabecera", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#settings");
  await page.locator(".nav-editor .nav-item-card").first().waitFor();

  // Bajar el primer subenlace de "Nosotros": antes solo se movía el primer nivel.
  const subenlaces = page.locator(".nav-children .nav-child-row");
  await subenlaces.first().locator(".nav-move").nth(1).click();
  // La primera flecha del primer subenlace queda deshabilitada (ya está arriba).
  await expect(subenlaces.first().locator(".nav-move").first()).toBeDisabled();

  // Lo mismo en una columna del pie.
  const pie = page.locator(".postbox", { hasText: "Pie · Enlaces del instituto" });
  await pie.locator(".nav-child-row").first().locator(".nav-move").nth(1).click();

  // El botón principal de la cabecera ya no está escrito dentro del componente.
  const cabecera = page.locator(".postbox", { hasText: "Cabecera · Botones" });
  await cabecera.locator(".form-input").nth(1).fill("Quiero información");

  await page.locator(".settings-save .button-primary").click();
  await expect.poll(() => sink.last?.nav?.[1]?.children?.[0]?.label).toBe("Becas");
  await expect.poll(() => sink.last?.footer?.institutoLinks?.[0]?.label).toBe("Becas");
  await expect.poll(() => sink.last?.header?.applyLabel).toBe("Quiero información");
});


test("automatización: activa, añade tema y fuente, y guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#automation");
  await page.locator(".ba-toggle").waitFor();
  // Interruptor global.
  await page.locator(".ba-toggle input").check();
  // Un tema precargado; añadimos otro.
  await expect(page.locator(".ba-list .ba-row")).toHaveCount(1);
  await page.locator("button", { hasText: "Añadir tema" }).click();
  await page.locator(".ba-list .ba-row .form-input").last().fill("Empleabilidad");
  // Añadimos una fuente con URL.
  await page.locator("button", { hasText: "Añadir fuente" }).click();
  await page.locator(".ba-card .ba-card-head .form-input").fill("https://iidea.edu.ec/blog");
  // Guardar → el payload refleja los cambios.
  await page.locator(".settings-save .button-primary").click();
  await expect.poll(() => sink.last?.enabled).toBe(true);
  await expect.poll(() => sink.last?.topics?.length).toBe(2);
  await expect.poll(() => sink.last?.sources?.[0]?.url).toBe("https://iidea.edu.ec/blog");
});

test("automatización: analizar competencia muestra huecos y un clic los añade como tema", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#automation");
  await page.locator(".ba-toggle").waitFor();
  // Añadir un competidor habilita el análisis (el botón valida que haya al menos uno).
  await page.locator("button", { hasText: "Añadir competidor" }).click();
  await page.locator(".ba-analyze").scrollIntoViewIfNeeded();
  await page.locator("input[placeholder='competidor.com']").fill("rival.com");
  await page.locator("button", { hasText: "Analizar competencia ahora" }).click();
  // Los huecos de temas aparecen como chips y los títulos recientes se listan.
  await expect(page.locator(".ba-gap-chip", { hasText: "Empleabilidad" })).toBeVisible();
  await expect(page.locator(".ba-comp-list")).toContainText("Cómo conseguir prácticas");
  // Clic en un hueco lo añade como tema nuevo (queda en la lista de temas).
  const topicInputs = page.locator(".ba-list").first().locator(".ba-row .form-input");
  await expect(topicInputs).toHaveCount(1); // solo el tema precargado
  await page.locator(".ba-gap-chip", { hasText: "Empleabilidad" }).click();
  await expect(topicInputs).toHaveCount(2);
  await expect(topicInputs.nth(1)).toHaveValue("Empleabilidad");
  await expect(page.locator(".ba-gap-chip", { hasText: "Empleabilidad" })).toBeDisabled();
});

test("automatización: los ajustes por tema (⚙ tono/largo) se guardan en topicOverrides", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#automation");
  await page.locator(".ba-topic .ba-gear").first().waitFor();
  // Abrir los ajustes avanzados del primer tema y ponerle un tono propio.
  await page.locator(".ba-topic .ba-gear").first().click();
  const toneInput = page.locator(".ba-topic-adv .ba-opt input[type=text]").first();
  await toneInput.waitFor();
  await toneInput.fill("formal");
  await page.locator(".settings-save .button-primary").click();
  // El override se guarda bajo el nombre del tema precargado ("Becas y ayudas").
  await expect.poll(() => sink.last?.topicOverrides?.["Becas y ayudas"]?.tone).toBe("formal");
});

test("automatización: la estimación de volumen se recalcula al cambiar la programación", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#automation");
  await page.locator(".ba-estimate").waitFor();
  // Config por defecto: 1 blog/semana → ≈ 4 borradores/mes.
  await expect(page.locator(".ba-estimate")).toContainText("4 borradores");
  // Subir a 5/semana recalcula en vivo (≈ 22/mes).
  await page.locator("input[type=number]").first().fill("5");
  await expect(page.locator(".ba-estimate")).toContainText("22 borradores");
});

test("cola de revisión: muestra el borrador auto-generado y aprobarlo lo publica", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#review");
  await page.locator(".review-card").waitFor();
  await expect(page.locator(".review-card")).toHaveCount(1);
  await expect(page.locator(".review-topic")).toHaveText("Becas");
  // Aprobar → PUT con draft:false (publica); la tarjeta desaparece.
  await page.locator("[data-approve]").click();
  await expect.poll(() => sink.last?.draft).toBe(false);
  await expect(page.locator(".review-card")).toHaveCount(0);
  await expect(page.locator(".review-empty")).toBeVisible();
});

test("cola de revisión: rechazar pide confirmación y vacía la cola", async ({ page }) => {
  await mockApi(page, {}, { state: "success" });
  await page.goto("/editor.html#review");
  await page.locator(".review-card [data-reject]").click();
  await page.locator(".cm-box").waitFor();
  await page.locator(".cm-box .button-danger").click();
  await expect(page.locator(".review-card")).toHaveCount(0);
});

test("ajustes, tema y categorías mandan baseSha (control de concurrencia)", async ({ page }) => {
  // Estos tres documentos eran último-en-guardar-gana: dos admins (o un admin y
  // el asistente) se pisaban en silencio y no hay pantalla de Revisiones para
  // recuperarlos. El servidor ya compara el sha; esto fija que el cliente lo mande.
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });

  await page.goto("/editor.html#settings");
  await page.locator(".settings-save .button-primary").waitFor();
  await page.locator(".settings-save .button-primary").click();
  await expect.poll(() => sink.last?.baseSha).toBe("sha-settings-1");

  await page.goto("/editor.html#appearance");
  await page.locator(".theme-editor").waitFor();
  await page.locator(".button-hero", { hasText: "Guardar y publicar" }).click();
  await expect.poll(() => sink.last?.baseSha).toBe("sha-theme-1");

  await page.goto("/editor.html#categories");
  await page.locator(".cat-manage").waitFor();
  await page.locator(".button-primary", { hasText: "Guardar cambios" }).click();
  await expect.poll(() => sink.last?.baseSha).toBe("sha-cats-1");
});

test("el panel no depende de scripts ni manejadores inline (CSP script-src 'self')", async ({ page }) => {
  // La CSP del servidor es script-src 'self' SIN 'unsafe-inline'. Un <script>
  // suelto o un onclick= en el HTML no se ejecutarían en producción, y el fallo
  // solo se vería allí. Esto lo caza aquí.
  await mockApi(page, {});
  for (const file of ["/editor.html", "/login.html"]) {
    await page.goto(file);
    const inlineScripts = await page.locator("script:not([src])").count();
    expect(inlineScripts, `${file} tiene un <script> inline`).toBe(0);
    const inlineHandlers = await page.evaluate(() =>
      document.querySelectorAll("[onclick],[onchange],[oninput],[onsubmit],[onload]").length,
    );
    expect(inlineHandlers, `${file} tiene un manejador on*= inline`).toBe(0);
  }
});

test("menú: las pantallas ocultas no aparecen, ni para un admin", async ({ page }) => {
  // HIDDEN_VIEWS = automatización, cola de revisión y equipo. Un admin ve todo
  // lo demás, así que si aparecieran sería aquí.
  await mockApi(page, {}, { state: "success" });
  await page.goto("/editor.html#pages");
  await page.locator("#wp-menu .menu-item[data-view='pages']").waitFor();
  for (const v of ["automation", "review", "team"]) {
    await expect(page.locator(`#wp-menu .menu-item[data-view='${v}']`)).toHaveCount(0);
  }
  // Sin ítem de menú tampoco se pinta la insignia de borradores pendientes.
  await expect(page.locator("#wp-menu .menu-badge")).toHaveCount(0);
  // Y el resto del menú sigue en pie (no se llevó por delante su grupo).
  await expect(page.locator("#wp-menu .menu-item[data-view='agent']")).toBeVisible();
  await expect(page.locator("#wp-menu .menu-item[data-view='brand']")).toBeVisible();
  await expect(page.locator("#wp-menu .menu-item[data-view='intakes']")).toBeVisible();
});

test("menú: un editor tampoco ve las pantallas ocultas ni las de admin", async ({ page }) => {
  await mockApi(page, {}, { state: "success" }, undefined, "editor");
  await page.goto("/editor.html#pages");
  await page.locator("#wp-menu .menu-item[data-view='pages']").waitFor();
  for (const v of ["automation", "review", "team", "appearance", "settings", "intakes"]) {
    await expect(page.locator(`#wp-menu .menu-item[data-view='${v}']`)).toHaveCount(0);
  }
});

test("automatización: los editores (no admin) no ven la sección", async ({ page }) => {
  await mockApi(page, {}, { state: "success" }, undefined, "editor");
  await page.goto("/editor.html#pages");
  await page.locator("#wp-menu .menu-item[data-view='pages']").waitFor();
  await expect(page.locator("#wp-menu .menu-item[data-view='automation']")).toHaveCount(0);
});

test("marca: edita voz/reglas y añade una regla, y guarda la guía", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#brand");
  await page.locator(".brand-slots").waitFor();
  // El perfil completo se renderiza: identidad, personas, terminología, CTAs…
  await expect(page.locator(".postbox", { hasText: "Identidad" })).toBeVisible();
  await expect(page.locator(".brand-objrow").first()).toBeVisible(); // personas/términos/CTAs
  await expect(page.locator(".brand-slot select").first()).toHaveValue("cover");
  // La lista de reglas (primera lista de su caja) trae la regla precargada.
  const rulesBox = page.locator(".postbox", { hasText: "Reglas, cumplimiento y fuentes" });
  const rulesList = rulesBox.locator(".ba-list").first();
  await expect(rulesList.locator(".ba-row .form-input").first()).toHaveValue("No menciones a la competencia por su nombre");
  // Añade una regla nueva y guarda.
  await rulesList.locator("button", { hasText: "Añadir" }).click();
  await rulesList.locator(".ba-row .form-input").last().fill("Cita solo fuentes oficiales");
  await page.locator(".settings-save .button-primary").click();
  await expect.poll(() => sink.last?.rules).toContain("Cita solo fuentes oficiales");
  await expect.poll(() => sink.last?.rules).toContain("No menciones a la competencia por su nombre");
  // El payload conserva las secciones nuevas (identidad, personas, CTAs).
  await expect.poll(() => sink.last?.identity?.country).toBe("Ecuador");
  await expect.poll(() => sink.last?.personas?.[0]?.name).toBe("Adulto que trabaja");
  await expect.poll(() => sink.last?.ctas?.[0]?.label).toBe("Aplica ahora");
});

test("marca: los editores (no admin) no ven la sección", async ({ page }) => {
  await mockApi(page, {}, { state: "pending" }, PAGE, "editor");
  await page.goto("/editor.html#brand");
  await expect(page.locator("#wp-content")).toContainText("Solo administradores");
  await expect(page.locator('#wp-menu [data-view="brand"]')).toHaveCount(0);
});

test("equipo: muestra quién puede entrar y quién es admin (solo lectura)", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#team");
  await page.locator(".team-list").waitFor();
  await expect(page.locator("#wp-content")).toContainText("@iidea.edu.ec");
  await expect(page.locator(".team-chip", { hasText: "invitado@gmail.com" })).toBeVisible();
  await expect(page.locator(".team-chip", { hasText: "jefe@iidea.edu.ec" })).toBeVisible();
});

test("equipo: los editores (no admin) no ven la sección", async ({ page }) => {
  await mockApi(page, {}, { state: "pending" }, PAGE, "editor");
  await page.goto("/editor.html#team");
  // Guard de rol: aviso "solo administradores".
  await expect(page.locator("#wp-content")).toContainText("Solo administradores");
  await expect(page.locator('#wp-menu [data-view="team"]')).toHaveCount(0);
});

test("ajustes del sitio: los editores (no admin) no ven la sección", async ({ page }) => {
  await mockApi(page, {}, { state: "success" }, undefined, "editor");
  await page.goto("/editor.html#pages");
  await page.locator("#wp-menu .menu-item[data-view='pages']").waitFor();
  await expect(page.locator("#wp-menu .menu-item[data-view='settings']")).toHaveCount(0);
});

test("Ctrl+S guarda la página", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink, { state: "success" });
  await page.goto("/editor.html#page/prueba");
  await page.locator("#gb-canvas .vc-block").first().waitFor();
  await page.keyboard.press("Control+s");
  await expect.poll(() => sink.last?.blocks?.length).toBe(3);
});

test("tras guardar, el estado de publicación pasa a 'en vivo'", async ({ page }) => {
  // El deploy-status simulado responde 'success' → el texto en vivo debe resolver.
  await mockApi(page, {}, { state: "success", updatedAt: new Date().toISOString(), detailUrl: "" });
  await page.goto("/editor.html#page/prueba");
  await page.locator(".gb-save").waitFor();
  await page.click(".gb-save");
  await expect(page.locator("#publish-status")).toContainText("en vivo", { timeout: 5000 });
});

test("apariencia: edita el nombre del tema y añade una parada, y guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#appearance");
  await page.locator(".theme-editor").waitFor();
  // El primer postbox ("Tema activo") tiene el input del nombre del tema.
  const label = page.locator(".theme-editor > .postbox").first().locator(".form-input");
  await label.fill("Tema navidad");
  // El degradado arranca con 2 paradas; "Añadir parada" → 3.
  await page.locator(".theme-stops .button", { hasText: "Añadir parada" }).click();
  await page.locator(".theme-editor .button-primary", { hasText: "Guardar y publicar" }).click();
  await expect.poll(() => sink.last?.label).toBe("Tema navidad");
  await expect.poll(() => sink.last?.colors?.accent?.length).toBe(3);
  await expect(page.locator("#screen-notice .notice.ok")).toContainText("Tema guardado");
});

test("categorías: muestra el uso, no deja borrar una con entradas, añade y guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#categories");
  await page.locator(".cat-manage").waitFor();
  // "General" tiene 2 entradas → su ✕ está deshabilitado; "Becas" (0) sí se puede quitar.
  await expect(page.locator(".cat-manage-row", { hasText: "General" })).toContainText("2 entradas");
  await expect(page.locator(".cat-manage-row", { hasText: "General" }).locator("button.danger")).toBeDisabled();
  await expect(page.locator(".cat-manage-row", { hasText: "Becas" }).locator("button.danger")).toBeEnabled();
  // Añadir una categoría nueva → aparece una fila más.
  await page.locator(".cat-add .form-input").fill("Eventos");
  await page.locator(".cat-add .button", { hasText: "Añadir" }).click();
  await expect(page.locator(".cat-manage-row")).toHaveCount(3);
  // Guardar envía la lista completa con la nueva categoría.
  await page.locator(".button-primary", { hasText: "Guardar cambios" }).click();
  await expect.poll(() => sink.last?.categories).toContain("Eventos");
});

test("papelera: lista una entrada borrada y 'Restaurar' la recupera", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#posts");
  await page.locator(".subsubsub").waitFor();
  // Cambiar al filtro "Papelera" carga /api/trash.
  await page.locator(".subsubsub a[data-f='trash']").click();
  await page.locator("[data-restore='borrada-1']").waitFor();
  await expect(page.locator(".wp-list-table")).toContainText("Entrada borrada");
  // Restaurar hace POST con el slug y el parentSha del commit padre.
  await page.locator("[data-restore='borrada-1']").click();
  await expect.poll(() => sink.last?.slug).toBe("borrada-1");
  await expect.poll(() => sink.last?.parentSha).toBe("abc1234");
  // Tras restaurar, showPosts() recarga el listado completo (vuelve a "Todas").
  await expect(page.locator(".subsubsub a[data-f='all']")).toHaveClass(/current/);
});

test("promoción: en modo staging el escritorio ofrece 'Publicar a producción'", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  // Sobrescribe /api/forms para simular modo staging (toProd:false) → aparece la caja.
  await page.route("**/api/forms", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...FORMS, publish: { toProd: false, where: "staging", url: "" } }) }));
  await page.goto("/editor.html#dashboard");
  await page.locator("#promote-btn").waitFor();
  await page.locator("#promote-btn").click();
  // Modal de confirmación → aceptar dispara POST /api/promote.
  await page.locator(".cm-box").waitFor();
  await page.locator(".cm-box .button", { hasText: "Publicar a producción" }).click();
  await expect.poll(() => sink.last?.promoted).toBe(true);
  await expect(page.locator("#screen-notice .notice.ok")).toContainText("Promovido a producción");
});

test("promoción: un editor (no admin) no ve la caja de producción", async ({ page }) => {
  await mockApi(page, {}, { state: "pending" }, PAGE, "editor");
  await page.route("**/api/forms", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...FORMS, publish: { toProd: false, where: "staging", url: "" } }) }));
  await page.goto("/editor.html#dashboard");
  await page.locator("#glance").waitFor();
  await expect(page.locator("#promote-btn")).toHaveCount(0);
});

test("carreras: el listado marca el estado y usa la ruta pública real", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/editor.html#careers");
  await page.locator(".wp-list-table").waitFor();
  const oculta = page.locator("tr", { hasText: "Contabilidad" });
  await expect(oculta.locator(".row-state")).toHaveText("Oculta");
  // Una carrera oculta no ofrece "Ver": todavía no existe en el sitio.
  await expect(oculta.locator("a", { hasText: "Ver" })).toHaveCount(0);
  await expect(page.locator("tr", { hasText: "Ingeniería en Software" })).toContainText("/carrera/ingenieria");
});

test("carreras: 'Añadir nueva carrera' crea y abre el editor", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#careers");
  await page.locator("#career-add").click();
  await page.locator("#career-new-title").fill("Contabilidad");
  await page.locator(".career-new button[type='submit']").click();
  // Manda el nombre y navega a la ficha de la carrera recién creada.
  await expect.poll(() => sink.last?.title).toBe("Contabilidad");
  await expect.poll(() => page.url()).toContain("#career/contabilidad");
});

test("carreras: un nombre vacío no crea nada", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#careers");
  await page.locator("#career-add").click();
  await page.locator(".career-new button[type='submit']").click();
  await expect.poll(() => sink.last?.title).toBe(undefined);
});

test("textos de carrera: edita un rótulo y lo guarda", async ({ page }) => {
  const sink: Sink = {};
  await mockApi(page, sink);
  await page.goto("/editor.html#career-labels");
  await page.locator(".ed-savebar").waitFor();
  // Los rótulos se agrupan por sección de la página de carrera.
  await expect(page.locator(".postbox-header h2", { hasText: "Malla curricular" })).toBeVisible();
  const campo = page.locator(".cl-row", { hasText: "descargaCta" }).locator("input");
  await campo.fill("Descargar la malla (PDF)");
  await page.locator(".ed-savebar .button-primary").click();
  await expect.poll(() => sink.last?.malla?.descargaCta).toBe("Descargar la malla (PDF)");
  // Manda el sha para el control de concurrencia, como el resto de configs.
  await expect.poll(() => sink.last?.baseSha).toBe("cl");
});

test("textos de carrera: un editor (no admin) no ve la sección", async ({ page }) => {
  await mockApi(page, {}, { state: "pending" }, PAGE, "editor");
  await page.goto("/editor.html#dashboard");
  await page.locator("#wp-menu").waitFor();
  await expect(page.locator("#wp-menu .menu-item[data-view='career-labels']")).toHaveCount(0);
});
