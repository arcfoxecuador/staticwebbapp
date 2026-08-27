import { openEditor } from "./editor.js";
import { altNudgeAck, doc, setAltNudgeAck, setSavedSnapshot, slug } from "./state.js";
import { api } from "../core/api.js";
import { pageSnapshot } from "../core/dirty.js";
import { $, esc } from "../core/dom.js";
import { confirmModal, notice } from "../core/ui.js";

// ── Guardar página ───────────────────────────────────────────────────────────
// Tras guardar, sigue el estado del build/deploy y actualiza el texto en vivo
// ("publicando…" → "en vivo" o "el build falló"). Una sola publicación activa a
// la vez (deployWatchId cancela pollers anteriores). Sondea cada 10s con tope de
// tiempo; si no hay proveedor de estado, cae al mensaje "puede tardar ~1 min".
let deployWatchId = 0;
export function watchDeploy(box, siteUrl) {
  if (!box) return;
  const myId = ++deployWatchId;
  const started = Date.now();
  const MAX_MS = 150000; // ~2.5 minutos
  const siteLink = siteUrl ? ` <a href="${esc(siteUrl)}" target="_blank" rel="noopener">Ver el sitio →</a>` : "";
  const poll = async () => {
    if (myId !== deployWatchId || !box.isConnected) return; // reemplazado o aviso cerrado
    let d = null;
    try { d = await api("/api/deploy-status"); } catch { /* red inestable: se reintenta */ }
    if (myId !== deployWatchId || !box.isConnected) return;
    if (d && d.state === "success") {
      box.innerHTML = `<span class="deploy-ok">●</span> Publicado y en vivo.${siteLink}`;
      return;
    }
    if (d && d.state === "failure") {
      const det = d.detailUrl ? ` <a href="${esc(d.detailUrl)}" target="_blank" rel="noopener">Ver detalles →</a>` : "";
      box.innerHTML = `<span class="deploy-fail">●</span> <b>El build falló</b> — el sitio mantiene la versión anterior.${det}`;
      return;
    }
    if (Date.now() - started > MAX_MS) {
      box.innerHTML = `Publicado. Puede tardar ~1 minuto en verse.${siteLink}`;
      return;
    }
    box.innerHTML = `<span class="spinner"></span> Publicando tus cambios…`;
    setTimeout(poll, 10000);
  };
  poll();
}

// Cuenta imágenes con ruta pero SIN texto alternativo, recorriendo bloques y sus
// listas/piezas anidadas. Pares conocidos del esquema: image→imageAlt, src→alt.
// Las secciones ocultas no se cuentan (no se publican de forma visible).
function countImagesMissingAlt(blocks) {
  let n = 0;
  const hasVal = (v) => typeof v === "string" && v.trim() !== "";
  const walk = (obj) => {
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    if (!obj || typeof obj !== "object") return;
    if (hasVal(obj.image) && !hasVal(obj.imageAlt)) n++;
    if (hasVal(obj.src) && !hasVal(obj.alt)) n++;
    for (const v of Object.values(obj)) if (v && typeof v === "object") walk(v);
  };
  (blocks || []).forEach((b) => { if (!b || b.hidden) return; walk(b); });
  return n;
}

// Aviso suave (no bloqueante) al guardar con imágenes sin texto alternativo. Solo
// re-avisa si el número de imágenes sin alt AUMENTÓ desde la última vez que se
// aceptó (altNudgeAck, reiniciado al abrir la página): no molesta en cada guardado.

async function altTextGate() {
  const missing = countImagesMissingAlt(doc.blocks);
  if (missing === 0 || missing <= altNudgeAck) return true;
  const ok = await confirmModal({
    title: "Imágenes sin texto alternativo",
    message:
      `${missing === 1 ? "Una imagen no tiene" : `${missing} imágenes no tienen`} texto alternativo.\n\n` +
      "El texto alternativo describe la imagen para buscadores (SEO) y lectores de pantalla (accesibilidad). " +
      "Puedes añadirlo en “⚙ Todos los ajustes” de cada sección.",
    confirmLabel: "Guardar de todas formas",
    cancelLabel: "Volver y añadirlo",
  });
  if (ok) setAltNudgeAck(missing);
  return ok;
}

export async function save() {
  if (!(await altTextGate())) return;
  const btn = document.querySelector(".gb-save");
  btn.disabled = true; btn.textContent = "Actualizando…";
  try {
    const data = await api(`/api/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: doc.title, hidden: doc.hidden === true, seo: doc.seo || undefined, blocks: doc.blocks, baseSha: doc._sha }),
    });
    if (data.sha) doc._sha = data.sha;
  setSavedSnapshot(pageSnapshot()); // ya está guardado: limpia el estado "sin guardar"
    localStorage.removeItem(`wp-autosave-page-${slug}`);
    // Estado de publicación EN VIVO: en vez de una promesa estática, seguimos el
    // build/deploy y actualizamos el texto ("publicando…" → "en vivo" o "falló").
    notice("ok", `Cambios guardados. <span id="publish-status"><span class="spinner"></span> Publicando tus cambios…</span>`);
    watchDeploy($("publish-status"), data.url);
  } catch (e) {
    if (e.status === 409 && e.data?.conflict) {
      notice("err", `${esc(e.message)} <a data-reload>Recargar la página</a>`);
      $("screen-notice").querySelector("[data-reload]").addEventListener("click", () => { setSavedSnapshot(null); openEditor(slug); });
    } else {
      notice("err", esc(e.message));
    }
  } finally {
    btn.disabled = false; btn.textContent = "Actualizar";
  }
}
