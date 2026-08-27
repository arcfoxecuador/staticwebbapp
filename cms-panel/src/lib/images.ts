import sharp from "sharp";
import { recordImageGenerated } from "./agentBudget.js";
import { createHash } from "node:crypto";
import { config } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────
// Imágenes del panel: generación por IA, descarga segura y OPTIMIZACIÓN.
//
// IMPORTANTE: Claude NO genera imágenes. El agente entiende el pedido y escribe
// el PROMPT; los píxeles los crea un proveedor aparte (Gemini u OpenAI). Si el
// proveedor primario falla y el otro está configurado, se usa como respaldo.
//
// TODA imagen que entra al sitio —subida manual, generada por IA o descargada
// de un enlace— pasa por optimizeImage(): WebP, ancho máximo y orientación EXIF
// corregida. Así ningún camino puede publicar un PNG de 4 MB que rompa los
// presupuestos de Core Web Vitals del proyecto.
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedImage {
  base64: string; // contenido de imagen en base64 (sin prefijo data:)
  prompt: string;
}

export interface OptimizeOptions {
  // Ancho máximo (no agranda). Por defecto 1920 (subidas generales).
  maxWidth?: number;
  // Recorte a proporción fija (portadas): {width, height} exactos con fit cover.
  cover?: { width: number; height: number };
  quality?: number;
}

// Medidas objetivo por tipo de imagen (recorte 'cover' a estas proporciones).
// Deben coincidir con IMAGE_SIZES en brandSchema.ts. "natural" no recorta.
export const IMAGE_PRESETS = {
  wide: { width: 1920, height: 1080 },      // 16:9  — fondos de hero, banners anchos
  cover: { width: 1600, height: 1000 },     // 16:10 — portadas de blog/noticias
  landscape: { width: 1440, height: 1080 }, // 4:3   — imagen lateral, texto+imagen
  portrait: { width: 1080, height: 1350 },  // 4:5   — fotos de persona (vertical)
  square: { width: 1200, height: 1200 },    // 1:1   — logos, avatares, íconos
} as const;
export type ImagePreset = keyof typeof IMAGE_PRESETS;

// Pista de composición para el modelo, por medida (mejora el encuadre).
export const PRESET_HINT: Record<ImagePreset, string> = {
  wide: "Composición horizontal panorámica (16:9).",
  cover: "Composición horizontal (16:10), motivo centrado.",
  landscape: "Composición horizontal (4:3).",
  portrait: "Composición vertical (4:5), sujeto centrado.",
  square: "Composición cuadrada (1:1), sujeto centrado.",
};

// Proporción estándar de las portadas del blog (16:10). Alias de la medida 'cover'.
export const COVER_SIZE = IMAGE_PRESETS.cover;

// Convierte cualquier imagen (base64) a WebP optimizado. Devuelve base64.
export async function optimizeImage(base64: string, opts: OptimizeOptions = {}): Promise<string> {
  let pipe = sharp(Buffer.from(base64, "base64")).rotate(); // respeta EXIF
  if (opts.cover) {
    pipe = pipe.resize({ ...opts.cover, fit: "cover", withoutEnlargement: false });
  } else {
    pipe = pipe.resize({ width: opts.maxWidth ?? 1920, withoutEnlargement: true });
  }
  const out = await pipe.webp({ quality: opts.quality ?? 80 }).toBuffer();
  return out.toString("base64");
}

// Nombre de archivo estable por CONTENIDO (hash), para que subir dos veces la
// misma imagen no duplique archivos en la biblioteca.
export function hashedName(base64: string, originalName: string): string {
  const hash = createHash("sha256").update(Buffer.from(base64, "base64")).digest("hex").slice(0, 12);
  const base =
    originalName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "imagen";
  return `${base}-${hash}.webp`;
}

// Restricción que se añade a TODO prompt, lo pida el agente o no.
//
// Los generadores rellenan paredes, pantallas y pizarras con texto y logotipos
// inventados: en /nosotros salieron dos heros seguidos con marcas ajenas
// ("EDUTECH ECUADOR" en una pantalla, un logo de "EDUCARED" en la pared) y se
// publicaron. La regla equivalente vive también en el prompt de los agentes
// (brand.ts), pero se aplica AQUÍ además porque este es el único punto por el
// que pasan las tres vías de generación —herramienta de medios, portada de blog
// y automatización—, así que basta con que un agente la olvide para que igual
// se cumpla.
const NO_BRANDING_RULE =
  "Sin texto legible de ningún tipo (carteles, rótulos, pantallas con palabras, " +
  "pizarras escritas, pósters). Sin logotipos ni nombres de marca, reales o " +
  "inventados. Pantallas, monitores, paredes de fondo y pizarras: neutras, " +
  "apagadas, con formas abstractas o desenfocadas.";

