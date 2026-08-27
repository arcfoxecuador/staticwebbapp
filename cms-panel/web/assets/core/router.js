import { closeDrawer, openEditor } from "../blocks/editor.js";
import { resetPageEditor } from "../blocks/state.js";
import { isDirty } from "./dirty.js";
import { el } from "./dom.js";
import { setMenu } from "./sidebar.js";
import { ADMIN_ONLY, isAdmin } from "./state.js";
import { confirmModal, screen } from "./ui.js";
import { showAgent } from "../views/agent.js";
import { showAppearance } from "../views/appearance.js";
import { showAutomation } from "../views/automation.js";
import { showBrand } from "../views/brand.js";
import { showCareerLabels } from "../views/career-labels.js";
import { openCareer, showCareers } from "../views/careers.js";
import { showCategories } from "../views/categories.js";
import { showDashboard } from "../views/dashboard.js";
import { showIntakes } from "../views/intakes.js";
import { showMedia } from "../views/media.js";
import { showPages } from "../views/pages-list.js";
import { openPost, resetPostEditor } from "../views/post-editor.js";
import { showPosts } from "../views/posts-list.js";
import { showReview } from "../views/review.js";
import { showSettings } from "../views/settings.js";
import { showTeam } from "../views/team.js";

// ── Router por hash (pantallas como en wp-admin) ─────────────────────────────
export let currentHash = null;

function parentView(h) {
  if (h === "categories") return "posts";
  if (h.startsWith("post/")) return "posts";
  if (h.startsWith("page/")) return "pages";
  if (h.startsWith("career/")) return "careers";
  return h || "dashboard";
}

export function render(h) {
  currentHash = h;
  // Sale de cualquier editor abierto (el guard de cambios ya pasó).
  resetPageEditor();
  resetPostEditor();
  if (typeof closeDrawer === "function") closeDrawer(); // cierra el cajón de ajustes al navegar
  setMenu(parentView(h));
  // Guard de rol: un editor que llega por URL a una pantalla de admin ve un aviso.
  if (ADMIN_ONLY.has(h) && !isAdmin()) {
    const wrap = screen("Solo administradores", "Solo administradores");
    wrap.appendChild(el("p", "muted", "Esta sección (apariencia, categorías) es solo para administradores. Si necesitas un cambio aquí, pídeselo a un administrador del sitio."));
    return;
  }
  if (h === "" || h === "dashboard") showDashboard();
  else if (h === "posts") showPosts();
  else if (h === "review") showReview();
  else if (h === "post/new") openPost(null);
  else if (h.startsWith("post/")) openPost(h.slice(5));
  else if (h === "categories") showCategories();
  else if (h === "media") showMedia();
  else if (h === "pages") showPages();
  else if (h.startsWith("page/")) openEditor(h.slice(5));
  else if (h === "careers") showCareers();
  else if (h.startsWith("career/")) openCareer(h.slice(7));
  else if (h === "appearance") showAppearance();
  else if (h === "settings") showSettings();
  else if (h === "intakes") showIntakes();
  else if (h === "career-labels") showCareerLabels();
  else if (h === "brand") showBrand();
  else if (h === "team") showTeam();
  else if (h === "automation") showAutomation();
  else if (h === "agent") showAgent();
  else showDashboard();
}

// Guard de navegación interna con cambios sin guardar. Como el modal es async y
// el hash YA cambió al dispararse el evento, se revierte de inmediato, se pregunta
// y, si confirma, se re-navega con una bandera que salta la comprobación (evita
// volver a preguntar en el segundo hashchange).
let navBypass = false;
window.addEventListener("hashchange", async () => {
  const h = location.hash.slice(1);
  if (h === currentHash) return;
  if (navBypass) { navBypass = false; render(h); return; }
  if (isDirty()) {
    history.replaceState(null, "", "#" + currentHash); // revierte la barra de direcciones
    const ok = await confirmModal({
      title: "Cambios sin guardar",
      message: "Los cambios que has realizado se perderán si sales sin guardarlos. ¿Salir de todas formas?",
      confirmLabel: "Salir sin guardar",
      danger: true,
    });
    if (!ok) return;
    navBypass = true;
    location.hash = h; // re-dispara hashchange; navBypass salta la comprobación
    return;
  }
  render(h);
});

export function go(h) {
  if (location.hash === "#" + h) render(h);
  else location.hash = h;
}

// Pantalla base: fija el título del documento y devuelve el contenedor .wrap.
// El editor de entradas actualiza el hash tras guardar una entrada nueva.
export function setCurrentHash(h) { currentHash = h; }

