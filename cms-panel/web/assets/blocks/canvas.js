import { openDrawer } from "./editor.js";
import { histCommit, histCommitDebounced } from "./history.js";
import { duplicateBlock, moveBlock, moveBlockTo, openPicker, removeBlock, toggleBlock } from "./ops.js";
import { paintAccountability, paintCtaBanner, paintFaq, paintFeatureGrid, paintGeneric, paintHero, paintLead, paintRichContent, paintStats, paintSteps } from "./paint.js";
import { doc, dragFrom, sel, setDragFrom, setSel } from "./state.js";
import { $, el, esc } from "../core/dom.js";
import { FORMS, SITE } from "../core/state.js";
import { openMediaModal } from "../views/media.js";

// ── Helpers del lienzo visual ────────────────────────────────────────────────
export function fieldExists(b, name) { const s = FORMS.schema[b._type]; return !!(s && s.fields.some((f) => f.name === name)); }
export function fieldSpec(b, name) { const s = FORMS.schema[b._type]; return s && s.fields.find((f) => f.name === name); }
export function nOr(v, d) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; }
export function pickBg(b) {
  const v = b.background ?? b.variant;
  if (v === "dark") return "b-dark";
  if (v === "brand") return "b-brand";
  return "b-light";
}

// Índice del bloque que se está arrastrando (null = ninguno).

export function clearDragMarks() {
  setDragFrom(null);
  document.querySelectorAll(".vc-block").forEach((r) => r.classList.remove("dragging", "drop-before", "drop-after"));
}
function inserter(at) {
  const ins = el("div", "vc-ins");
  const b = el("button", null, "+"); b.title = "Añadir sección aquí"; b.setAttribute("aria-label", "Añadir sección aquí");
  b.addEventListener("click", (e) => { e.stopPropagation(); openPicker(at); });
  ins.appendChild(b);
  return ins;
}

// Editable in-situ: escribe de vuelta en obj[key]. rich = conserva HTML (negrita).
export function editEl(obj, key, cls, opts = {}) {
  const e = el("span", cls || "");
  e.dataset.edit = "1";
  if (opts.rich) e.innerHTML = obj[key] ?? ""; else e.textContent = obj[key] ?? "";
  if (opts.pre) e.style.whiteSpace = "pre-wrap";
  if (opts.ph) e.dataset.ph = opts.ph;
  e.contentEditable = "true"; e.spellcheck = false;
  // Accesibilidad: campo de texto editable con nombre accesible.
  e.setAttribute("role", "textbox");
  if (opts.multiline) e.setAttribute("aria-multiline", "true");
  e.setAttribute("aria-label", opts.ph || opts.label || key);
  e.addEventListener("input", () => { obj[key] = opts.rich ? e.innerHTML : e.innerText; histCommitDebounced(); });
  e.addEventListener("click", (ev) => ev.stopPropagation());
  if (!opts.multiline) e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") ev.preventDefault(); });
  return e;
}
export function heading(b, name) { return editEl(b, name, "b-h", { pre: true, multiline: true, ph: "Título" }); }

