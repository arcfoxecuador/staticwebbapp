import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// ── Identidad del cliente (multi-tenant) ─────────────────────────────────────
// Todo lo específico de la institución vive en client.config.json (raíz del
// panel), no incrustado en el código ni en los prompts. Para servir a otro
// cliente, se edita ese archivo y nada más.
export interface ClientConfig {
  orgName: string;
  orgShort: string;
  location: string;
  language: string;
  description: string;
  voiceTone: string;
  emailDomain: string;
  authorDefault: string;
  github: { owner: string; repo: string; siteDir: string };
  // Presets de temporada del Agente de Diseño (configurable por cliente).
  themePresets: Array<{
    id: string;
    label: string;
    ink: string;
    cloud: string;
    accent: Array<{ color: string; at: number }>;
    seasonalEffect: "none" | "snow" | "confetti";
    seasonalIntensity?: "low" | "medium" | "high";
  }>;
}

// Ruta robusta en dev (tsx, src/) y en prod (node, dist/): client.config.json
// vive en la raíz del panel, un nivel por encima del módulo compilado.
const clientPath = resolve(dirname(fileURLToPath(import.meta.url)), "../client.config.json");
const client = JSON.parse(readFileSync(clientPath, "utf8")) as ClientConfig;

// Lee una variable de entorno obligatoria; lanza error claro si falta.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name} (revisa tu .env)`);
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

const isProd = process.env.NODE_ENV === "production";

// Valor por defecto histórico e inseguro de SESSION_SECRET. En producción se
// rechaza: firmar cookies de sesión con un secreto público permitiría falsificar
// sesiones de cualquier usuario del panel.
const INSECURE_SESSION_SECRET = "cambia-esto-en-produccion";

// SESSION_SECRET es obligatorio y no puede ser el valor por defecto en
// producción; en desarrollo se permite un valor temporal con aviso para no
// frenar el arranque local.
function resolveSessionSecret(): string {
  const v = process.env.SESSION_SECRET;
  if (isProd) {
    if (!v || v === INSECURE_SESSION_SECRET) {
      throw new Error(
        "SESSION_SECRET es obligatorio en producción y no puede ser el valor por defecto. " +
          "Genera uno con: openssl rand -hex 32",
      );
    }
    return v;
  }
  if (!v) {
    console.warn("⚠️  SESSION_SECRET sin definir: usando un secreto de desarrollo inseguro. Defínelo antes de desplegar.");
    return INSECURE_SESSION_SECRET;
  }
  return v;
}

// URL pública del sitio en producción y en staging.
const siteUrl = optional("SITE_URL", "").replace(/\/+$/, "");
const stageUrl = (optional("STAGE_URL", "") || optional("SITE_URL", "")).replace(/\/+$/, "");

// Rama de PUBLICACIÓN (donde commitean agentes + editor) y rama de PRODUCCIÓN.
// Por defecto AMBAS son "main": los agentes publican DIRECTO a producción ("modo
// normal"). El modelo staging-first (publicar a una rama `stage` y promover con
// el botón) se ACTIVA poniendo GITHUB_BASE_BRANCH=stage cuando ese deploy exista.
const baseBranch = optional("GITHUB_BASE_BRANCH", "main");
const prodBranch = optional("GITHUB_PROD_BRANCH", "main");
// Si publican a la misma rama de producción, no hay paso de staging.
const publishesToProd = baseBranch === prodBranch;

export const config = {
  port: Number(process.env.PORT ?? 4321),
  panelBaseUrl: optional("PANEL_BASE_URL", "http://localhost:4321"),
  // URL pública del sitio Astro desplegado (ej. https://iidea-pagina-web.vercel.app)
  // para mostrar las vistas previas de imágenes en el editor.
  siteUrl,
  // URL de STAGING (ej. https://stage.iidea.edu.ec). Cae a siteUrl si no se define.
  stageUrl,

  // Destino de publicación de los agentes (deriva de baseBranch vs prodBranch).
  // `where` = etiqueta para los mensajes; `url` = base de los enlaces "ver resultado".
  publish: {
    toProd: publishesToProd,
    where: publishesToProd ? "el sitio" : "staging",
    url: publishesToProd ? siteUrl : stageUrl,
  },

  // Identidad del cliente (ver client.config.json) — usada por los agentes y como
  // valor por defecto de varios ajustes de abajo.
  client,

  anthropicApiKey: optional("ANTHROPIC_API_KEY"),

  github: {
    token: optional("GITHUB_TOKEN"),
    owner: optional("GITHUB_OWNER", client.github.owner),
    repo: optional("GITHUB_REPO", client.github.repo),
    // Rama de PUBLICACIÓN (agentes + editor commitean aquí) y de PRODUCCIÓN.
    // Por defecto ambas = "main" (publica directo a prod). Ver consts arriba.
    baseBranch,
    prodBranch,
    siteDir: optional("SITE_DIR", client.github.siteDir),
  },

  microsoft: {
    clientId: optional("MICROSOFT_CLIENT_ID"),
    clientSecret: optional("MICROSOFT_CLIENT_SECRET"),
    // Tenant de Microsoft 365 del cliente. Restringe el login a esa organización.
    // Usa el Directory (tenant) ID, o "organizations" para cualquier cuenta de trabajo.
    tenant: optional("MICROSOFT_TENANT_ID", "organizations"),
    allowedDomain: optional("ALLOWED_EMAIL_DOMAIN", client.emailDomain),
    allowedEmails: optional("ALLOWED_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    sessionSecret: resolveSessionSecret(),
  },

  // Correos con rol ADMIN (acciones globales/irreversibles: promover a producción,
  // apariencia/tema, categorías, borrado permanente de medios). El resto de las
  // cuentas autorizadas son EDITORES. Si la lista está vacía, TODOS son admin
  // (compatibilidad: setups de un solo usuario siguen con acceso total).
  adminEmails: optional("ADMIN_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  // Límites de uso del Asistente IA (control de costo/abuso). Todo en memoria:
  // es una barrera, no contabilidad exacta; se reinicia al reiniciar el panel.
  agent: {
    // Máx. peticiones al asistente por usuario y por hora (0 = sin límite).
    ratePerHour: Number(process.env.AGENT_RATE_PER_HOUR ?? 30),
    // Máx. peticiones globales por hora (protege el gasto agregado).
    rateGlobalPerHour: Number(process.env.AGENT_RATE_GLOBAL_PER_HOUR ?? 300),
    // Techo de tokens al mes (input+output). 0 = sin límite; el admin lo fija.
    monthlyTokenBudget: Number(process.env.AGENT_MONTHLY_TOKEN_BUDGET ?? 0),
    // Precios opcionales para estimar el costo en el panel (USD por millón de
    // tokens). 0 = no se muestra costo, solo tokens.
    usdPerMInput: Number(process.env.AGENT_USD_PER_M_INPUT ?? 0),
    usdPerMOutput: Number(process.env.AGENT_USD_PER_M_OUTPUT ?? 0),
  },

  images: {
    provider: optional("IMAGE_PROVIDER", "none") as "gemini" | "openai" | "none",
    openaiApiKey: optional("OPENAI_API_KEY"),
    geminiApiKey: optional("GEMINI_API_KEY"),
    // "Nano Banana". Configurable para subir a Pro sin tocar código.
    geminiModel: optional("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"),
  },
};

export { required, isProd };
