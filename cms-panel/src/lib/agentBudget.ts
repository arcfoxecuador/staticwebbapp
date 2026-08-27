// ─────────────────────────────────────────────────────────────────────────────
// Límite de uso y telemetría del Asistente IA.
//
// Cada corrida del agente gasta tokens de Claude (Opus 4.8 por defecto). Sin
// freno, un usuario autenticado —o un bucle de reintentos del cliente— puede
// disparar el costo. Este módulo:
//   1. Limita las peticiones por usuario y globales (ventana deslizante de 1h).
//   2. Corta si se supera un techo mensual de tokens (configurable).
//   3. Registra el consumo (tokens/costo estimado) para mostrarlo en el panel.
//
// Todo vive EN MEMORIA (coherente con el resto del panel): es una barrera de
// costo, no contabilidad contable, y se reinicia al reiniciar el proceso. Para
// varias instancias o persistencia, mover a Redis (ver plan de mejoras).
// ─────────────────────────────────────────────────────────────────────────────

import { config } from "../config.js";

const HOUR_MS = 60 * 60 * 1000;

// Marcas de tiempo de peticiones (ventana deslizante de 1h) para el rate limit.
const globalHits: number[] = [];
const userHits = new Map<string, number[]>();

// Acumulado del mes en curso (input/output). Se reinicia al cambiar de mes.
let monthKey = monthKeyNow();
let monthIn = 0;
let monthOut = 0;
const monthByUser = new Map<string, { in: number; out: number }>();

// Gasto de FONDO (automatización del blog) e imágenes generadas. Van APARTE del
// contador de arriba a propósito: ese es el que corta a los editores cuando se
// alcanza el presupuesto mensual, y el blog semanal los dejaría sin asistente.
// Aquí solo se mide, no se gatea. Antes no se medía en ningún sitio: el único
// componente que gasta solo era invisible en el único tablero de costo.
let bgIn = 0;
let bgOut = 0;
let bgRuns = 0;
let imageCount = 0;

// Bitácora de las últimas corridas (para el widget del escritorio).
interface RunRecord {
  email: string;
  kind: string;
  inTok: number;
  outTok: number;
  at: number;
}
const recentRuns: RunRecord[] = [];
const MAX_RECENT = 200;

function monthKeyNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function rollMonth(): void {
  const k = monthKeyNow();
  if (k !== monthKey) {
    monthKey = k;
    monthIn = 0;
    monthOut = 0;
    monthByUser.clear();
    bgIn = 0;
    bgOut = 0;
    bgRuns = 0;
    imageCount = 0;
  }
}
function prune(arr: number[], now: number): void {
  const cutoff = now - HOUR_MS;
  while (arr.length && arr[0] < cutoff) arr.shift();
}

export interface Gate {
  ok: boolean;
  status?: number;
  reason?: string;
}

// ¿Puede este usuario correr el agente ahora? (rate limit + presupuesto).
export function checkAgentAllowed(email: string): Gate {
  rollMonth();
  const now = Date.now();
  const key = email || "anon";
  const { ratePerHour, rateGlobalPerHour, monthlyTokenBudget } = config.agent;

  prune(globalHits, now);
  const hits = userHits.get(key) ?? [];
  prune(hits, now);
  userHits.set(key, hits);

  if (ratePerHour > 0 && hits.length >= ratePerHour) {
    return {
      ok: false,
      status: 429,
      reason: `Alcanzaste el límite de ${ratePerHour} peticiones al asistente por hora. Vuelve a intentar más tarde.`,
    };
  }
  if (rateGlobalPerHour > 0 && globalHits.length >= rateGlobalPerHour) {
    return {
      ok: false,
      status: 429,
      reason: "El asistente está recibiendo muchas peticiones ahora mismo. Intenta de nuevo en unos minutos.",
    };
  }
  if (monthlyTokenBudget > 0 && monthIn + monthOut >= monthlyTokenBudget) {
    return {
      ok: false,
      status: 429,
      reason: "Se alcanzó el presupuesto mensual de uso del asistente. Escríbele al administrador para ampliarlo.",
    };
  }
  return { ok: true };
}

// Reserva un turno en la ventana (llamar tras pasar checkAgentAllowed y antes de
// correr, para que peticiones concurrentes también cuenten).
export function reserveAgentSlot(email: string): void {
  const now = Date.now();
  const key = email || "anon";
  globalHits.push(now);
  const hits = userHits.get(key) ?? [];
  hits.push(now);
  userHits.set(key, hits);
}

// Registra el consumo real de una corrida (tokens de todos los turnos).
export function recordAgentRun(email: string, kind: string, inTok: number, outTok: number): void {
  rollMonth();
  const key = email || "anon";
  monthIn += inTok;
  monthOut += outTok;
  const u = monthByUser.get(key) ?? { in: 0, out: 0 };
  u.in += inTok;
  u.out += outTok;
  monthByUser.set(key, u);
  recentRuns.push({ email: key, kind, inTok, outTok, at: Date.now() });
  if (recentRuns.length > MAX_RECENT) recentRuns.shift();
}

// Gasto de la automatización del blog. NO alimenta checkAgentAllowed: agotar
// con el blog el presupuesto que gatea a las personas sería el efecto contrario
// al buscado. Solo se muestra, para que el costo real deje de ser invisible.
export function recordBackgroundRun(inTok: number, outTok: number): void {
  rollMonth();
  bgIn += inTok;
  bgOut += outTok;
  bgRuns += 1;
}

// Una imagen generada por IA (asistente o automatización). Se cuenta por
// unidades: el precio no va por tokens y depende del proveedor.
export function recordImageGenerated(): void {
  rollMonth();
  imageCount += 1;
}

function estCostUsd(inTok: number, outTok: number): number | null {
  const { usdPerMInput, usdPerMOutput } = config.agent;
  if (!usdPerMInput && !usdPerMOutput) return null;
  return +((inTok / 1e6) * usdPerMInput + (outTok / 1e6) * usdPerMOutput).toFixed(2);
}

// Resumen para el escritorio del panel.
export function agentUsageStats() {
  rollMonth();
  return {
    month: monthKey,
    tokens: { input: monthIn, output: monthOut, total: monthIn + monthOut },
    budget: config.agent.monthlyTokenBudget,
    estCostUsd: estCostUsd(monthIn, monthOut),
    // Gasto de fondo, contabilizado aparte del que gatea a los editores.
    automation: {
      runs: bgRuns,
      tokens: { input: bgIn, output: bgOut, total: bgIn + bgOut },
      estCostUsd: estCostUsd(bgIn, bgOut),
    },
    images: { generated: imageCount },
    limits: { ratePerHour: config.agent.ratePerHour, rateGlobalPerHour: config.agent.rateGlobalPerHour },
    byUser: [...monthByUser.entries()]
      .map(([email, t]) => ({ email, tokens: t.in + t.out }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 20),
    recent: recentRuns
      .slice(-15)
      .reverse()
      .map((r) => ({ email: r.email, kind: r.kind, tokens: r.inTok + r.outTok, at: r.at })),
  };
}
