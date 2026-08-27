import { clearDragMarks, renderCanvas, renderSettings } from "./canvas.js";
import { doc, insertAt, sel, setInsertAt, setSel } from "./state.js";
import { $, el, esc } from "../core/dom.js";
import { FORMS } from "../core/state.js";
import { announce, confirmModal } from "../core/ui.js";

// ── Operaciones de bloques ───────────────────────────────────────────────────
// Nombre legible de una sección (para los anuncios a lectores de pantalla).
function blockLabel(b) { const s = b && FORMS.schema[b._type]; return s ? s.label : (b ? b._type : "Sección"); }
export function moveBlock(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= doc.blocks.length) return;
  [doc.blocks[i], doc.blocks[j]] = [doc.blocks[j], doc.blocks[i]];
  if (sel === i) setSel(j); else if (sel === j) setSel(i);
  renderCanvas(); renderSettings();
  announce(`${blockLabel(doc.blocks[j])} movida a la posición ${j + 1} de ${doc.blocks.length}`);
}
// Mueve el bloque `from` a la posición de inserción `insertIndex` (0..n).
// Usado por el drag-and-drop. Conserva la selección por identidad del bloque.
export function moveBlockTo(from, insertIndex) {
  clearDragMarks();
  if (from == null || from < 0 || from >= doc.blocks.length) return;
  let dest = insertIndex > from ? insertIndex - 1 : insertIndex;
  dest = Math.max(0, Math.min(dest, doc.blocks.length - 1));
  if (dest === from) return;
  const selBlock = sel != null ? doc.blocks[sel] : null;
  const [moved] = doc.blocks.splice(from, 1);
  doc.blocks.splice(dest, 0, moved);
  setSel(selBlock ? doc.blocks.indexOf(selBlock) : null);
  renderCanvas(); renderSettings();
  announce(`${blockLabel(moved)} movida a la posición ${dest + 1} de ${doc.blocks.length}`);
}
export function toggleBlock(i) {
  doc.blocks[i].hidden = !doc.blocks[i].hidden;
  renderCanvas(); renderSettings();
  announce(`${blockLabel(doc.blocks[i])} ${doc.blocks[i].hidden ? "ocultada" : "mostrada"}`);
}
export async function removeBlock(i) {
  if (!(await confirmModal({ title: "Eliminar sección", message: "¿Eliminar esta sección? También puedes ocultarla en su lugar.", confirmLabel: "Eliminar", danger: true }))) return;
  const label = blockLabel(doc.blocks[i]);
  doc.blocks.splice(i, 1);
  if (sel === i) setSel(null); else if (sel > i) setSel(sel - 1);
  renderCanvas(); renderSettings();
  announce(`${label} eliminada. ${doc.blocks.length} ${doc.blocks.length === 1 ? "sección" : "secciones"} en total.`);
}
// Duplica el bloque i (copia profunda) justo debajo y lo selecciona.
export function duplicateBlock(i) {
  const copy = JSON.parse(JSON.stringify(doc.blocks[i]));
  doc.blocks.splice(i + 1, 0, copy);
  setSel(i + 1);
  renderCanvas(); renderSettings();
  announce(`${blockLabel(copy)} duplicada`);
}

