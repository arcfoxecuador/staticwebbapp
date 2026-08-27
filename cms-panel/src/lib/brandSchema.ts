import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Guía de MARCA (astro-web/src/config/brand.json). La editan desde el panel
// (pantalla "Marca") y la LEEN los agentes en cada corrida para redactar textos
// con la voz correcta y generar imágenes con las medidas adecuadas. Git-first +
// validada aquí antes de guardar. NO la consume el build del sitio (es solo para
// el panel y los agentes), así que un valor flojo nunca rompe el sitio.
// ─────────────────────────────────────────────────────────────────────────────

// Medidas disponibles para generar imágenes (deben coincidir con IMAGE_PRESETS
// en lib/images.ts). Cada "slot" del sitio se mapea a una de estas.
export const IMAGE_SIZES = ["wide", "cover", "landscape", "portrait", "square", "natural"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export const imageSlotSchema = z.object({
  use: z.string().trim().min(1, "Describe para qué es esta imagen"),
  size: z.enum(IMAGE_SIZES).default("natural"),
  notes: z.string().trim().default(""),
});
export type ImageSlot = z.infer<typeof imageSlotSchema>;

// Persona/segmento de audiencia (a quién le hablamos).
export const personaSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
});
// Terminología: qué palabra usar y cuál evitar.
export const termSchema = z.object({
  prefer: z.string().trim().min(1),
  avoid: z.string().trim().default(""),
  note: z.string().trim().default(""),
});
// Llamada a la acción preferida y cuándo usarla.
export const ctaSchema = z.object({
  label: z.string().trim().min(1),
  when: z.string().trim().default(""),
});

export const brandSchema = z.object({
  // ── Identidad ──────────────────────────────────────────────────────────────
  identity: z
    .object({
      legalName: z.string().trim().default(""),
      type: z.string().trim().default(""),      // ej. "Instituto Superior Tecnológico"
      tagline: z.string().trim().default(""),   // eslogan
      foundedYear: z.string().trim().default(""),
      city: z.string().trim().default(""),
      country: z.string().trim().default(""),
      accreditation: z.string().trim().default(""), // regulador/aval (ej. SENESCYT/CES)
    })
    .default({ legalName: "", type: "", tagline: "", foundedYear: "", city: "", country: "", accreditation: "" }),
  // ── Oferta ─────────────────────────────────────────────────────────────────
  offering: z
    .object({
      modality: z.string().trim().default(""),      // ej. "100% online"
      methodology: z.string().trim().default(""),   // ej. "dual con IA aplicada"
      startDates: z.string().trim().default(""),    // ej. "10 fechas de inicio al año"
      programAreas: z.array(z.string().trim().min(1)).default([]), // áreas/carreras a alto nivel
    })
    .default({ modality: "", methodology: "", startDates: "", programAreas: [] }),
  // ── Audiencia ──────────────────────────────────────────────────────────────
  audience: z.string().trim().default(""),
  personas: z.array(personaSchema).default([]),
  // ── Voz y mensajes ───────────────────────────────────────────────────────────
  voice: z
    .object({
      tone: z.string().trim().min(1).default("cercano, profesional, optimista, orientado a empleabilidad"),
      do: z.array(z.string().trim().min(1)).default([]),
      dont: z.array(z.string().trim().min(1)).default([]),
    })
    .default({ tone: "cercano, profesional, optimista, orientado a empleabilidad", do: [], dont: [] }),
  mission: z.string().trim().default(""),
  vision: z.string().trim().default(""),
  valueProps: z.array(z.string().trim().min(1)).default([]),
  differentiators: z.array(z.string().trim().min(1)).default([]), // por qué IIDEA (vs. no estudiar / alternativas)
  keyPhrases: z.array(z.string().trim().min(1)).default([]),
  boilerplate: z.string().trim().default(""),
  // ── Terminología ─────────────────────────────────────────────────────────────
  terminology: z.array(termSchema).default([]),
  // ── Reglas, cumplimiento y fuentes ───────────────────────────────────────────
  // Reglas DURAS de contenido (no nombrar competencia, no inventar datos, etc.).
  rules: z.array(z.string().trim().min(1)).default([]),
  compliance: z.array(z.string().trim().min(1)).default([]), // límites legales/regulatorios
  // De dónde sacar la información al redactar (fuentes oficiales de confianza).
  sources: z.string().trim().default(""),
  // ── Conversión y SEO ─────────────────────────────────────────────────────────
  ctas: z.array(ctaSchema).default([]),
  seoKeywords: z.array(z.string().trim().min(1)).default([]),
  // ── Imágenes ─────────────────────────────────────────────────────────────────
  // Cómo debe verse cada tipo de imagen (medida + notas de composición).
  imageGuide: z.array(imageSlotSchema).default([]),
});

export type BrandGuide = z.infer<typeof brandSchema>;