// Ranura de imagen: muestra la imagen del sitio (si hay SITE) o un placeholder;
// clic abre la biblioteca de medios.
// warnAlt: avisar si la imagen no tiene texto alternativo. Se activa en las
// imágenes de bloque (que SÍ tienen campo alt) y se desactiva en ítems de
// tarjeta (algunos —avatares— no tienen alt, avisar ahí sería un falso positivo).
export function imageSlot(b, key, warnAlt = true) {
  const slot = el("div", "b-imgslot");
  const v = b[key];
  const src = v && v.startsWith("/") && SITE ? SITE + v : v;
  if (src) {
    const img = el("img"); img.src = src; img.alt = ""; img.loading = "lazy"; slot.appendChild(img);
    // Nudge de accesibilidad/SEO: imagen puesta pero sin texto alternativo.
    if (warnAlt && !altTextOf(b).trim()) slot.appendChild(altWarn());
  } else {
    slot.innerHTML = `<div class="b-img-ph"><span class="ic">🖼️</span><span>${esc(b.imageAlt || b.imgAlt || b.alt || "Sin imagen")}</span></div>`;
  }
  const btn = el("button", "b-img-edit", src ? "Cambiar imagen" : "Añadir imagen");
  btn.addEventListener("click", (ev) => { ev.stopPropagation(); openMediaModal((p) => { b[key] = p; renderCanvas(); }); });
  slot.appendChild(btn);
  return slot;
}
// Texto alternativo de un objeto con imagen (bloque: imageAlt · entrada: imgAlt ·
// pieza de contenido libre: alt).
export function altTextOf(b) { return String(b.imageAlt ?? b.imgAlt ?? b.alt ?? ""); }
export function altWarn() {
  const w = el("div", "b-alt-warn", "⚠ Sin texto alternativo");
  w.title = "Añade un texto alternativo para accesibilidad y SEO. Edítalo en ⚙ Todos los ajustes.";
  return w;
}
// Cabecera de sección (eyebrow + título + descripción) editable.
export function secHead(b) {
  const head = el("div", "b-sec-head" + (b.align === "center" ? " center" : ""));
  if (fieldExists(b, "eyebrow") && b.eyebrow != null) head.appendChild(editEl(b, "eyebrow", "b-eyebrow", { ph: "Etiqueta" }));
  const hn = fieldExists(b, "heading") ? "heading" : fieldExists(b, "title") ? "title" : null;
  if (hn && b[hn] != null) head.appendChild(heading(b, hn));
  if (fieldExists(b, "description") && b.description != null) head.appendChild(editEl(b, "description", "b-sub", { rich: true, multiline: true }));
  return head.childNodes.length ? head : null;
}
// ── Ítems de una lista, editables en el lienzo (agregar / quitar / reordenar) ──
// Ítem en blanco a partir del sub-esquema del campo array (para "＋ Agregar").
function defaultItem(field) {
  const it = {};
  ((field && field.item) || []).forEach((sf) => {
    if (sf.type === "array" || sf.type === "tags") it[sf.name] = [];
    else if (sf.type === "checkbox") it[sf.name] = false;
    else if (sf.type === "cta") it[sf.name] = { label: "", href: "" };
    else if (sf.type === "select") it[sf.name] = sf.options ? (/^\d+$/.test(sf.options[0]) ? Number(sf.options[0]) : sf.options[0]) : "";
    else it[sf.name] = "";
  });
  return it;
}
// Barra flotante de un ítem: subir · bajar · eliminar.
export function itemTools(arr, idx) {
  const t = el("div", "b-item-tools");
  const mk = (lbl, title, fn) => { const b = el("button", null, lbl); b.title = title; b.setAttribute("aria-label", title); b.addEventListener("click", (e) => { e.stopPropagation(); fn(); }); return b; };
  t.append(
    mk("↑", "Subir", () => { if (idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; renderCanvas(); } }),
    mk("↓", "Bajar", () => { if (idx < arr.length - 1) { [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]; renderCanvas(); } }),
    mk("✕", "Eliminar", () => { arr.splice(idx, 1); renderCanvas(); }),
  );
  return t;
}
// "＋ Agregar …" para una lista (tarjeta/paso/métrica/pregunta): siembra un ítem
// en blanco (con placeholders) usando el addLabel del esquema.
export function addTile(block, fieldName) {
  const field = fieldSpec(block, fieldName);
  const btn = el("button", "b-add", "＋ " + ((field && field.addLabel) || "Agregar"));
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!Array.isArray(block[fieldName])) block[fieldName] = [];
    block[fieldName].push(defaultItem(field));
    renderCanvas();
  });
  return btn;
}
// Botón editable con ✕ para quitarlo.
function btnChip(arr, idx) {
  const wrap = el("span", "b-btnwrap");
  wrap.appendChild(editEl(arr[idx], "label", "b-cta", { ph: "Botón" }));
  const x = el("button", "b-item-x", "✕"); x.title = "Quitar botón"; x.setAttribute("aria-label", "Quitar botón");
  x.addEventListener("click", (e) => { e.stopPropagation(); arr.splice(idx, 1); renderCanvas(); });
  wrap.appendChild(x);
  return wrap;
}
// Fila de botones de una lista {label,href}: editables + quitar + "＋".
export function buttonGroup(block, fieldName, cls) {
  const field = fieldSpec(block, fieldName);
  if (!Array.isArray(block[fieldName])) block[fieldName] = [];
  const arr = block[fieldName];
  const row = el("div", cls || "b-actions");
  arr.forEach((_, idx) => row.appendChild(btnChip(arr, idx)));
  const add = el("button", "b-add-inline", "＋ " + ((field && field.addLabel) || "Botón"));
  add.addEventListener("click", (e) => { e.stopPropagation(); arr.push({ label: "Nuevo botón", href: "#" }); renderCanvas(); });
  row.appendChild(add);
  return row;
}
// CTA único opcional (primaryCta/secondaryCta): editable + quitar, o "＋ añadir".
export function singleCta(block, fieldName, cls, addLabel) {
  if (!fieldExists(block, fieldName)) return null;
  if (block[fieldName]) {
    const wrap = el("span", "b-btnwrap");
    wrap.appendChild(editEl(block[fieldName], "label", "b-cta " + cls, { ph: "Botón" }));
    const x = el("button", "b-item-x", "✕"); x.title = "Quitar botón"; x.setAttribute("aria-label", "Quitar botón");
    x.addEventListener("click", (e) => { e.stopPropagation(); delete block[fieldName]; renderCanvas(); });
    wrap.appendChild(x);
    return wrap;
  }
  const add = el("button", "b-add-inline", "＋ " + addLabel);
  add.addEventListener("click", (e) => { e.stopPropagation(); block[fieldName] = { label: "Botón", href: "#" }; renderCanvas(); });
  return add;
}
// Array → rejilla de tarjetas (o fila de botones), cada ítem con quitar/reordenar
// y un "＋ Agregar" al final. Muestra la rejilla aunque esté vacía (para añadir).
export function cardGridOrButtons(b, f) {
  const sub = f.item || [];
  if (!sub.length) return el("span");
  if (!Array.isArray(b[f.name])) b[f.name] = [];
  const items = b[f.name];
  const isButtons = sub.every((sf) => sf.name === "label" || sf.name === "href");
  if (isButtons) return buttonGroup(b, f.name, "b-actions");
  const grid = el("div", "b-cards");
  grid.style.gridTemplateColumns = `repeat(${nOr(b.columns, Math.min(items.length || 1, 3))},1fr)`;
  const imgF = sub.find((sf) => sf.type === "image");
  const tF = sub.find((sf) => ["title", "heading", "question", "name", "value", "label"].includes(sf.name));
  items.forEach((it, idx) => {
    const card = el("div", "b-card b-item");
    if (imgF) card.appendChild(imageSlot(it, imgF.name, false));
    if (tF) card.appendChild(editEl(it, tF.name, "t", { ph: tF.label || "Título" }));
    sub.forEach((sf) => {
      if (sf === tF || sf === imgF) return;
      if (sf.type === "text" || sf.type === "textarea")
        card.appendChild(editEl(it, sf.name, "d", { rich: sf.type === "textarea", multiline: true, ph: sf.label }));
    });
    card.appendChild(itemTools(items, idx));
    grid.appendChild(card);
  });
  grid.appendChild(addTile(b, f.name));
  return grid;
}

