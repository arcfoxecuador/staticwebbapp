// Estado del editor visual de páginas, compartido por el lienzo, el historial,
// las operaciones de bloque y el guardado. Se exporta como enlace vivo (las
// lecturas no necesitan getter) y se escribe SOLO por estos setters, que es lo
// que hace rastreable quién mueve la selección.

export let slug = null;      // página abierta
export let doc = null;       // su JSON (bloques + seo), con _sha
export let sel = null;       // índice del bloque seleccionado
export let insertAt = null;  // posición donde insertará el modal "añadir bloque"
export let savedSnapshot = null; // instantánea para detectar cambios sin guardar
export let dragFrom = null;  // índice del bloque que se está arrastrando
export let altNudgeAck = -1; // nº de imágenes sin alt ya avisadas al guardar

export const setSlug = (v) => { slug = v; };
export const setDoc = (v) => { doc = v; };
export const setSel = (v) => { sel = v; };
export const setInsertAt = (v) => { insertAt = v; };
export const setSavedSnapshot = (v) => { savedSnapshot = v; };
export const setDragFrom = (v) => { dragFrom = v; };
export const setAltNudgeAck = (v) => { altNudgeAck = v; };

// Sale del editor de páginas (lo llama el router en cada navegación).
export function resetPageEditor() {
  doc = null; savedSnapshot = null; sel = null;
}

