// ─────────────────────────────────────────────────────────────────────────────
// Capa de PRESENTACIÓN del panel.
//
// El manifiesto generado (src/generated/schema-manifest.ts) dice qué campos
// existen, de qué tipo y si son obligatorios — esa es la estructura, y viene de
// la fuente de verdad (astro-web/src/content/blocks.ts y career.ts).
//
// Aquí solo viven las decisiones HUMANAS que el esquema no captura: la etiqueta
// en español, qué control usar (área de texto, imagen, lista de chips…), el
// texto de ayuda y el botón "Agregar" de las listas. Nada de esto puede
// descuadrar la validación: si falta una etiqueta, se usa el nombre del campo;
// si se cambia el esquema, la estructura se actualiza sola al regenerar.
//
// Las claves son rutas con punto: "<bloque>.<campo>" o, anidado,
// "<bloque>.<campo>.<subcampo>". Las carreras usan el prefijo "career".
// ─────────────────────────────────────────────────────────────────────────────

import type { FieldType } from "./blockForms.js";

export interface FieldPres {
  label?: string;
  control?: FieldType; // fuerza un control concreto (p.ej. string → "textarea" o "image")
  options?: string[]; // para control "select" sobre un string libre (p.ej. colores de la malla)
  help?: string;
  addLabel?: string; // para listas (type "array")
}

// Campos comunes que el editor maneja aparte (no se muestran como campos de form).
export const RESERVED_FIELDS = new Set(["hidden", "anchor"]);

// Colores de la malla curricular: el esquema los guarda como string libre, pero
// en el panel se eligen de una lista para mantener coherencia visual.
const COLORS = ["blue", "coral", "purple", "green", "amber"];

// Nombre humano de cada bloque (cabecera del formulario en el editor).
export const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero (encabezado)",
  richContent: "Contenido libre",
  stats: "Métricas",
  richTextSplit: "Texto con imágenes",
  careerShowcase: "Carreras (carrusel/grid)",
  featureGrid: "Grid de tarjetas",
  newsGrid: "Noticias",
  admissionsCallout: "Admisiones (texto + pasos)",
  leadForm: "Formulario de contacto",
  dualLeadForm: "Formulario de dos rutas (Productor / Empresa)",
  faq: "Preguntas frecuentes",
  stepsProcess: "Pasos numerados",
  ctaBanner: "Banner de llamada a la acción",
  highlightCards: "Tarjetas destacadas (Misión/Visión)",
  pricingGrid: "Tabla de aranceles",
  featureList: "Tabla concepto/valor",
  accountabilityTabs: "Rendición de cuentas (pestañas)",
  audiences: "Perfiles de audiencia",
  testimonials: "Testimonios",
};

