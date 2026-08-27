import { addTile, altTextOf, altWarn, buttonGroup, cardGridOrButtons, editEl, fieldExists, fieldSpec, heading, imageSlot, itemTools, nOr, pickBg, renderCanvas, secHead, singleCta } from "./canvas.js";
import { $, el, esc } from "../core/dom.js";
import { FORMS, SITE } from "../core/state.js";
import { docPickerButtons, openMediaModal } from "../views/media.js";

// ── Aspecto fiel por tipo de bloque ──────────────────────────────────────────
export function paintHero(b) {
  const bg = pickBg(b);
  const onDark = bg !== "b-light";
  const wrap = el("div", "b " + bg + (onDark ? " vc-on-dark" : ""));
  const text = el("div", "b-hero-text");
  if (b.eyebrow != null) text.appendChild(editEl(b, "eyebrow", "b-eyebrow", { ph: "Etiqueta" }));
  text.appendChild(heading(b, "heading"));
  if (b.description != null) text.appendChild(editEl(b, "description", "b-sub", { rich: true, multiline: true, ph: "Descripción" }));
  const ctas = el("div", "b-cta-row");
  const hp = singleCta(b, "primaryCta", "primary", "Botón principal"); if (hp) ctas.appendChild(hp);
  const hs = singleCta(b, "secondaryCta", "secondary", "Botón secundario"); if (hs) ctas.appendChild(hs);
  text.appendChild(ctas);
  if (b.align === "center") {
    // Igual que en el sitio (Hero.astro): centrado CON imagen ⇒ la imagen es el
    // FONDO a sangre, con overlay oscuro y el texto centrado encima. Antes el
    // preview la descartaba (parecía que la imagen "desaparecía").
    if (b.image) {
      wrap.classList.add("b-hero-hasbg", "vc-on-dark");
      wrap.style.backgroundImage = `url("${b.image.startsWith("/") && SITE ? SITE + b.image : b.image}")`;
    }
    const c = el("div", "b-hero-center"); c.appendChild(text);
    const bgBtn = el("button", "b-img-edit b-hero-bgbtn", b.image ? "Cambiar imagen de fondo" : "Añadir imagen de fondo");
    bgBtn.addEventListener("click", (ev) => { ev.stopPropagation(); openMediaModal((p) => { b.image = p; renderCanvas(); }); });
    wrap.append(c, bgBtn);
    if (b.image && !altTextOf(b).trim()) wrap.appendChild(altWarn());
    return wrap;
  }
  const grid = el("div", "b-hero-grid" + (b.imageSide === "left" ? " b-order-left" : ""));
  const media = el("div", "b-media"); media.appendChild(imageSlot(b, "image"));
  grid.append(text, media); wrap.appendChild(grid); return wrap;
}
export function paintStats(b) {
  const wrap = el("div", "b b-light");
  if (!Array.isArray(b.items)) b.items = [];
  const grid = el("div", "b-stats"); grid.style.gridTemplateColumns = `repeat(${nOr(b.columns, b.items.length || 3)},1fr)`;
  b.items.forEach((it, idx) => {
    const s = el("div", "b-stat b-item");
    s.appendChild(editEl(it, "value", "v", { ph: "0" }));
    s.appendChild(editEl(it, "label", "l", { ph: "Etiqueta" }));
    s.appendChild(itemTools(b.items, idx));
    grid.appendChild(s);
  });
  grid.appendChild(addTile(b, "items"));
  wrap.appendChild(grid); return wrap;
}
export function paintSteps(b) {
  const wrap = el("div", "b b-tint"); const h = secHead(b); if (h) wrap.appendChild(h);
  if (!Array.isArray(b.steps)) b.steps = [];
  const grid = el("div", "b-steps"); grid.style.gridTemplateColumns = `repeat(${nOr(b.columns, 4)},1fr)`;
  b.steps.forEach((st, i) => {
    const c = el("div", "b-step b-item");
    c.appendChild(el("div", "n", String(i + 1)));
    c.appendChild(editEl(st, "title", "t", { ph: "Título" }));
    c.appendChild(editEl(st, "description", "d", { multiline: true, ph: "Descripción" }));
    c.appendChild(itemTools(b.steps, i));
    grid.appendChild(c);
  });
  grid.appendChild(addTile(b, "steps"));
  wrap.appendChild(grid); return wrap;
}
export function paintFeatureGrid(b) {
  const wrap = el("div", "b b-light"); const h = secHead(b); if (h) wrap.appendChild(h);
  if (fieldExists(b, "actions")) wrap.appendChild(buttonGroup(b, "actions", "b-actions"));
  if (!Array.isArray(b.items)) b.items = [];
  const itemsField = fieldSpec(b, "items");
  const imgSub = ((itemsField && itemsField.item) || []).find((sf) => sf.type === "image");
  const grid = el("div", "b-cards"); grid.style.gridTemplateColumns = `repeat(${nOr(b.columns, 3)},1fr)`;
  b.items.forEach((it, idx) => {
    const c = el("div", "b-card b-item");
    if (imgSub) c.appendChild(imageSlot(it, imgSub.name, false));
    c.appendChild(editEl(it, "title", "t", { ph: "Título" }));
    c.appendChild(editEl(it, "description", "d", { multiline: true, ph: "Descripción" }));
    c.appendChild(itemTools(b.items, idx));
    grid.appendChild(c);
  });
  grid.appendChild(addTile(b, "items"));
  wrap.appendChild(grid); return wrap;
}
export function paintFaq(b) {
  const wrap = el("div", "b b-light"); const h = secHead(b); if (h) wrap.appendChild(h);
  if (!Array.isArray(b.items)) b.items = [];
  const list = el("div", "b-faq");
  b.items.forEach((it, idx) => {
    const qa = el("div", "qa b-item");
    const q = el("div", "q"); q.appendChild(editEl(it, "question", "", { ph: "Pregunta" }));
    qa.appendChild(q);
    qa.appendChild(editEl(it, "answer", "a", { multiline: true, ph: "Respuesta" }));
    qa.appendChild(itemTools(b.items, idx));
    list.appendChild(qa);
  });
  list.appendChild(addTile(b, "items"));
  wrap.appendChild(list); return wrap;
}
export function paintLead() {
  const wrap = el("div", "b b-tint b-lead");
  wrap.innerHTML = `<div class="b-leadcard"><div class="t">Recibe información</div><div class="row">Nombre y apellido</div><div class="row">WhatsApp</div><div class="row">Carrera de interés ▾</div><div class="send">Quiero información</div></div>`;
  return wrap;
}
export function paintCtaBanner(b) {
  const bg = pickBg(b) === "b-light" ? "b-brand" : pickBg(b);
  const wrap = el("div", "b " + bg + " b-banner vc-on-dark");
  const c = el("div", "b-hero-center");
  const h = secHead(b); if (h) c.appendChild(h);
  const ctas = el("div", "b-cta-row"); ctas.style.justifyContent = "center";
  const cp = singleCta(b, "primaryCta", "primary", "Botón principal"); if (cp) ctas.appendChild(cp);
  const cs = singleCta(b, "secondaryCta", "secondary", "Botón secundario"); if (cs) ctas.appendChild(cs);
  c.appendChild(ctas); wrap.appendChild(c); return wrap;
}
// Genérico (los demás bloques): fiel-ish y editable, guiado por el esquema.
// Bloques "dinámicos": su contenido NO vive en el bloque, se arma solo a partir
// de otra colección. En el editor mostrarían una sección casi vacía y confusa;
// por eso se les añade un aviso claro de qué muestran y dónde se edita.
const DYNAMIC_BLOCKS = {
  careerShowcase: { what: "las carreras del sitio", where: "Carreras", hash: "#careers" },
  newsGrid: { what: "las últimas entradas publicadas", where: "Entradas", hash: "#posts" },
  pricingGrid: { what: "los aranceles de cada carrera", where: "Carreras", hash: "#careers" },
};
function dynamicNotice(type) {
  const d = DYNAMIC_BLOCKS[type];
  if (!d) return null;
  const n = el("div", "b-dynamic");
  n.innerHTML = `<span class="b-dynamic-ic" aria-hidden="true">⟳</span><span>Esta sección muestra automáticamente <b>${esc(d.what)}</b>. Su contenido se gestiona en <a href="${d.hash}">${esc(d.where)}</a>; aquí solo editas el encabezado.</span>`;
  return n;
}

