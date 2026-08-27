import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { readFile } from "../lib/github.js";
import { themeSchema } from "../lib/themeSchema.js";
import type { RunContext } from "./context.js";

const THEME_PATH = "src/config/theme.json";

// Herramientas del Agente de Diseño. Superficie acotada: solo lee y escribe
// theme.json (validado contra el esquema). No puede tocar ningún componente ni
// CSS, así que "ponla navideña" nunca rompe el sitio.
export function buildDesignTools(ctx: RunContext) {
  const getCurrentTheme = betaZodTool({
    name: "get_current_theme",
    description:
      "Lee el theme.json actual del sitio (rama base). Úsalo SIEMPRE antes de " +
      "proponer cambios, para partir del estado real.",
    inputSchema: z.object({}),
    run: async () => {
      ctx.emit({ type: "step", message: "Leyendo el tema actual…" });
      const staged = ctx.readStaged(THEME_PATH);
      if (staged && staged.encoding !== "base64") return staged.content;
      return readFile(THEME_PATH, ctx.branch);
    },
  });

  const applyTheme = betaZodTool({
    name: "apply_theme",
    description:
      "Aplica un nuevo theme.json completo: lo valida contra el esquema, lo " +
      "commitea en una rama y abre un PR. El objeto debe incluir todos los campos " +
      "(themeId, colors, promoBanner, seasonal). colors.accent son las paradas del " +
      "degradado de marca: una lista de {color, at} (at = posición 0–100%), de la " +
      "más clara/inicial a la final. Usa los presets del prompt como punto de " +
      "partida. Para una promo, enciende promoBanner.enabled con un texto y CTA cortos.",
    inputSchema: z.object({
      theme: z
        .object({
          themeId: z.string(),
          label: z.string().optional(),
          colors: z.object({
            ink: z.string(),
            cloud: z.string(),
            accent: z
              .array(z.object({ color: z.string(), at: z.number() }))
              .describe("Paradas del degradado: [{color:'#hex', at:0..100}], mín. 2"),
          }),
          promoBanner: z.object({
            enabled: z.boolean(),
            text: z.string().optional(),
            ctaLabel: z.string().optional(),
            ctaHref: z.string().optional(),
            bg: z.string().optional(),
            fg: z.string().optional(),
          }),
          seasonal: z.object({
            effect: z.enum(["none", "snow", "confetti"]),
            intensity: z.enum(["low", "medium", "high"]).optional(),
          }),
        })
        .describe("El theme.json completo a aplicar"),
      summary: z.string().describe("Resumen en una frase del cambio (para el commit)"),
    }),
    run: async (input) => {
      ctx.emit({ type: "step", message: "Validando el nuevo tema…" });
      // Valida contra el esquema estricto. Si falla, el cambio se rechaza.
      const validated = themeSchema.parse({
        $schema: "./theme.schema.json",
        ...input.theme,
      });
      const content = JSON.stringify(validated, null, 2) + "\n";
      // Prepara el cambio; run.ts lo publica en el commit final de la corrida.
      ctx.stage({ path: THEME_PATH, content }, `tema: ${input.summary}`);
      return `Tema "${validated.themeId}" preparado (${input.summary}). Se publica al terminar la corrida.`;
    },
  });

  return [getCurrentTheme, applyTheme];
}
