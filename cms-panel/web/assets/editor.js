// Administración estilo WordPress del Panel IIDEA.
// Shell: barra de administración + menú lateral + rutas por hash (#entradas,
// #pages, #post/<slug>…), como las pantallas de wp-admin.
// Backend: /api/forms, /api/pages, /api/posts, /api/media, /api/theme,
// /api/careers, /api/agent (SSE), /api/promote.
//
// Punto de entrada (ES module). El panel se sirve sin empaquetador: el navegador
// resuelve estos imports tal cual (ver ADR-2 en DECISIONES.md). Aquí solo queda
// el ARRANQUE; cada pantalla vive en su propio módulo bajo core/, views/ y blocks/.

import { renderCanvas, renderSettings } from "./blocks/canvas.js";
import { histRedo, histUndo } from "./blocks/history.js";
import { duplicateBlock, moveBlock, removeBlock } from "./blocks/ops.js";
import { doc, sel, setSel } from "./blocks/state.js";
import { $, ICONS } from "./core/dom.js";
import { openCommandPalette } from "./core/palette.js";
import { render } from "./core/router.js";
import { buildMenu, refreshReviewBadge } from "./core/sidebar.js";
import { SITE, setForms, setSession } from "./core/state.js";
import "./core/shortcuts.js"; // registra sus listeners

$("ab-new-ico").innerHTML = ICONS.plus;

// Cargamos "quién soy" y los formularios JUNTOS para conocer el ROL antes de
// construir el menú (así los editores no ven fugazmente opciones de admin).
Promise.all([
  fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
  fetch("/api/forms").then((r) => (r.ok ? r.json() : Promise.reject())),
])
  .then(([u, data]) => {
    if (u) {
      setSession(u);

      const name = (u.name && u.name !== u.email ? u.name : u.email.split("@")[0]);
      $("ab-user").textContent = name;
      $("ab-avatar").textContent = name.slice(0, 2).toUpperCase();
    }
    setForms(data);

    if (SITE) { $("ab-site").href = SITE; $("ab-visit").href = SITE; }
    else { $("ab-site").removeAttribute("target"); }
    buildMenu();
    render(location.hash.slice(1));
    refreshReviewBadge();
  })
  .catch(() => {
    $("wp-content").innerHTML = "<div class='notice err'>No se pudo cargar la administración. Recarga la página.</div>";
  });

// Botón "Buscar" de la barra de administración → abre la paleta de comandos.
$("ab-search")?.addEventListener("click", openCommandPalette);

// Plegado del menú, como el "Cerrar menú" de WP (persistido por usuario).
if (localStorage.getItem("wp-folded") === "1") document.body.classList.add("folded");
$("collapse-menu").addEventListener("click", () => {
  const folded = document.body.classList.toggle("folded");
  localStorage.setItem("wp-folded", folded ? "1" : "0");
});

// Atajos del editor de bloques (solo con el lienzo visible y sin foco en campos).
document.addEventListener("keydown", (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
  if (!$("gb-canvas") || sel == null || !doc || !doc.blocks[sel]) return;
  if (e.key === "Escape") { setSel(null); renderCanvas(); renderSettings(); }
  else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); duplicateBlock(sel); }
  else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeBlock(sel); }
  // Reordenar con el teclado: Alt+↑ / Alt+↓ mueve la sección seleccionada
  // (alternativa accesible al arrastrar, que anuncia la nueva posición).
  else if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); moveBlock(sel, -1); }
  else if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); moveBlock(sel, 1); }
});

// Ctrl/Cmd+S = "Actualizar" en CUALQUIER editor con botón .gb-save (páginas y
// carreras). Funciona también desde un campo; se ignora si ya se está guardando.
document.addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey) || (e.key || "").toLowerCase() !== "s") return;
  const b = document.querySelector(".gb-save");
  if (!b) return;
  e.preventDefault();
  if (!b.disabled) b.click();
});

// Deshacer / rehacer: solo en el editor de páginas (lienzo). No aplica a carreras
// (formulario) ni a otras pantallas.
document.addEventListener("keydown", (e) => {
  if (!$("gb-canvas") || !doc) return;
  if (!(e.metaKey || e.ctrlKey)) return;
  const tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  const k = (e.key || "").toLowerCase();
  if (k === "z" && !e.shiftKey) { e.preventDefault(); histUndo(); }
  else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); histRedo(); }
});