// Rendición de cuentas: periodos → fases → documentos. El pintor genérico no
// sabía anidar tan hondo (quedaba confuso); este lo muestra legible y editable:
// título/descripción de cada fase in-situ, URL del PDF por documento (vacío =
// "Próximamente") con su estado en vivo, y añadir/quitar/reordenar.
export function paintAccountability(b) {
  const wrap = el("div", "b b-light");
  const h = secHead(b); if (h) wrap.appendChild(h);
  if (!Array.isArray(b.periods)) b.periods = [];
  b.periods.forEach((per, pi) => {
    if (!Array.isArray(per.phases)) per.phases = [];
    const pc = el("div", "b-acc-period");
    const yhead = el("div", "b-acc-yearrow");
    yhead.appendChild(editEl(per, "year", "b-acc-year", { ph: "Año" }));
    yhead.appendChild(itemTools(b.periods, pi));
    pc.appendChild(yhead);
    per.phases.forEach((ph, phi) => {
      if (!Array.isArray(ph.docs)) ph.docs = [];
      const card = el("div", "b-acc-phase b-item");
      const head = el("div", "b-acc-phase-head");
      head.appendChild(el("span", "b-acc-num", String(ph.number ?? phi + 1)));
      head.appendChild(editEl(ph, "title", "b-acc-title", { ph: "Título de la fase" }));
      card.appendChild(head);
      card.appendChild(editEl(ph, "description", "b-acc-desc", { multiline: true, ph: "Descripción de la fase" }));
      const docs = el("div", "b-acc-docs");
      ph.docs.forEach((d, di) => {
        const row = el("div", "b-acc-doc");
        row.appendChild(el("span", "b-acc-dot " + (d.href ? "pub" : "pend")));
        row.appendChild(editEl(d, "title", "b-acc-doc-t", { ph: "Nombre del documento" }));
        const href = el("input", "b-acc-href form-input");
        href.type = "text"; href.placeholder = "Sube el archivo o pega una dirección"; href.value = d.href || "";
        href.setAttribute("aria-label", "Archivo del documento");
        href.addEventListener("click", (e) => e.stopPropagation());
        href.addEventListener("input", () => { d.href = href.value.trim() || null; });
        href.addEventListener("change", renderCanvas); // refresca el estado (punto + texto)
        row.appendChild(href);
        // Subir desde la computadora o elegir de la biblioteca, sin salir del
        // lienzo: antes aquí solo se podía ESCRIBIR una dirección a mano.
        row.append(...docPickerButtons((p) => { d.href = p; renderCanvas(); }, { cls: "b-acc-doc-btn" }));
        row.appendChild(el("span", "b-acc-doc-st " + (d.href ? "pub" : "pend"), d.href ? "Publicado" : "Próximamente"));
        const x = el("button", "b-acc-doc-x", "✕"); x.title = "Quitar documento";
        x.addEventListener("click", (e) => { e.stopPropagation(); ph.docs.splice(di, 1); renderCanvas(); });
        row.appendChild(x);
        docs.appendChild(row);
      });
      const addDoc = el("button", "b-add b-add-sm", "＋ Documento");
      addDoc.addEventListener("click", (e) => { e.stopPropagation(); ph.docs.push({ title: "", href: null }); renderCanvas(); });
      docs.appendChild(addDoc);
      card.appendChild(docs);
      card.appendChild(itemTools(per.phases, phi));
      pc.appendChild(card);
    });
    const addPhase = el("button", "b-add", "＋ Fase");
    addPhase.addEventListener("click", (e) => { e.stopPropagation(); per.phases.push({ number: per.phases.length + 1, title: "", description: "", docs: [] }); renderCanvas(); });
    pc.appendChild(addPhase);
    wrap.appendChild(pc);
  });
  const addPer = el("button", "b-add", "＋ Periodo");
  addPer.addEventListener("click", (e) => { e.stopPropagation(); b.periods.push({ year: "", phases: [{ number: 1, title: "", description: "", docs: [] }] }); renderCanvas(); });
  wrap.appendChild(addPer);
  return wrap;
}

