import { getAnthropic } from "../lib/anthropic.js";
import { MODELS } from "../models.js";
import { buildBlogTools } from "./blogTools.js";
import { buildDesignTools } from "./designTools.js";
import { buildPageTools } from "./pageTools.js";
import { buildCareerTools } from "./careerTools.js";
import { buildMediaTools } from "./mediaTools.js";
import { PAGES } from "../lib/pageBlocks.js";
import { commitFiles, fileSha } from "../lib/github.js";
import { invalidatePostsCache } from "../lib/posts.js";
import { config } from "../config.js";
import { loadBrand, brandContextText, imageGuideText, CONTENT_HARD_RULES } from "../lib/brand.js";
import { createRunContext, type AgentEvent } from "./context.js";
import { startRunTrace, instrumentTools } from "../lib/observability.js";

const TODAY = () => new Date().toISOString().slice(0, 10);

// Identidad del cliente (multi-tenant): los prompts se arman desde client.config.json.
const c = config.client;

// Los cambios de una corrida se publican JUNTOS en un único commit al final
// (ver flushRun). La frase del prompt se adapta a prod vs staging.
const PUBLISH_NOTE = config.publish.toProd
  ? "Todos tus cambios se publican JUNTOS en un único commit al terminar (van directo al sitio). Responde en 1-2 frases."
  : 'Todos tus cambios se publican JUNTOS en un único commit al terminar (van a STAGING; el equipo los pasa a producción con el botón "Publicar a producción"). Responde en 1-2 frases.';

// Regla compartida: imágenes adjuntadas por el equipo desde el chat del panel.
const ATTACHMENTS_NOTE = `
Imágenes adjuntas: si el pedido incluye líneas "[Imagen adjunta: /uploads/...]",
esas imágenes YA están subidas al sitio (optimizadas). Usa ESA ruta tal cual
donde el equipo indique (portada de una nota con image.mode "existing", campo
de imagen de un bloque o carrera, etc.). No las regeneres ni las descargues.`;

export const BLOG_SYSTEM = `Eres el Agente de Blogs de ${c.orgName} (${c.location}).
${c.orgShort} ofrece ${c.description}. Tono: ${c.voiceTone}. Idioma: ${c.language}.

Tu trabajo: crear y EDITAR notas del blog según pida el equipo.
- Para una nota nueva: redáctala completa y llama a publish_blog_post.
- Para corregir/cambiar una existente (título, texto, portada, fecha, categoría,
  publicar/despublicar): list_posts → get_post → edit_post.

Reglas:
- Elige la categoría más adecuada entre las permitidas (si el nombre no valida,
  la herramienta te dirá las opciones actuales).
- Escribe un excerpt atractivo (máx 280 caracteres) y un cuerpo en Markdown con
  subtítulos (##), listas cuando aporten, y un cierre con llamada a la acción.
- La fecha por defecto es hoy (${TODAY()}) salvo que pidan otra. Una fecha
  futura = publicación programada (aparece en el primer build tras esa fecha).
- SIEMPRE escribe imgAlt: describe la portada en una frase (accesibilidad+SEO).
- Imagen de portada — REGLA ESTRICTA, sin excepciones:
  · Si el equipo NO dio una imagen → mode "generate" con un prompt visual
    coherente (estilo fotográfico, educativo, moderno).
  · Si el equipo SÍ indicó una imagen (adjunta, de la biblioteca o un enlace) →
    mode "existing" con ESA ruta o mode "url" con ESE enlace.
  · NUNCA inventes una ruta de imagen ni reutilices la de otra nota por tu
    cuenta; usa list_media para ver las rutas reales. Si la generación FALLA y
    el equipo no dio imagen, NO publiques: explica qué falta y detente.
${ATTACHMENTS_NOTE}
${PUBLISH_NOTE}`;

// Guía de presets de temporada — configurable por cliente (client.config.json →
// themePresets). Agregar/quitar una temporada es editar ese JSON, no este código.
const presetGuide = c.themePresets
  .map(
    (p) =>
      `- "${p.label}" (themeId "${p.id}"): ink ${p.ink}, cloud ${p.cloud}, ` +
      `colors.accent ${p.accent.map((s) => `${s.color}@${s.at}%`).join(" → ")}, ` +
      `seasonal.effect "${p.seasonalEffect}"${p.seasonalIntensity ? ` (intensidad ${p.seasonalIntensity})` : ""}.`,
  )
  .join("\n");

