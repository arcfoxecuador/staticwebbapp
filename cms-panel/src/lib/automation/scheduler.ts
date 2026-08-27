import { config } from "../../config.js";
import { readFile, commitFiles } from "../github.js";
import { listPosts } from "../posts.js";
import { generateImage, optimizeImage, hashedName, COVER_SIZE } from "../images.js";
import { blogAutomationSchema, DEFAULT_AUTOMATION, type BlogAutomationConfig } from "../blogAutomationSchema.js";
import { shouldRunNow, scheduleStateFromPosts, dayKeyInTz, createAttemptLimiter } from "./schedule.js";
import { generateDraft, type GenerateDeps, type GenerateResult } from "./generate.js";
import { llmGenerateDraft } from "./llm.js";
import { log, captureError } from "../observability.js";

// Programador EN PROCESO del motor de generación. El panel es un servidor Express
// de larga vida, así que un tick por minuto basta (git-first: sin colas externas).
// Todo lo pesado (LLM, red, commits) se inyecta a generateDraft, que es puro-ish.

async function loadConfig(): Promise<BlogAutomationConfig> {
  try {
    const raw = await readFile("src/config/blog-automation.json", config.github.baseBranch).catch(() => null);
    return raw ? blogAutomationSchema.parse(JSON.parse(raw)) : DEFAULT_AUTOMATION;
  } catch {
    return DEFAULT_AUTOMATION;
  }
}

// Dependencias reales (Anthropic + GitHub + generación de imagen).
function realDeps(): GenerateDeps {
  const branch = config.github.baseBranch;
  return {
    llm: llmGenerateDraft,
    listPosts: () => listPosts(branch),
    commit: async (files, msg) => { await commitFiles(files, msg, branch); },
    // Devuelve la portada SIN commitearla: generateDraft la mete en el mismo
    // commit que el .md. Antes iba en un commit propio, así que un fallo
    // posterior dejaba la imagen huérfana (y un build extra del sitio).
    generateCover: async (prompt: string) => {
      const raw = (await generateImage(prompt)).base64;
      const webp = await optimizeImage(raw, { cover: COVER_SIZE });
      const name = hashedName(webp, "blog-auto");
      const path = `/uploads/${name}`;
      return { path, file: { path: `public${path}`, content: webp, encoding: "base64" as const } };
    },
  };
}

// Ejecuta UNA generación ahora (botón "Generar ahora" del panel). Ignora el
// horario/cupo (es explícita), pero respeta la regla de fuentes requeridas.
export async function runAutomationOnce(): Promise<GenerateResult> {
  const cfg = await loadConfig();
  if (!cfg.topics.length) return { ok: false, reason: "no hay temas configurados" };
  return generateDraft(cfg, realDeps());
}

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

// Freno de gasto: intentos por día, espaciados. La lógica (pura y probada) vive
// en createAttemptLimiter; aquí solo se instancia. En memoria, como el resto del
// scheduler, que asume un único proceso (documentado en DEPLOY.md).
const MAX_ATTEMPTS_PER_DAY = 3;       // tolera un fallo pasajero, acota el gasto
const RETRY_BACKOFF_MS = 15 * 60_000; // y espacia los reintentos 15 min
const limiter = createAttemptLimiter(MAX_ATTEMPTS_PER_DAY, RETRY_BACKOFF_MS);

// Solo para pruebas: reinicia el freno entre casos.
export function resetAttemptsForTests(): void {
  limiter.reset();
  running = false;
}

// Un tick: si la automatización está activa y toca (según horario/cupo derivados
// de los posts), genera un borrador. Serial: nunca dos a la vez.
export async function tick(now = new Date()): Promise<GenerateResult | null> {
  if (running) return null;
  const cfg = await loadConfig();
  if (!cfg.enabled) return null;
  const posts = await listPosts(config.github.baseBranch).catch(() => []);
  const decision = shouldRunNow(cfg, now, scheduleStateFromPosts(posts, now));
  if (!decision.run) return null;

  // Contabiliza el INTENTO (no el éxito) ANTES de gastar nada.
  const today = dayKeyInTz(now, cfg.schedule.timezone);
  if (!limiter.tryAcquire(now, today)) return null;

  running = true;
  try {
    return await generateDraft(cfg, realDeps());
  } catch (err) {
    log.error("automation: la generación falló", {
      err: err instanceof Error ? err.stack ?? err.message : String(err),
      intento: limiter.attempts(), maxIntentos: MAX_ATTEMPTS_PER_DAY, dia: today,
    });
    captureError(err, { scope: "automation.tick", intento: limiter.attempts() });
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (timer) return;
  // Cada 60 s. El guard por `enabled` vive dentro de tick(), así que activar o
  // reconfigurar desde el panel surte efecto sin reiniciar el servidor.
  timer = setInterval(() => { void tick(); }, 60_000);
  if (typeof timer.unref === "function") timer.unref();
}

export function stopScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