// Borrador por defecto (semilla y fallback si el archivo aún no existe). Valores
// razonables derivados de la identidad del cliente; el equipo los refina desde la
// pantalla "Marca". No inventa datos ni promesas: son guías de estilo/medidas.
export const DEFAULT_BRAND: BrandGuide = brandSchema.parse({
  identity: {
    legalName: "Instituto Superior Tecnológico IIDEA",
    type: "Instituto Superior Tecnológico",
    tagline: "Empieza este mes, no en seis",
    foundedYear: "",
    city: "",
    country: "Ecuador",
    accreditation: "",
  },
  offering: {
    modality: "100% online",
    methodology: "Metodología dual con IA aplicada",
    startDates: "10 fechas de inicio al año (una casi cada mes)",
    programAreas: [],
  },
  personas: [
    { name: "Primera carrera", description: "Jóvenes que buscan su primera carrera técnica y necesitan flexibilidad para empezar ya." },
    { name: "Adulto que trabaja", description: "Personas que trabajan y quieren estudiar sin dejar su empleo, con horarios flexibles." },
  ],
  differentiators: [
    "Empiezas casi cualquier mes (10 fechas al año), no una sola vez al año.",
    "100% online: estudias desde donde estés, a tu ritmo.",
    "Metodología dual con IA aplicada, orientada a la práctica y al empleo.",
  ],
  terminology: [
    { prefer: "carreras", avoid: "cursos", note: "IIDEA ofrece carreras, no cursos sueltos." },
    { prefer: "estudiantes", avoid: "clientes", note: "" },
  ],
  compliance: [
    "No garantices titulación ni empleo; describe apoyo y oportunidades, no resultados asegurados.",
    "Usa los nombres oficiales de las carreras y titulaciones.",
  ],
  ctas: [
    { label: "Aplica ahora", when: "Cierre de páginas y entradas de captación." },
    { label: "Escríbenos por WhatsApp", when: "Cuando el lector tiene dudas o quiere hablar con alguien." },
    { label: "Ver carreras", when: "Para explorar la oferta académica." },
  ],
  seoKeywords: ["carreras online Ecuador", "estudiar tecnología online", "instituto tecnológico online"],
  voice: {
    tone: "cercano, profesional, optimista, orientado a empleabilidad",
    do: [
      "Habla de tú, de forma cercana y clara.",
      "Frases cortas: una idea por frase.",
      "Enfócate en el resultado para el estudiante (empleo, tiempo, flexibilidad).",
      "Usa datos concretos (100% online, 10 fechas de inicio al año).",
      "Cierra con una llamada a la acción clara.",
    ],
    dont: [
      "Tecnicismos vacíos o relleno.",
      "Promesas exageradas o garantías de empleo.",
      "Tono corporativo frío o impersonal.",
      "Textos largos sin subtítulos ni listas.",
    ],
  },
  audience: "Personas que buscan estudiar una carrera técnica 100% online en Ecuador, con foco en empleabilidad y flexibilidad de horario.",
  mission: "Hacer accesible la educación superior tecnológica 100% en línea, con foco en la empleabilidad de cada estudiante.",
  vision: "Ser el instituto tecnológico en línea de referencia en Ecuador por su cercanía, flexibilidad y resultados de empleabilidad.",
  valueProps: [
    "Carreras 100% online",
    "Metodología dual con IA aplicada",
    "10 fechas de inicio al año",
    "Enfoque en empleabilidad",
  ],
  keyPhrases: ["Empieza este mes, no en seis"],
  boilerplate: "IIDEA es un instituto superior tecnológico con carreras 100% online, metodología dual e IA aplicada, y 10 fechas de inicio al año.",
  rules: [
    "No menciones a la competencia por su nombre ni compares con otras instituciones.",
    "No inventes datos, cifras, fechas ni testimonios: usa solo la información oficial y la investigación provista.",
    "No prometas empleo garantizado ni resultados que no podamos respaldar.",
    "Si falta un dato clave, dilo o pide la información; no lo rellenes con supuestos.",
    "Cierra siempre con una llamada a la acción hacia IIDEA (aplicar, escribir a Bienestar, ver carreras).",
  ],
  sources: "Sitio y páginas de IIDEA, comunicados oficiales del instituto, y la investigación de fuentes configurada en Automatización. Ante la duda, prioriza la información oficial de IIDEA sobre fuentes externas.",
  imageGuide: [
    { use: "Fondo de hero / banner ancho de página", size: "wide", notes: "Horizontal 16:9. Deja el centro-izquierda despejado para el texto encima." },
    { use: "Imagen lateral de un hero", size: "landscape", notes: "Horizontal 4:3." },
    { use: "Portada de una entrada o noticia", size: "cover", notes: "16:10. Motivo claro y centrado (se recorta a este formato)." },
    { use: "Imagen de una sección de texto + imagen", size: "landscape", notes: "Horizontal 4:3." },
    { use: "Foto de persona (testimonio, equipo)", size: "portrait", notes: "Vertical 4:5, rostro centrado." },
    { use: "Logo, avatar o ícono", size: "square", notes: "Cuadrado 1:1." },
    { use: "Imagen libre dentro de Contenido libre", size: "natural", notes: "Sin recorte: conserva su proporción y se adapta al ancho." },
  ],
});
