import { $, el, esc } from "./dom.js";

// ── Chuleta de atajos de teclado (tecla "?") ─────────────────────────────────
const IS_MAC = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
const MOD = IS_MAC ? "⌘" : "Ctrl";
export function openShortcuts() {
  if ($("sc-back")) return;
  const back = el("div", "sc-back"); back.id = "sc-back";
  back.setAttribute("role", "dialog"); back.setAttribute("aria-modal", "true"); back.setAttribute("aria-label", "Atajos de teclado");
  const box = el("div", "sc-box");
  const ROWS = [
    ["Buscar o ir a una pantalla", [MOD, "K"]],
    ["Guardar la página o entrada", [MOD, "S"]],
    ["Deshacer", [MOD, "Z"]],
    ["Rehacer", [MOD, "Shift", "Z"]],
    ["Mover el bloque seleccionado", ["Alt", "↑ / ↓"]],
    ["Ver estos atajos", ["?"]],
    ["Cerrar diálogos y menús", ["Esc"]],
  ];
  const kbd = (keys) => keys.map((k) => `<kbd>${esc(k)}</kbd>`).join('<span class="sc-plus">+</span>');
  box.innerHTML = `<div class="sc-head"><h2>Atajos de teclado</h2><button class="button" id="sc-close">Cerrar</button></div>
    <table class="sc-table"><tbody>${ROWS.map(([label, keys]) => `<tr><td>${esc(label)}</td><td class="sc-keys">${kbd(keys)}</td></tr>`).join("")}</tbody></table>
    <p class="muted sc-foot">La mayoría de atajos funcionan dentro de los editores. Pulsa <kbd>?</kbd> en cualquier momento para volver a ver esta lista.</p>`;
  back.appendChild(box);
  document.body.appendChild(back);
  const closeFn = () => { document.removeEventListener("keydown", onKey, true); back.remove(); };
  const onKey = (ev) => { if (ev.key === "Escape") { ev.preventDefault(); closeFn(); } };
  $("sc-close").addEventListener("click", closeFn);
  back.addEventListener("click", (ev) => { if (ev.target === back) closeFn(); });
  document.addEventListener("keydown", onKey, true);
  $("sc-close").focus();
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
  const el0 = document.activeElement;
  const typing = el0 && (/^(INPUT|TEXTAREA|SELECT)$/.test(el0.tagName) || el0.isContentEditable);
  if (typing || $("sc-back")) return; // no interrumpir la escritura ni reabrir
  e.preventDefault();
  openShortcuts();
});