function paint(b) {
  switch (b._type) {
    case "hero": return paintHero(b);
    case "richContent": return paintRichContent(b);
    case "stats": return paintStats(b);
    case "stepsProcess": return paintSteps(b);
    case "featureGrid": return paintFeatureGrid(b);
    case "faq": return paintFaq(b);
    case "leadForm": return paintLead(b);
    case "ctaBanner": return paintCtaBanner(b);
    case "accountabilityTabs": return paintAccountability(b);
    default: return paintGeneric(b);
  }
}

// Barra contextual de layout: solo los controles que aplican al bloque activo.
function renderLayoutBar() {
  const bar = $("vc-layoutbar"); if (!bar) return;
  if (sel == null || !doc.blocks[sel]) { bar.style.display = "none"; return; }
  const b = doc.blocks[sel]; bar.style.display = "flex"; bar.innerHTML = "";
  const spec = FORMS.schema[b._type];
  bar.appendChild(el("span", "lb-title", esc(spec ? spec.label : b._type)));
  const group = (label, ctrl) => { const g = el("div", "vc-group"); g.append(el("span", null, label), ctrl); return g; };
  // El hero combina imagen (lado) + alineación en UN control claro: la imagen va
  // a un lado, o de fondo (que además centra el texto). Evita el "¿por qué al
  // centrar desaparece la imagen?" de tener dos controles separados.
  const heroLayout = b._type === "hero" && fieldExists(b, "imageSide") && fieldExists(b, "align");
  if (heroLayout) {
    const seg = el("div", "vc-seg");
    const current = b.align === "center" ? "bg" : b.imageSide === "left" ? "left" : "right";
    [["right", "▨ Imagen dcha."], ["left", "◨ Imagen izq."], ["bg", "🖼 Imagen de fondo"]].forEach(([v, t]) => {
      const x = el("button", current === v ? "on" : "", t);
      x.onclick = () => { if (v === "bg") { b.align = "center"; } else { b.align = "left"; b.imageSide = v; } renderCanvas(); };
      seg.appendChild(x);
    });
    bar.appendChild(group("Disposición", seg));
  } else {
    if (fieldExists(b, "imageSide")) {
      const seg = el("div", "vc-seg");
      const l = el("button", b.imageSide === "left" ? "on" : "", "◧ Izq."); l.onclick = () => { b.imageSide = "left"; renderCanvas(); };
      const r = el("button", b.imageSide !== "left" ? "on" : "", "Der. ◨"); r.onclick = () => { b.imageSide = "right"; renderCanvas(); };
      seg.append(l, r); bar.appendChild(group("Imagen", seg));
    }
    if (fieldExists(b, "align")) {
      const seg = el("div", "vc-seg");
      [["left", "⯇ Izq."], ["center", "Centro"]].forEach(([v, t]) => { const x = el("button", b.align === v ? "on" : "", t); x.onclick = () => { b.align = v; renderCanvas(); }; seg.appendChild(x); });
      bar.appendChild(group("Alineación", seg));
    }
  }
  const bgF = fieldSpec(b, "background") || fieldSpec(b, "variant");
  if (bgF) {
    const seg = el("div", "vc-seg");
    (bgF.options || ["brand", "dark", "light"]).forEach((v) => { const lbl = { brand: "Marca", dark: "Oscuro", light: "Claro", tint: "Suave" }[v] || v; const x = el("button", b[bgF.name] === v ? "on" : "", lbl); x.onclick = () => { b[bgF.name] = v; renderCanvas(); }; seg.appendChild(x); });
    bar.appendChild(group("Fondo", seg));
  }
  if (fieldExists(b, "columns")) {
    const box = el("div", "vc-step");
    const dec = el("button", null, "−"); const val = el("span", null, String(nOr(b.columns, 3))); const inc = el("button", null, "+");
    dec.onclick = () => { b.columns = Math.max(2, nOr(b.columns, 3) - 1); renderCanvas(); };
    inc.onclick = () => { b.columns = Math.min(6, nOr(b.columns, 3) + 1); renderCanvas(); };
    box.append(dec, val, inc); bar.appendChild(group("Columnas", box));
  }
  const adv = el("button", "button vc-adv-btn", "⚙ Todos los ajustes"); adv.onclick = () => openDrawer(sel); bar.appendChild(adv);
}