// Si el bloque tiene imageSide + un campo de imagen, dibuja texto | imagen.
export function paintGeneric(b) {
  const spec = FORMS.schema[b._type];
  const fields = spec ? spec.fields : [];
  const bg = pickBg(b);
  const onDark = bg !== "b-light";
  const wrap = el("div", "b " + bg + (onDark ? " vc-on-dark" : "") + " b-generic");
  const imgField = fields.find((f) => f.type === "image");
  const sideLayout = fieldExists(b, "imageSide") && imgField;

  const textCol = el("div", sideLayout ? "b-hero-text" : "");
  const head = secHead(b); if (head) textCol.appendChild(head);
  fields.forEach((f) => {
    if (["eyebrow", "heading", "title", "description"].includes(f.name)) return;
    if (f.type === "cta") {
      const node = singleCta(b, f.name, "primary", f.label || "Botón");
      if (node) { const r = el("div", "b-cta-row"); r.appendChild(node); textCol.appendChild(r); }
    } else if ((f.type === "text" || f.type === "textarea" || f.type === "url") && b[f.name] != null && b[f.name] !== "") {
      const box = el("div", "b-field");
      box.appendChild(el("div", "b-fl", esc(f.label)));
      box.appendChild(editEl(b, f.name, "b-sub", { rich: f.type === "textarea", multiline: true }));
      textCol.appendChild(box);
    }
  });

  if (sideLayout) {
    const grid = el("div", "b-hero-grid" + (b.imageSide === "left" ? " b-order-left" : ""));
    const media = el("div", "b-media"); media.appendChild(imageSlot(b, imgField.name));
    grid.append(textCol, media); wrap.appendChild(grid);
  } else {
    wrap.appendChild(textCol);
    fields.filter((f) => f.type === "image").forEach((f) => wrap.appendChild(imageSlot(b, f.name)));
  }
  fields.filter((f) => f.type === "array").forEach((f) => wrap.appendChild(cardGridOrButtons(b, f)));
  const dn = dynamicNotice(b._type); if (dn) wrap.appendChild(dn);
  return wrap;
}
// ── Contenido libre (richContent): piezas apilables de cualquier tipo ─────────
function variantsFieldOf(b) {
  const spec = FORMS.schema[b._type];
  return spec && spec.fields.find((f) => f.type === "variants");
}
function fieldDefaultVal(f) {
  if (f.type === "select") return f.options ? (/^\d+$/.test(f.options[0]) ? Number(f.options[0]) : f.options[0]) : "";
  if (f.type === "checkbox") return false;
  if (f.type === "tags" || f.type === "textlist" || f.type === "array") return [];
  if (f.type === "cta") return { label: "", href: "" };
  return "";
}
function defaultPiece(field, kind) {
  const v = (field.variants || []).find((x) => x.value === kind);
  const piece = { [field.variantKey]: kind };
  (v ? v.fields : []).forEach((f) => { piece[f.name] = fieldDefaultVal(f); });
  return piece;
}
// Lista de textos editable in-situ (para la pieza "list" y similares).
function stringListEditor(obj, key, ordered) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  const arr = obj[key];
  const list = el(ordered ? "ol" : "ul", "b-rc-list");
  arr.forEach((_, i) => {
    const li = el("li", "b-rc-li");
    // rich: los ítems admiten HTML en línea (<b>, <a>) y el sitio los pinta con
    // set:html; el editor debe renderizarlos igual (no mostrar las etiquetas).
    li.appendChild(editEl(arr, i, "b-rc-litext", { rich: true, ph: "Elemento" }));
    const x = el("button", "b-li-x", "✕"); x.title = "Quitar"; x.setAttribute("aria-label", "Quitar elemento");
    x.addEventListener("click", (e) => { e.stopPropagation(); arr.splice(i, 1); renderCanvas(); });
    li.appendChild(x);
    list.appendChild(li);
  });
  const add = el("button", "b-add-inline", "＋ Elemento");
  add.addEventListener("click", (e) => { e.stopPropagation(); arr.push("Nuevo elemento"); renderCanvas(); });
  const box = el("div"); box.append(list, add);
  return box;
}
// Menú "＋ Agregar pieza": elige el tipo (Texto, Imagen, Botón…) y lo inserta.
function addPieceMenu(block, field) {
  const box = el("div", "b-addpiece");
  const btn = el("button", "b-add", "＋ Agregar pieza");
  const menu = el("div", "b-addpiece-menu"); menu.hidden = true;
  (field.variants || []).forEach((v) => {
    const opt = el("button", "b-addpiece-opt", esc(v.label || v.value));
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!Array.isArray(block[field.name])) block[field.name] = [];
      block[field.name].push(defaultPiece(field, v.value));
      renderCanvas();
    });
    menu.appendChild(opt);
  });
  btn.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  box.append(btn, menu);
  return box;
}
// Dibuja una pieza según su kind (texto, título, imagen, botón, lista, espacio).
function paintPiece(piece) {
  const kind = piece.kind;
  const box = el("div", "b-piece b-piece-" + kind);
  if (kind === "heading") {
    box.appendChild(editEl(piece, "text", piece.level === "h3" ? "b-h b-h-sm" : "b-h", { ph: "Título" }));
  } else if (kind === "text") {
    box.appendChild(editEl(piece, "text", "b-sub", { rich: true, multiline: true, ph: "Escribe un párrafo…" }));
  } else if (kind === "image") {
    box.appendChild(imageSlot(piece, "src"));
  } else if (kind === "button") {
    const row = el("div", "b-cta-row");
    row.appendChild(editEl(piece, "label", "b-cta " + (piece.style === "secondary" ? "secondary" : "primary"), { ph: "Botón" }));
    box.appendChild(row);
  } else if (kind === "buttons") {
    box.appendChild(buttonGroup(piece, "items", "b-actions"));
  } else if (kind === "list") {
    box.appendChild(stringListEditor(piece, "items", piece.ordered));
  } else if (kind === "spacer") {
    box.appendChild(el("div", "b-spacer", `Espacio (${esc(piece.size || "md")})`));
  } else {
    box.appendChild(el("p", "muted", `Pieza desconocida: ${esc(kind)}`));
  }
  return box;
}
export function paintRichContent(b) {
  const bgMap = { light: "b-light", tint: "b-tint", brand: "b-brand", dark: "b-dark" };
  const bg = bgMap[b.background] || "b-light";
  const onDark = bg === "b-brand" || bg === "b-dark";
  const wrap = el("div", "b " + bg + (onDark ? " vc-on-dark" : ""));
  const col = el("div", "b-rc" + (b.align === "center" ? " b-rc-center" : "") + (b.width === "wide" ? " b-rc-wide" : ""));
  if (!Array.isArray(b.items)) b.items = [];
  const field = variantsFieldOf(b);
  b.items.forEach((piece, idx) => {
    const node = paintPiece(piece);
    node.classList.add("b-item");
    node.appendChild(itemTools(b.items, idx));
    col.appendChild(node);
  });
  if (field) col.appendChild(addPieceMenu(b, field));
  if (!b.items.length) col.insertBefore(el("p", "muted b-rc-empty", "Bloque vacío. Usa “＋ Agregar pieza” para poner texto, imágenes o botones."), col.firstChild);
  wrap.appendChild(col);
  return wrap;
}
