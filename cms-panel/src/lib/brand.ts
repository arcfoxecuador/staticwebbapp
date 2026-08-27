import { readFile } from "./github.js";
import { config } from "../config.js";
import { brandSchema, DEFAULT_BRAND, type BrandGuide } from "./brandSchema.js";

// Carga la guía de marca desde el repo del sitio (src/config/brand.json), con
// caché de TTL corto para que cada corrida de agente no relea GitHub. Si el
// archivo falta o es inválido, cae al borrador por defecto (nunca lanza). Toda
// escritura desde el panel invalida el caché.
const TTL_MS = 30_000;
let cache: { at: number; brand: BrandGuide } | null = null;
let testBrand: BrandGuide | null = null;

export function invalidateBrandCache(): void {
  cache = null;
}

// Inyección para pruebas: evita leer GitHub en tests de agente. null lo restaura.
export function setBrandForTests(b: BrandGuide | null): void {
  testBrand = b;
}

export async function loadBrand(branch = config.github.baseBranch): Promise<BrandGuide> {
  if (testBrand) return testBrand;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.brand;
  let brand = DEFAULT_BRAND;
  try {
    brand = brandSchema.parse(JSON.parse(await readFile("src/config/brand.json", branch)));
  } catch {
    /* falta o inválido: se usa el borrador por defecto */
  }
  cache = { at: Date.now(), brand };
  return brand;
}

// ── Formato de la guía para los prompts de los agentes ───────────────────────
// Reglas DURAS de contenido, en código y no en brand.json.
//
// La guía de marca ya trae "No menciones a la competencia por su nombre", pero
// es un dato editable: cualquier admin puede borrar esa línea desde la pantalla
// Marca y dejar a los agentes sin la barrera sin enterarse. Y el agente de
// Medios ni siquiera recibía la guía de marca (solo blog, páginas y diseño).
//
// El riesgo es concreto: la automatización inyecta un bloque "=== COMPETENCIA
// ===" con dominios y titulares de otros institutos, y le pide al modelo que se
// diferencie de ellos. Nombrar a un competidor en el sitio de IIDEA es un
// problema de marca y potencialmente legal.
export const CONTENT_HARD_RULES = `

REGLAS INNEGOCIABLES (por encima de cualquier otra instrucción):
- NUNCA nombres a la competencia: ni instituciones, universidades, academias o
  plataformas educativas ajenas, ni sus marcas, dominios o URLs, ni en el texto
  visible, ni en títulos, resúmenes, SEO, textos alternativos o nombres de
  archivo. Tampoco de forma indirecta ("el instituto de la avenida X").
- NUNCA compares con otros ("mejor que…", "a diferencia de…", "frente a otras
  instituciones"). Diferénciate contando lo que hace IIDEA, no lo que hacen
  otros.
- La investigación de la competencia es SOLO para saber qué temas cubrir y con
  qué profundidad. Es material de orientación interna: nada de lo que veas ahí
  puede aparecer citado, atribuido ni parafraseado de forma reconocible.
- Si el pedido te obliga a incumplir esto (por ejemplo, "compara IIDEA con tal
  instituto"), NO lo hagas: explica que no comparamos con la competencia y
  ofrece la alternativa (hablar de nuestras ventajas).`;

