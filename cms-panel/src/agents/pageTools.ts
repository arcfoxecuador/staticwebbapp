import { readFileMeta } from "../lib/github.js";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  PAGES,
  BLOCK_CATALOG,
  readPage,
  pagePath,
  assertPage,
  validateBlock,
  validateBlocks,
  summarizeBlock,
  serializePage,
  validatePageSeo,
  SEO_LIMITS,
  type PageDoc,
} from "../lib/pageBlocks.js";
import type { RunContext } from "./context.js";

// Herramientas del Agente de Páginas. Editan los bloques de las páginas del
// sitio (src/content/pages/*.json): reordenar, mostrar/ocultar, agregar, editar
// y quitar bloques del catálogo. Superficie acotada: solo escribe esos JSON,
// validados contra el catálogo; nunca toca .astro ni HTML libre.
export function buildPageTools(ctx: RunContext) {
  // Lectura con overlay: si esta corrida ya editó la página, las siguientes
  // herramientas ven ESA versión (no la del repo).
  async function readPageCtx(slug: string): Promise<PageDoc> {
    const staged = ctx.readStaged(pagePath(slug));
    if (staged && staged.encoding !== "base64") return JSON.parse(staged.content) as PageDoc;
    // Se anota el sha de esta primera lectura para detectar si alguien guarda la
    // misma página desde el panel mientras el agente trabaja (ver flushRun).
    const { content, sha } = await readFileMeta(pagePath(slug), ctx.branch);
    ctx.noteBase(pagePath(slug), sha);
    return JSON.parse(content) as PageDoc;
  }

  // Valida y PREPARA la página; run.ts publica todo en un único commit al
  // terminar la corrida (si algo quedara inválido, el build de Astro falla y
  // el sitio se queda en la versión anterior).
  function save(slug: string, doc: PageDoc, action: string): void {
    validateBlocks(doc.blocks);
    ctx.stage({ path: pagePath(slug), content: serializePage(doc) }, `${PAGES[slug]}: ${action}`);
    ctx.emit({ type: "step", message: `${PAGES[slug]}: ${action} — listo (se publica al final).` });
  }

  // Texto visible de un elemento de lista, para emparejar por contenido
  // ("el que dice Profesores listos") sin depender del nombre exacto del campo.
  function itemText(it: unknown): string {
    if (it == null) return "";
    if (typeof it === "string") return it;
    if (typeof it === "object") return Object.values(it as Record<string, unknown>).filter((v) => typeof v === "string").join(" ");
    return String(it);
  }
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Ubica un ítem por índice ('at') o por texto que contiene ('match'). Si el
  // texto coincide con varios, lanza y los lista para que el agente desambigüe
  // (así nunca borra el ítem equivocado en silencio).
  function resolveItem(list: unknown[], at?: number, match?: string): number {
    if (typeof at === "number") {
      if (at < 0 || at >= list.length) throw new Error(`Índice de ítem fuera de rango: ${at} (0..${list.length - 1}).`);
      return at;
    }
    if (match && match.trim()) {
      const m = norm(match);
      const hits = list.map((it, i) => [i, norm(itemText(it))] as const).filter(([, t]) => t.includes(m)).map(([i]) => i);
      const listing = list.map((it, i) => `#${i} "${itemText(it).slice(0, 40)}"`).join(", ");
      if (hits.length === 0) throw new Error(`Ningún ítem contiene "${match}". Ítems actuales: ${listing}`);
      if (hits.length > 1) throw new Error(`"${match}" coincide con varios ítems (${hits.map((i) => `#${i}`).join(", ")}). Sé más específico o usa 'at'. Ítems: ${listing}`);
      return hits[0];
    }
    throw new Error("Indica 'at' (índice del ítem) o 'match' (texto que contiene) para ubicarlo.");
  }

  const listPages = betaZodTool({
    name: "list_pages",
    description: "Lista las páginas editables del sitio (slug → nombre). Úsalo para saber qué páginas puedes modificar.",
    inputSchema: z.object({}),
    run: async () => JSON.stringify(PAGES, null, 2),
  });

  const getBlockCatalog = betaZodTool({
    name: "get_block_catalog",
    description:
      "Devuelve el catálogo de tipos de bloque disponibles y sus campos (required/optional). " +
      "Consúltalo antes de add_block o edit_block para no inventar campos.",
    inputSchema: z.object({}),
    run: async () => JSON.stringify(BLOCK_CATALOG, null, 2),
  });

  const listBlocks = betaZodTool({
    name: "list_blocks",
    description:
      "Lista los bloques de una página con su índice, tipo, si está oculto y un resumen. " +
      "LLÁMALO SIEMPRE antes de mover/editar/quitar para conocer los índices reales.",
    inputSchema: z.object({ page: z.string().describe("slug de la página, ej. 'home'") }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const list = doc.blocks.map((b, i) => ({ index: i, type: b._type, hidden: !!b.hidden, summary: summarizeBlock(b) }));
      return JSON.stringify({ page: input.page, title: doc.title, blocks: list }, null, 2);
    },
  });

  const getBlock = betaZodTool({
    name: "get_block",
    description: "Devuelve el contenido completo de un bloque por índice, para editarlo con precisión.",
    inputSchema: z.object({
      page: z.string(),
      index: z.number().int().describe("índice del bloque (de list_blocks)"),
    }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const block = doc.blocks[input.index];
      if (!block) throw new Error(`No existe el bloque #${input.index} en "${input.page}".`);
      return JSON.stringify(block, null, 2);
    },
  });

  const addBlock = betaZodTool({
    name: "add_block",
    description:
      "Inserta un bloque nuevo del catálogo en la página. Valida tipo y campos. " +
      "Si no pasas atIndex, se agrega al final.",
    inputSchema: z.object({
      page: z.string(),
      type: z.string().describe("tipo de bloque del catálogo, ej. 'ctaBanner'"),
      data: z.record(z.string(), z.any()).describe("campos del bloque (sin _type)"),
      atIndex: z.number().int().optional().describe("posición donde insertar (0 = arriba). Omitir = al final"),
    }),
    run: async (input) => {
      assertPage(input.page);
      const block = { _type: input.type, ...input.data };
      validateBlock(block);
      const doc = await readPageCtx(input.page);
      const at = input.atIndex ?? doc.blocks.length;
      doc.blocks.splice(Math.max(0, Math.min(at, doc.blocks.length)), 0, block);
      save(input.page, doc, `agregar bloque ${input.type}`);
      return `Bloque "${input.type}" agregado en "${input.page}" (posición ${at}). Se publica al terminar la corrida.`;
    },
  });

  const editBlock = betaZodTool({
    name: "edit_block",
    description:
      "Modifica campos de un bloque existente (merge superficial del patch). Rechaza campos desconocidos. " +
      "Para cambiar UN solo ítem de una lista usa mejor edit_list_item; edit_block reemplaza el campo " +
      "entero, así que si tocas una lista debes pasar el array COMPLETO ya modificado.",
    inputSchema: z.object({
      page: z.string(),
      index: z.number().int(),
      patch: z.record(z.string(), z.any()).describe("campos a cambiar (no incluyas _type)"),
    }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const block = doc.blocks[input.index];
      if (!block) throw new Error(`No existe el bloque #${input.index} en "${input.page}".`);
      const patch = { ...input.patch };
      delete patch._type; // el tipo no se cambia por edición
      const updated = { ...block, ...patch };
      validateBlock(updated);
      doc.blocks[input.index] = updated;
      save(input.page, doc, `editar bloque #${input.index} (${block._type})`);
      // Verificación: devolvemos el estado REAL de cada lista tocada para que el
      // agente no declare éxito de algo que su patch no cambió.
      const listedChanges = Object.keys(patch)
        .filter((k) => Array.isArray((updated as Record<string, unknown>)[k]))
        .map((k) => {
          const arr = (updated as Record<string, unknown>)[k] as unknown[];
          return `  ${k} (${arr.length}): ${arr.map((it, i) => `#${i} "${itemText(it).slice(0, 40)}"`).join(" · ")}`;
        });
      const verify = listedChanges.length ? `\nEstado resultante de las listas:\n${listedChanges.join("\n")}\nConfirma que refleja lo pedido antes de responder.` : "";
      return `Bloque #${input.index} (${block._type}) actualizado en "${input.page}". Se publica al terminar la corrida.${verify}`;
    },
  });

  const editListItem = betaZodTool({
    name: "edit_list_item",
    description:
      "Agrega, quita o reemplaza UN elemento de una lista dentro de un bloque (una métrica de 'items', un " +
      "paso de 'steps', un testimonio…). Es la forma SEGURA de tocar un solo ítem: no reenvías el array " +
      "completo, así que no puedes borrar el equivocado por accidente. Para quitar/reemplazar, ubica el " +
      "ítem con 'match' (texto que contiene, ej. 'Profesores listos') o 'at' (índice). Devuelve la lista " +
      "resultante para que confirmes el cambio.",
    inputSchema: z.object({
      page: z.string(),
      index: z.number().int().describe("índice del BLOQUE (de list_blocks)"),
      field: z.string().default("items").describe("nombre de la lista dentro del bloque: items, steps, rows, periods…"),
      op: z.enum(["add", "remove", "replace"]),
      at: z.number().int().optional().describe("posición del ítem dentro de la lista"),
      match: z.string().optional().describe("texto que el ítem contiene (alternativa a 'at' para quitar/reemplazar)"),
      value: z.record(z.string(), z.any()).optional().describe("datos del ítem (para add/replace)"),
    }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const block = doc.blocks[input.index];
      if (!block) throw new Error(`No existe el bloque #${input.index} en "${input.page}".`);
      const field = input.field || "items";
      const list = (block as Record<string, unknown>)[field];
      if (!Array.isArray(list)) {
        const arrays = Object.keys(block).filter((k) => Array.isArray((block as Record<string, unknown>)[k]));
        throw new Error(`El bloque #${input.index} (${block._type}) no tiene la lista "${field}". Listas disponibles: ${arrays.join(", ") || "(ninguna)"}.`);
      }
      const before = list.length;
      let action: string;
      if (input.op === "add") {
        if (!input.value) throw new Error("Falta 'value' con los datos del ítem para agregar.");
        const at = input.at ?? list.length;
        list.splice(Math.max(0, Math.min(at, list.length)), 0, input.value);
        action = `agregar ítem en ${field}[${Math.max(0, Math.min(at, before))}]`;
      } else {
        const t = resolveItem(list, input.at, input.match);
        if (input.op === "remove") {
          const [removed] = list.splice(t, 1);
          action = `quitar ítem ${field}[${t}] ("${itemText(removed).slice(0, 40)}")`;
        } else {
          if (!input.value) throw new Error("Falta 'value' con los campos a reemplazar.");
          list[t] = typeof list[t] === "object" && list[t] !== null ? { ...(list[t] as object), ...input.value } : input.value;
          action = `reemplazar ítem ${field}[${t}]`;
        }
      }
      save(input.page, doc, `${action} en bloque #${input.index}`);
      const after = list.map((it, i) => `#${i}: "${itemText(it).slice(0, 50)}"`).join("\n");
      return `Hecho: ${action}. La lista "${field}" pasó de ${before} a ${list.length} ítems:\n${after}\nVerifica que refleje lo pedido antes de responder.`;
    },
  });

  const moveBlock = betaZodTool({
    name: "move_block",
    description: "Reordena un bloque: súbelo, bájalo o muévelo a una posición concreta.",
    inputSchema: z.object({
      page: z.string(),
      index: z.number().int().describe("índice actual del bloque"),
      to: z.union([z.enum(["up", "down"]), z.number().int()]).describe("'up', 'down' o un índice destino"),
    }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const n = doc.blocks.length;
      if (input.index < 0 || input.index >= n) throw new Error(`Índice fuera de rango: ${input.index} (0..${n - 1}).`);
      let dest = typeof input.to === "number" ? input.to : input.to === "up" ? input.index - 1 : input.index + 1;
      dest = Math.max(0, Math.min(dest, n - 1));
      const [block] = doc.blocks.splice(input.index, 1);
      doc.blocks.splice(dest, 0, block);
      save(input.page, doc, `mover bloque ${block._type} de ${input.index} a ${dest}`);
      return `Bloque "${block._type}" movido de la posición ${input.index} a ${dest} en "${input.page}". Se publica al terminar la corrida.`;
    },
  });

  const toggleBlock = betaZodTool({
    name: "toggle_block",
    description: "Muestra u oculta un bloque sin borrarlo (conserva su contenido).",
    inputSchema: z.object({
      page: z.string(),
      index: z.number().int(),
      hidden: z.boolean().describe("true = ocultar, false = mostrar"),
    }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const block = doc.blocks[input.index];
      if (!block) throw new Error(`No existe el bloque #${input.index} en "${input.page}".`);
      block.hidden = input.hidden;
      save(input.page, doc, `${input.hidden ? "ocultar" : "mostrar"} bloque #${input.index}`);
      return `Bloque #${input.index} (${block._type}) ${input.hidden ? "ocultado" : "visible"} en "${input.page}". Se publica al terminar la corrida.`;
    },
  });

  const getPageSeo = betaZodTool({
    name: "get_page_seo",
    description:
      "Devuelve los metadatos SEO actuales de una página (title, description, ogImage). " +
      "Vacío = la página usa sus valores por defecto.",
    inputSchema: z.object({ page: z.string().describe("slug de la página, ej. 'home'") }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      return JSON.stringify(doc.seo ?? {}, null, 2);
    },
  });

  const setPageSeo = betaZodTool({
    name: "set_page_seo",
    description:
      "Fija el SEO de una página (título e descripción para buscadores y redes). Se FUSIONA con lo " +
      `existente: envía solo lo que quieras cambiar; una cadena vacía ("") BORRA ese campo y la página ` +
      `vuelve a su valor por defecto. Límites: title ≤${SEO_LIMITS.title}, description ≤${SEO_LIMITS.description} caracteres. ` +
      "ogImage es una ruta dentro de /public (ej. '/og-estudiantes.png') o una URL absoluta.",
    inputSchema: z.object({
      page: z.string(),
      title: z.string().optional().describe("título SEO (pestaña del navegador / resultado de búsqueda)"),
      description: z.string().optional().describe("meta descripción (resumen en buscadores y al compartir)"),
      ogImage: z.string().optional().describe("imagen para redes sociales (ruta en /public o URL)"),
    }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      // Fusiona: parte del seo actual y aplica solo los campos enviados.
      const merged: Record<string, unknown> = { ...(doc.seo ?? {}) };
      for (const key of ["title", "description", "ogImage"] as const) {
        if (input[key] === undefined) continue; // no enviado → intacto
        if (input[key] === "") delete merged[key]; // vacío → borra el campo
        else merged[key] = input[key];
      }
      doc.seo = validatePageSeo(merged); // valida límites/tipos; undefined si quedó vacío
      save(input.page, doc, "actualizar SEO");
      return `SEO de "${input.page}" actualizado: ${JSON.stringify(doc.seo ?? {})}. Se publica al terminar la corrida.`;
    },
  });

  const removeBlock = betaZodTool({
    name: "remove_block",
    description: "Elimina un bloque por índice. Úsalo solo si el equipo lo pide explícitamente; para esconderlo usa toggle_block.",
    inputSchema: z.object({ page: z.string(), index: z.number().int() }),
    run: async (input) => {
      const doc = await readPageCtx(input.page);
      const block = doc.blocks[input.index];
      if (!block) throw new Error(`No existe el bloque #${input.index} en "${input.page}".`);
      doc.blocks.splice(input.index, 1);
      save(input.page, doc, `quitar bloque #${input.index} (${block._type})`);
      return `Bloque #${input.index} (${block._type}) eliminado de "${input.page}". Se publica al terminar la corrida.`;
    },
  });

  return [listPages, getBlockCatalog, listBlocks, getBlock, addBlock, editBlock, editListItem, moveBlock, toggleBlock, getPageSeo, setPageSeo, removeBlock];
}