export const DESIGN_SYSTEM = `Eres el Agente de Diseño del sitio web de ${c.orgShort} (Astro).
Cambias la apariencia del sitio editando ÚNICAMENTE el archivo theme.json, que
controla la paleta (ink, cloud y el degradado de acento), un banner de promoción
y un efecto de temporada. No puedes tocar componentes ni CSS.

colors.accent es la lista de paradas del degradado de marca: [{color, at}], donde
"at" es la posición 0–100%. Mínimo 2 paradas, de la inicial (at 0) a la final (at 100).

Flujo obligatorio:
1. Llama a get_current_theme para partir del estado real.
2. Diseña el nuevo theme.json completo según el pedido.
3. Llama a apply_theme con el objeto completo y un summary de una frase.

Presets de temporada disponibles (úsalos como punto de partida):
${presetGuide}

Otras peticiones:
- "promoción / promo": mantén la paleta actual salvo que pidan otra, y enciende
  promoBanner.enabled con un texto corto (máx 120) y un CTA (ctaLabel + ctaHref).
- "volver al normal / quitar": aplica el preset "default", promoBanner.enabled false,
  seasonal.effect "none".

Todos los colores deben ser hex de 6 dígitos. ${PUBLISH_NOTE}`;

export const PAGE_SYSTEM = `Eres el Agente de Páginas del sitio web de ${c.orgShort} (Astro).
Editas el CONTENIDO y el ORDEN de las páginas del sitio, que están hechas de
bloques (secciones) guardados en archivos JSON. Cambias textos, reordenas
secciones (subir/bajar), las muestras u ocultas, agregas bloques del catálogo
(hero, carrusel de carreras, grids, FAQ, banners, etc.) y editas sus campos.

NO puedes escribir HTML, CSS ni tocar componentes: solo bloques del catálogo y
sus campos. Los colores y la decoración vienen del tema global, no se editan por
bloque. Las noticias se gestionan como blogs (no aquí); la tabla de aranceles del
sitio se calcula a partir de los datos de cada carrera.

Páginas editables: ${Object.entries(PAGES).map(([s, t]) => `${s} (${t})`).join(", ")}.
Carreras editables: consúltalas con list_careers (las lee del repo en cada corrida).

Trabajas en dos áreas:
A) PÁGINAS (bloques): reordenar, mostrar/ocultar, agregar, editar y quitar
   bloques. Flujo: list_blocks → (get_block_catalog / get_block) → move_block /
   edit_block / edit_list_item / add_block / toggle_block / remove_block. Para
   reordenar usa move_block con 'up'/'down' o un índice.
   LISTAS (una métrica, un paso, un testimonio, una fila): para AGREGAR, QUITAR o
   REEMPLAZAR UN solo ítem usa edit_list_item (ubícalo con 'match' = texto que
   contiene, ej. "Profesores listos", o con 'at' = índice). NO reenvíes el array
   completo con edit_block para tocar un solo ítem: es donde antes se borraba el
   equivocado o no se borraba nada. Usa edit_block solo para campos que no son
   listas, o cuando reordenes/reemplaces la lista entera a propósito.
   No elimines bloques salvo que lo pidan; para esconder usa toggle_block.
   CONTENIDO LIBRE (bloque "richContent"): un contenedor de PIEZAS apiladas en el
   orden que se quiera. Úsalo cuando el pedido NO encaje en un bloque específico
   (p. ej. "agrega un texto y una imagen debajo de los botones", "pon un párrafo,
   una lista y un botón"). Créalo con add_block("richContent", { background, items: [] })
   y gestiona sus piezas con edit_list_item(field:"items", op:"add"|"remove"|"replace",
   value:{ kind:"…", … }). Cada pieza lleva su kind: heading{text,level:h2|h3},
   text{text} (párrafo; admite <b>,<i>,<a>), image{src,alt,width:full|wide|medium},
   button{label,href,style:primary|secondary}, buttons{items:[{label,href}]},
   list{items:[string],ordered}, spacer{size:sm|md|lg}. Un kind inválido o una
   pieza a la que le falte un campo obligatorio se rechaza con un mensaje claro;
   corrige y reintenta. Consulta get_block_catalog para el detalle.
   SEO de la página (título y descripción para buscadores/redes): get_page_seo y
   set_page_seo(page, {title?, description?, ogImage?}). Se fusiona con lo
   existente; enviar "" en un campo lo borra y vuelve al valor por defecto.
B) CARRERAS (datos): cambiar textos, pilares, perfil de egreso,
   campo ocupacional, sectores, malla, aranceles e imagen de una carrera. Flujo:
   list_careers → get_career_fields / get_career → edit_career(slug, patch). En
   el patch, para listas y la malla pasa el valor COMPLETO ya modificado. Solo
   puedes tocar los campos del catálogo; el slug no se cambia.

Imágenes en bloques y carreras: usa rutas REALES (list_media), imágenes adjuntas
por el equipo, o genera una nueva con generate_image. Escribe siempre el campo
de texto alternativo (imageAlt/imgAlt) cuando exista.

DISEÑO (layout) de los bloques — también lo controlas tú vía edit_block:
- "columns": número de columnas en escritorio. stats admite 2–6 (números) o
  "auto" (texto: tantas columnas como métricas, todas en una fila);
  stepsProcess 2–6; highlightCards 2–4; audiences y testimonials 2–4;
  featureGrid 2–4. Los números van como número JSON (4), no como texto ("4").
- "imageSide": "left" o "right" — de qué lado va la imagen en escritorio.
  Lo admiten hero (también mueve el formulario de contacto), richTextSplit y
  featureGrid. Si piden "pasa la foto a la derecha", edita ese campo.
Consulta get_block_catalog si dudas de qué campos admite un bloque.

MÉTODO: haz UN cambio a la vez y VERIFICA antes de declararlo hecho. Cada
herramienta de edición devuelve el estado resultante (p. ej. la lista con sus
ítems tras quitar uno): LÉELO y confirma que refleja exactamente lo que se pidió.
Si el resultado no muestra el cambio (el ítem sigue ahí, el conteo no bajó),
corrige y vuelve a intentar; NUNCA respondas "listo, lo eliminé" si el estado
devuelto no lo confirma. Resume al equipo solo lo que las herramientas confirman.
${ATTACHMENTS_NOTE}
Barreras: NO escribes HTML, CSS ni componentes; solo bloques del catálogo y
campos de carrera permitidos. Los colores vienen del tema global. ${PUBLISH_NOTE}`;

