import type { ManifestField } from "../generated/schema-manifest.js";

// Validación de TIPOS contra el manifiesto generado desde el Zod del sitio.
//
// Hasta ahora el panel solo comprobaba NOMBRES de campo: un bloque con
// `columns: "4"` (texto) o una carrera con `asignaturas: "20"` pasaban el
// control, se commiteaban, y reventaban el build de Astro — dejando el sitio
// congelado en la versión anterior. Peor por el chat: el asistente respondía
// "listo" porque el commit sí había salido.
//
// Esto NO reimplementa el Zod del sitio (son paquetes separados: ver DECISIONES).
// Comprueba lo que el manifiesto sí sabe —clase, opciones y forma— que es donde
// caen los errores reales de un agente.

// Los literales admitidos de un enum se derivan de las opciones: una opción que
// "parece número" viene de un z.literal(4) numérico; el resto son strings.
// Así `stats.columns` (union de "auto" y 2..6) acepta 3 y "auto", pero no "3",
// exactamente como el Zod del sitio — que es quien manda en el build.
function enumLiterals(options: string[]): Array<string | number> {
  return options.map((o) => (/^-?\d+(\.\d+)?$/.test(o) ? Number(o) : o));
}

const typeName = (v: unknown): string =>
  Array.isArray(v) ? "lista" : v === null ? "null" : typeof v === "object" ? "objeto" : typeof v;

function fail(where: string, field: string, msg: string): never {
  throw new Error(`${where}: el campo "${field}" ${msg}`);
}

// Valida UN campo presente. Los ausentes no se tocan aquí (los obligatorios los
// comprueba quien llama, que sabe si es una creación o un parche parcial).
function validateField(where: string, f: ManifestField, value: unknown): void {
  if (value === undefined || value === null) return; // "sin valor" = usar el default del sitio

  switch (f.kind) {
    // OJO: "string" en el manifiesto puede venir de un z.string() puro o de una
    // unión aplanada por el codegen. En el sitio hay varias reales
    // (career.creditos y accountabilityTabs.phases.number son
    // z.union([z.string(), z.number()])) y hay contenido PUBLICADO que usa el
    // número. Como el manifiesto no distingue los dos casos, aquí se acepta
    // texto o número: rechazar el número bloquearía guardar 4 carreras y 2
    // páginas que hoy funcionan. Lo que sí se descarta es lo que nunca es
    // válido en un escalar: objetos, listas y booleanos.
    case "string":
      if (typeof value !== "string" && typeof value !== "number") {
        fail(where, f.name, `debe ser texto (llegó ${typeName(value)}).`);
      }
      return;

    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(where, f.name, `debe ser un número sin comillas (llegó ${typeName(value)}: ${JSON.stringify(value)}).`);
      }
      return;

    case "boolean":
      if (typeof value !== "boolean") fail(where, f.name, `debe ser true o false (llegó ${typeName(value)}).`);
      return;

    case "enum": {
      const allowed = enumLiterals(f.options ?? []);
      if (!allowed.some((a) => a === value)) {
        const shown = allowed.map((a) => (typeof a === "number" ? String(a) : `"${a}"`)).join(", ");
        fail(where, f.name, `admite ${shown} (llegó ${JSON.stringify(value)}). Los números van sin comillas.`);
      }
      return;
    }

    case "stringlist":
      if (!Array.isArray(value) || value.some((x) => typeof x !== "string")) {
        fail(where, f.name, `debe ser una lista de textos (llegó ${typeName(value)}).`);
      }
      if (f.options?.length) {
        const allowed = new Set(f.options);
        (value as string[]).forEach((item, i) => {
          if (!allowed.has(item)) {
            const shown = f.options!.map((o) => `"${o}"`).join(", ");
            fail(where, f.name, `— el elemento #${i + 1} admite ${shown} (llegó ${JSON.stringify(item)}).`);
          }
        });
      }
      return;

    case "array": {
      if (!Array.isArray(value)) fail(where, f.name, `debe ser una lista (llegó ${typeName(value)}).`);
      if (!f.item) return;
      (value as unknown[]).forEach((item, i) => {
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          fail(where, f.name, `— el elemento #${i + 1} debe ser un objeto (llegó ${typeName(item)}).`);
        }
        validateFields(`${where} › ${f.name} #${i + 1}`, f.item!, item as Record<string, unknown>);
      });
      return;
    }

    case "cta":
    case "object":
      if (typeof value !== "object" || Array.isArray(value)) {
        fail(where, f.name, `debe ser un objeto (llegó ${typeName(value)}).`);
      }
      return;

    // "unknown" y cualquier clase futura: el manifiesto no sabe lo suficiente
    // para juzgar, así que no se inventa una regla. El Zod del sitio decide.
    default:
      return;
  }
}

// Valida los campos PRESENTES en obj contra su definición. Ignora los que el
// manifiesto no conoce (de eso ya se encarga el control de campos permitidos).
export function validateFields(where: string, fields: ManifestField[], obj: Record<string, unknown>): void {
  const byName = new Map(fields.map((f) => [f.name, f]));
  for (const [key, value] of Object.entries(obj)) {
    const f = byName.get(key);
    if (f) validateField(where, f, value);
  }
}

// Comprueba además que estén los obligatorios (para creaciones, no para parches).
export function validateRequired(where: string, fields: ManifestField[], obj: Record<string, unknown>): void {
  for (const f of fields) {
    if (f.required && obj[f.name] === undefined) {
      throw new Error(`${where}: falta el campo obligatorio "${f.name}".`);
    }
  }
}
