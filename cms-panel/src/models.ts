// ─────────────────────────────────────────────────────────────────────────────
// Selección de modelo por agente (re-evaluada 2026-07; ver README).
//
//   • Agentes de Diseño, Páginas y Blogs → claude-opus-4-8 (el Opus vigente).
//        Editan JSON validado con precisión absoluta y redactan con voz
//        institucional; son la cara visible del sitio, la calidad manda.
//   • Agente de Medios → claude-opus-4-8. Escribe prompts visuales y alt text;
//        volumen bajo.
//   • Router (clasifica la intención) → claude-haiku-4-5. Tarea trivial y de
//        baja latencia; no necesita un modelo grande.
//
// Alternativa de costo si el volumen de publicación crece: claude-sonnet-5
// (calidad casi-Opus en redacción/agentes a ~60% menos costo) vía las
// variables de entorno de abajo, sin tocar código.
// ─────────────────────────────────────────────────────────────────────────────

export const MODELS = {
  blog: process.env.MODEL_BLOG_AGENT || "claude-opus-4-8",
  design: process.env.MODEL_DESIGN_AGENT || "claude-opus-4-8",
  page: process.env.MODEL_PAGE_AGENT || "claude-opus-4-8",
  media: process.env.MODEL_MEDIA_AGENT || "claude-opus-4-8",
  router: process.env.MODEL_ROUTER || "claude-haiku-4-5",
  // Automatización del blog: Claude Sonnet por defecto (buena relación
  // calidad/costo para volumen de redacción). Configurable por entorno.
  automation: process.env.MODEL_BLOG_AUTOMATION || "claude-sonnet-5",
} as const;
