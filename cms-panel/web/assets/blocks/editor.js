import { renderCanvas } from "./canvas.js";
import { renderField } from "./fields.js";
import { histRedo, histReset, histUndo } from "./history.js";
import { save } from "./save.js";
import { doc, sel, setAltNudgeAck, setDoc, setSavedSnapshot, setSel, setSlug, slug } from "./state.js";
import { api } from "../core/api.js";
import { pageSnapshot } from "../core/dirty.js";
import { $, el, esc } from "../core/dom.js";
import { revisionsBox } from "../core/revisions.js";
import { FORMS, SITE, isAdmin } from "../core/state.js";
import { loadingScreen, notice, screen } from "../core/ui.js";
import { openMediaModal } from "../views/media.js";

// ── Páginas: editor de bloques (Gutenberg-like) ──────────────────────────────
export async function openEditor(s) {
  setSlug(s); setSel(null); setAltNudgeAck(-1);
  loadingScreen(FORMS.pages[s] || "Página");
  try {
  setDoc(await api(`/api/pages/${s}`));
  setSavedSnapshot(pageSnapshot());
    renderEditor();
    // Copia local sin guardar (autoguardado) → ofrecer restaurar.
    let stash = null;
    try { stash = JSON.parse(localStorage.getItem(`wp-autosave-page-${s}`) || "null"); } catch { /* corrupto */ }
    if (stash && stash.doc && JSON.stringify(stash.doc.blocks) !== JSON.stringify(doc.blocks)) {
      notice("ok", `Hay una copia local con cambios sin guardar (autoguardado ${new Date(stash.at).toLocaleString()}). <a data-as-restore>Restaurarla</a> · <a data-as-discard>Descartarla</a>`);
      const area = $("screen-notice");
      area.querySelector("[data-as-restore]").addEventListener("click", () => {
      setDoc({ ...stash.doc, _sha: doc._sha });
        renderEditor();
        notice("ok", "Copia local restaurada. Revisa y pulsa Actualizar para guardarla.");
      });
      area.querySelector("[data-as-discard]").addEventListener("click", () => {
        localStorage.removeItem(`wp-autosave-page-${s}`);
        area.innerHTML = "";
      });
    } else if (stash) {
      localStorage.removeItem(`wp-autosave-page-${s}`);
    }
  } catch (e) {
    screen("Páginas", "Páginas"); notice("err", esc(e.message));
  }
}

// Editor VISUAL: en vez de una lista de bloques + panel de campos, dibuja la
// página tal como se ve (colores reales del tema) y se edita in-situ. Los campos
// raros/avanzados viven en un cajón lateral bajo demanda ("Todos los ajustes").
function renderEditor() {
  const path = slug === "home" ? "/" : `/${slug}`;
  const wrap = screen(doc.title || FORMS.pages[slug], `Editar página <a class="page-title-action" href="#pages">← Todas las páginas</a>`);
  wrap.classList.add("wrap-wide");
  const shell = el("div", "vc-shell");
  const top = el("div", "vc-topbar");
  top.innerHTML = `
    <span class="vc-crumb">${esc(doc.title || FORMS.pages[slug])}${doc.hidden ? ` <b class="vc-oculta" title="No se publica: no aparece en el menú ni en buscadores">oculta</b>` : ""}<small>${esc(path)}</small></span>
    <span class="vc-undoredo">
      <button class="button" id="vc-undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" disabled>↶</button>
      <button class="button" id="vc-redo" title="Rehacer (Ctrl+Mayús+Z)" aria-label="Rehacer" disabled>↷</button>
    </span>
    <span class="vc-spacer"></span>
    <button class="button" id="vc-seo">SEO</button>
    <button class="button" id="vc-history">Historial</button>
    ${SITE ? `<a class="button" href="${esc(SITE + path)}" target="_blank" rel="noopener">Vista previa</a>` : ""}
    <button class="button button-primary gb-save">Actualizar</button>`;
  const layoutbar = el("div", "vc-layoutbar"); layoutbar.id = "vc-layoutbar"; layoutbar.style.display = "none";
  const canvas = el("div", "vc-device"); canvas.id = "gb-canvas";
  const hint = el("p", "vc-hint muted", `Haz clic en cualquier texto para editarlo. Pasa el cursor sobre una sección para moverla, duplicarla u ocultarla. Usa <b>+</b> para añadir una sección.<br><b>@becasEmail</b>, <b>@email</b>, <b>@aula</b> y <b>@video</b> son atajos: el sitio los cambia por el dato de ${isAdmin() ? `<a href="#settings">Ajustes del sitio</a>` : "<b>Ajustes del sitio</b>"} al publicar. Déjalos tal cual.`);
  shell.append(top, layoutbar, canvas, hint);
  wrap.appendChild(shell);
  ensureDrawer();
  top.querySelector(".gb-save").addEventListener("click", save);
  top.querySelector("#vc-seo").addEventListener("click", openSeo);
  top.querySelector("#vc-history").addEventListener("click", openHistory);
  top.querySelector("#vc-undo").addEventListener("click", histUndo);
  top.querySelector("#vc-redo").addEventListener("click", histRedo);
  // Línea base del historial = la página recién cargada (o restaurada).
  histReset();
  // Selección por defecto: la primera sección (muestra la barra de layout).
  setSel((sel != null && doc.blocks[sel]) ? sel : (doc.blocks.length ? 0 : null));
  renderCanvas();
}

