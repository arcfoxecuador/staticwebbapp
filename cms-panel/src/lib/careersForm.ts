import { buildFields, type FormSpec } from "./blockForms.js";
import { CAREER_MANIFEST, CAREER_LIST } from "../generated/schema-manifest.js";
import { CAREER_FIELD_ORDER, CAREER_LABEL } from "./presentation.js";
import { listDir, readFile } from "./github.js";

const CAREERS_DIR = "src/content/careers";

export function careerPath(slug: string): string {
  return `${CAREERS_DIR}/${slug}.json`;
}

// Semilla: las carreras que existían cuando se generó el manifiesto. Solo se usa
// como respaldo si GitHub no responde — la lista REAL se lee del repo (ver abajo),
// porque desde que el panel puede crear carreras el manifiesto se queda corto
// hasta el siguiente `npm run codegen`.
const SEED: Record<string, string> = Object.fromEntries(CAREER_LIST.map((c) => [c.slug, c.label]));

export interface CareerSummary {
  title: string;
  hidden: boolean;
  proximamente: boolean;
  // Slug de la RUTA pública (/carrera/<slug>). No siempre es el nombre del
  // archivo: administracion-empresas.json publica en /carrera/administracion.
  routeSlug: string;
}

// Igual que el listado de entradas: cache corta para que las pantallas repetidas
// no consuman rate limit. Toda escritura de carreras lo invalida.
const LIST_TTL_MS = 30_000;
const listCache = new Map<string, { at: number; careers: Record<string, CareerSummary> }>();

export function invalidateCareersCache(): void {
  listCache.clear();
}

// Carreras del repo con su estado de publicación. Es la fuente de verdad del
// panel: el manifiesto generado se queda corto en cuanto se crea una carrera.
export async function listCareerDetails(branch: string): Promise<Record<string, CareerSummary>> {
  const cached = listCache.get(branch);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.careers;
  let careers: Record<string, CareerSummary>;
  try {
    const entries = await listDir(CAREERS_DIR, branch);
    const pairs = await Promise.all(
      entries
        .filter((e) => e.name.endsWith(".json"))
        .map(async (e) => {
          const slug = e.name.replace(/\.json$/, "");
          try {
            const data = JSON.parse(await readFile(e.path, branch));
            return [
              slug,
              {
                title: String(data.title ?? slug),
                hidden: data.hidden === true,
                proximamente: data.proximamente === true,
                routeSlug: String(data.slug ?? slug),
              },
            ] as const;
          } catch {
            return null; // una carrera corrupta no debe tumbar el listado
          }
        }),
    );
    careers = Object.fromEntries(pairs.filter((p): p is readonly [string, CareerSummary] => p != null));
  } catch {
    // Sin red: al menos deja editar lo que ya se conocía por el manifiesto.
    return Object.fromEntries(
      Object.entries(SEED).map(([slug, title]) => [
        slug,
        { title, hidden: false, proximamente: false, routeSlug: slug },
      ]),
    );
  }
  listCache.set(branch, { at: Date.now(), careers });
  return careers;
}

// Vista simple (slug → título) para quien solo necesita nombrarlas.
export async function listCareers(branch: string): Promise<Record<string, string>> {
  const details = await listCareerDetails(branch);
  return Object.fromEntries(Object.entries(details).map(([slug, c]) => [slug, c.title]));
}

// Formulario de una carrera, DERIVADO del manifiesto generado (career.ts) + la
// presentación (etiquetas/controles). El slug se omite (no se edita desde el
// panel) y los campos sin control —p.ej. malla.titulacion— se conservan tal cual
// al guardar. El orden sigue CAREER_FIELD_ORDER para una edición más cómoda.
const order = new Map(CAREER_FIELD_ORDER.map((name, i) => [name, i]));
const fields = buildFields(CAREER_MANIFEST, "career").sort(
  (a, b) => (order.get(a.name) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.name) ?? Number.MAX_SAFE_INTEGER),
);

export const CAREER_FORM: FormSpec = { label: CAREER_LABEL, fields };

// Carrera recién creada: el mínimo que hace que el build del sitio VALIDE
// (careerSchema exige tag, img, desc, titulo, nivel, resolucion, duracion,
// creditos y perfil). Nace como "próximamente" y oculta, para que nadie la vea
// a medio llenar: el equipo la completa y luego la publica.
export function newCareer(slug: string, title: string): Record<string, unknown> {
  return {
    slug,
    title,
    hidden: true,
    proximamente: true,
    tag: "Por definir",
    img: "",
    modalidad: "En línea",
    desc: `Carrera de ${title}. Completa esta descripción antes de publicarla.`,
    titulo: `Tecnólogo(a) Superior en ${title}`,
    nivel: "Tercer nivel · Tecnológico Superior",
    resolucion: "En trámite (CES)",
    duracion: "4 períodos académicos",
    creditos: "0",
    perfil: `Completa aquí el perfil profesional de ${title}.`,
    egreso: [],
    campo: [],
  };
}
