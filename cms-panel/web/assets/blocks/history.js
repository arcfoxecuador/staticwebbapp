import { renderCanvas, renderSettings } from "./canvas.js";
import { doc, sel, setSel } from "./state.js";
import { $ } from "../core/dom.js";
import { announce } from "../core/ui.js";

// Historial deshacer/rehacer del editor de páginas: pila de instantáneas JSON de
// la página (sin _sha). histCommit() se dispara al final de cada renderCanvas
// (cambios estructurales) y con debounce al escribir texto in-situ. Ver histReset.
let histStack = [], histIndex = -1, histRestoring = false, histTimer = null;
const HIST_MAX = 80;

// ── Deshacer / rehacer ───────────────────────────────────────────────────────
// Instantánea del contenido de la página (sin _sha, que cambia al guardar y no
// es parte del contenido editable).
function histSnapshot() { return JSON.stringify({ title: doc.title, seo: doc.seo || null, blocks: doc.blocks }); }
// Reinicia el historial a la página actual como línea base (al abrir o al cargar
// una revisión/autoguardado). Sin esto, deshacer podría cruzar documentos.
export function histReset() {
  histStack = [histSnapshot()];
  histIndex = 0;
  clearTimeout(histTimer);
  histUpdateButtons();
}
// Registra el estado actual como un nuevo paso si difiere del tope. Descarta la
// rama de "rehacer" al ramificar. No corre durante una restauración (evita bucle).
export function histCommit() {
  // Solo con el lienzo de PÁGINAS activo. editEl es compartido (páginas y el hero
  // de carreras); en carreras no hay #gb-canvas, así que aquí no hace nada.
  if (histRestoring || !doc || !$("gb-canvas")) return;
  const snap = histSnapshot();
  if (histStack.length && snap === histStack[histIndex]) return;
  histStack = histStack.slice(0, histIndex + 1);
  histStack.push(snap);
  if (histStack.length > HIST_MAX) histStack.shift();
  histIndex = histStack.length - 1;
  histUpdateButtons();
}
// Al escribir texto in-situ agrupamos las pulsaciones en un solo paso (350ms).
export function histCommitDebounced() { clearTimeout(histTimer); histTimer = setTimeout(histCommit, 350); }
// Aplica la instantánea del índice actual al documento y re-dibuja. Conserva
// _sha (detección de conflictos) y acota la selección si el bloque ya no existe.
function histApply() {
  const s = JSON.parse(histStack[histIndex]);
  histRestoring = true;
  doc.title = s.title;
  doc.seo = s.seo || undefined;
  doc.blocks = s.blocks;
  if (sel != null && !doc.blocks[sel]) setSel(doc.blocks.length ? Math.min(sel, doc.blocks.length - 1) : null);
  renderCanvas(); renderSettings();
  histRestoring = false;
  histUpdateButtons();
}
export function histUndo() {
  histCommit(); // captura una edición de texto pendiente antes de retroceder
  if (histIndex <= 0) { announce("No hay nada que deshacer"); return; }
  histIndex--;
  histApply();
  announce("Cambio deshecho");
}
export function histRedo() {
  clearTimeout(histTimer);
  if (histIndex >= histStack.length - 1) { announce("No hay nada que rehacer"); return; }
  histIndex++;
  histApply();
  announce("Cambio rehecho");
}
function histUpdateButtons() {
  const u = $("vc-undo"), r = $("vc-redo");
  if (u) u.disabled = histIndex <= 0;
  if (r) r.disabled = histIndex >= histStack.length - 1;
}