// Cajón lateral (se crea una vez y se reutiliza). Aloja los campos avanzados de
// una sección y el historial de revisiones.
export function ensureDrawer() {
  if ($("vc-drawer")) return;
  const back = el("div", "vc-drawer-back"); back.id = "vc-drawer-back";
  const drawer = el("aside", "vc-drawer"); drawer.id = "vc-drawer";
  drawer.innerHTML = `<div class="vc-drawer-head"><strong id="vc-drawer-title">Ajustes</strong><button class="button" id="vc-drawer-close">✕</button></div><div class="vc-drawer-body" id="vc-drawer-body"></div>`;
  document.body.append(back, drawer);
  back.addEventListener("click", closeDrawer);
  drawer.querySelector("#vc-drawer-close").addEventListener("click", closeDrawer);
}
export function closeDrawer() {
  const d = $("vc-drawer"); if (!d) return;
  d.classList.remove("open"); $("vc-drawer-back").classList.remove("open");
}
// "Todos los ajustes" de una sección: reutiliza renderField (todos los campos,
// CTAs, texto alternativo, arrays…) — lo que no se edita directo en el lienzo.
export function openDrawer(i) {
  ensureDrawer();
  setSel(i);
  const b = doc.blocks[i];
  const spec = FORMS.schema[b._type];
  $("vc-drawer-title").textContent = "Ajustes: " + (spec ? spec.label : b._type);
  const body = $("vc-drawer-body"); body.innerHTML = "";
  if (spec && spec.fields.length) spec.fields.forEach((f) => body.appendChild(renderField(f, b)));
  else body.appendChild(el("p", "muted", "Esta sección no tiene campos editables."));
  $("vc-drawer").classList.add("open"); $("vc-drawer-back").classList.add("open");
}
function openHistory() {
  ensureDrawer();
  $("vc-drawer-title").textContent = "Revisiones";
  const body = $("vc-drawer-body"); body.innerHTML = "";
  body.appendChild(revisionsBox("page", slug, (loaded) => {
      setDoc({ ...loaded, _sha: doc._sha });
      setSel(null); closeDrawer(); renderEditor();
    notice("ok", "Revisión cargada. Revisa y pulsa Actualizar para restaurarla.");
  }));
  $("vc-drawer").classList.add("open"); $("vc-drawer-back").classList.add("open");
}