// ── Añadir bloque (modal) ────────────────────────────────────────────────────
function clientDefaultBlock(type) {
  const spec = FORMS.schema[type];
  const block = { _type: type };
  spec.fields.forEach((f) => {
    if (f.type === "array") {
      const seed = {};
      f.item.forEach((sf) => {
        if (sf.type === "array") seed[sf.name] = [];
        else if (sf.type === "select") seed[sf.name] = sf.options[0];
        else if (sf.type === "checkbox") seed[sf.name] = false;
        else if (sf.type === "tags") seed[sf.name] = [];
        else if (sf.type !== "cta") seed[sf.name] = "";
      });
      block[f.name] = [seed];
    } else if (f.type === "select") {
      block[f.name] = /^\d+$/.test(f.options[0]) ? Number(f.options[0]) : f.options[0];
    } else if (f.type === "variants") {
      block[f.name] = []; // contenedor de piezas: empieza vacío
    }
  });
  return block;
}
function insertBlock(type) {
  doc.blocks.splice(insertAt, 0, clientDefaultBlock(type));
  setSel(insertAt);
  $("ed-picker").hidden = true;
  renderCanvas(); renderSettings();
  announce(`${blockLabel({ _type: type })} añadida en la posición ${insertAt + 1}`);
}
// Miniatura esquemática (wireframe SVG) por tipo de bloque, para el selector
// visual "añadir sección" (galería tipo Strapi/Elementor). Da una idea del
// layout de un vistazo en vez de una lista de texto.
function bpThumb(type) {
  const A = "#9db4ff", M = "#c8d2e6", L = "#e6ebf6";
  const bar = (x, y, w, h, f = M) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, 3)}" fill="${f}"/>`;
  const card = (x, y, w, h, f = L) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${f}"/>`;
  const cards3 = (imgH) => [8, 37, 66].map((x) => card(x, 12, 26, 38) + (imgH ? `<rect x="${x}" y="12" width="26" height="${imgH}" rx="3" fill="#d2dae9"/>` : "") + bar(x + 4, 16 + (imgH || 0), 18, 4) + bar(x + 4, 24 + (imgH || 0), 14, 3)).join("");
  const W = {
    split: bar(8, 15, 36, 6, A) + bar(8, 26, 30, 4) + bar(8, 33, 26, 4) + bar(8, 43, 16, 7, A) + card(54, 13, 40, 34, "#d7deee"),
    stats: [10, 40, 70].map((x) => card(x, 18, 20, 24) + bar(x + 4, 23, 12, 6, A) + bar(x + 4, 33, 12, 3)).join(""),
    steps: `<line x1="20" y1="26" x2="80" y2="26" stroke="#d2dae9" stroke-width="2"/>` + [20, 50, 80].map((cx) => `<circle cx="${cx}" cy="26" r="7" fill="${A}"/>`).join("") + [12, 42, 72].map((x) => bar(x, 40, 16, 3)).join(""),
    grid: [[10, 10], [52, 10], [10, 32], [52, 32]].map(([x, y]) => card(x, y, 38, 18) + bar(x + 4, y + 4, 16, 4, A) + bar(x + 4, y + 11, 26, 3)).join(""),
    faq: [14, 26, 38].map((y) => bar(10, y, 80, 9, L) + bar(82, y + 2, 5, 5, A)).join(""),
    form: bar(30, 10, 40, 5, A) + card(20, 20, 60, 8) + card(20, 31, 60, 8) + bar(35, 44, 30, 8, A),
    cta: bar(25, 17, 50, 7, A) + bar(30, 29, 40, 4) + bar(38, 39, 24, 8, A),
    rich: bar(10, 12, 40, 6, A) + bar(10, 23, 80, 4) + bar(10, 30, 70, 4) + card(10, 37, 30, 15, "#d7deee") + bar(46, 39, 44, 4) + bar(46, 46, 30, 4),
    pricing: [8, 37, 66].map((x) => card(x, 12, 26, 38) + bar(x + 3, 16, 20, 5, A) + bar(x + 3, 26, 20, 3) + bar(x + 3, 32, 20, 3)).join(""),
    imgcards: cards3(15),
    tabs: `<rect x="8" y="10" width="84" height="11" rx="2" fill="${L}"/>` + bar(12, 12, 16, 7, A) + bar(32, 13, 16, 5) + bar(52, 13, 16, 5) + [27, 36, 45].map((y) => bar(10, y, 80, 5)).join(""),
    list: [14, 24, 34, 44].map((y) => `<circle cx="12" cy="${y + 2}" r="2.5" fill="${A}"/>` + bar(20, y, 62, 4)).join(""),
    generic: bar(10, 14, 50, 6, A) + bar(10, 26, 80, 4) + bar(10, 33, 74, 4) + bar(10, 40, 80, 4),
  };
  const MAP = {
    hero: "split", richTextSplit: "split", stats: "stats", stepsProcess: "steps",
    featureGrid: "grid", audiences: "grid", highlightCards: "grid", testimonials: "grid",
    faq: "faq", leadForm: "form", ctaBanner: "cta", admissionsCallout: "cta",
    richContent: "rich", featureList: "list", pricingGrid: "pricing",
    careerShowcase: "imgcards", newsGrid: "imgcards", accountabilityTabs: "tabs",
  };
  return `<svg viewBox="0 0 100 60" class="bp-thumb" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect width="100" height="60" rx="4" fill="#f4f7fd"/>${W[MAP[type] || "generic"]}</svg>`;
}

export function openPicker(at) {
  setInsertAt(at);
  const list = $("ed-picker-list");
  const search = $("ed-picker-search");
  list.innerHTML = "";
  // Una tarjeta por tipo de bloque: miniatura + etiqueta + descripción.
  const items = Object.entries(FORMS.schema).map(([type, spec]) => {
    const desc = (FORMS.catalog && FORMS.catalog[type] && FORMS.catalog[type].description) || "";
    const b = el("button", "ed-picker-item bp-card", `${bpThumb(type)}<span class="bp-meta"><strong>${esc(spec.label)}</strong>${desc ? `<span class="ed-picker-desc">${esc(desc)}</span>` : ""}</span>`);
    b.dataset.q = (spec.label + " " + desc).toLowerCase();
    b.addEventListener("click", () => insertBlock(type));
    list.appendChild(b);
    return b;
  });
  // Buscador: filtra por etiqueta o descripción; Enter inserta el primer visible.
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    items.forEach((b) => { b.hidden = q !== "" && !b.dataset.q.includes(q); });
  };
  search.value = "";
  search.oninput = filter;
  search.onkeydown = (e) => {
    if (e.key === "Escape") $("ed-picker").hidden = true;
    else if (e.key === "Enter") { const first = items.find((b) => !b.hidden); if (first) first.click(); }
  };
  $("ed-picker").hidden = false;
  search.focus();
}
$("ed-picker-close").addEventListener("click", () => ($("ed-picker").hidden = true));
$("ed-picker").addEventListener("click", (e) => { if (e.target.id === "ed-picker") $("ed-picker").hidden = true; });