// Genera una imagen a partir de un prompt, con respaldo entre proveedores:
// si el primario falla (cupo, caída) y el otro tiene API key, se intenta ahí.
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const order = providerOrder();
  if (order.length === 0) {
    throw new Error(
      "La generación de imágenes por IA está desactivada (IMAGE_PROVIDER=none). " +
        "Configura un proveedor (gemini | openai) o sube la imagen manualmente.",
    );
  }
  const guardedPrompt = `${prompt}\n\n${NO_BRANDING_RULE}`;
  let lastError: unknown;
  for (const provider of order) {
    try {
      const img = provider === "gemini" ? await generateWithGemini(guardedPrompt) : await generateWithOpenAI(guardedPrompt);
      // Cada imagen se paga aparte (no va por tokens): sin este contador el
      // gasto en imágenes no aparecía en ningún tablero.
      recordImageGenerated();
      return img;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// Primario según IMAGE_PROVIDER; el otro entra como respaldo si tiene API key.
function providerOrder(): Array<"gemini" | "openai"> {
  const { provider, geminiApiKey, openaiApiKey } = config.images;
  const available = { gemini: Boolean(geminiApiKey), openai: Boolean(openaiApiKey) };
  if (provider === "none") return [];
  const primary = provider;
  const fallback = provider === "gemini" ? "openai" : "gemini";
  const order: Array<"gemini" | "openai"> = [];
  if (available[primary]) order.push(primary);
  if (available[fallback]) order.push(fallback);
  // Sin key del primario pero pedido explícito: deja que el proveedor lance su
  // error claro ("Falta GEMINI_API_KEY") en lugar de fallar en silencio.
  if (order.length === 0) order.push(primary);
  return order;
}

// Nano Banana (Google Gemini). Usa la API generateContent (estable y soportada
// por las SDK oficiales): se le pasa el prompt como texto y devuelve la imagen
// como `inlineData` en base64. El modelo es configurable (GEMINI_IMAGE_MODEL);
// por defecto gemini-2.5-flash-image ("Nano Banana"). Para más calidad/resolución:
// gemini-3-pro-image (Nano Banana Pro) o gemini-3.1-flash-image. API key gratuita
// en https://aistudio.google.com/apikey.
async function generateWithGemini(prompt: string): Promise<GeneratedImage> {
  if (!config.images.geminiApiKey) throw new Error("Falta GEMINI_API_KEY");
  const model = config.images.geminiModel;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        // La key va en cabecera (no en la URL) para no filtrarla en logs.
        "x-goog-api-key": config.images.geminiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Hay que pedir explícitamente la modalidad IMAGE o no devuelve imagen.
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini images → ${res.status}: ${await res.text()}`);
  // La imagen viene como una "part" con inlineData.data (base64). El resto de
  // parts pueden ser texto; tomamos la primera que traiga datos de imagen.
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string };
          inline_data?: { data?: string };
        }>;
      };
    }>;
  };
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    const b64 = part.inlineData?.data ?? part.inline_data?.data;
    if (b64) return { base64: b64, prompt };
  }
  throw new Error(
    `Gemini (${model}) no devolvió ninguna imagen. Verifica que el modelo soporte ` +
      "generación de imágenes (gemini-2.5-flash-image, gemini-3-pro-image, …).",
  );
}

async function generateWithOpenAI(prompt: string): Promise<GeneratedImage> {
  if (!config.images.openaiApiKey) throw new Error("Falta OPENAI_API_KEY");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.images.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024", // ~16:10, encaja con las portadas del sitio
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI images → ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ b64_json: string }> };
  return { base64: data.data[0].b64_json, prompt };
}

// ── Descarga segura de imágenes por URL ──────────────────────────────────────
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Bloquea hosts internos/privados: el agente puede pedir cualquier URL, y sin
// esto un prompt malicioso podría hacer que el panel lea servicios internos
// (SSRF: metadata de la nube, localhost, red privada).
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`URL de imagen inválida: "${raw}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Solo se permiten URLs http(s), no ${url.protocol}`);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host.startsWith("fd") || // IPv6 ULA
    host.startsWith("fe80:") || // IPv6 link-local
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (privateHost) throw new Error(`URL de imagen no permitida (host privado/interno): ${host}`);
  return url;
}

// Descarga una imagen desde una URL pública y la devuelve en base64.
// Verifica tipo de contenido y tamaño máximo (10 MB) antes de aceptarla.
export async function fetchImageAsBase64(rawUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(rawUrl);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`No se pudo descargar la imagen: ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    throw new Error(`El enlace no es una imagen (content-type: ${type || "desconocido"})`);
  }
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Imagen demasiado grande (${Math.round(declared / 1024 / 1024)} MB; máx. 10 MB)`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Imagen demasiado grande (${Math.round(buf.byteLength / 1024 / 1024)} MB; máx. 10 MB)`);
  }
  return buf.toString("base64");
}