// SEO de la página: título y descripción para buscadores/redes + imagen para
// compartir. Los límites (title 70, description 200, ogImage 300) DEBEN coincidir
// con el Zod de la colección "pages" (astro-web) y con validatePageSeo del panel.
const SEO_MAX = { title: 70, description: 200, ogImage: 300 };
function openSeo() {
  ensureDrawer();
  // Lectura de valores iniciales sin mutar doc (abrir el panel no ensucia la
  // página): doc.seo solo se crea cuando se escribe algo, y se borra si queda vacío.
  const s = doc.seo || {};
  $("vc-drawer-title").textContent = "Ajustes de la página";
  const body = $("vc-drawer-body"); body.innerHTML = "";

  // ── Visibilidad ─────────────────────────────────────────────────────────
  // Una página oculta sigue respondiendo por su URL directa (para revisarla o
  // pasar el enlace al equipo), pero desaparece del menú, del pie, del sitemap
  // y de /llms.txt, y se sirve con noindex. Es el mismo criterio que "oculta"
  // en carreras y "borrador" en entradas: nada se borra, solo se despublica.
  const visBox = el("input"); visBox.type = "checkbox"; visBox.id = "vc-hidden";
  visBox.checked = doc.hidden === true;
  const vis = el("label", "ed-field ed-field-check");
  vis.append(visBox, el("span", null, "Página oculta (no se publica)"));
  const visHelp = el("p", "ed-field-help muted");
  const paintVis = () => {
    visHelp.textContent = visBox.checked
      ? "Oculta: sale del menú, del pie y de los buscadores. Sigue abriéndose por su enlace directo, así que puedes revisarla o compartirla con el equipo."
      : "Visible: aparece en el menú y en los buscadores, como cualquier otra página.";
  };
  paintVis();
  // Mutar doc basta: "cambios sin guardar" se calcula comparando el documento
  // con su última copia guardada (core/dirty.js).
  visBox.addEventListener("change", () => { doc.hidden = visBox.checked; paintVis(); });
  body.append(vis, visHelp);

  body.appendChild(el("p", "ed-field-label", "SEO"));
  body.appendChild(el("p", "muted",
    "Cómo se ve esta página en Google y al compartirla. Si dejas un campo vacío, se usa el valor por defecto de la página."));

  // Guarda un campo en doc.seo; borra la clave (y el objeto si queda vacío) si
  // el valor está en blanco, para que la página vuelva a su valor por defecto.
  const setField = (key, val) => {
    const v = (val || "").trim();
    if (v) { (doc.seo = doc.seo || {})[key] = v; }
    else if (doc.seo) { delete doc.seo[key]; if (!Object.keys(doc.seo).length) delete doc.seo; }
  };

  // Campo de texto con contador de caracteres (input o textarea).
  const textField = (key, label, help, multiline) => {
    const wrap = el("div", "ed-field");
    wrap.appendChild(el("label", "ed-field-label", esc(label)));
    if (help) wrap.appendChild(el("p", "ed-field-help muted", esc(help)));
    const input = multiline ? el("textarea") : el("input");
    if (!multiline) input.type = "text";
    input.maxLength = SEO_MAX[key];
    input.value = s[key] || "";
    input.setAttribute("aria-label", label);
    const count = el("span", "seo-count muted");
    const paint = () => { count.textContent = `${input.value.length}/${SEO_MAX[key]}`; };
    paint();
    input.addEventListener("input", () => { setField(key, input.value); paint(); });
    wrap.appendChild(input);
    wrap.appendChild(count);
    return wrap;
  };

  body.appendChild(textField("title", "Título SEO",
    "Aparece en la pestaña del navegador y como titular en Google. Ideal: 50–60 caracteres.", false));
  body.appendChild(textField("description", "Descripción",
    "El resumen bajo el título en los resultados de búsqueda. Ideal: 150–160 caracteres.", true));

  // Imagen para compartir (OG): input + galería + vista previa.
  const imgWrap = el("div", "ed-field");
  imgWrap.appendChild(el("label", "ed-field-label", "Imagen para compartir"));
  imgWrap.appendChild(el("p", "ed-field-help muted",
    "La imagen que se ve al compartir el enlace en WhatsApp, Facebook o X. Por defecto se usa la imagen general del sitio."));
  const imgRow = el("div", "seo-img-row");
  const imgInput = el("input"); imgInput.type = "text"; imgInput.placeholder = "/og-estudiantes.png";
  imgInput.maxLength = SEO_MAX.ogImage; imgInput.value = s.ogImage || "";
  imgInput.setAttribute("aria-label", "Ruta de la imagen para compartir");
  const prev = el("img", "seo-og-prev"); prev.alt = "";
  const paintPrev = () => {
    const val = (imgInput.value || "").trim();
    if (val) { prev.src = /^https?:/i.test(val) ? val : (SITE || "") + val; prev.style.display = ""; }
    else prev.style.display = "none";
  };
  paintPrev();
  imgInput.addEventListener("input", () => { setField("ogImage", imgInput.value); paintPrev(); });
  const pickBtn = el("button", "button", "Elegir de la galería");
  pickBtn.addEventListener("click", () => openMediaModal((path) => {
    imgInput.value = path; setField("ogImage", path); paintPrev();
  }));
  imgRow.append(imgInput, pickBtn);
  imgWrap.append(imgRow, prev);
  body.appendChild(imgWrap);

  const done = el("p", "muted", "Los cambios se guardan al pulsar <b>Actualizar</b>.");
  done.style.marginTop = "16px";
  body.appendChild(done);

  $("vc-drawer").classList.add("open"); $("vc-drawer-back").classList.add("open");
}

