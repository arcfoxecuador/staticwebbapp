import { z } from "zod";

// Configuración de la AUTOMATIZACIÓN del blog (astro-web/src/config/blog-automation.json).
// Git-first + "sin kaboom": el panel valida con este esquema ANTES de guardar,
// así que una config inválida nunca llega al repo. No la consume el build del
// sitio; la usa el motor de generación del panel.

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Una fuente por defecto que el bot investiga antes de escribir cada blog.
// `required`: si falla su investigación, NO se genera el blog (vs. opcional, que
// se ignora si falla).
export const sourceSchema = z.object({
  url: z.string().trim().url("URL de fuente inválida"),
  required: z.boolean().default(false),
  // Palabras clave separadas por comas. Vacío = sin filtro de palabras.
  keywordFilter: z.string().trim().default(""),
  // Solo contenido más nuevo que N días. 0 = sin filtro de fecha.
  newerThanDays: z.number().int().min(0).max(3650).default(0),
  // Profundidad de rastreo desde la URL/feed. 0 = solo la propia URL/feed.
  crawlDepth: z.number().int().min(0).max(3).default(0),
  // Máximo de resultados a extraer de esta fuente.
  maxResults: z.number().int().min(1).max(50).default(10),
});
export type SourceConfig = z.infer<typeof sourceSchema>;

export const blogAutomationSchema = z.object({
  // Interruptor global de la automatización.
  enabled: z.boolean().default(false),
  schedule: z
    .object({
      // Blogs por semana (tope de generaciones automáticas por semana).
      perWeek: z.number().int().min(1).max(7).default(1),
      // Días preferidos en los que puede generar.
      days: z.array(z.enum(WEEKDAYS)).min(1, "Elige al menos un día").default(["tue"]),
      // Hora preferida (24h, HH:MM) en la zona horaria de abajo.
      time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM, 24h)").default("09:00"),
      timezone: z.string().trim().min(1).default("America/Guayaquil"),
    })
    .default({ perWeek: 1, days: ["tue"], time: "09:00", timezone: "America/Guayaquil" }),
  // Lista ORDENADA de temas; el orden es la prioridad (el primero pesa más). El
  // motor rota entre ellos: elige el menos usado, y desempata por prioridad.
  topics: z.array(z.string().trim().min(1)).default([]),
  // Ajustes POR TEMA (opcionales), indexados por el nombre del tema. Solo se
  // guardan las claves que difieren de la config global de "Redacción". Es
  // aditivo: si un tema no aparece aquí, usa los valores globales. El motor de
  // rotación sigue trabajando con la lista `topics` (strings), sin cambios.
  topicOverrides: z
    .record(
      z.string(),
      z
        .object({
          tone: z.string().trim().min(1).optional(),
          minWords: z.number().int().min(200).max(5000).optional(),
          maxWords: z.number().int().min(200).max(5000).optional(),
        })
        .refine((o) => o.minWords == null || o.maxWords == null || o.maxWords >= o.minWords, {
          message: "El máximo de palabras debe ser ≥ al mínimo",
          path: ["maxWords"],
        }),
    )
    .default({}),
  sources: z.array(sourceSchema).default([]),
  competitors: z
    .object({
      // Dominios o URLs de la competencia a vigilar.
      domains: z.array(z.string().trim().min(1)).default([]),
      // Ventana de retrospección: solo posts de los últimos N días.
      lookbackDays: z.number().int().min(1).max(365).default(30),
      // Cuántos posts recientes traer por competidor.
      postsPerCompetitor: z.number().int().min(1).max(50).default(5),
    })
    .default({ domains: [], lookbackDays: 30, postsPerCompetitor: 5 }),
  // Ajustes de redacción. El modelo (Claude Sonnet) se fija en código (MODELS),
  // configurable por variable de entorno; aquí van largo y tono editables.
  generation: z
    .object({
      minWords: z.number().int().min(200).max(5000).default(900),
      maxWords: z.number().int().min(200).max(5000).default(1200),
      tone: z.string().trim().min(1).default("profesional y cercano"),
      language: z.string().trim().min(1).default("es"),
    })
    .refine((g) => g.maxWords >= g.minWords, { message: "El máximo de palabras debe ser ≥ al mínimo", path: ["maxWords"] })
    .default({ minWords: 900, maxWords: 1200, tone: "profesional y cercano", language: "es" }),
});

export type BlogAutomationConfig = z.infer<typeof blogAutomationSchema>;

// Config por defecto (semilla y fallback si el archivo aún no existe).
export const DEFAULT_AUTOMATION: BlogAutomationConfig = blogAutomationSchema.parse({});
