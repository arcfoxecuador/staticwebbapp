import type { BlogAutomationConfig } from "../blogAutomationSchema.js";
import { researchSource, type SourceResult, type ResearchDeps } from "./sources.js";
import { researchCompetitors, type CompetitorResearch } from "./competitors.js";
import { sanitizeUntrusted } from "../promptSafety.js";

export type { ResearchDeps, SourceResult } from "./sources.js";
export type { CompetitorResearch, CompetitorResult, CompetitorPost } from "./competitors.js";

export interface ResearchBundle {
  sources: SourceResult[];
  competitors: CompetitorResearch;
  generatedAt: string;
}

// Reúne TODA la investigación de una corrida: cada fuente + la competencia.
// Las fuentes corren en paralelo. Nunca lanza (cada parte captura su error).
export async function gatherResearch(config: BlogAutomationConfig, deps: ResearchDeps = {}): Promise<ResearchBundle> {
  const [sources, competitors] = await Promise.all([
    Promise.all(config.sources.map((s) => researchSource(s, deps))),
    researchCompetitors(config.competitors, config.topics, deps),
  ]);
  return { sources, competitors, generatedAt: (deps.now ?? (() => new Date()))().toISOString() };
}

// Regla dura del pedido: si una fuente REQUERIDA falla, no se genera el blog.
export function requiredSourcesFailed(bundle: ResearchBundle): SourceResult[] {
  return bundle.sources.filter((s) => s.required && !s.ok);
}

// Cada campo que viene de una página ajena se sanea AQUÍ, en la hoja, además de
// enmarcarse entero más adelante (ver promptSafety y llm.ts). Se hace en dos
// sitios a propósito: si mañana alguien arma un prompt con este texto y olvida
// envolverlo, los títulos ya vienen sin marcas de turno ni vallas falsas.
const limpio = (t: string | undefined, max = 300) => sanitizeUntrusted(t ?? "", max);

// Compacta la investigación en un bloque de texto para el prompt del LLM.
//
// Las cabeceras propias NO usan «=== … ===»: ese patrón es justo el que
// sanitizeUntrusted neutraliza para que el material no falsifique estructura, y
// al envolver el bloque entero se comería las nuestras.
export function researchToPrompt(bundle: ResearchBundle, maxPerSource = 6): string {
  const lines: string[] = [];
  lines.push("FUENTES:");
  for (const s of bundle.sources) {
    if (!s.ok) { lines.push(`- ${limpio(s.url, 200)}: (sin datos: ${limpio(s.error, 200)})`); continue; }
    lines.push(`- ${limpio(s.url, 200)} (${s.items.length} resultados):`);
    for (const it of s.items.slice(0, maxPerSource)) {
      const when = it.date ? ` [${it.date.toISOString().slice(0, 10)}]` : "";
      const sum = it.summary ? ` — ${limpio(it.summary, 160)}` : "";
      lines.push(`   • ${limpio(it.title) || limpio(it.link, 200)}${when}${sum}`);
    }
  }
  // El bloque de competencia lleva su propia advertencia PEGADA a los datos: el
  // modelo ve aquí dominios y titulares ajenos, y una regla que vive lejos, al
  // final del prompt de sistema, pesa menos que una que viaja con el material.
  lines.push(
    "",
    "COMPETENCIA (reciente) — MATERIAL INTERNO, NO PUBLICABLE:",
    "Sirve solo para saber QUÉ temas cubrir. Prohibido nombrar estos sitios o",
    "marcas, citarlos, compararse con ellos o parafrasearlos de forma reconocible.",
  );
  for (const c of bundle.competitors.competitors) {
    if (!c.ok) { lines.push(`- ${limpio(c.domain, 200)}: (${limpio(c.error, 200)})`); continue; }
    lines.push(`- ${limpio(c.domain, 200)}:`);
    for (const p of c.posts) {
      const when = p.date ? ` [${p.date.toISOString().slice(0, 10)}]` : "";
      lines.push(`   • ${limpio(p.title)}${when}`);
    }
  }
  if (bundle.competitors.gaps.length) {
    lines.push(
      "",
      `HUECOS DE TEMAS (temas que aún no cubrimos): ${bundle.competitors.gaps.map((g) => limpio(g, 120)).join(", ")}.`,
      "Son sugerencias de SOBRE QUÉ escribir. Trátalos como tema propio: nada de",
      "mencionar de dónde salieron ni de compararse con nadie.",
    );
  }
  return lines.join("\n");
}