export function renderCanvas() {
  const host = $("gb-canvas");
  if (!host) return;
  host.innerHTML = "";
  host.appendChild(inserter(0));
  doc.blocks.forEach((b, i) => {
    const spec = FORMS.schema[b._type];
    const label = spec ? spec.label : b._type;
    const block = el("div", "vc-block" + (i === sel ? " sel" : "") + (b.hidden ? " is-hidden" : ""));
    block.dataset.i = i;
    block.appendChild(el("div", "vc-outline"));
    const chip = el("div", "vc-chip", `<span class="vc-drag" draggable="true" title="Arrastra para reordenar" aria-label="Reordenar: ${esc(label)}">⠿</span>${esc(label)}`);
    block.appendChild(chip);
    if (b.hidden) block.appendChild(el("div", "vc-hidden-tag", "Oculto"));
    const tools = el("div", "vc-tools");
    const tb = (lbl, title, fn, cls = "") => { const x = el("button", cls, lbl); x.title = title; x.setAttribute("aria-label", title); x.addEventListener("click", (e) => { e.stopPropagation(); fn(); }); return x; };
    tools.append(
      tb("↑", "Subir", () => moveBlock(i, -1)),
      tb("↓", "Bajar", () => moveBlock(i, 1)),
      tb("⧉", "Duplicar", () => duplicateBlock(i)),
      tb(b.hidden ? "🙈" : "👁", b.hidden ? "Mostrar" : "Ocultar", () => toggleBlock(i)),
      tb("⚙", "Todos los ajustes", () => openDrawer(i)),
      tb("🗑", "Eliminar", () => removeBlock(i), "danger"),
    );
    block.appendChild(tools);
    let body;
    try { body = paint(b); }
    catch (err) { body = el("div", "b b-light", `<p class="muted">No se pudo previsualizar esta sección (${esc(b._type)}). Usa <b>⚙ Todos los ajustes</b> para editarla.</p>`); }
    block.appendChild(body);
    block.addEventListener("click", () => { setSel(i); renderCanvas(); });
    // Reordenar arrastrando desde el asa del chip; ↑/↓ quedan como alternativa.
    const handle = chip.querySelector(".vc-drag");
    handle.addEventListener("click", (e) => e.stopPropagation());
    handle.addEventListener("dragstart", (e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); block.classList.add("dragging"); });
    handle.addEventListener("dragend", clearDragMarks);
    block.addEventListener("dragover", (e) => { if (dragFrom == null) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; const r = block.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2; block.classList.toggle("drop-after", after); block.classList.toggle("drop-before", !after); });
    block.addEventListener("dragleave", () => block.classList.remove("drop-before", "drop-after"));
    block.addEventListener("drop", (e) => { if (dragFrom == null) return; e.preventDefault(); const r = block.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2; moveBlockTo(dragFrom, after ? i + 1 : i); });
    host.appendChild(block);
    host.appendChild(inserter(i + 1));
  });
  if (!doc.blocks.length) host.appendChild(el("p", "muted", "Esta página no tiene secciones. Usa + para añadir una."));
  renderLayoutBar();
  // Todo cambio estructural pasa por aquí → registra un paso de historial (salvo
  // durante una restauración de deshacer/rehacer, que fija histRestoring).
  histCommit();
}

// Compat: las operaciones de bloque llaman renderCanvas() + renderSettings().
// El lienzo ya redibuja la barra de layout, así que esto solo la re-sincroniza.
export function renderSettings() { renderLayoutBar(); }

// renderField (usado por el cajón de ajustes y por Carreras) llama a esto tras
// cada edición. En el editor de páginas, repinta el lienzo para reflejar el
// cambio; en Carreras (sin lienzo) no hace nada. El foco está en el cajón, así
// que repintar el lienzo no roba el cursor.
export function refreshSummary() {
  if (sel == null || !doc || !$("gb-canvas")) return;
  renderCanvas();
}

