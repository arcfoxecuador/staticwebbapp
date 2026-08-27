import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { readFileMeta } from "../lib/github.js";
import { CAREER_FORM, careerPath, listCareers as readCareerList } from "../lib/careersForm.js";
import { CAREER_MANIFEST } from "../generated/schema-manifest.js";
import { validateFields } from "../lib/manifestValidate.js";
import type { RunContext } from "./context.js";

// Herramientas del asistente para editar CARRERAS. Barrera de seguridad: solo
// puede modificar los campos del catálogo (CAREER_FORM); nunca el slug ni
// archivos arbitrarios. Publica directo (Vercel no despliega builds inválidas).
const ALLOWED = new Set(CAREER_FORM.fields.map((f) => f.name));

export function buildCareerTools(ctx: RunContext) {
  // Lectura con overlay: si esta corrida ya editó la carrera, se ve ESA versión.
  async function readCareer(slug: string): Promise<Record<string, any>> {
    const staged = ctx.readStaged(careerPath(slug));
    if (staged && staged.encoding !== "base64") return JSON.parse(staged.content);
    const { content, sha } = await readFileMeta(careerPath(slug), ctx.branch);
    ctx.noteBase(careerPath(slug), sha); // para detectar ediciones concurrentes
    return JSON.parse(content);
  }

  // Prepara el cambio; run.ts publica todo en un único commit al final.
  function publish(slug: string, data: Record<string, any>, action: string) {
    data.slug = slug; // el slug no se cambia
    const nombre = String(data.title ?? slug);
    // Mismo control que el endpoint del panel: si el agente pone un texto donde
    // va un número, se rechaza AQUÍ con un mensaje que el modelo puede corregir,
    // en vez de commitear y romper el build del sitio.
    validateFields(`La carrera "${nombre}"`, CAREER_MANIFEST, data);
    ctx.stage(
      { path: careerPath(slug), content: JSON.stringify(data, null, 2) + "\n" },
      `carrera ${nombre}: ${action}`,
    );
    ctx.emit({ type: "step", message: `Carrera "${nombre}" lista (se publica al final).` });
  }

  const listCareersTool = betaZodTool({
    name: "list_careers",
    description: "Lista las carreras editables (slug → nombre).",
    inputSchema: z.object({}),
    run: async () => JSON.stringify(await readCareerList(ctx.branch), null, 2),
  });

  const getCareerFields = betaZodTool({
    name: "get_career_fields",
    description:
      "Devuelve el catálogo de campos editables de una carrera (la BARRERA: solo estos campos se pueden cambiar). Consúltalo antes de edit_career.",
    inputSchema: z.object({}),
    run: async () => JSON.stringify(CAREER_FORM, null, 2),
  });

  const getCareer = betaZodTool({
    name: "get_career",
    description: "Devuelve los datos completos de una carrera para editarla con precisión.",
    inputSchema: z.object({ slug: z.string().describe("slug de la carrera, ej. 'marketing'") }),
    run: async (input) => {
      const conocidas = await readCareerList(ctx.branch);
      if (!conocidas[input.slug]) throw new Error(`Carrera desconocida: "${input.slug}". Válidas: ${Object.keys(conocidas).join(", ")}`);
      return JSON.stringify(await readCareer(input.slug), null, 2);
    },
  });

  const editCareer = betaZodTool({
    name: "edit_career",
    description:
      "Modifica campos de una carrera (merge superficial del patch). Solo se permiten los campos del catálogo; el slug no se cambia. " +
      "Para listas (pilares, egreso, campo, sectores) y la malla, pasa el valor COMPLETO ya modificado.",
    inputSchema: z.object({
      slug: z.string(),
      patch: z.record(z.string(), z.any()).describe("campos a cambiar (sin slug)"),
    }),
    run: async (input) => {
      const conocidas = await readCareerList(ctx.branch);
      if (!conocidas[input.slug]) throw new Error(`Carrera desconocida: "${input.slug}".`);
      const patch = { ...input.patch };
      delete patch.slug;
      for (const k of Object.keys(patch)) {
        if (!ALLOWED.has(k)) {
          throw new Error(`Campo no editable: "${k}". Campos válidos: ${[...ALLOWED].join(", ")}`);
        }
      }
      const data = await readCareer(input.slug);
      Object.assign(data, patch);
      publish(input.slug, data, "edición desde el asistente");
      return `Carrera "${conocidas[input.slug]}" actualizada (campos: ${Object.keys(patch).join(", ")}). Se publica al terminar la corrida.`;
    },
  });

  return [listCareersTool, getCareerFields, getCareer, editCareer];
}