// Descripción de cada bloque para el catálogo que ve el Agente de Páginas.
export const BLOCK_DESCRIPTIONS: Record<string, string> = {
  hero: "Encabezado de página. heading admite el marcador {wordmark} y saltos de línea \\n.",
  richContent:
    "Contenedor de CONTENIDO LIBRE: items es una lista de piezas apiladas en orden, " +
    "cada una con un campo kind. Tipos de pieza: heading {text,level:h2|h3}, " +
    "text {text} (párrafo, admite <b>,<i>,<a>), image {src,alt,width:full|wide|medium}, " +
    "button {label,href,style:primary|secondary}, buttons {items:[{label,href}]}, " +
    "list {items:[string],ordered}, spacer {size:sm|md|lg}. background: light|tint|brand|dark. " +
    "Úsalo cuando el contenido no encaje en un bloque específico (texto+imagen+botón en cualquier orden).",
  stats: "Métricas en tarjetas. items: [{value,label}]. overlap hace que floten sobre la sección previa.",
  richTextSplit: "Texto con imágenes laterales (2 columnas). body admite HTML simple (<b>).",
  careerShowcase: "Carrusel o grid de carreras (datos derivados de careers, solo-lectura). layout: carousel|grid.",
  featureGrid:
    "Grid de tarjetas. style: plain|numbered|card|accordion (accordion = lista plegable de una " +
    "columna, ideal para módulos o temarios). items: [{icon?,eyebrow?,title,description?}].",
  newsGrid: "Noticias desde la colección blog. showFeatured muestra la primera como destacada; categories son chips.",
  admissionsCallout: "Texto + pasos numerados. steps: [{title,description}].",
  leadForm:
    "Formulario de conversión de 5 pasos → WhatsApp. Los CAMPOS que pide son fijos (nombre, " +
    "fecha de nacimiento, teléfono, carrera y momento) y las carreras salen solas del contenido; " +
    "aquí se edita todo su TEXTO: el pitch de la izquierda, las cinco preguntas, las opciones de " +
    "'¿cuándo quieres empezar?', el aviso para menores de edad y la pantalla de confirmación. Lo " +
    "que se deje vacío usa el texto por defecto. La fecha de nacimiento y la casilla de " +
    "consentimiento son obligatorias por la LOPDP: no se pueden quitar, solo reescribir.",
  dualLeadForm:
    "Formulario con DOS pestañas → WhatsApp. Los campos son fijos: la ruta 'productor' pide " +
    "nombre, celular y correo; la ruta 'empresa' pide empresa, correo y provincia. Aquí solo se " +
    "editan los TEXTOS: los de cada ruta (tabLabel, title, description, submitLabel, labels de " +
    "los campos), la pantalla de confirmación y la lista de provincias. Las tarjetas de entrada enlazan a #productor y #empresa.",
  faq: "Acordeón de preguntas. items: [{question,answer}].",
  stepsProcess: "Pasos numerados. style: cards|bordered. steps: [{title?,description}].",
  ctaBanner: "Banda de conversión final. background: brand|dark.",
  highlightCards: "Tarjetas destacadas (2-up), ideal Misión/Visión. Admite encabezado de sección (eyebrow/heading/description). items: [{variant,eyebrow?,title,body?}].",
  pricingGrid: "Aranceles por carrera (derivados de careers, solo-lectura). note admite HTML simple. placeholder es el texto del botón a WhatsApp que sale en las carreras sin arancel publicado.",
  featureList: "Tabla concepto/valor. rows: [{concept,value,hint?,group?}]. hint es el matiz bajo el concepto; group, puesto en la PRIMERA fila de un apartado, abre un subtítulo dentro de la misma tabla.",
  accountabilityTabs: "Rendición de cuentas con pestañas por período. periods: [{year,phases:[{number,title,description,docs:[{title,href?}]}]}].",
  audiences: "Tarjetas por perfil de audiencia (jóvenes/adultos/padres). items: [{image,title,description?,cta?}].",
  testimonials: "Testimonios con foto. items: [{image?,quote,name,role?}].",
};

// Etiqueta humana de cada "pieza" del bloque de contenido libre (richContent).
// Clave: "<bloque>.<valor del discriminador>".
export const VARIANT_LABELS: Record<string, string> = {
  "richContent.heading": "Título",
  "richContent.text": "Texto",
  "richContent.image": "Imagen",
  "richContent.button": "Botón",
  "richContent.buttons": "Fila de botones",
  "richContent.list": "Lista",
  "richContent.spacer": "Espacio",
};

// Etiqueta humana del formulario de carrera.
export const CAREER_LABEL = "Carrera";

// Campos que NO se muestran en ningún formulario (se conservan tal cual al
// guardar). El slug identifica la carrera y nunca debe cambiarse desde el panel.
export const OMIT = new Set<string>(["career.slug"]);

// Orden curado de los campos de carrera en el editor (más cómodo que el orden
// del esquema). Los campos no listados se agregan al final.
export const CAREER_FIELD_ORDER = [
  "img",
  "title",
  "proximamente",
  "tag",
  "tagline",
  "desc",
  "perfil",
  "titulo",
  "nivel",
  "resolucion",
  "duracion",
  "creditos",
  "asignaturas",
  "inicio",
  "modalidad",
  "mallaPdf",
  "dual",
  "arancelTotal",
  "arancelPeriodo",
  "pilares",
  "egreso",
  "campo",
  "sectores",
  "malla",
];

