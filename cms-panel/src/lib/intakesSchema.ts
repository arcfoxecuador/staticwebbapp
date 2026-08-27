import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Calendario de inicios (astro-web/src/config/intakes.json).
//
// Es la ÚNICA fuente de verdad de las fechas de inicio: el sitio calcula con
// ella el "próximo inicio" y el "X inicios al año" que sostienen toda la copia
// de urgencia (ver astro-web/src/lib/intakes.ts). Por eso el panel valida aquí
// antes de guardar — una lista rota no rompe el build, pero sí haría que el
// sitio anuncie una fecha que ya pasó.
// ─────────────────────────────────────────────────────────────────────────────

// "AAAA-MM-DD" y además una fecha REAL: "2026-02-31" pasa el regex pero no existe.
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }, "Esa fecha no existe en el calendario");

// Hoy a medianoche local: una fecha de inicio HOY todavía cuenta como próxima.
function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const intakesSchema = z
  .object({
    // Nota explicativa que vive en el archivo; se conserva tal cual.
    _note: z.string().optional(),
    intakes: z.array(isoDate).min(1, "Debe haber al menos una fecha de inicio"),
  })
  .superRefine((val, ctx) => {
    const dup = val.intakes.filter((d, i) => val.intakes.indexOf(d) !== i);
    if (dup.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["intakes"],
        message: `Fechas repetidas: ${[...new Set(dup)].join(", ")}`,
      });
    }
    // Sin ninguna fecha futura, el sitio anunciaría como "próximo inicio" una
    // fecha ya pasada: es el fallo que este esquema existe para impedir.
    const hoy = startOfToday();
    if (!val.intakes.some((d) => parseLocal(d) >= hoy)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["intakes"],
        message: "Debe quedar al menos una fecha futura: el sitio anuncia el próximo inicio a partir de esta lista",
      });
    }
  });

export type Intakes = z.infer<typeof intakesSchema>;

// Guarda siempre ordenado y sin duplicados: el archivo se lee a ojo y el sitio
// lo ordena igual, así que el orden en disco no debe depender de quien lo editó.
export function normalizeIntakes(value: Intakes): Intakes {
  return { ...value, intakes: [...new Set(value.intakes)].sort() };
}

// Cuántas de esas fechas caen en los próximos 12 meses — el "X inicios al año"
// que verá el sitio. Espejo de intakesPerYear() en astro-web/src/lib/intakes.ts,
// para poder mostrarlo en el panel antes de guardar.
export function intakesPerYear(dates: string[], now: Date = new Date()): number {
  const end = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  return dates.map(parseLocal).filter((d) => d >= now && d < end).length;
}

// La próxima fecha a partir de hoy, o null si no queda ninguna.
export function nextIntake(dates: string[], now: Date = startOfToday()): string | null {
  return [...dates].sort().find((d) => parseLocal(d) >= now) ?? null;
}
