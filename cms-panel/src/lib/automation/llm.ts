import { getAnthropic } from "../anthropic.js";
import { recordBackgroundRun } from "../agentBudget.js";
import { MODELS } from "../../models.js";
import { config } from "../../config.js";
import { loadBrand, brandContextText, CONTENT_HARD_RULES } from "../brand.js";
import { wrapUntrusted, UNTRUSTED_INPUT_RULES, foreignLinks } from "../promptSafety.js";
import { startRunTrace, log } from "../observability.js";
import { BLOG_CATEGORIES } from "../markdown.js";
import type { BlogAutomationConfig } from "../blogAutomationSchema.js";
import type { DraftContent } from "./generate.js";

// Redacción real con el LLM (Claude Sonnet). Fuerza una salida ESTRUCTURADA vía
// la herramienta `draft`, así el motor recibe campos limpios (nada de parsear
// texto libre). Es la `llm` que se inyecta a generateDraft en producción.
export async function llmGenerateDraft(input: {
  topic: string;
  researchText: string;
  config: BlogAutomationConfig;
}): Promise<DraftContent> {
  const trace = startRunTrace("automation_blog", { origen: "sistema", tema: input.topic });
  const c = config.client;
  const g = input.config.generation;
  // Ajustes POR TEMA (si existen) sobre la config global de redacción.
  const ov = input.config.topicOverrides?.[input.topic] ?? {};
  const tone = ov.tone || g.tone;
  const minWords = ov.minWords ?? g.minWords;
  const maxWords = Math.max(ov.maxWords ?? g.maxWords, minWords);
  const brand = await loadBrand(config.github.baseBranch);
  const system =
    `Eres redactor de blog de ${c.orgName} (${c.location}). ${c.orgShort} ofrece ${c.description}. ` +
    `Escribe una entrada de blog en ${g.language}, con tono ${tone}, de ${minWords} a ${maxWords} palabras. ` +
    `Apóyate en la INVESTIGACIÓN para aportar datos frescos. Los HUECOS de temas te dicen SOBRE QUÉ conviene escribir, ` +
    `no con quién compararte: cubre ese tema mejor y más completo, sin aludir a nadie más. Cuerpo en Markdown con ` +
    `subtítulos (##) y listas cuando aporten; cierra con una llamada a la acción. Devuelve SIEMPRE el resultado ` +
    `llamando a la herramienta "draft".` +
    // Antes decía "diferenciarte de la competencia (no copies sus títulos)", lo
    // que invitaba a compararse justo mientras el prompt lleva un bloque con
    // dominios y titulares de otros institutos. Las reglas duras van en código
    // porque la guía de marca es editable desde el panel.
    CONTENT_HARD_RULES +
    // La INVESTIGACIÓN es texto raspado de páginas ajenas y el sistema le pide
    // arriba "apóyate en ella": sin estas reglas, un <title> hostil se lee como
    // una orden del panel. Van en código por el mismo motivo que las de arriba.
    UNTRUSTED_INPUT_RULES +
    brandContextText(brand);

  const res = await getAnthropic().messages.create({
    model: MODELS.automation,
    max_tokens: 4000,
    system,
    tools: [
      {
        name: "draft",
        description: "Entrega la entrada de blog redactada, con todos los campos.",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título del artículo (máx. 120 caracteres)" },
            excerpt: { type: "string", description: "Resumen atractivo para listados (máx. 280 caracteres)" },
            body: { type: "string", description: "Cuerpo completo en Markdown" },
            cat: { type: "string", enum: [...BLOG_CATEGORIES], description: "Categoría del blog" },
            imgAlt: { type: "string", description: "Texto alternativo de la portada (accesibilidad + SEO)" },
            imagePrompt: { type: "string", description: "Prompt visual para generar la portada (estilo fotográfico, educativo)" },
          },
          required: ["title", "excerpt", "body", "cat", "imgAlt", "imagePrompt"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "draft" },
    messages: [
      {
        role: "user",
        content:
          `Tema del blog: ${input.topic}\n\n` +
          // El tema lo elige el equipo (confiable). La investigación viene de la
          // web abierta: va enmarcada, saneada y con el recordatorio pegado.
          wrapUntrusted("investigación de fuentes y competencia", input.researchText),
      },
    ],
  });

  // Contador SEPARADO del presupuesto que gatea a los editores: el blog escribe
  // solo cada semana y agotarles a ellos la cuota sería el efecto contrario.
  // Se registra antes de validar la respuesta: el gasto ya está hecho.
  recordBackgroundRun(res.usage?.input_tokens ?? 0, res.usage?.output_tokens ?? 0);

  const comunes = {
    model: MODELS.automation,
    tokensIn: res.usage?.input_tokens ?? 0,
    tokensOut: res.usage?.output_tokens ?? 0,
    // Cuánto material externo entró: si un día una fuente se dispara, el costo
    // sube por aquí y sin esto no habría forma de verlo.
    materialExterno: input.researchText.length,
  };

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    trace.finish("error", { ...comunes, error: "sin_borrador_estructurado" });
    throw new Error("El modelo no devolvió un borrador estructurado.");
  }

  // Comprobación del lado de la SALIDA. Enmarcar el material externo baja la
  // probabilidad de inyección, no la vuelve cero, y el objetivo habitual de una
  // inyección en un redactor es colar un enlace. Se avisa, no se bloquea: el
  // borrador queda en draft y lo aprueba una persona; tumbar la generación por
  // un falso positivo sería peor que registrarlo.
  const draft = block.input as DraftContent;
  const permitidos = [
    config.siteUrl,
    ...(input.config.sources ?? []).map((s) => s.url),
  ].filter(Boolean);
  const foraneos = foreignLinks([draft.title, draft.excerpt, draft.body].join("\n"), permitidos);
  if (foraneos.length) {
    log.warn("borrador con enlaces no permitidos", {
      evt: "injection_warn", tema: input.topic, dominios: foraneos,
    });
  }

  trace.finish("ok", { ...comunes, enlacesForaneos: foraneos.length });
  return draft;
}
