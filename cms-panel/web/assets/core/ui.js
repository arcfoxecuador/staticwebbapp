import { $, el, esc } from "./dom.js";

// `meta` agrega las pestañas "Opciones de pantalla" / "Ayuda" (como wp-admin).
export function screen(title, headHtml, meta) {
  document.title = `${title} ‹ Panel IIDEA`;
  const wrap = el("div", "wrap");
  if (meta) wrap.appendChild(screenMeta(meta));
  if (headHtml) wrap.appendChild(el("h1", "wp-heading", headHtml));
  const noticeArea = el("div"); noticeArea.id = "screen-notice";
  wrap.appendChild(noticeArea);
  $("wp-content").innerHTML = "";
  $("wp-content").appendChild(wrap);
  return wrap;
}

// Pestañas superiores "Opciones de pantalla ▾ / Ayuda ▾" con sus paneles.
// meta = { screenOptions?: HTMLElement, help?: string(html) }
function screenMeta(meta) {
  const box = el("div");
  const links = el("div", "screen-meta-links");
  const panels = {};
  const mkTab = (key, label, content) => {
    const btn = el("button", "screen-meta-toggle", `${label}<span class="arrow">▼</span>`);
    const panel = el("div", "screen-meta-panel");
    if (typeof content === "string") panel.innerHTML = content; else panel.appendChild(content);
    panel.hidden = true;
    panels[key] = panel;
    btn.addEventListener("click", () => {
      const show = panel.hidden;
      Object.values(panels).forEach((p) => (p.hidden = true));
      panel.hidden = !show;
    });
    links.appendChild(btn);
    return panel;
  };
  const stack = [];
  if (meta.screenOptions) stack.push(mkTab("options", "Opciones de pantalla", meta.screenOptions));
  if (meta.help) stack.push(mkTab("help", "Ayuda", meta.help));
  box.appendChild(links);
  stack.forEach((p) => box.appendChild(p));
  return box;
}

// Anuncia un cambio a lectores de pantalla vía la región aria-live (#sr-live).
// Se limpia y re-escribe para forzar el anuncio aunque el texto se repita.
export function announce(msg) {
  const live = $("sr-live");
  if (!live) return;
  live.textContent = "";
  // Un microtiempo asegura que el lector detecte el cambio de contenido.
  setTimeout(() => { live.textContent = msg; }, 30);
}

let noticeTimer = null;
export function notice(type, html, opts = {}) {
  const area = $("screen-notice");
  if (!area) return;
  clearTimeout(noticeTimer);
  area.innerHTML = "";
  // Accesibilidad: los lectores de pantalla anuncian el aviso. Los errores de
  // forma asertiva (interrumpen); los éxitos, de forma cortés.
  area.setAttribute("aria-live", type === "err" ? "assertive" : "polite");
  const n = el("div", `notice ${type}`, html);
  n.setAttribute("role", type === "err" ? "alert" : "status");
  const dismiss = el("button", "notice-dismiss", "✕");
  dismiss.title = "Descartar este aviso";
  dismiss.setAttribute("aria-label", "Descartar este aviso");
  dismiss.addEventListener("click", () => { clearTimeout(noticeTimer); n.remove(); });
  n.appendChild(dismiss);
  area.appendChild(n);
  n.scrollIntoView({ block: "nearest" });
  // Los avisos de ÉXITO se descartan solos a los ~6s. Excepciones que permanecen:
  // errores, avisos con acciones/enlaces (para poder pulsarlos), estado de
  // publicación en vivo, o cuando se pide sticky explícitamente.
  const interactive = /<a[\s>]|data-as-|data-reload|id="publish-status"/.test(html);
  if (type === "ok" && !opts.sticky && !interactive) {
    noticeTimer = setTimeout(() => { n.classList.add("notice-fade"); setTimeout(() => n.remove(), 300); }, 6000);
  }
}
export function loadingScreen(title) {
  const wrap = screen(title, esc(title));
  wrap.appendChild(el("p", "muted", "<span class='spinner'></span>Cargando…"));
  return wrap;
}

// Confirmación con estilo (reemplaza el confirm() nativo). Devuelve Promise<bool>.
// Accesible: role="dialog", foco al botón principal, trampa de foco entre los dos
// botones, Esc/clic-fuera = cancelar, Enter = confirmar. `danger` pinta el botón
// principal en rojo (acciones destructivas). Texto vía textContent (sin HTML).
export function confirmModal(opts = {}) {
  const { title = "Confirmar", message = "", confirmLabel = "Aceptar", cancelLabel = "Cancelar", danger = false } = opts;
  return new Promise((resolve) => {
    const back = el("div", "cm-back");
    const box = el("div", "cm-box");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "cm-title");
    const h = el("h2", "cm-title"); h.id = "cm-title"; h.textContent = title;
    const p = el("p", "cm-msg"); p.textContent = message;
    const actions = el("div", "cm-actions");
    const cancelBtn = el("button", "button"); cancelBtn.textContent = cancelLabel;
    const okBtn = el("button", "button " + (danger ? "button-danger" : "button-primary")); okBtn.textContent = confirmLabel;
    actions.append(cancelBtn, okBtn);
    box.append(h, p, actions);
    back.appendChild(box);
    const prevFocus = document.activeElement;
    const close = (val) => {
      document.removeEventListener("keydown", onKey, true);
      back.remove();
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch { /* nodo removido */ }
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      else if (e.key === "Enter") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === okBtn ? cancelBtn : okBtn).focus(); }
    };
    okBtn.addEventListener("click", () => close(true));
    cancelBtn.addEventListener("click", () => close(false));
    back.addEventListener("click", (e) => { if (e.target === back) close(false); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(back);
    okBtn.focus();
  });
}

