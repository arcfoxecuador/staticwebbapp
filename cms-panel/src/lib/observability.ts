// ─────────────────────────────────────────────────────────────────────────────
// Observabilidad del panel: logs estructurados (JSON) y captura de errores.
//
// - `log.*` emite líneas JSON a stdout/stderr → las recogen Render/App Runner/
//   CloudWatch sin dependencias. Nivel, timestamp y campos extra por línea.
// - Monitoreo de errores: si SENTRY_DSN está definido y @sentry/node instalado,
//   los errores no manejados se envían a Sentry; si no, quedan en los logs. Así
//   funciona con o sin Sentry, sin romper el arranque.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "node:crypto";

type Level = "info" | "warn" | "error";

// Sumidero de logs. En producción es la consola; las pruebas lo sustituyen para
// poder afirmar sobre lo que se emite (ver setLogSinkForTests).
type Sink = (level: Level, record: Record<string, unknown>) => void;

const consoleSink: Sink = (level, record) => {
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

// Las pruebas emiten decenas de trazas de corrida; escupirlas a la consola
// entierra el resultado real de la suite. PANEL_LOG_SILENT=1 las apaga sin tocar
// NODE_ENV (del que sí dependen las comprobaciones de producción en config.ts).
const silentSink: Sink = () => {};

let sink: Sink = process.env.PANEL_LOG_SILENT === "1" ? silentSink : consoleSink;

/** Costura de pruebas: pasa null para volver al sumidero por defecto. */
export function setLogSinkForTests(s: Sink | null): void {
  sink = s ?? (process.env.PANEL_LOG_SILENT === "1" ? silentSink : consoleSink);
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  sink(level, { t: new Date().toISOString(), level, msg, ...(fields ?? {}) });
}

export const log = {
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};

// Cliente de Sentry (opcional). `any` porque el paquete puede no estar instalado.
let sentry: { captureException: (e: unknown, hint?: unknown) => void } | null = null;

export async function initMonitoring(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    log.info("observability: solo logs (SENTRY_DSN no definido).");
    return;
  }
  try {
    // Import dinámico con especificador variable: @sentry/node es OPCIONAL (no es
    // dependencia del panel). Si no está instalado, caemos a solo-logs sin romper.
    // Para activarlo: `npm i @sentry/node` y define SENTRY_DSN.
    const sentryPkg = "@sentry/node";
    const mod: any = await import(sentryPkg);
    mod.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0,
    });
    sentry = mod;
    log.info("observability: Sentry activo.");
  } catch {
    log.warn("observability: SENTRY_DSN definido pero @sentry/node no está instalado; solo logs.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trazas de corrida de agente.
//
// Antes, de una corrida solo quedaba "panel iniciado" y, si reventaba, un error
// suelto. No se podía responder ni "por qué esta corrida costó tanto" ni "qué
// herramienta falla más" ni "cuántas se quedan sin pasos". Cada corrida emite
// ahora UNA línea `agent_run` con todo lo que hace falta para agregar después.
//
// No se calcula costo en dinero: el precio por modelo cambia y meterlo aquí
// significaría hornear números que envejecen mal. Se emiten tokens y modelo, que
// es lo que permite calcularlo fuera y sin mentir.
// ─────────────────────────────────────────────────────────────────────────────

export type RunOutcome = "ok" | "sin_pasos" | "sin_cambios" | "cancelada" | "error";

export interface RunTrace {
  runId: string;
  /** Registra una llamada a herramienta ya terminada. */
  recordTool(name: string, ms: number, ok: boolean): void;
  /** Emite la línea final. Idempotente: llamarla dos veces no duplica. */
  finish(outcome: RunOutcome, fields?: Record<string, unknown>): void;
}

export function startRunTrace(
  kind: string,
  fields: Record<string, unknown> = {},
): RunTrace {
  const runId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  const tools = new Map<string, { n: number; ms: number; fallos: number }>();
  let cerrada = false;

  log.info("agent_run_start", { evt: "agent_run_start", runId, kind, ...fields });

  return {
    runId,
    recordTool(name, ms, ok) {
      const prev = tools.get(name) ?? { n: 0, ms: 0, fallos: 0 };
      prev.n += 1;
      prev.ms += Math.round(ms);
      if (!ok) prev.fallos += 1;
      tools.set(name, prev);
    },
    finish(outcome, extra = {}) {
      if (cerrada) return;
      cerrada = true;
      const detalle = Object.fromEntries(
        [...tools.entries()].map(([n, v]) => [n, v.fallos ? `${v.n}(${v.fallos}✗)/${v.ms}ms` : `${v.n}/${v.ms}ms`]),
      );
      log.info("agent_run", {
        evt: "agent_run",
        runId,
        kind,
        outcome,
        durationMs: Date.now() - t0,
        toolCalls: [...tools.values()].reduce((a, v) => a + v.n, 0),
        toolFails: [...tools.values()].reduce((a, v) => a + v.fallos, 0),
        tools: detalle,
        ...fields,
        ...extra,
      });
    },
  };
}

/**
 * Envuelve las herramientas de una corrida para que cada llamada quede medida.
 *
 * Conserva la forma del objeto de `betaZodTool` (type, name, input_schema,
 * description, parse) y solo sustituye `run`. Si un día la forma cambiara y no
 * hubiera `run`, la herramienta pasa intacta en vez de romperse.
 */
// El genérico va sobre el ARRAY, no sobre el elemento: las herramientas de una
// corrida tienen firmas de `run` distintas entre sí, y un genérico por elemento
// obliga a TypeScript a unificarlas (apply_theme contra publish_blog_post) y
// falla el typecheck. Así el tipo entra y sale intacto.
export function instrumentTools<A extends readonly any[]>(tools: A, trace: RunTrace): A {
  const envueltas = (tools as readonly any[]).map((tool) => {
    if (typeof tool?.run !== "function") return tool;
    const nombre = String(tool.name ?? "sin_nombre");
    const original = tool.run.bind(tool);
    return {
      ...tool,
      run: async (...args: unknown[]) => {
        const t0 = Date.now();
        try {
          const r = await original(...args);
          trace.recordTool(nombre, Date.now() - t0, true);
          return r;
        } catch (err) {
          trace.recordTool(nombre, Date.now() - t0, false);
          throw err;
        }
      },
    };
  });
  return envueltas as unknown as A;
}

// Envía un error al monitoreo (si hay), sin lanzar nunca.
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  try {
    sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* nunca dejar que el monitoreo tumbe la petición */
  }
}
