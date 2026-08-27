import { doc, savedSnapshot, slug } from "../blocks/state.js";
import { el } from "./dom.js";
import { post, postAutosaveKey, postSnapshot } from "../views/post-editor.js";

// ── Cambios sin guardar ──────────────────────────────────────────────────────
export function pageSnapshot() { return doc ? JSON.stringify({ title: doc.title, hidden: doc.hidden === true, seo: doc.seo || null, blocks: doc.blocks }) : null; }
export function currentPostSnapshot() { return post ? JSON.stringify(post) : null; }
export function isDirty() {
  if (savedSnapshot != null && pageSnapshot() !== savedSnapshot) return true;
  if (postSnapshot != null && currentPostSnapshot() !== postSnapshot) return true;
  return false;
}
window.addEventListener("beforeunload", (e) => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

// Autoguardado local cada 5 s mientras haya cambios sin guardar: si el
// navegador se cierra o falla, el editor ofrece restaurar la copia al volver.
setInterval(() => {
  try {
    if (post && postSnapshot != null && currentPostSnapshot() !== postSnapshot) {
      localStorage.setItem(postAutosaveKey(), JSON.stringify({ at: Date.now(), post }));
    }
    if (doc && slug && savedSnapshot != null && pageSnapshot() !== savedSnapshot) {
      localStorage.setItem(`wp-autosave-page-${slug}`, JSON.stringify({ at: Date.now(), doc }));
    }
  } catch { /* almacenamiento lleno o bloqueado: el guard de salida sigue activo */ }
}, 5000);

