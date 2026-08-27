import { z } from "zod";

// Espejo en Zod del esquema de astro-web/src/config/theme.schema.json.
// El Agente de Diseño produce un objeto que se valida contra esto ANTES de
// commitearlo. Si no valida, el cambio se rechaza y nunca llega al sitio.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Debe ser un color hex de 6 dígitos, ej. #01154a");

// Una parada del degradado de marca: color + posición 0–100%.
const accentStop = z.object({
  color: hex,
  at: z.number().min(0).max(100),
});

export const themeSchema = z.object({
  $schema: z.string().optional(),
  themeId: z
    .string()
    .regex(/^[a-z0-9-]{1,32}$/, "themeId: minúsculas, números y guiones (máx 32)"),
  label: z.string().max(60).optional(),
  colors: z.object({
    ink: hex,
    cloud: hex,
    // Paradas del degradado de marca (mín. 2). El sitio deriva todo de aquí.
    accent: z.array(accentStop).min(2),
  }),
  promoBanner: z.object({
    enabled: z.boolean(),
    text: z.string().max(120).optional().default(""),
    ctaLabel: z.string().max(30).optional().default(""),
    ctaHref: z.string().max(300).optional().default(""),
    bg: hex.optional(),
    fg: hex.optional(),
  }),
  seasonal: z.object({
    effect: z.enum(["none", "snow", "confetti"]),
    intensity: z.enum(["low", "medium", "high"]).optional().default("medium"),
  }),
  // IDs de marketing/analítica que el sitio inyecta en el <head>. El Project ID
  // de Clarity es alfanumérico; el del Meta Pixel es solo dígitos. Se permite
  // vacío para desactivarlos.
  tracking: z
    .object({
      clarityId: z
        .string()
        .regex(/^[a-z0-9]{0,20}$/, "El ID de Clarity solo lleva letras minúsculas y números.")
        .optional()
        .default(""),
      metaPixelId: z
        .string()
        .regex(/^[0-9]{0,20}$/, "El ID del Meta Pixel solo lleva dígitos.")
        .optional()
        .default(""),
    })
    .optional(),
});

export type Theme = z.infer<typeof themeSchema>;
