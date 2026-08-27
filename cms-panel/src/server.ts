import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "./config.js";
import { configurePassport, requireAuth, requireAdmin, type PanelUser } from "./auth.js";
import { runAgent, routeIntent, AGENT_LABEL, type AgentKind, type HistoryTurn } from "./agents/run.js";
import {
  PAGES,
  BLOCK_CATALOG,
  pagePath,
  assertPage,
  validateBlocks,
  validatePageSeo,
  serializePage,
} from "./lib/pageBlocks.js";
import { FORM_SCHEMA } from "./lib/blockForms.js";
import {
  CAREER_FORM,
  careerPath,
  invalidateCareersCache,
  listCareerDetails,
  listCareers,
  newCareer,
} from "./lib/careersForm.js";
import {
  commitFiles,
  renameFile,
  readFile,
  readFileMeta,
  fileSha,
  fileExists,
  deleteFile,
  listDir,
  listDirAll,
  listCommitsForPath,
  getCommitFiles,
  getDeployStatus,
  promoteToProduction,
  sitePath,
} from "./lib/github.js";
import {
  listPosts,
  readPost,
  postPath,
  parsePostMarkdown,
  serializePost,
  assertSlug,
  invalidatePostsCache,
  BLOG_DIR,
} from "./lib/posts.js";
import { searchContent } from "./lib/search.js";
import { slugify, assertCategory } from "./lib/markdown.js";
import { getCategories, saveCategories, CATEGORIES_PATH } from "./lib/categories.js";
import { CAREER_MANIFEST } from "./generated/schema-manifest.js";
import { validateFields } from "./lib/manifestValidate.js";
import { findMediaUsage } from "./lib/usage.js";
import { optimizeImage, hashedName } from "./lib/images.js";
import { themeSchema } from "./lib/themeSchema.js";
import { siteSchema } from "./lib/siteSchema.js";
import { careerLabelsSchema } from "./lib/careerLabelsSchema.js";
import { intakesSchema, normalizeIntakes } from "./lib/intakesSchema.js";
import { brandSchema } from "./lib/brandSchema.js";
import { loadBrand, invalidateBrandCache } from "./lib/brand.js";
import { blogAutomationSchema, DEFAULT_AUTOMATION } from "./lib/blogAutomationSchema.js";
import { startScheduler, runAutomationOnce } from "./lib/automation/scheduler.js";
import { researchCompetitors } from "./lib/research/competitors.js";
import { mediaFolderOf, IMG_RE, isMedia, mediaKindOf } from "./lib/media.js";
import { assertDocument, hashedDocName, DOC_EXTENSIONS } from "./lib/documents.js";
import { checkAgentAllowed, reserveAgentSlot, recordAgentRun, agentUsageStats } from "./lib/agentBudget.js";
import { log, initMonitoring, captureError } from "./lib/observability.js";
import { buildSessionStore } from "./lib/sessionStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, "..", "web");

const app = express();
app.set("trust proxy", 1);
// Límite global ajustado: ninguna ruta salvo la subida de medios manda cuerpos
// grandes. Antes eran 15 MB para TODO —y antes de la sesión—, así que cualquiera
// sin autenticar podía hacer que el proceso parseara 15 MB por petición.
//
// La subida de medios sí necesita margen (la imagen viaja en base64, ~1.37× el
// tamaño del archivo), así que se la salta explícitamente: el parser global corre
// ANTES que el de la ruta, y sin esta excepción rechazaría la imagen con un 413
// antes de que el middleware de 15 MB llegue a verla.
const MEDIA_UPLOAD_PATHS = new Set(["/api/media", "/api/media/document"]);
const jsonSmall = express.json({ limit: "1mb" });
const mediaBodyParser = express.json({ limit: "15mb" });
// Los documentos no se comprimen (un PDF firmado viaja tal cual) y se admiten
// hasta 20 MB, que en base64 son ~27 MB: por eso su parser es más holgado.
const docBodyParser = express.json({ limit: "30mb" });
app.use((req, res, next) => {
  if (req.method === "POST" && MEDIA_UPLOAD_PATHS.has(req.path)) return next();
  return jsonSmall(req, res, next);
});