// Presentación campo por campo (etiqueta / control / ayuda / botón de lista).
export const FIELD_PRESENTATION: Record<string, FieldPres> = {
  // ── hero ──────────────────────────────────────────────────────────────────
  "hero.variant": { label: "Variante", help: "brand = fondo de marca · light = fondo claro" },
  "hero.background": { label: "Fondo" },
  "hero.align": { label: "Alineación" },
  "hero.eyebrow": { label: "Etiqueta superior" },
  "hero.heading": { label: "Título", control: "textarea", help: "Usa {wordmark} para el logo iidea y saltos de línea con Enter" },
  "hero.description": { label: "Descripción", control: "textarea" },
  "hero.primaryCta": { label: "Botón principal" },
  "hero.secondaryCta": { label: "Botón secundario" },
  "hero.image": { label: "Imagen", control: "image" },
  "hero.imageAlt": { label: "Texto alternativo de la imagen" },
  "hero.videoUrl": { label: "URL de video (opcional)" },
  "hero.heroVideo": { label: "Video propio (archivo mp4, no un link)" },
  "hero.heroVideoPoster": { label: "Póster del video", control: "image" },
  "hero.showSeal": { label: "Mostrar sello" },
  "hero.intakeBadgeLabel": { label: "Rótulo del próximo inicio", help: "La FECHA sale de Fechas de inicio; esto es solo el texto que la antecede." },
  "hero.intakeBadge": { label: "Mostrar badge de próximo inicio" },
  "hero.imageSide": { label: "Lado de la imagen", help: "En escritorio: la imagen (o el formulario) a la izquierda o a la derecha del texto" },

  // ── richContent (contenido libre) ──────────────────────────────────────────
  "richContent.background": { label: "Fondo", help: "claro · gris suave · marca (degradado) · oscuro" },
  "richContent.width": { label: "Ancho del contenido" },
  "richContent.align": { label: "Alineación" },
  "richContent.items": { label: "Piezas", addLabel: "Agregar pieza" },
  "richContent.heading.text": { label: "Texto del título", control: "textarea" },
  "richContent.heading.level": { label: "Nivel" },
  "richContent.text.text": { label: "Texto", control: "textarea", help: "Admite <b>, <i> y enlaces <a>." },
  "richContent.image.src": { label: "Imagen", control: "image" },
  "richContent.image.alt": { label: "Texto alternativo" },
  "richContent.image.width": { label: "Ancho" },
  "richContent.button.label": { label: "Texto del botón" },
  "richContent.button.href": { label: "Enlace" },
  "richContent.button.style": { label: "Estilo" },
  "richContent.buttons.items": { label: "Botones", addLabel: "Agregar botón" },
  "richContent.buttons.items.label": { label: "Texto" },
  "richContent.buttons.items.href": { label: "Enlace" },
  "richContent.list.items": { label: "Elementos", control: "textlist", addLabel: "Agregar elemento" },
  "richContent.list.ordered": { label: "Lista numerada" },
  "richContent.spacer.size": { label: "Tamaño del espacio" },

  // ── stats ─────────────────────────────────────────────────────────────────
  "stats.columns": { label: "Columnas", help: "auto = tantas columnas como métricas (todas en una fila)" },
  "stats.overlap": { label: "Superponer a la sección anterior" },
  "stats.highlightLabel": { label: "Etiqueta destacada (opcional)" },
  "stats.highlightValue": { label: "Valor destacado (opcional)" },
  "stats.items": { label: "Métricas", addLabel: "Agregar métrica" },
  "stats.items.value": { label: "Valor" },
  "stats.items.label": { label: "Etiqueta" },

  // -- richTextSplit ----------------------------------------------------------
  "richTextSplit.eyebrow": { label: "Etiqueta superior" },
  "richTextSplit.heading": { label: "Título" },
  "richTextSplit.body": { label: "Texto", control: "textarea", help: "Admite negritas con <b>…</b>" },
  "richTextSplit.cta": { label: "Botón" },
  "richTextSplit.imagePrimary": { label: "Imagen principal", control: "image" },
  "richTextSplit.imageAlt": { label: "Texto alternativo de la imagen" },
  "richTextSplit.imageSide": { label: "Lado de la imagen" },

  // ── careerShowcase ──────────────────────────────────────────────────────────
  "careerShowcase.eyebrow": { label: "Etiqueta superior" },
  "careerShowcase.heading": { label: "Título" },
  "careerShowcase.description": { label: "Descripción", control: "textarea" },
  "careerShowcase.layout": { label: "Formato" },
  "careerShowcase.modalidad": {
    label: "Mostrar solo",
    help: "“todas” lista toda la oferta. Elegir una modalidad permite separar la página en secciones (en línea, duales, híbridas) y comunicar cada grupo con lo que promete su resolución del CES.",
  },
  "careerShowcase.tabs": {
    label: "Pestañas de filtro",
    help: "Agrupa la oferta en pestañas que filtran sin salir de la página (p. ej. “En línea”, “Dual”, “Programas especializados”). Si defines pestañas, mandan sobre “Mostrar solo”.",
  },
  "careerShowcase.tabs.label": { label: "Nombre de la pestaña" },
  "careerShowcase.tabs.modalidades": {
    label: "Modalidades que agrupa",
    help: "Las carreras de estas modalidades entran en la pestaña. Valores: En línea, Dual, Híbrida (separados por coma). Déjalo vacío si la pestaña solo lleva tarjetas propias.",
  },
  "careerShowcase.tabs.extras": {
    label: "Tarjetas propias (no son carreras)",
    help: "Para programas que viven en su propia página y no en la colección de carreras: educación continua, programa agrícola.",
  },
  "careerShowcase.tabs.extras.title": { label: "Título" },
  "careerShowcase.tabs.extras.href": { label: "Enlace" },
  "careerShowcase.tabs.extras.image": { label: "Imagen", control: "image" },
  "careerShowcase.tabs.extras.tag": { label: "Etiqueta superior (opcional)" },
  "careerShowcase.viewAllCta": { label: "Botón 'ver todas'" },

  // ── featureGrid ─────────────────────────────────────────────────────────────
  "featureGrid.variant": { label: "Tema" },
  "featureGrid.style": { label: "Estilo" },
  "featureGrid.align": { label: "Alineación" },
  "featureGrid.headingAlign": { label: "Alineación del título" },
  "featureGrid.eyebrow": { label: "Etiqueta superior" },
  "featureGrid.heading": { label: "Título" },
  "featureGrid.description": { label: "Descripción", control: "textarea" },
  "featureGrid.footnote": { label: "Nota al pie (opcional)", control: "textarea" },
  "featureGrid.actions": { label: "Botones (opcional)", addLabel: "Agregar botón" },
  "featureGrid.actions.label": { label: "Texto" },
  "featureGrid.actions.href": { label: "Enlace" },
  "featureGrid.columns": { label: "Columnas" },
  "featureGrid.image": { label: "Imagen lateral (opcional)", control: "image" },
  "featureGrid.imageAlt": { label: "Texto alternativo de la imagen" },
  "featureGrid.imageWidth": { label: "Ancho real de la imagen (px)", help: "Evita saltos al cargar (CLS). Usa el ancho original del archivo." },
  "featureGrid.imageHeight": { label: "Alto real de la imagen (px)", help: "Evita saltos al cargar (CLS). Usa el alto original del archivo." },
  "featureGrid.imageLayout": { label: "Disposición de la imagen", help: "stacked = arriba · side = al costado" },
  "featureGrid.imageSide": { label: "Lado de la imagen" },
  "featureGrid.items": { label: "Tarjetas", addLabel: "Agregar tarjeta" },
  "featureGrid.items.icon": { label: "Icono (opcional)", control: "image" },
  "featureGrid.items.image": { label: "Imagen (opcional)", control: "image" },
  "featureGrid.items.imageAlt": { label: "Texto alternativo de la imagen" },
  "featureGrid.items.eyebrow": { label: "Etiqueta (opcional)" },
  "featureGrid.items.title": { label: "Título" },
  "featureGrid.items.description": { label: "Descripción", control: "textarea" },
  "featureGrid.items.href": { label: "Enlace de la tarjeta (opcional)" },

  // ── newsGrid ────────────────────────────────────────────────────────────────
  "newsGrid.eyebrow": { label: "Etiqueta superior" },
  "newsGrid.heading": { label: "Título" },
  "newsGrid.limit": { label: "Cuántas mostrar" },
  "newsGrid.showFeatured": { label: "Mostrar destacada" },
  "newsGrid.categories": { label: "Chips de categoría", help: "Separadas por coma" },
  "newsGrid.viewAllCta": { label: "Botón 'ver todas'" },

  // ── admissionsCallout ───────────────────────────────────────────────────────
  "admissionsCallout.eyebrow": { label: "Etiqueta superior" },
  "admissionsCallout.heading": { label: "Título" },
  "admissionsCallout.body": { label: "Texto", control: "textarea", help: "Admite <b>…</b>" },
  "admissionsCallout.highlightLabel": { label: "Etiqueta destacada" },
  "admissionsCallout.highlightValue": { label: "Valor destacado" },
  "admissionsCallout.requirements": { label: "Requisitos", help: "Separados por coma" },
  "admissionsCallout.primaryCta": { label: "Botón principal" },
  "admissionsCallout.secondaryCta": { label: "Botón secundario" },
  "admissionsCallout.steps": { label: "Pasos", addLabel: "Agregar paso" },
  "admissionsCallout.steps.title": { label: "Título" },
  "admissionsCallout.steps.description": { label: "Descripción", control: "textarea" },

  // ── dualLeadForm ────────────────────────────────────────────────────────────
  "dualLeadForm.eyebrow": { label: "Etiqueta superior" },
  "dualLeadForm.heading": { label: "Título" },
  "dualLeadForm.description": { label: "Descripción", control: "textarea" },
  "dualLeadForm.note": { label: "Nota bajo el formulario", control: "textarea", help: "Microcopy tranquilizador, ej. “Te escribimos hoy mismo”." },
  "dualLeadForm.productor": { label: "Ruta 1 — Productor", help: "Campos fijos: nombre completo, teléfono celular y correo. Ancla: #productor" },
  "dualLeadForm.productor.tabLabel": { label: "Texto de la pestaña" },
  "dualLeadForm.productor.title": { label: "Título del formulario" },
  "dualLeadForm.productor.description": { label: "Descripción", control: "textarea" },
  "dualLeadForm.productor.submitLabel": { label: "Texto del botón" },
  "dualLeadForm.empresa": { label: "Ruta 2 — Empresa", help: "Campos fijos: nombre de la empresa, correo de contacto y provincia. Ancla: #empresa" },
  "dualLeadForm.empresa.tabLabel": { label: "Texto de la pestaña" },
  "dualLeadForm.empresa.title": { label: "Título del formulario" },
  "dualLeadForm.empresa.description": { label: "Descripción", control: "textarea" },
  "dualLeadForm.empresa.submitLabel": { label: "Texto del botón" },
  "dualLeadForm.provinces": { label: "Provincias del desplegable", help: "Separadas por coma. Si se deja vacío, el campo pasa a texto libre." },
  "dualLeadForm.consent": { label: "Consentimiento de datos (LOPDP)", help: "Casilla obligatoria: sin marcarla el formulario no envía." },
  "dualLeadForm.consent.label": { label: "Texto de la casilla", control: "textarea", help: "Escribe {politica} donde deba ir el enlace a la política de privacidad." },
  "dualLeadForm.consent.linkLabel": { label: "Texto del enlace" },
  "dualLeadForm.consent.href": { label: "Enlace de la política" },
  "dualLeadForm.consent.error": { label: "Mensaje si no se marca" },

  // ── faq ─────────────────────────────────────────────────────────────────────
  "faq.eyebrow": { label: "Etiqueta superior" },
  "faq.heading": { label: "Título" },
  "faq.items": { label: "Preguntas", addLabel: "Agregar pregunta" },
  "faq.items.question": { label: "Pregunta" },
  "faq.items.answer": { label: "Respuesta", control: "textarea" },

  // ── stepsProcess ────────────────────────────────────────────────────────────
  "stepsProcess.style": { label: "Estilo" },
  "stepsProcess.align": { label: "Alineación" },
  "stepsProcess.columns": { label: "Columnas" },
  "stepsProcess.eyebrow": { label: "Etiqueta superior" },
  "stepsProcess.heading": { label: "Título" },
  "stepsProcess.steps": { label: "Pasos", addLabel: "Agregar paso" },
  "stepsProcess.steps.title": { label: "Título (opcional)" },
  "stepsProcess.steps.description": { label: "Descripción", control: "textarea" },

  // ── ctaBanner ───────────────────────────────────────────────────────────────
  "ctaBanner.background": { label: "Fondo" },
  "ctaBanner.backgroundImage": { label: "Imagen de fondo (opcional)", control: "image" },
  "ctaBanner.heading": { label: "Título" },
  "ctaBanner.description": { label: "Descripción", control: "textarea" },
  "ctaBanner.primaryCta": { label: "Botón principal" },
  "ctaBanner.secondaryCta": { label: "Botón secundario" },

  // ── highlightCards ──────────────────────────────────────────────────────────
  "highlightCards.eyebrow": { label: "Etiqueta superior" },
  "highlightCards.heading": { label: "Título" },
  "highlightCards.description": { label: "Descripción", control: "textarea" },
  "highlightCards.columns": { label: "Columnas" },
  "highlightCards.items": { label: "Tarjetas", addLabel: "Agregar tarjeta" },
  "highlightCards.items.variant": { label: "Estilo" },
  "highlightCards.items.eyebrow": { label: "Etiqueta" },
  "highlightCards.items.title": { label: "Título", control: "textarea" },
  "highlightCards.items.body": { label: "Texto", control: "textarea" },

  // ── pricingGrid ─────────────────────────────────────────────────────────────
  "pricingGrid.eyebrow": { label: "Etiqueta superior" },
  "pricingGrid.heading": { label: "Título" },
  "pricingGrid.placeholder": { label: "Texto cuando no hay arancel", help: "Botón a WhatsApp en las carreras sin precio publicado. Por defecto: «Consúltalo con un asesor»." },
  "pricingGrid.note": { label: "Nota", control: "textarea", help: "Admite <b>…</b>. Los precios salen de las carreras." },

  // ── featureList ─────────────────────────────────────────────────────────────
  "featureList.eyebrow": { label: "Etiqueta superior" },
  "featureList.heading": { label: "Título" },
  "featureList.rows": { label: "Filas", addLabel: "Agregar fila" },
  "featureList.rows.concept": { label: "Concepto" },
  "featureList.rows.value": { label: "Valor" },
  "featureList.rows.hint": { label: "Detalle", help: 'Matiz bajo el concepto: "por cada asignatura", "primera emisión por semestre"…' },
  "featureList.rows.group": { label: "Abre un apartado", help: "Rellénalo solo en la PRIMERA fila del apartado; las siguientes se agrupan bajo ella." },
  "featureList.note": { label: "Nota al pie", control: "textarea", help: "Admite <b>…</b> y enlaces <a>." },

  "pricingGrid.periodoLabel": { label: "Rótulo bajo la cifra", help: "Por defecto: «por período académico»." },
  "pricingGrid.totalLabel": { label: "Rótulo del arancel total" },
  "pricingGrid.placeholderNote": { label: "Texto bajo el botón de consulta" },
  "newsGrid.readMoreLabel": { label: "Texto del enlace de cada noticia" },
  "accountabilityTabs.pendingLabel": { label: "Distintivo de documento pendiente", help: "Por defecto: «Próximamente»." },
  "leadForm.stepLabel": { label: "Contador de pasos", help: "Usa {n} para el paso actual y {total} para el número de pasos." },
  "leadForm.fallbackName": { label: "Saludo si no hay nombre", help: "«¡Listo, aquí!» cuando la persona no escribió su nombre." },
  "dualLeadForm.successHeading": { label: "Título de la confirmación", help: "Usa {nombre} para saludar por su nombre." },
  "dualLeadForm.successText": { label: "Texto de la confirmación", control: "textarea" },
  "dualLeadForm.successWhatsappCta": { label: "Botón de WhatsApp de la confirmación" },
  "dualLeadForm.successPhoneCta": { label: "Botón de llamada de la confirmación", help: "El número se añade solo desde Ajustes del sitio." },
  "dualLeadForm.fallbackName": { label: "Saludo si no hay nombre" },
  "dualLeadForm.productor.labels": { label: "Rótulos de los campos", help: "Claves: nombre, telefono, correo (rótulos) y nombrePh, telefonoPh, correoPh (texto de ejemplo dentro del campo)." },
  "dualLeadForm.empresa.labels": { label: "Rótulos de los campos", help: "Claves: empresa, correo, provincia (rótulos), empresaPh, correoPh y provinciaPlaceholder (texto de ejemplo)." },
  // ── leadForm ────────────────────────────────────────────────────────────────
  // Los campos que pide el formulario son fijos; esto es solo su texto.
  "leadForm.eyebrow": { label: "Etiqueta superior" },
  "leadForm.heading": { label: "Título", control: "textarea", help: "Un salto de línea aquí se respeta en el sitio." },
  "leadForm.description": { label: "Bajada", control: "textarea" },
  "leadForm.bullets": { label: "Ventajas (lista con ✓)", addLabel: "Agregar ventaja" },
  "leadForm.phoneCtaLabel": { label: "Botón de llamada", help: "El número se añade solo desde Ajustes del sitio." },
  "leadForm.whatsappCtaLabel": { label: "Botón de WhatsApp" },
  "leadForm.nameStep": { label: "Paso 1 · Nombre" },
  "leadForm.phoneStep": { label: "Paso 2 · Teléfono" },
  "leadForm.careerStep": { label: "Paso 3 · Carrera" },
  "leadForm.timingStep": { label: "Paso 4 · Cuándo empezar" },
  "leadForm.nameStep.question": { label: "Pregunta" },
  "leadForm.nameStep.hint": { label: "Texto de ayuda" },
  "leadForm.nameStep.placeholder": { label: "Ejemplo dentro del campo" },
  "leadForm.phoneStep.question": { label: "Pregunta" },
  "leadForm.phoneStep.hint": { label: "Texto de ayuda" },
  "leadForm.phoneStep.placeholder": { label: "Ejemplo dentro del campo" },
  "leadForm.careerStep.question": { label: "Pregunta" },
  "leadForm.careerStep.hint": { label: "Texto de ayuda" },
  "leadForm.careerStep.placeholder": { label: "Ejemplo dentro del campo (no se usa en este paso)" },
  "leadForm.timingStep.question": { label: "Pregunta" },
  "leadForm.timingStep.hint": { label: "Texto de ayuda" },
  "leadForm.timingStep.placeholder": { label: "Ejemplo dentro del campo (no se usa en este paso)" },
  "leadForm.timingOptions": { label: "Opciones de “¿cuándo empezar?”", addLabel: "Agregar opción" },
  "leadForm.nextLabel": { label: "Botón “siguiente”" },
  "leadForm.submitLabel": { label: "Botón del último paso" },
  "leadForm.backLabel": { label: "Botón “atrás”" },
  "leadForm.birthStep": { label: "Paso 2 · Fecha de nacimiento (verificación de edad)", help: "Obligatorio por la LOPDP: se pregunta antes del teléfono y decide si hace falta la autorización del representante legal." },
  "leadForm.birthStep.question": { label: "Pregunta" },
  "leadForm.birthStep.hint": { label: "Texto de ayuda" },
  "leadForm.birthStep.placeholder": { label: "Marcador de posición", help: "No se usa: el campo es un calendario." },
  "leadForm.birthStep.error": { label: "Mensaje si la fecha es imposible" },
  "leadForm.guardian": { label: "Menores de 18 años (representante legal)", help: "Aparece solo si la fecha de nacimiento es de un menor. Sin el nombre del representante y su casilla marcada, el formulario no avanza." },
  "leadForm.guardian.title": { label: "Título del aviso" },
  "leadForm.guardian.description": { label: "Explicación", control: "textarea" },
  "leadForm.guardian.placeholder": { label: "Marcador del campo del representante" },
  "leadForm.guardian.consentLabel": { label: "Texto de la casilla de autorización", control: "textarea" },
  "leadForm.guardian.error": { label: "Mensaje si falta el representante" },
  "leadForm.consent": { label: "Consentimiento de datos (LOPDP)", help: "Casilla obligatoria: sin marcarla el formulario no envía." },
  "leadForm.consent.label": { label: "Texto de la casilla", control: "textarea", help: "Escribe {politica} donde deba ir el enlace a la política de privacidad." },
  "leadForm.consent.linkLabel": { label: "Texto del enlace" },
  "leadForm.consent.href": { label: "Enlace de la política" },
  "leadForm.consent.error": { label: "Mensaje si no se marca" },
  "leadForm.success": { label: "Confirmación (tras enviar)" },
  "leadForm.success.heading": { label: "Título", help: "Escribe {nombre} donde deba ir el nombre de quien escribió." },
  "leadForm.success.description": { label: "Mensaje", control: "textarea" },
  "leadForm.success.whatsappLabel": { label: "Botón de WhatsApp" },
  "leadForm.success.phoneLabel": { label: "Botón de llamada" },

  // ── accountabilityTabs ──────────────────────────────────────────────────────
  "accountabilityTabs.eyebrow": { label: "Etiqueta superior" },
  "accountabilityTabs.heading": { label: "Título" },
  "accountabilityTabs.description": { label: "Descripción", control: "textarea" },
  "accountabilityTabs.periods": { label: "Períodos", addLabel: "Agregar período" },
  "accountabilityTabs.periods.year": { label: "Año" },
  "accountabilityTabs.periods.phases": { label: "Fases", addLabel: "Agregar fase" },
  "accountabilityTabs.periods.phases.number": { label: "Número" },
  "accountabilityTabs.periods.phases.title": { label: "Título" },
  "accountabilityTabs.periods.phases.description": { label: "Descripción", control: "textarea" },
  "accountabilityTabs.periods.phases.docs": { label: "Documentos", addLabel: "Agregar documento" },
  "accountabilityTabs.periods.phases.docs.title": { label: "Título" },
  "accountabilityTabs.periods.phases.docs.href": {
    label: "Archivo (vacío = próximamente)",
    control: "doc",
    help: "Sube el PDF o elígelo de la biblioteca. Si lo dejas vacío, el documento se muestra como “próximamente”.",
  },

  // ── audiences ───────────────────────────────────────────────────────────────
  "audiences.columns": { label: "Columnas" },
  "audiences.eyebrow": { label: "Etiqueta superior" },
  "audiences.heading": { label: "Título" },
  "audiences.description": { label: "Descripción", control: "textarea" },
  "audiences.items": { label: "Perfiles", addLabel: "Agregar perfil" },
  "audiences.items.image": { label: "Imagen", control: "image" },
  "audiences.items.imageAlt": { label: "Texto alternativo de la imagen" },
  "audiences.items.title": { label: "Título" },
  "audiences.items.description": { label: "Descripción", control: "textarea" },
  "audiences.items.cta": { label: "Botón" },

  // ── testimonials ────────────────────────────────────────────────────────────
  "testimonials.columns": { label: "Columnas" },
  "testimonials.eyebrow": { label: "Etiqueta superior" },
  "testimonials.heading": { label: "Título" },
  "testimonials.description": { label: "Descripción", control: "textarea" },
  "testimonials.items": { label: "Testimonios", addLabel: "Agregar testimonio" },
  "testimonials.items.image": { label: "Foto (opcional)", control: "image" },
  "testimonials.items.quote": { label: "Cita", control: "textarea" },
  "testimonials.items.name": { label: "Nombre" },
  "testimonials.items.role": { label: "Rol / carrera (opcional)" },

  // ── career ──────────────────────────────────────────────────────────────────
  "career.proximamente": {
    label: "Próximamente (aún no abre)",
    help: "La carrera se publica con la etiqueta “Próximamente” y su fecha de apertura, sin botón de postular. Para ocultarla del todo usa “oculta”.",
  },
  "career.img": { label: "Imagen de la carrera", control: "image" },
  "career.banner": { label: "Imagen de banner (opcional)", control: "image" },
  "career.title": { label: "Nombre de la carrera" },
  "career.mallaPdf": {
    label: "Malla oficial (PDF)",
    control: "doc",
    help: "El PDF tal como se presentó al CES. Se muestra como botón de descarga bajo la malla. Súbelo desde Medios (documentos).",
  },
  "career.tag": { label: "Área (ej. Tecnología)" },
  "career.tagline": { label: "Frase / tagline" },
  "career.desc": { label: "Descripción corta", control: "textarea" },
  "career.perfil": { label: "Perfil profesional", control: "textarea" },
  "career.titulo": { label: "Título oficial que obtiene" },
  "career.nivel": { label: "Nivel" },
  "career.resolucion": { label: "Resolución" },
  "career.duracion": { label: "Duración" },
  "career.creditos": { label: "Créditos" },
  "career.asignaturas": { label: "Nº de asignaturas" },
  "career.inicio": { label: "Fecha de inicio" },
  "career.modalidad": {
    label: "Modalidad",
    help: "Debe coincidir con la resolución del CES de la carrera. Decide en qué sección de la Oferta aparece y qué declara su dato estructurado.",
  },
  "career.dual": { label: "Formación dual % (vacío si no aplica)" },
  "career.arancelTotal": { label: "Arancel total (vacío si no aplica)" },
  "career.arancelPeriodo": { label: "Arancel por período (vacío si no aplica)" },
  "career.pilares": { label: "Pilares (¿Por qué IIDEA?)", addLabel: "Agregar pilar" },
  "career.pilares.n": { label: "Nº" },
  "career.pilares.t": { label: "Título" },
  "career.pilares.d": { label: "Descripción", control: "textarea" },
  "career.egreso": { label: "Perfil de egreso (logros al graduarse)", control: "textlist" },
  "career.campo": { label: "Campo ocupacional (roles)", control: "textlist" },
  "career.sectores": { label: "Sectores", control: "textlist" },
  "career.malla": { label: "Malla curricular" },
  "career.malla.intro": { label: "Introducción de la malla", control: "textarea" },
  "career.malla.ejes": { label: "Ejes temáticos (leyenda)", addLabel: "Agregar eje" },
  "career.malla.ejes.t": { label: "Nombre del eje" },
  "career.malla.ejes.k": { label: "Color", control: "select", options: COLORS },
  "career.malla.periodos": { label: "Períodos", addLabel: "Agregar período" },
  "career.malla.periodos.rom": { label: "Período (I, II, III, IV)" },
  "career.malla.periodos.a": { label: "Asignaturas", addLabel: "Agregar asignatura" },
  "career.malla.periodos.a.n": { label: "Asignatura" },
  "career.malla.periodos.a.k": { label: "Color del eje", control: "select", options: COLORS },
};