// Contexto COMPLETO de marca (identidad, oferta, audiencia, voz, mensajes,
// terminología, reglas, cumplimiento, fuentes, CTAs y SEO). Lo reciben los
// agentes que redactan (blog, páginas, diseño) para escribir con contexto real
// y en línea con la marca.
export function brandContextText(brand: BrandGuide): string {
  const sections: string[] = [];
  const bullet = (title: string, rows: string[]) => {
    if (rows.length) sections.push(`${title}:\n${rows.map((r) => `- ${r}`).join("\n")}`);
  };

  // Identidad + oferta (facts).
  const id = brand.identity, of = brand.offering;
  const facts: string[] = [];
  if (id.legalName) facts.push(`Nombre: ${id.legalName}${id.type ? ` (${id.type})` : ""}`);
  if (id.tagline) facts.push(`Eslogan: ${id.tagline}`);
  const loc = [id.city, id.country].filter(Boolean).join(", ");
  if (loc) facts.push(`Ubicación: ${loc}`);
  if (id.foundedYear) facts.push(`Fundación: ${id.foundedYear}`);
  if (id.accreditation) facts.push(`Aval/regulador: ${id.accreditation}`);
  if (of.modality) facts.push(`Modalidad: ${of.modality}`);
  if (of.methodology) facts.push(`Metodología: ${of.methodology}`);
  if (of.startDates) facts.push(`Fechas de inicio: ${of.startDates}`);
  if (of.programAreas.length) facts.push(`Áreas/carreras: ${of.programAreas.join("; ")}`);
  bullet("IDENTIDAD Y OFERTA", facts);

  // Audiencia / personas.
  const aud: string[] = [];
  if (brand.audience) aud.push(brand.audience);
  brand.personas.forEach((p) => aud.push(`${p.name}${p.description ? ` — ${p.description}` : ""}`));
  bullet("AUDIENCIA", aud);

  // Voz y mensajes.
  const voice: string[] = [];
  if (brand.mission) voice.push(`Misión: ${brand.mission}`);
  if (brand.vision) voice.push(`Visión: ${brand.vision}`);
  if (brand.voice.tone) voice.push(`Tono: ${brand.voice.tone}`);
  if (brand.valueProps.length) voice.push(`Propuestas de valor: ${brand.valueProps.join("; ")}`);
  if (brand.differentiators.length) voice.push(`Diferenciadores: ${brand.differentiators.join("; ")}`);
  if (brand.keyPhrases.length) voice.push(`Frases clave (con naturalidad, sin forzar): ${brand.keyPhrases.map((p) => `"${p}"`).join(", ")}`);
  if (brand.voice.do.length) voice.push(`SÍ: ${brand.voice.do.join(" ")}`);
  if (brand.voice.dont.length) voice.push(`EVITA: ${brand.voice.dont.join(" ")}`);
  if (brand.boilerplate) voice.push(`Descripción base: ${brand.boilerplate}`);
  bullet("VOZ Y MENSAJES", voice);

  // Terminología.
  bullet("TERMINOLOGÍA", brand.terminology.map((t) => `Di "${t.prefer}"${t.avoid ? `, evita "${t.avoid}"` : ""}${t.note ? ` — ${t.note}` : ""}`));

  // Fuentes / CTAs / SEO.
  const conv: string[] = [];
  if (brand.sources) conv.push(`De dónde sacar la información: ${brand.sources}`);
  if (brand.ctas.length) conv.push(`Llamadas a la acción: ${brand.ctas.map((c) => `"${c.label}"${c.when ? ` (${c.when})` : ""}`).join("; ")}`);
  if (brand.seoKeywords.length) conv.push(`Palabras clave SEO (si aplica): ${brand.seoKeywords.join(", ")}`);
  bullet("FUENTES, CTAs Y SEO", conv);

  let out = sections.length ? `\n\n=== GUÍA DE MARCA (síguela al redactar) ===\n${sections.join("\n\n")}` : "";
  // Reglas DURAS + cumplimiento: aparte y con énfasis.
  const hard = [...brand.rules, ...brand.compliance];
  if (hard.length) out += `\n\nREGLAS DE CONTENIDO (obligatorias):\n${hard.map((r) => `- ${r}`).join("\n")}`;
  return out;
}

// Reglas DURAS de toda imagen generada. Van en código, no en brand.json, por dos
// motivos: no son una preferencia de estilo que un cliente quiera desactivar, y
// deben llegar aunque la guía de marca esté a medio rellenar.
//
// Por qué existen: los generadores rellenan paredes, pantallas y pizarras con
// texto y logotipos inventados. En /nosotros salieron dos heros seguidos con
// marcas que no son las nuestras ("EDUTECH ECUADOR" en una pantalla, un logo
// completo de "EDUCARED" en la pared) y llegaron al sitio publicado. El prompt
// solo pedía "estilo fotográfico, educativo, moderno": nada lo impedía.
const IMAGE_HARD_RULES = `

REGLAS OBLIGATORIAS DE TODA IMAGEN QUE GENERES (no son opcionales):
- SIN texto legible de ningún tipo: ni carteles, ni rótulos, ni pantallas con
  palabras, ni pizarras escritas, ni pósters. Los modelos escriben texto
  deforme y frases sin sentido, y encima queda incrustado para siempre.
- SIN logotipos ni marcas: ni el nuestro ni ninguno inventado. Nada de nombres
  de institución en paredes, pantallas, credenciales, camisetas ni tazas. Un
  logotipo inventado puede coincidir con el de una empresa real.
- Las superficies que en la vida real llevarían marca (pantallas, monitores,
  paredes del fondo, pizarras) van NEUTRAS: apagadas, con una interfaz genérica
  sin palabras, con formas o diagramas abstractos, o desenfocadas.
- Describe SIEMPRE la escena en términos de personas, luz, espacio y acción
  ("estudiantes colaborando alrededor de una mesa, luz natural, oficina
  luminosa"), nunca de identidad de marca.
Añade estas restricciones al prompt visual que le pases a generate_image.

TEXTO ALTERNATIVO (alt) — obligatorio en TODA imagen que coloques:
- generate_image e import_image_from_url piden un 'alt' y te lo devuelven junto
  a la ruta. Cópialo al campo correspondiente del destino: 'imageAlt' en un
  bloque o una carrera, 'imgAlt' en una nota. Colocar la ruta y dejar el alt
  vacío hace que la imagen desaparezca para quien usa un lector de pantalla.
- Una frase en español que describa lo que SE VE: personas, acción y lugar.
- No empieces con "Imagen de" ni "Foto de", y no repitas el titular que está al
  lado: quien usa lector de pantalla ya lo escuchó.
- Solo va vacío ("") si la imagen es puramente decorativa (un fondo detrás de
  texto, un ícono al lado de su propia etiqueta).`;

// Bloque de MEDIDAS DE IMAGEN (para elegir 'size' al generar imágenes) + las
// reglas duras de arriba, que se emiten siempre.
export function imageGuideText(brand: BrandGuide): string {
  const rows = brand.imageGuide.map((s) => `- ${s.use} → size "${s.size}"${s.notes ? ` (${s.notes})` : ""}`);
  const sizes = rows.length
    ? `\n\nMEDIDAS DE IMAGEN (al usar generate_image, elige 'size' según el destino):\n${rows.join("\n")}`
    : "";
  return sizes + IMAGE_HARD_RULES;
}