export const MEDIA_SYSTEM = `Eres el Agente de Medios del sitio web de ${c.orgShort}.
Gestionas las imágenes de la biblioteca del sitio: generas imágenes con IA
(generate_image), importas desde enlaces públicos (import_image_from_url) y
consultas las existentes (list_media). Todo lo que entra queda optimizado en
WebP automáticamente.

- Prompts visuales: estilo fotográfico, educativo, moderno; coherente con una
  institución de educación superior en línea de ${c.location}.
- Devuelve siempre la ruta pública resultante (p. ej. /uploads/campus-abc123.webp)
  para que el equipo la use en entradas, páginas o carreras.
- Organiza en CARPETAS: al generar o importar, pasa 'folder' (una carpeta bajo
  /uploads, minúsculas y guiones) según el tema — p. ej. 'carreras', 'noticias',
  'equipo'. Consulta list_media para ver las carpetas ya existentes y reutilizarlas.
${ATTACHMENTS_NOTE}
${PUBLISH_NOTE}`;

function extractText(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Tope de vueltas del bucle de herramientas de UNA corrida. Ver el comentario
// en runAgent: es el freno de gasto que el gate de presupuesto no puede dar.
export const MAX_TOOL_ITERATIONS = 12;

export type AgentKind = "blog" | "design" | "page" | "media";

// Nombre de cada área EN PALABRAS DEL EQUIPO, no del código. Se muestra tal cual
// en el registro del panel, así que dice qué se va a tocar del sitio y no cómo
// se llama el agente por dentro ("Blogs", "Contenido"…).
export const AGENT_LABEL: Record<AgentKind, string> = {
  blog: "las entradas del blog",
  design: "el diseño del sitio",
  page: "las páginas y carreras",
  media: "las imágenes",
};

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RunOptions {
  emit: (event: AgentEvent) => void;
  // Correo del solicitante, para auditoría en el commit.
  userEmail?: string;
  // Cancela la corrida si el cliente cierra la conexión ("Detener").
  signal?: AbortSignal;
  // Conversación previa (multi-turno): "hazlo más corto" tiene contexto.
  history?: HistoryTurn[];
  // Uso acumulado tras CADA turno del bucle. Sin esto, una corrida que revienta
  // a mitad (o que el usuario detiene) no devuelve nada y su gasto —que ya se
  // pagó— quedaba sin contabilizar: justo el caso más caro.
  onUsage?: (usage: { input: number; output: number }) => void;
}

export interface AgentResult {
  reply: string;
  // Tokens sumados de TODOS los turnos de la corrida (para presupuesto/telemetría).
  usage: { input: number; output: number };
  // true si se agotó MAX_TOOL_ITERATIONS: la tarea quedó a medias.
  ranOutOfSteps?: boolean;
}

export async function runAgent(kind: AgentKind, prompt: string, opts: RunOptions): Promise<AgentResult> {
  const ctx = createRunContext(config.github.baseBranch, opts.emit, opts.userEmail);
  // Traza de la corrida: una línea `agent_run` al terminar, pase lo que pase.
  // El correo NO se emite (es PII y el commit ya lo registra); basta saber si
  // la pidió una persona o la automatización.
  const trace = startRunTrace(kind, { origen: opts.userEmail ? "panel" : "sistema" });
  const tools = instrumentTools(
    kind === "blog" ? [...buildBlogTools(ctx), ...buildMediaTools(ctx)]
    : kind === "design" ? buildDesignTools(ctx)
    : kind === "media" ? buildMediaTools(ctx)
    : [...buildPageTools(ctx), ...buildCareerTools(ctx), ...buildMediaTools(ctx)],
    trace,
  );
  const baseSystem =
    kind === "blog" ? BLOG_SYSTEM
    : kind === "design" ? DESIGN_SYSTEM
    : kind === "media" ? MEDIA_SYSTEM
    : PAGE_SYSTEM;
  // Guía de marca (leída del repo del sitio en cada corrida): voz para quien
  // redacta textos; medidas de imagen para quien puede generar imágenes.
  const brand = await loadBrand(config.github.baseBranch);
  const wantsVoice = kind === "blog" || kind === "page" || kind === "design";
  const wantsImages = kind === "blog" || kind === "page" || kind === "media";
  // CONTENT_HARD_RULES va SIEMPRE, sea cual sea el agente. La guía de marca es
  // editable (y "Medios" ni siquiera la recibía), así que las prohibiciones que
  // no admiten excepción no pueden depender de ella.
  const system =
    baseSystem +
    CONTENT_HARD_RULES +
    (wantsVoice ? brandContextText(brand) : "") +
    (wantsImages ? imageGuideText(brand) : "");
  const model =
    kind === "blog" ? MODELS.blog
    : kind === "design" ? MODELS.design
    : kind === "media" ? MODELS.media
    : MODELS.page;

  ctx.emit({ type: "agent", message: `Revisando ${AGENT_LABEL[kind]} para hacer el cambio…` });

  const runner = getAnthropic().beta.messages.toolRunner(
    {
      model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      // Techo del bucle de herramientas. El presupuesto (checkAgentAllowed) solo
      // se consulta AL EMPEZAR, así que sin este tope un ciclo que no converge
      // (edit_block → get_block → edit_block…) sigue llamando al modelo hasta
      // agotar la ventana de contexto y muere en un 400 crudo, ya con el gasto
      // hecho. 12 iteraciones sobran para las tareas reales del panel: la más
      // larga (crear una nota con imagen) usa 4-5.
      max_iterations: MAX_TOOL_ITERATIONS,
      system,
      tools,
      messages: [
        ...(opts.history ?? []).map((t) => ({ role: t.role, content: t.content })),
        { role: "user" as const, content: prompt },
      ],
    },
    { signal: opts.signal },
  );

  // Recorremos el runner (en vez de solo await) para sumar el uso de tokens de
  // cada turno del bucle de herramientas, no solo el del último mensaje.
  let input = 0;
  let output = 0;
  let turnos = 0;
  let finalMessage: Awaited<ReturnType<typeof runner.done>> | undefined;
  try {
    for await (const message of runner) {
      finalMessage = message;
      turnos += 1;
      const u = message.usage;
      if (u) {
        input += u.input_tokens ?? 0;
        output += u.output_tokens ?? 0;
        // Se reporta en cada vuelta: si el bucle revienta en la siguiente, lo
        // gastado hasta aquí ya quedó contabilizado.
        opts.onUsage?.({ input, output });
      }
    }
  } catch (err) {
    // El gasto ya está hecho aunque la corrida muera: la traza debe salir igual,
    // o las corridas caras que revientan serían justo las invisibles.
    trace.finish(opts.signal?.aborted ? "cancelada" : "error", {
      model, tokensIn: input, tokensOut: output, turnos,
      error: err instanceof Error ? err.name : "desconocido",
    });
    throw err;
  }

  // Si el bucle acabó porque se agotaron las iteraciones, el último mensaje
  // todavía pedía herramientas: el trabajo quedó A MEDIAS. Decirlo, en vez de
  // caer en el "Listo." por defecto, que sería mentira (y lo que ya se preparó
  // se publica igual: son cambios válidos, solo incompletos).
  const ranOutOfSteps = finalMessage?.stop_reason === "tool_use";
  const text = finalMessage ? extractText(finalMessage) : "";
  const reply = ranOutOfSteps
    ? `Me quedé sin pasos antes de terminar (tope de ${MAX_TOOL_ITERATIONS} por pedido).` +
      `${text ? ` Lo último que hice: ${text}` : ""}` +
      " Revisa cómo quedó y pídeme el resto en un mensaje más concreto."
    : text || "Listo.";
  const archivos = ctx.staged.size;
  try {
    await flushRun(ctx, prompt);
  } catch (err) {
    // flushRun aborta si alguien guardó desde el panel durante la corrida.
    trace.finish("error", {
      model, tokensIn: input, tokensOut: output, turnos, archivos,
      error: err instanceof Error ? err.name : "desconocido",
    });
    throw err;
  }
  trace.finish(ranOutOfSteps ? "sin_pasos" : archivos === 0 ? "sin_cambios" : "ok", {
    model, tokensIn: input, tokensOut: output, turnos, archivos,
  });
  return { reply, usage: { input, output }, ranOutOfSteps };
}

// Publica TODOS los cambios preparados por la corrida en un único commit, con
// el autor del pedido en el mensaje (auditoría). Si no hay cambios, no hay commit.
async function flushRun(ctx: ReturnType<typeof createRunContext>, prompt: string): Promise<void> {
  if (ctx.staged.size === 0) return;

  // ¿Alguien guardó desde el panel uno de estos archivos MIENTRAS el agente
  // trabajaba? Una corrida dura minutos; sin esta comprobación el commit final
  // pisaba ese trabajo en silencio (el panel sí se protege del agente, pero no
  // al revés). Se aborta la corrida entera para mantener el invariante de "un
  // commit o ninguno": lo del agente se puede volver a pedir, lo de la persona
  // podría no estar en ningún otro sitio.
  const conflicts: string[] = [];
  await Promise.all(
    [...ctx.baseShas.entries()].map(async ([path, baseSha]) => {
      if (!baseSha || !ctx.staged.has(path)) return;
      const current = await fileSha(path, ctx.branch).catch(() => null);
      if (current && current !== baseSha) conflicts.push(path);
    }),
  );
  if (conflicts.length) {
    const nombres = conflicts.map((p) => p.split("/").pop()).join(", ");
    throw new Error(
      `Alguien editó ${nombres} desde el panel mientras yo trabajaba, así que no publiqué nada ` +
        "para no borrar ese cambio. Revisa cómo quedó y vuelve a pedírmelo.",
    );
  }

  const where = config.publish.where;
  const n = ctx.staged.size;
  ctx.emit({ type: "step", message: `Guardando ${n} cambio${n === 1 ? "" : "s"} en ${where}…` });
  const summary = (ctx.actions.join("; ") || prompt).slice(0, 180);
  const author = ctx.userEmail ? ` — por ${ctx.userEmail}` : "";
  await commitFiles(
    [...ctx.staged.values()],
    `panel(asistente): ${summary}${author}`,
    config.github.baseBranch,
  );
  invalidatePostsCache();
  const link = config.publish.url || "";
  ctx.emit({
    type: "pr",
    message: `Publicado en ${where}${link ? `: ${link}` : ""}. El sitio se reconstruye en ~1 minuto.`,
    data: link ? { url: link } : undefined,
  });
}

// Router: clasifica el pedido del equipo. Devuelve también "unclear" cuando el
// pedido es ambiguo, para preguntar en vez de adivinar (adivinar "blog" era el
// error más caro: publicaba contenido).
export type RoutedIntent = AgentKind | "unclear";

export async function routeIntent(
  prompt: string,
  history: HistoryTurn[] = [],
  // El router también gasta (Haiku, una llamada por pedido). Es poco por vez,
  // pero antes no se contaba en NINGÚN sitio, así que el total del mes mentía.
  onUsage?: (usage: { input: number; output: number }) => void,
): Promise<RoutedIntent> {
  // El enrutador ve los últimos turnos para resolver SEGUIMIENTOS: "sigue ahí",
  // "hazlo más corto", "ahora el otro" no significan nada sueltos, pero con la
  // conversación previa pertenecen al mismo tema que se venía tratando. Van como
  // transcripción dentro de un único mensaje (evita romper la alternancia).
  const trace = startRunTrace("router");
  const recent = history.slice(-6).map((t) => `${t.role === "user" ? "Usuario" : "Asistente"}: ${t.content.slice(0, 600)}`);
  const convo = recent.length ? `Conversación previa:\n${recent.join("\n")}\n\n` : "";
  let res;
  try {
    res = await getAnthropic().messages.create({
    model: MODELS.router,
    max_tokens: 10,
    system:
      "Clasifica el ÚLTIMO mensaje del usuario en UNA palabra. Si es un seguimiento " +
      '("sigue ahí", "hazlo más corto", "ahora el otro", "no funcionó", "y el título"), ' +
      "usa la conversación previa para entender a qué se refiere y clasifícalo en la MISMA " +
      "categoría del tema que se venía tratando. Categorías: " +
      '"blog" si pide crear, redactar, corregir, publicar o despublicar una noticia/artículo/entrada; ' +
      '"design" si pide cambiar la apariencia global (colores, temporada, navideño, festivo, banner, promo); ' +
      '"page" si pide editar el CONTENIDO o el ORDEN de una página o sus secciones ' +
      "(cambiar un texto/título, reordenar/subir/bajar/ocultar/agregar una sección o bloque, " +
      "quitar o editar una métrica/paso/testimonio de una lista, " +
      "mover el carrusel, editar el hero, poner una imagen en una página) O editar los DATOS de una " +
      "carrera (malla, pilares, aranceles, perfil, descripción de una carrera específica); " +
      '"media" si SOLO pide generar/importar/listar imágenes de la biblioteca, sin usarlas aún en ningún lugar; ' +
      '"unclear" solo si es ambiguo INCLUSO considerando la conversación previa. ' +
      "Responde SOLO con: blog, design, page, media o unclear.",
    messages: [{ role: "user", content: `${convo}Último mensaje del usuario: ${prompt}` }],
    });
  } catch (err) {
    trace.finish("error", { model: MODELS.router, error: err instanceof Error ? err.name : "desconocido" });
    throw err;
  }
  onUsage?.({ input: res.usage?.input_tokens ?? 0, output: res.usage?.output_tokens ?? 0 });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .toLowerCase();

  const intencion: RoutedIntent =
    text.includes("unclear") ? "unclear"
    : text.includes("media") ? "media"
    : text.includes("page") ? "page"
    : text.includes("design") ? "design"
    : text.includes("blog") ? "blog"
    : "unclear";

  // El router es la llamada de IA más FRECUENTE del sistema (una por pedido) y
  // era la única sin traza. Interesa sobre todo la proporción de "unclear": si
  // se dispara, el problema está en cómo se pide, no en el modelo; si cae a
  // cero, conviene sospechar que volvió a adivinar.
  //
  // `reconocido` distingue "el modelo dijo unclear" de "no entendimos su
  // respuesta y caímos al valor por defecto", que son fallos muy distintos.
  trace.finish("ok", {
    model: MODELS.router,
    tokensIn: res.usage?.input_tokens ?? 0,
    tokensOut: res.usage?.output_tokens ?? 0,
    intencion,
    reconocido: /unclear|media|page|design|blog/.test(text),
  });
  return intencion;
}
