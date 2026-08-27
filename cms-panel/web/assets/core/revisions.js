import { api } from "./api.js";
import { $, el, esc } from "./dom.js";
import { notice } from "./ui.js";

// Caja "Revisiones": commits que tocaron el documento; "Cargar" trae esa
// versión al editor (restaurar = cargar + guardar, como en WP).
export function revisionsBox(type, slugValue, onLoad) {
  const box = el("div", "postbox");
  box.innerHTML = `<div class="postbox-header"><h2>Revisiones</h2></div>`;
  const inside = el("div", "inside");
  inside.innerHTML = "<p class='muted'><span class='spinner'></span>Cargando historial…</p>";
  box.appendChild(inside);
  api(`/api/revisions?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slugValue)}`)
    .then((r) => {
      const revs = r.revisions || [];
      if (!revs.length) { inside.innerHTML = "<p class='muted'>Sin historial todavía.</p>"; return; }
      inside.innerHTML = "";
      const ul = el("ul", "revisions-list");
      revs.slice(0, 8).forEach((rev, i) => {
        const li = el("li");
        const when = rev.date ? new Date(rev.date).toLocaleString() : "";
        li.innerHTML = `<span class="rev-when">${esc(when)}</span><span class="rev-msg muted">${esc(rev.message)}</span>`;
        if (i === 0) li.appendChild(el("span", "ed-tag", "actual"));
        else {
          const load = el("a", "rev-load", "Cargar");
          load.addEventListener("click", async () => {
            try { onLoad(await api(`/api/revisions/content?type=${type}&slug=${encodeURIComponent(slugValue)}&sha=${rev.sha}`)); }
            catch (e) { notice("err", esc(e.message)); }
          });
          li.appendChild(load);
        }
        ul.appendChild(li);
      });
      inside.appendChild(ul);
    })
    .catch(() => { inside.innerHTML = "<p class='muted'>No se pudo cargar el historial.</p>"; });
  return box;
}

// Slug provisional en el cliente (el definitivo lo fija el servidor al crear).
export function slugifyClient(t) {
  return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// Etiqueta legible de una carpeta de medios (comparte showMedia y el modal).
export function mediaFolderLabel(f) {
  if (f === "") return "Sin carpeta";
  if (f === "news") return "Portadas";
  if (f === "documentos") return "Documentos";
  return f.split("/").map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)).join(" / ");
}

// Documentos publicables. Debe coincidir con DOC_RE del servidor (lib/media.ts):
// el servidor es quien decide de verdad, esto solo filtra antes de subir.
export const DOC_EXT_RE = /\.(pdf|docx?|xlsx?|pptx?)$/i;
export const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

// Rutas que el panel puede modificar (renombrar, reemplazar, eliminar). Espejo
// de EDITABLE_MEDIA_RE del servidor: aquí solo decide qué botones se muestran.
export const EDITABLE_MEDIA = (p) => p.startsWith("/uploads/") || p.startsWith("/documentos/");

// Extensión en mayúsculas para el "icono" de un documento (PDF, DOCX…).
export function docExt(name) {
  const m = String(name).match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : "DOC";
}