// ── Cabeceras de seguridad ───────────────────────────────────────────────────
// El panel no tenía NINGUNA. La CSP es la que importa: convierte un XSS
// almacenado (texto que un editor guarda en un campo `rich` de un bloque, o un
// enlace javascript: en la vista previa de Markdown) en un intento bloqueado en
// vez de código ejecutándose con la sesión de un admin.
//
// Las dos concesiones, y por qué:
//  · style-src 'unsafe-inline' — editor.js genera HTML con atributos style="…"
//    (8 sitios). Inyectar estilos no permite ejecutar código; quitarlo exigiría
//    reescribir esas plantillas sin ganar casi nada.
//  · img-src incluye SITE_URL — la biblioteca de medios previsualiza las
//    imágenes desde el dominio público del sitio.
// script-src queda ESTRICTO ('self', sin 'unsafe-inline'): por eso el script de
// login vive en /assets/login.js y editor.html ya no lleva onclick.
const siteOrigin = (() => {
  try { return config.siteUrl ? new URL(config.siteUrl).origin : ""; } catch { return ""; }
})();
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${siteOrigin ? ` ${siteOrigin}` : ""}`,
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // El login se envía a Microsoft; el resto de formularios, al propio panel.
  "form-action 'self' https://login.microsoftonline.com",
  "frame-ancestors 'none'", // el panel nunca va dentro de un iframe (clickjacking)
].join("; ");

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  // HSTS solo con TLS: enviarlo en http es inútil, y en local rompería el acceso.
  if (req.secure || req.get("x-forwarded-proto") === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Store persistente si SESSION_REDIS_URL está definido; si no, memoria (default).
const sessionStore = await buildSessionStore();
app.use(
  session({
    store: sessionStore,
    secret: config.microsoft.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.panelBaseUrl.startsWith("https"),
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  }),
);

configurePassport(app);

// Sufijo de auditoría: cada commit del panel registra QUIÉN pidió el cambio.
function byUser(req: express.Request): string {
  const email = (req.user as PanelUser | undefined)?.email;
  return email ? ` — por ${email}` : "";
}

// ── CSRF ─────────────────────────────────────────────────────────────────────
// Token por sesión (entregado en /api/me); toda mutación de /api debe traerlo
// en la cabecera X-CSRF-Token. sameSite=lax ya bloquea la mayoría, esto cierra
// el resto sin tocar el flujo de login.
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const sess = req.session as session.Session & { csrf?: string };
  if (!sess.csrf || req.get("x-csrf-token") !== sess.csrf) {
    res.status(403).json({ error: "Sesión caducada o token CSRF inválido. Recarga la página." });
    return;
  }
  next();
});

// ── Salud (para el health check del despliegue) ──────────────────────────────
// Público, sin sesión ni HTML: responde rápido y no filtra nada sensible.
const startedAt = Date.now();
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) });
});

// ── Páginas públicas ─────────────────────────────────────────────────────────
app.get("/login", (_req, res) => res.sendFile(path.join(webDir, "login.html")));

// ── Quién soy (para que la UI muestre el usuario) + token CSRF ───────────────
app.get("/api/me", requireAuth, (req, res) => {
  const sess = req.session as session.Session & { csrf?: string };
  if (!sess.csrf) sess.csrf = crypto.randomBytes(16).toString("hex");
  res.json({ ...(req.user as PanelUser), csrf: sess.csrf });
});

// Equipo y acceso (SOLO LECTURA): quién puede iniciar sesión y quién es admin.
// Se configura por variables de entorno (ALLOWED_EMAIL_DOMAIN, ALLOWED_EMAILS,
// ADMIN_EMAILS); esta pantalla da transparencia, no edición — cambiar el acceso
// requiere un administrador del despliegue (es más seguro que editarlo por UI).
app.get("/api/team", requireAuth, requireAdmin, (req, res) => {
  const me = req.user as PanelUser;
  res.json({
    me: { email: me.email, name: me.name, role: me.role },
    allowedDomain: config.microsoft.allowedDomain || "",
    allowedEmails: config.microsoft.allowedEmails,
    adminEmails: config.adminEmails,
    everyoneAdmin: config.adminEmails.length === 0,
    tenant: config.microsoft.tenant,
  });
});

// ── Asistente IA (streaming SSE, multi-turno, con adjuntos) ──────────────────
// POST { prompt, kind, attachments?: ["/uploads/x.webp"] }.
// kind = "blog" | "design" | "page" | "media" | "auto".
type AgentSession = session.Session & { agentHistory?: HistoryTurn[] };
const HISTORY_LIMIT = 20; // turnos conservados (user+assistant)

app.post("/api/agent", requireAuth, async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  const requested = String(req.body?.kind ?? "auto");
  const attachments = (Array.isArray(req.body?.attachments) ? req.body.attachments : [])
    .map((a: unknown) => String(a))
    .filter((a: string) => /^\/(uploads|news)\/[a-z0-9._-]+$/i.test(a));
  if (!prompt) {
    res.status(400).json({ error: "Falta el prompt" });
    return;
  }

  // Freno de costo/abuso: rate limit por usuario + global + presupuesto mensual.
  // Se comprueba ANTES de abrir el stream SSE para poder responder 429 limpio.
  const agentEmail = (req.user as PanelUser | undefined)?.email ?? "";
  const isAdmin = (req.user as PanelUser | undefined)?.role === "admin";
  // El agente de DISEÑO cambia la apariencia/tema del sitio (apply_theme commitea
  // theme.json), la misma acción global que PUT /api/theme — reservada a admins.
  // Si un editor lo pide EXPLÍCITAMENTE, 403 limpio antes de abrir el stream SSE.
  // (El caso "auto" que el router enruta a diseño se corta más abajo, ya con el
  // stream abierto, con un mensaje claro.)
  if (!isAdmin && requested === "design") {
    res.status(403).json({ error: "El diseño y la apariencia del sitio son solo para administradores." });
    return;
  }
  const gate = checkAgentAllowed(agentEmail);
  if (!gate.ok) {
    res.status(gate.status ?? 429).json({ error: gate.reason ?? "Límite de uso alcanzado." });
    return;
  }
  reserveAgentSlot(agentEmail);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event: { type: string; message: string; data?: unknown }) =>
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  // Latido cada 20s para que los proxies no corten corridas largas (comentario
  // SSE: el cliente lo ignora).
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 20_000);
  // "Detener" en el panel = cerrar la conexión → se aborta la corrida.
  const abort = new AbortController();
  req.on("close", () => abort.abort());

  const sess = req.session as AgentSession;
  const history = sess.agentHistory ?? [];
  const remember = (userText: string, reply: string) => {
    history.push({ role: "user", content: userText }, { role: "assistant", content: reply });
    sess.agentHistory = history.slice(-HISTORY_LIMIT);
  };

  // Fuera del try: el bloque finally los necesita para registrar la corrida
  // pase lo que pase (éxito, error o "Detener"). Router y agente se llevan por
  // separado porque el agente reporta su ACUMULADO en cada vuelta: sumarlos
  // directamente contaría el router una vez por turno.
  const runStartedAt = Date.now();
  const routerTokens = { input: 0, output: 0 };
  const agentTokens = { input: 0, output: 0 };
  const totalTokens = () => ({
    input: routerTokens.input + agentTokens.input,
    output: routerTokens.output + agentTokens.output,
  });
  let kind: AgentKind | null = null;

  try {
    const fullPrompt =
      prompt +
      (attachments.length
        ? "\n\n" + attachments.map((a: string) => `[Imagen adjunta: ${a}]`).join("\n")
        : "");

    const routed =
      requested === "blog" || requested === "design" || requested === "page" || requested === "media"
        ? (requested as AgentKind)
        : await routeIntent(fullPrompt, history, (u) => {
            // El router se suma al total: es la primera llamada que se paga,
            // incluso cuando el pedido acaba en "unclear" y no corre ningún agente.
            routerTokens.input += u.input;
            routerTokens.output += u.output;
          });

    if (routed === "unclear") {
      // Mejor preguntar que adivinar (adivinar publicaba contenido).
      const msg =
        "No estoy seguro de qué necesitas. ¿Es sobre una entrada del blog, el diseño del sitio, " +
        "el contenido de una página o carrera, o una imagen de la biblioteca? Cuéntame un poco más.";
      remember(fullPrompt, msg);
      send({ type: "done", message: msg });
      return;
    }

    kind = routed;
    // Defensa (caso "auto"): si el enrutamiento cayó en diseño y el usuario no es
    // admin, NO ejecutamos el agente de diseño. Misma regla que PUT /api/theme:
    // cambiar la apariencia del sitio es una acción de administrador.
    if (!isAdmin && kind === "design") {
      const msg =
        "El diseño y la apariencia del sitio son solo para administradores. Puedo ayudarte con " +
        "páginas, carreras, entradas del blog o imágenes de la biblioteca.";
      remember(fullPrompt, msg);
      send({ type: "done", message: msg });
      return;
    }
    send({ type: "routed", message: `Entendido. Voy a trabajar en ${AGENT_LABEL[kind]}.` });

    const { reply, usage, ranOutOfSteps } = await runAgent(kind, fullPrompt, {
      emit: send,
      userEmail: (req.user as PanelUser | undefined)?.email,
      signal: abort.signal,
      history,
      onUsage: (u) => { agentTokens.input = u.input; agentTokens.output = u.output; },
    });
    // Una corrida completa deja rastro: sin esto, "ayer el asistente hizo algo
    // raro" no se puede investigar (no había NINGÚN log en este camino).
    log.info("agente: corrida completada", {
      email: agentEmail, kind, ms: Date.now() - runStartedAt,
      inTok: usage.input, outTok: usage.output, sinPasos: ranOutOfSteps === true,
    });
    remember(fullPrompt, reply);
    send({ type: "done", message: reply });
  } catch (err) {
    if (abort.signal.aborted) {
      log.info("agente: corrida detenida por el usuario", { email: agentEmail, kind: requested, ms: Date.now() - runStartedAt });
      send({ type: "error", message: "Detuviste el pedido. No se publicó ningún cambio en el sitio." });
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      const ref = crypto.randomBytes(4).toString("hex");
      log.error("agente: la corrida falló", {
        ref, email: agentEmail, kind: requested, ms: Date.now() - runStartedAt,
        err: err instanceof Error ? err.stack ?? err.message : String(err),
      });
      captureError(err, { ref, scope: "api.agent", email: agentEmail, kind: requested });
      // La referencia también va al chat: así un reporte del equipo ("me salió
      // el error 3f9a2b1c") se puede cruzar con la línea exacta del log.
      send({ type: "error", message: `Error: ${msg} (ref ${ref})` });
    }
  } finally {
    // El gasto se contabiliza SIEMPRE, también si la corrida revienta o se
    // aborta: si no, el caso que más cuesta —fallar y reintentar— reportaba 0.
    const t = totalTokens();
    recordAgentRun(agentEmail, kind ?? "page", t.input, t.output);
    clearInterval(heartbeat);
    res.end();
  }
});

// Historial de la conversación (persiste mientras dure la sesión) + reinicio.
app.get("/api/agent/history", requireAuth, (req, res) => {
  res.json({ messages: (req.session as AgentSession).agentHistory ?? [] });
});
app.post("/api/agent/reset", requireAuth, (req, res) => {
  (req.session as AgentSession).agentHistory = [];
  res.json({ ok: true });
});

// Uso del Asistente IA (tokens del mes, costo estimado, top de usuarios) para el
// widget del escritorio. Solo lectura; en memoria (se reinicia con el proceso).
// Solo ADMIN: expone correos y actividad por usuario (supervisión de costo), que
// un editor no debería enumerar.
app.get("/api/agent/usage", requireAuth, requireAdmin, (_req, res) => {
  res.json(agentUsageStats());
});

// ── Editor visual de páginas (REST) ──────────────────────────────────────────
app.get("/api/forms", requireAuth, (_req, res) => {
  res.json({
    pages: PAGES,
    schema: FORM_SCHEMA,
    catalog: BLOCK_CATALOG,
    siteUrl: config.siteUrl,
    // El escritorio muestra el botón "Publicar a producción" solo en modo staging.
    publish: config.publish,
  });
});

// Lee una página (sus bloques) + el sha del archivo (detección de conflictos).
app.get("/api/pages/:slug", requireAuth, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    assertPage(slug);
    const { content, sha } = await readFileMeta(pagePath(slug), config.github.baseBranch);
    const doc = JSON.parse(content);
    if (!Array.isArray(doc.blocks)) throw new Error(`La página "${slug}" no tiene un array blocks.`);
    res.json({ ...doc, _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Guarda una página completa. Si el cliente envía baseSha y el archivo cambió
// desde que lo cargó (otro editor o el asistente), rechaza con 409.
app.put("/api/pages/:slug", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  try {
    assertPage(slug);
    const blocks = req.body?.blocks;
    if (!Array.isArray(blocks)) {
      res.status(400).json({ error: "Falta el array blocks" });
      return;
    }
    validateBlocks(blocks);
    // SEO opcional por página: se valida con los mismos límites que el build.
    const seo = validatePageSeo(req.body?.seo);
    if (await conflicts(pagePath(slug), req.body?.baseSha, res)) return;
    const title = String(req.body?.title ?? PAGES[slug]);
    // Página oculta: solo se escribe cuando está activada, para no ensuciar los
    // JSON con "hidden": false en las trece páginas que sí se publican.
    const hidden = req.body?.hidden === true;
    // Solo se escribe `seo` en disco si hay algo (mantiene los JSON limpios).
    const pageDoc = {
      title,
      ...(hidden ? { hidden: true } : {}),
      ...(seo ? { seo } : {}),
      blocks,
    };
    await commitFiles(
      [{ path: pagePath(slug), content: serializePage(pageDoc) }],
      `content(${slug}): edición desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    const sha = await fileSha(pagePath(slug), config.github.baseBranch);
    res.json({ ok: true, url: config.siteUrl || null, sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Ruta de la config de automatización (se usa en el GET, el PUT y el conflicto).
const AUTOMATION_PATH = "src/config/blog-automation.json";

// Quita los campos de control de concurrencia antes de validar con Zod: son del
// transporte, no del documento, y los esquemas estrictos los rechazarían.
function stripShaFields<T extends object>(body: T): T {
  const copy = { ...body } as Record<string, unknown>;
  delete copy.baseSha;
  delete copy._sha;
  return copy as T;
}

// ¿El archivo cambió respecto al sha que cargó el editor? → 409 y true.
async function conflicts(relPath: string, baseSha: unknown, res: express.Response): Promise<boolean> {
  if (!baseSha || typeof baseSha !== "string") return false; // cliente sin soporte: last-write-wins
  const current = await fileSha(relPath, config.github.baseBranch);
  if (current && current !== baseSha) {
    res.status(409).json({
      error: "Alguien más editó este contenido mientras lo tenías abierto. Recarga para ver la versión actual (tus cambios locales se perderían al guardar encima).",
      conflict: true,
    });
    return true;
  }
  return false;
}

// ── Entradas del blog ────────────────────────────────────────────────────────
app.get("/api/posts", requireAuth, async (_req, res) => {
  try {
    const [posts, categories] = await Promise.all([
      listPosts(config.github.baseBranch),
      getCategories(),
    ]);
    res.json({ posts, categories, siteUrl: config.siteUrl });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Búsqueda global de contenido (paleta de comandos): busca el término dentro
// del texto de páginas, carreras y entradas, no solo en sus títulos.
app.get("/api/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q ?? "");
    res.json({ results: await searchContent(config.github.baseBranch, q) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Crea una entrada nueva. El slug se deriva del título, o lo elige el editor
// (enlace permanente editable); no puede pisar una entrada existente.
app.post("/api/posts", requireAuth, async (req, res) => {
  try {
    const data = req.body ?? {};
    const slug = data.slug ? String(data.slug) : slugify(String(data.title ?? ""));
    if (!slug) { res.status(400).json({ error: "Falta el título de la entrada" }); return; }
    assertSlug(slug);
    assertCategory(String(data.cat ?? ""), await getCategories());
    if (await fileExists(postPath(slug), config.github.baseBranch)) {
      res.status(409).json({ error: `Ya existe una entrada con el slug "${slug}". Cambia el título o el enlace permanente.` });
      return;
    }
    const md = serializePost({ ...data, slug, body: String(data.body ?? "") });
    await commitFiles(
      [{ path: postPath(slug), content: md }],
      `feat(blog): nueva entrada "${data.title}" desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    invalidatePostsCache();
    res.json({ ok: true, slug, url: config.siteUrl ? `${config.siteUrl}/noticias/${slug}/` : null });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/posts/:slug", requireAuth, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    assertSlug(slug);
    const { content, sha } = await readFileMeta(postPath(slug), config.github.baseBranch);
    res.json({ ...parsePostMarkdown(slug, content), _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/posts/:slug", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  try {
    assertSlug(slug);
    if (req.body?.cat) assertCategory(String(req.body.cat), await getCategories());
    if (await conflicts(postPath(slug), req.body?.baseSha, res)) return;
    const md = serializePost({ ...req.body, slug, body: String(req.body?.body ?? "") });
    await commitFiles(
      [{ path: postPath(slug), content: md }],
      `content(blog/${slug}): edición desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    invalidatePostsCache();
    const sha = await fileSha(postPath(slug), config.github.baseBranch);
    res.json({ ok: true, url: config.siteUrl ? `${config.siteUrl}/noticias/${slug}/` : null, sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// "Mover a la papelera": el commit de borrado ES la papelera — /api/trash lo
// lista y permite restaurar.
app.delete("/api/posts/:slug", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  try {
    assertSlug(slug);
    await deleteFile(postPath(slug), `content(blog/${slug}): mover a la papelera${byUser(req)}`, config.github.baseBranch);
    invalidatePostsCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Papelera (entradas borradas, restaurables desde el historial de Git) ─────
app.get("/api/trash", requireAuth, async (_req, res) => {
  try {
    const branch = config.github.baseBranch;
    const commits = await listCommitsForPath(BLOG_DIR, branch, 25);
    const blogPrefix = sitePath(BLOG_DIR) + "/";
    const items: Array<{ slug: string; title: string; date: string; deletedAt: string; parentSha: string }> = [];
    const seen = new Set<string>();
    for (const c of commits) {
      if (items.length >= 10) break;
      const { parents, files } = await getCommitFiles(c.sha);
      if (!parents.length) continue;
      for (const f of files) {
        if (f.status !== "removed" || !f.filename.startsWith(blogPrefix) || !f.filename.endsWith(".md")) continue;
        const slug = f.filename.slice(blogPrefix.length).replace(/\.md$/, "");
        if (seen.has(slug)) continue;
        seen.add(slug);
        // Si volvió a existir (restaurada o recreada), ya no está en la papelera.
        if (await fileExists(postPath(slug), branch)) continue;
        let title = slug, date = "";
        try {
          const old = parsePostMarkdown(slug, await readFile(postPath(slug), parents[0]));
          title = old.title; date = old.date;
        } catch { /* ilegible: se muestra por slug */ }
        items.push({ slug, title, date, deletedAt: c.date, parentSha: parents[0] });
      }
    }
    res.json({ items });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/trash/restore", requireAuth, async (req, res) => {
  try {
    const slug = String(req.body?.slug ?? "");
    const parentSha = String(req.body?.parentSha ?? "");
    assertSlug(slug);
    if (!/^[0-9a-f]{7,40}$/i.test(parentSha)) throw new Error("Referencia de restauración inválida");
    if (await fileExists(postPath(slug), config.github.baseBranch)) {
      res.status(409).json({ error: `La entrada "${slug}" ya existe.` });
      return;
    }
    const content = await readFile(postPath(slug), parentSha);
    await commitFiles(
      [{ path: postPath(slug), content }],
      `content(blog/${slug}): restaurar desde la papelera${byUser(req)}`,
      config.github.baseBranch,
    );
    invalidatePostsCache();
    res.json({ ok: true, slug });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Revisiones (historial por documento, estilo WP) ──────────────────────────
function revisionPath(type: string, slug: string): string {
  if (type === "post") { assertSlug(slug); return postPath(slug); }
  if (type === "page") { assertPage(slug); return pagePath(slug); }
  // Igual que las entradas: se valida el FORMATO del slug (barrera contra rutas
  // arbitrarias), no que esté en una lista fija — desde que el panel crea
  // carreras, una lista fija dejaría sin historial a las recién creadas.
  if (type === "career") { assertSlug(slug); return careerPath(slug); }
  throw new Error(`Tipo de revisión desconocido: "${type}"`);
}

app.get("/api/revisions", requireAuth, async (req, res) => {
  try {
    const relPath = revisionPath(String(req.query.type), String(req.query.slug));
    const commits = await listCommitsForPath(relPath, config.github.baseBranch, 15);
    res.json({ revisions: commits });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Contenido de un documento en una revisión concreta (para cargarlo en el editor).
app.get("/api/revisions/content", requireAuth, async (req, res) => {
  try {
    const type = String(req.query.type);
    const slug = String(req.query.slug);
    const sha = String(req.query.sha);
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new Error("SHA inválido");
    const raw = await readFile(revisionPath(type, slug), sha);
    res.json(type === "post" ? parsePostMarkdown(slug, raw) : JSON.parse(raw));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Biblioteca de medios ─────────────────────────────────────────────────────
// Rutas que el panel puede MODIFICAR (reemplazar, renombrar, eliminar): solo lo
// que sube el propio panel — /uploads (imágenes) y /documentos (PDF y ofimática).
// Las portadas de /news pertenecen a su entrada y el resto de public/ es del
// repositorio. El segmento de carpeta no admite puntos y se rechaza cualquier
// "..", así que no hay forma de escaparse de esos dos directorios.
const EDITABLE_MEDIA_RE = /^\/(?:uploads|documentos)\/(?:[a-z0-9-]{1,40}\/)?[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i;
// Escanea TODO public/ (hasta 2 niveles de subcarpetas) buscando imágenes Y
// documentos, no solo uploads/news: así el panel muestra también los archivos
// del sitio (carreras, programas, iconos, becas, testimonios, los PDFs de
// rendición de cuentas…), que antes quedaban ocultos.
async function scanMedia(dir: string, branch: string, depth: number): Promise<Array<{ name: string; path: string; size: number }>> {
  const entries = await listDirAll(dir, branch);
  const files = entries
    .filter((e) => e.type === "file" && isMedia(e.name))
    .map((e) => ({ name: e.name, path: e.path, size: e.size }));
  if (depth <= 0) return files;
  const nested = await Promise.all(entries.filter((e) => e.type === "dir").map((e) => scanMedia(`${dir}/${e.name}`, branch, depth - 1)));
  return files.concat(...nested);
}

// ?kind=image|doc filtra la biblioteca. Sin el parámetro se devuelve todo, para
// no cambiar lo que ven los clientes que ya existían.
app.get("/api/media", requireAuth, async (req, res) => {
  try {
    const branch = config.github.baseBranch;
    const want = String(req.query.kind ?? "");
    const all = await scanMedia("public", branch, 2);
    const items = all
      .map((f) => {
        const path = f.path.replace(/^public/, "");
        return { name: f.name, path, size: f.size, folder: mediaFolderOf(path), kind: mediaKindOf(path) };
      })
      .filter((i) => (want === "image" || want === "doc" ? i.kind === want : true))
      .sort((a, b) => (a.name < b.name ? 1 : -1));
    const folders = [...new Set(items.map((i) => i.folder).filter(Boolean))].sort();
    res.json({ items, folders, siteUrl: config.siteUrl });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Sube una imagen: se optimiza (WebP) y el nombre lleva un hash del CONTENIDO,
// así subir dos veces la misma imagen no duplica archivos (dedupe gratis).
app.post("/api/media", requireAuth, mediaBodyParser, async (req, res) => {
  try {
    const filename = String(req.body?.filename || "imagen.png");
    const data = String(req.body?.data || "");
    if (!data) {
      res.status(400).json({ error: "Falta la imagen" });
      return;
    }
    // Reemplazo EN EL MISMO SITIO: sobrescribe los bytes de una imagen que ya
    // existe conservando SU MISMA RUTA, así todas las referencias (páginas,
    // entradas, carreras) siguen apuntando a ella sin romperse. Solo admins
    // (cambia lo que ve todo el sitio) y solo dentro de /uploads.
    const replacePath = String(req.body?.replacePath ?? "").trim();
    if (replacePath) {
      const isAdmin = (req.user as PanelUser | undefined)?.role === "admin";
      if (!isAdmin) {
        res.status(403).json({ error: "Reemplazar una imagen es solo para administradores." });
        return;
      }
      const okPath = /^\/uploads\/(?:[a-z0-9-]{1,40}\/)?[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i.test(replacePath);
      if (!okPath || replacePath.includes("..")) {
        res.status(400).json({ error: "Solo se pueden reemplazar imágenes de /uploads." });
        return;
      }
      if (!(await fileExists(`public${replacePath}`, config.github.baseBranch))) {
        res.status(404).json({ error: "La imagen que intentas reemplazar no existe." });
        return;
      }
      const webp = await optimizeImage(data, { maxWidth: 1920 });
      await commitFiles(
        [{ path: `public${replacePath}`, content: webp, encoding: "base64" }],
        `media: reemplazar ${replacePath}${byUser(req)}`,
        config.github.baseBranch,
      );
      res.json({ ok: true, path: replacePath, replaced: true });
      return;
    }
    // Carpeta opcional de destino (un nivel). Nombre seguro: minúsculas, números
    // y guiones — nada de barras ni puntos, así que no hay path traversal.
    const folder = String(req.body?.folder ?? "").trim().toLowerCase();
    if (folder && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(folder)) {
      res.status(400).json({ error: "Nombre de carpeta inválido: usa minúsculas, números y guiones." });
      return;
    }
    const webp = await optimizeImage(data, { maxWidth: 1920 });
    const name = hashedName(webp, filename);
    const publicPath = folder ? `/uploads/${folder}/${name}` : `/uploads/${name}`;
    // Dedupe por contenido: si ya existe (mismo hash), no se vuelve a commitear.
    if (!(await fileExists(`public${publicPath}`, config.github.baseBranch))) {
      await commitFiles(
        [{ path: `public${publicPath}`, content: webp, encoding: "base64" }],
        `media: subir ${name}${byUser(req)}`,
        config.github.baseBranch,
      );
    }
    res.json({ ok: true, path: publicPath });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Sube un DOCUMENTO (PDF, Word, Excel, PowerPoint): informes de rendición de
// cuentas, fichas de becas, reglamentos. A diferencia de las imágenes no se
// transforma —un PDF firmado debe publicarse intacto—, así que la validación es
// más estricta: extensión de una lista cerrada + firma de bytes coincidente.
// Vive bajo /documentos, junto a las fichas que ya publicaba el sitio.
app.post("/api/media/document", requireAuth, docBodyParser, async (req, res) => {
  try {
    const filename = String(req.body?.filename || "");
    const data = String(req.body?.data || "");
    if (!filename || !data) {
      res.status(400).json({ error: "Falta el documento" });
      return;
    }
    // Reemplazo EN EL MISMO SITIO: sustituye los bytes de un documento que ya
    // existe conservando SU MISMA RUTA. Es el camino normal cuando se publica
    // una versión corregida de un informe: los enlaces ya repartidos siguen
    // funcionando. Solo admins, y el formato no puede cambiar.
    const replacePath = String(req.body?.replacePath ?? "").trim();
    if (replacePath) {
      const isAdmin = (req.user as PanelUser | undefined)?.role === "admin";
      if (!isAdmin) {
        res.status(403).json({ error: "Reemplazar un documento es solo para administradores." });
        return;
      }
      if (!/^\/documentos\/(?:[a-z0-9-]{1,40}\/)?[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i.test(replacePath) || replacePath.includes("..")) {
        res.status(400).json({ error: "Solo se pueden reemplazar documentos de /documentos." });
        return;
      }
      const { ext: newExt, bytes: newBytes } = assertDocument(data, filename);
      const oldExt = replacePath.slice(replacePath.lastIndexOf(".") + 1).toLowerCase();
      if (newExt !== oldExt) {
        res.status(400).json({ error: `El documento nuevo debe ser .${oldExt}, igual que el que reemplaza.` });
        return;
      }
      if (!(await fileExists(`public${replacePath}`, config.github.baseBranch))) {
        res.status(404).json({ error: "El documento que intentas reemplazar no existe." });
        return;
      }
      await commitFiles(
        [{ path: `public${replacePath}`, content: newBytes.toString("base64"), encoding: "base64" }],
        `media: reemplazar ${replacePath}${byUser(req)}`,
        config.github.baseBranch,
      );
      res.json({ ok: true, path: replacePath, kind: "doc", replaced: true });
      return;
    }
    const folder = String(req.body?.folder ?? "").trim().toLowerCase();
    if (folder && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(folder)) {
      res.status(400).json({ error: "Nombre de carpeta inválido: usa minúsculas, números y guiones." });
      return;
    }
    const { ext, bytes } = assertDocument(data, filename);
    const name = hashedDocName(bytes, filename, ext);
    const publicPath = folder ? `/documentos/${folder}/${name}` : `/documentos/${name}`;
    // Dedupe por contenido, igual que las imágenes.
    if (!(await fileExists(`public${publicPath}`, config.github.baseBranch))) {
      await commitFiles(
        [{ path: `public${publicPath}`, content: bytes.toString("base64"), encoding: "base64" }],
        `media: subir documento ${name}${byUser(req)}`,
        config.github.baseBranch,
      );
    }
    res.json({ ok: true, path: publicPath, kind: "doc" });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Extensiones de documento admitidas (las usa el panel para el input de subida).
app.get("/api/media/document-types", requireAuth, (_req, res) => {
  res.json({ extensions: DOC_EXTENSIONS });
});

// "Adjunto a": qué páginas/carreras/entradas usan una imagen o un documento.
app.get("/api/media/usage", requireAuth, async (req, res) => {
  try {
    const mediaPath = String(req.query.path ?? "");
    // Solo lectura (busca dónde se usa): admite cualquier medio de /public.
    if (!mediaPath.startsWith("/") || mediaPath.includes("..") || !isMedia(mediaPath)) {
      throw new Error("Ruta de archivo inválida");
    }
    res.json({ usages: await findMediaUsage(mediaPath, config.github.baseBranch) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Borrado seguro: solo lo que sube el panel (/uploads y /documentos; las
// portadas /news pertenecen a sus entradas) y solo si ninguna página/carrera/
// entrada lo usa.
app.delete("/api/media", requireAuth, requireAdmin, async (req, res) => {
  try {
    const mediaPath = String(req.query.path ?? req.body?.path ?? "");
    if (!EDITABLE_MEDIA_RE.test(mediaPath) || mediaPath.includes("..")) {
      res.status(400).json({ error: "Solo se pueden eliminar archivos de /uploads o /documentos." });
      return;
    }
    const usages = await findMediaUsage(mediaPath, config.github.baseBranch);
    if (usages.length > 0) {
      res.status(409).json({
        error: "Este archivo está en uso; quítalo primero de ese contenido.",
        usages,
      });
      return;
    }
    await deleteFile(`public${mediaPath}`, `media: eliminar ${mediaPath}${byUser(req)}`, config.github.baseBranch);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Renombrar seguro: cambia el NOMBRE de archivo dentro de su misma carpeta de
// /uploads o /documentos, en un único commit atómico. Como cambia la ruta, SOLO
// se permite si el archivo no está en uso (si no, rompería las referencias).
// Solo admin.
app.post("/api/media/rename", requireAuth, requireAdmin, async (req, res) => {
  try {
    const from = String(req.body?.from ?? "");
    const name = String(req.body?.name ?? "").trim();
    if (!EDITABLE_MEDIA_RE.test(from) || from.includes("..")) {
      res.status(400).json({ error: "Solo se pueden renombrar archivos de /uploads o /documentos." });
      return;
    }
    // El nombre nuevo es solo el archivo (sin barras): se mantiene la carpeta.
    if (!/^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i.test(name) || name.includes("..")) {
      res.status(400).json({ error: "Nombre inválido: usa letras, números, guiones y una extensión." });
      return;
    }
    // Renombrar no puede cambiar el FORMATO: un .pdf que pasara a .html se
    // serviría como otra cosa distinta de la que se validó al subirlo.
    const extOf = (p: string) => p.slice(p.lastIndexOf(".") + 1).toLowerCase();
    if (extOf(name) !== extOf(from)) {
      res.status(400).json({ error: `El nombre nuevo debe mantener la extensión .${extOf(from)}.` });
      return;
    }
    const dir = from.slice(0, from.lastIndexOf("/") + 1); // p. ej. /uploads/carreras/
    const to = dir + name;
    if (to === from) { res.json({ ok: true, path: to }); return; }
    if (await fileExists(`public${to}`, config.github.baseBranch)) {
      res.status(409).json({ error: `Ya existe un archivo llamado "${name}" en esa carpeta.` });
      return;
    }
    const usages = await findMediaUsage(from, config.github.baseBranch);
    if (usages.length > 0) {
      res.status(409).json({ error: "Este archivo está en uso; no se puede renombrar sin romper esas referencias. Usa “Reemplazar” para cambiarlo conservando la ruta.", usages });
      return;
    }
    await renameFile(`public${from}`, `public${to}`, `media: renombrar ${from} → ${to}${byUser(req)}`, config.github.baseBranch);
    res.json({ ok: true, path: to });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Categorías del blog ──────────────────────────────────────────────────────
app.get("/api/categories", requireAuth, async (_req, res) => {
  try {
    const [categories, posts] = await Promise.all([
      getCategories(),
      listPosts(config.github.baseBranch),
    ]);
    const usage = Object.fromEntries(
      categories.map((cat) => [cat, posts.filter((p) => p.cat === cat).length]),
    );
    res.json({ categories, usage, _sha: await fileSha(CATEGORIES_PATH, config.github.baseBranch) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/categories", requireAuth, requireAdmin, async (req, res) => {
  try {
    const next = req.body?.categories;
    if (!Array.isArray(next)) { res.status(400).json({ error: "Falta la lista categories" }); return; }
    if (await conflicts(CATEGORIES_PATH, req.body?.baseSha, res)) return;
    const current = await getCategories();
    const posts = await listPosts(config.github.baseBranch);
    // No se puede quitar una categoría con entradas: rompería el build del sitio.
    const removedInUse = current.filter(
      (cat) => !next.includes(cat) && posts.some((p) => p.cat === cat),
    );
    if (removedInUse.length > 0) {
      res.status(409).json({
        error: `No puedes eliminar categorías con entradas: ${removedInUse.join(", ")}. Reasigna esas entradas primero.`,
      });
      return;
    }
    const saved = await saveCategories(next, `content(blog): editar categorías desde el panel${byUser(req)}`);
    res.json({ ok: true, categories: saved, sha: await fileSha(CATEGORIES_PATH, config.github.baseBranch) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Apariencia (theme.json) ──────────────────────────────────────────────────
app.get("/api/theme", requireAuth, async (_req, res) => {
  try {
    const { content, sha } = await readFileMeta("src/config/theme.json", config.github.baseBranch);
    res.json({ ...JSON.parse(content), _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/theme", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (await conflicts("src/config/theme.json", req.body?.baseSha, res)) return;
    const theme = themeSchema.parse(stripShaFields(req.body));
    await commitFiles(
      [{ path: "src/config/theme.json", content: JSON.stringify(theme, null, 2) + "\n" }],
      `design(theme): "${theme.label ?? theme.themeId}" desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    res.json({ ok: true, url: config.siteUrl || null, sha: await fileSha("src/config/theme.json", config.github.baseBranch) });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "issues" in (err as any)
        ? (err as any).issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : err instanceof Error
          ? err.message
          : String(err);
    res.status(400).json({ error: msg });
  }
});

// ── Ajustes del sitio (navegación, contacto, redes, enlaces) ─────────────────
// Mismo patrón que /api/theme: JSON editable en el repo, validado antes de
// guardar. Reservado a admins (afecta a todo el sitio).
app.get("/api/settings", requireAuth, async (_req, res) => {
  try {
    const { content, sha } = await readFileMeta("src/config/site.json", config.github.baseBranch);
    res.json({ ...JSON.parse(content), _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (await conflicts("src/config/site.json", req.body?.baseSha, res)) return;
    const settings = siteSchema.parse(stripShaFields(req.body));
    await commitFiles(
      [{ path: "src/config/site.json", content: JSON.stringify(settings, null, 2) + "\n" }],
      `config(site): ajustes del sitio desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    res.json({ ok: true, url: config.siteUrl || null, sha: await fileSha("src/config/site.json", config.github.baseBranch) });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "issues" in (err as any)
        ? (err as any).issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : err instanceof Error
          ? err.message
          : String(err);
    res.status(400).json({ error: msg });
  }
});

// ── Fechas de inicio (intakes.json) ─────────────────────────────────────────
// ÚNICA fuente de verdad del calendario de inicios: el sitio deriva de aquí el
// "próximo inicio" y el "X inicios al año" que sostienen la copia de urgencia.
// Mismo patrón que /api/settings; reservado a admins (cambia el mensaje de todas
// las páginas de conversión a la vez).
// Rótulos de la plantilla de carrera. La página /carrera/<slug> no usa bloques,
// así que sus textos fijos se editan aquí en vez de en código.
const LABELS_PATH = "src/config/career-labels.json";

app.get("/api/career-labels", requireAuth, async (_req, res) => {
  try {
    const { content, sha } = await readFileMeta(LABELS_PATH, config.github.baseBranch);
    res.json({ ...JSON.parse(content), _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/career-labels", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (await conflicts(LABELS_PATH, req.body?.baseSha, res)) return;
    const labels = careerLabelsSchema.parse(stripShaFields(req.body));
    await commitFiles(
      [{ path: LABELS_PATH, content: JSON.stringify(labels, null, 2) + "\n" }],
      `config(carreras): textos de la plantilla de carrera desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    res.json({ ok: true, url: config.siteUrl || null, sha: await fileSha(LABELS_PATH, config.github.baseBranch) });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "issues" in (err as any)
        ? (err as any).issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : err instanceof Error
          ? err.message
          : String(err);
    res.status(400).json({ error: msg });
  }
});

app.get("/api/intakes", requireAuth, async (_req, res) => {
  try {
    const { content, sha } = await readFileMeta("src/config/intakes.json", config.github.baseBranch);
    res.json({ ...JSON.parse(content), _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/intakes", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (await conflicts("src/config/intakes.json", req.body?.baseSha, res)) return;
    const parsed = normalizeIntakes(intakesSchema.parse(stripShaFields(req.body)));
    await commitFiles(
      [{ path: "src/config/intakes.json", content: JSON.stringify(parsed, null, 2) + "\n" }],
      `config(intakes): fechas de inicio desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    res.json({
      ok: true,
      url: config.siteUrl || null,
      sha: await fileSha("src/config/intakes.json", config.github.baseBranch),
      intakes: parsed.intakes,
    });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "issues" in (err as any)
        ? (err as any).issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : err instanceof Error
          ? err.message
          : String(err);
    res.status(400).json({ error: msg });
  }
});

// ── Guía de marca (brand.json): voz, mensajes y medidas de imagen ────────────
// La editan admins desde la pantalla "Marca" y la leen los agentes al redactar y
// generar imágenes. GET cae al borrador por defecto si el archivo no existe.
app.get("/api/brand", requireAuth, async (_req, res) => {
  try {
    // Si brand.json aún no existe, sha = null: conflicts() lo trata como
    // "sin conflicto posible" y el primer guardado crea el archivo.
    const [brand, sha] = await Promise.all([
      loadBrand(config.github.baseBranch),
      fileSha("src/config/brand.json", config.github.baseBranch),
    ]);
    res.json({ ...brand, _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/brand", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (await conflicts("src/config/brand.json", req.body?.baseSha, res)) return;
    const brand = brandSchema.parse(stripShaFields(req.body));
    await commitFiles(
      [{ path: "src/config/brand.json", content: JSON.stringify(brand, null, 2) + "\n" }],
      `config(brand): guía de marca desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    invalidateBrandCache();
    res.json({ ok: true, sha: await fileSha("src/config/brand.json", config.github.baseBranch) });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "issues" in (err as any)
        ? (err as any).issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : err instanceof Error
          ? err.message
          : String(err);
    res.status(400).json({ error: msg });
  }
});

// ── Automatización del blog (blog-automation.json) ───────────────────────────
// Config del motor que genera BORRADORES de blog. Mismo patrón que /api/theme y
// /api/settings: JSON validado, PUT solo admin. GET cae a los valores por
// defecto si el archivo aún no existe (config normalizada hacia adelante).
app.get("/api/automation", requireAuth, async (_req, res) => {
  try {
    const raw = await readFile(AUTOMATION_PATH, config.github.baseBranch).catch(() => null);
    const cfg = raw ? blogAutomationSchema.parse(JSON.parse(raw)) : DEFAULT_AUTOMATION;
    res.json({ ...cfg, _sha: raw ? await fileSha(AUTOMATION_PATH, config.github.baseBranch) : null });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/automation", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (await conflicts(AUTOMATION_PATH, req.body?.baseSha, res)) return;
    const cfg = blogAutomationSchema.parse(stripShaFields(req.body));
    await commitFiles(
      [{ path: AUTOMATION_PATH, content: JSON.stringify(cfg, null, 2) + "\n" }],
      `config(blog-automation): ajustes desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    res.json({ ok: true, sha: await fileSha(AUTOMATION_PATH, config.github.baseBranch) });
  } catch (err) {
    const msg =
      err && typeof err === "object" && "issues" in (err as any)
        ? (err as any).issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : err instanceof Error
          ? err.message
          : String(err);
    res.status(400).json({ error: msg });
  }
});

// Analiza a la competencia BAJO DEMANDA (botón del panel): trae los posts
// recientes de sus feeds y resalta los HUECOS de temas (lo que cubren y tú no).
// Solo admin (hace peticiones salientes a los sitios de la competencia).
app.get("/api/automation/competitors", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const raw = await readFile("src/config/blog-automation.json", config.github.baseBranch).catch(() => null);
    const cfg = raw ? blogAutomationSchema.parse(JSON.parse(raw)) : DEFAULT_AUTOMATION;
    if (!cfg.competitors.domains.length) {
      res.json({ gaps: [], recentTitles: [], competitors: [] });
      return;
    }
    const result = await researchCompetitors(cfg.competitors, cfg.topics);
    res.json({
      gaps: result.gaps,
      recentTitles: result.recentTitles,
      competitors: result.competitors.map((c) => ({
        domain: c.domain,
        ok: c.ok,
        error: c.error,
        posts: c.posts.map((p) => ({ title: p.title, link: p.link, date: p.date ? p.date.toISOString() : null })),
      })),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Genera UN borrador AHORA (ignora horario/cupo; respeta fuentes requeridas).
// Para el botón "Generar ahora". Solo admin (dispara una redacción con IA).
app.post("/api/automation/run", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await runAutomationOnce();
    if (!result.ok) { res.status(400).json({ error: result.reason || "No se pudo generar el borrador" }); return; }
    invalidatePostsCache();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Estado del despliegue (¿el último build pasó?) ───────────────────────────
app.get("/api/deploy-status", requireAuth, async (_req, res) => {
  try {
    const status = await getDeployStatus(config.github.baseBranch);
    res.json({ ...status, branch: config.github.baseBranch });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Carreras ─────────────────────────────────────────────────────────────────
app.get("/api/careers", requireAuth, async (_req, res) => {
  const details = await listCareerDetails(config.github.baseBranch);
  // `careers` (slug → título) es la forma que ya consumía el panel; `states`
  // añade si está oculta o próximamente, para marcarlas en el listado.
  const careers = Object.fromEntries(Object.entries(details).map(([s, c]) => [s, c.title]));
  const states = Object.fromEntries(
    Object.entries(details).map(([s, c]) => [
      s,
      { hidden: c.hidden, proximamente: c.proximamente, routeSlug: c.routeSlug },
    ]),
  );
  res.json({ careers, states, form: CAREER_FORM, siteUrl: config.siteUrl });
});

// Nueva carrera. Crea el JSON con el mínimo que valida el build y lo deja OCULTA
// y "próximamente": el equipo la completa desde el editor y luego la publica.
app.post("/api/careers", requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? "").trim();
    if (!title) { res.status(400).json({ error: "Falta el nombre de la carrera" }); return; }
    const slug = req.body?.slug ? String(req.body.slug) : slugify(title);
    if (!slug) { res.status(400).json({ error: "No se pudo derivar un enlace del nombre" }); return; }
    assertSlug(slug);
    if (await fileExists(careerPath(slug), config.github.baseBranch)) {
      res.status(409).json({ error: `Ya existe una carrera con el enlace "${slug}". Cambia el nombre.` });
      return;
    }
    const data = newCareer(slug, title);
    validateFields(`La carrera "${title}"`, CAREER_MANIFEST, data);
    await commitFiles(
      [{ path: careerPath(slug), content: JSON.stringify(data, null, 2) + "\n" }],
      `feat(carrera/${slug}): nueva carrera "${title}" desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    invalidateCareersCache();
    res.json({ ok: true, slug });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/careers/:slug", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const CAREERS = await listCareers(config.github.baseBranch);
  if (!CAREERS[slug]) { res.status(404).json({ error: "Carrera desconocida" }); return; }
  try {
    const { content, sha } = await readFileMeta(careerPath(slug), config.github.baseBranch);
    res.json({ ...JSON.parse(content), _sha: sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/careers/:slug", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const CAREERS = await listCareers(config.github.baseBranch);
  if (!CAREERS[slug]) { res.status(404).json({ error: "Carrera desconocida" }); return; }
  try {
    const data = { ...req.body };
    if (!data || typeof data !== "object" || !data.title) {
      res.status(400).json({ error: "Datos de carrera inválidos (falta title)" });
      return;
    }
    // Tipos contra el manifiesto: era el único documento que se commiteaba sin
    // ninguna validación de esquema, así que un `asignaturas: "20"` llegaba al
    // repo y rompía el build del sitio.
    validateFields(`La carrera "${CAREERS[slug]}"`, CAREER_MANIFEST, data);
    if (await conflicts(careerPath(slug), data.baseSha, res)) return;
    delete data.baseSha;
    delete data._sha;
    data.slug = slug; // el slug no se cambia
    await commitFiles(
      [{ path: careerPath(slug), content: JSON.stringify(data, null, 2) + "\n" }],
      `content(carrera/${slug}): edición desde el panel${byUser(req)}`,
      config.github.baseBranch,
    );
    const sha = await fileSha(careerPath(slug), config.github.baseBranch);
    res.json({ ok: true, url: config.siteUrl || null, sha });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Promover staging → producción ─────────────────────────────────────────────
app.post("/api/promote", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await promoteToProduction(
      `chore(release): promover ${config.github.baseBranch} → ${config.github.prodBranch} desde el panel${byUser(req)}`,
    );
    res.json({
      ok: true,
      alreadyUpToDate: result.alreadyUpToDate,
      sha: result.sha,
      url: config.siteUrl || null,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── App protegida ────────────────────────────────────────────────────────────
// Los assets (CSS/JS) son públicos: la pantalla de login también los necesita y
// no contienen nada sensible. El contenido protegido es / , /editor y las /api.
app.use("/assets", express.static(path.join(webDir, "assets")));
// La administración (estilo WordPress) es la entrada principal.
app.get(["/", "/editor"], requireAuth, (_req, res) => res.sendFile(path.join(webDir, "editor.html")));

// ── Manejador de errores global ──────────────────────────────────────────────
// Cualquier error no capturado en una ruta cae aquí: se registra en el servidor
// y se responde un mensaje genérico (nunca el stack ni detalles internos, para
// no filtrar información). Va al final, después de todas las rutas.
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const ref = crypto.randomBytes(4).toString("hex"); // id para correlacionar en logs
  log.error("request error", { ref, method: req.method, path: req.path, err: err instanceof Error ? err.stack ?? err.message : String(err) });
  captureError(err, { ref, method: req.method, path: req.path });
  if (res.headersSent) return; // p. ej. streams SSE ya iniciados
  const wantsJson = req.path.startsWith("/api/");
  // Cuerpo por encima del límite: es culpa del cliente, no un fallo interno.
  // Sin esto sale un 500 opaco y quien sube una imagen enorme no sabe por qué.
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.too.large") {
    const msg = req.path === "/api/media/document"
      ? "El documento es demasiado grande (máximo 20 MB). Comprímelo e inténtalo de nuevo."
      : req.path === "/api/media"
        ? "La imagen es demasiado grande (máximo 15 MB). Redúcela e inténtalo de nuevo."
        : "El contenido enviado es demasiado grande (máximo 1 MB).";
    if (wantsJson) res.status(413).json({ error: msg });
    else res.status(413).send(msg);
    return;
  }
  if (wantsJson) res.status(500).json({ error: `Error interno del servidor (ref ${ref}).` });
  else res.status(500).send("Error interno del servidor.");
});

// Última red de seguridad: registrar (y capturar) errores no manejados del proceso.
process.on("unhandledRejection", (reason) => {
  log.error("unhandledRejection", { err: reason instanceof Error ? reason.stack ?? reason.message : String(reason) });
  captureError(reason);
});
process.on("uncaughtException", (err) => {
  log.error("uncaughtException", { err: err instanceof Error ? err.stack ?? err.message : String(err) });
  captureError(err);
});

// La app se exporta para poder PROBARLA. Hasta ahora este archivo —1.365
// líneas y 50 rutas— no tenía ni una prueba, y no por descuido: importarlo
// abría un puerto, arrancaba el monitoreo y lanzaba el programador, así que
// era imposible. Los E2E simulaban las /api con page.route, o sea que la UI se
// verificaba contra una idea del servidor, no contra el servidor.
export { app };

// Arranque REAL: solo cuando este archivo es el que se ejecuta (node dist/server.js
// o tsx src/server.ts). Al importarlo desde una prueba, nada de esto ocurre.
const esEjecutable = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (esEjecutable) {
  void initMonitoring();
  app.listen(config.port, () => {
    log.info("panel iniciado", { url: config.panelBaseUrl, port: config.port });
    // Programador de la automatización de blog (tick por minuto; se autogobierna
    // por el flag `enabled` de la config, así que activarlo no requiere reinicio).
    startScheduler();
  });
}
