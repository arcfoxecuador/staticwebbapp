import { api } from "../core/api.js";
import { $, el, esc, fileToBase64 } from "../core/dom.js";
import { DOC_ACCEPT, DOC_EXT_RE, EDITABLE_MEDIA, docExt, mediaFolderLabel } from "../core/revisions.js";
import { SITE, isAdmin } from "../core/state.js";
import { confirmModal, loadingScreen, notice, screen } from "../core/ui.js";
import { career } from "./careers.js";
import { post } from "./post-editor.js";

// ── Medios: biblioteca ───────────────────────────────────────────────────────
export async function showMedia() {
  loadingScreen("Medios");
  let data;
  try { data = await api("/api/media"); }
  catch (e) { screen("Medios", "Biblioteca de medios"); notice("err", esc(e.message)); return; }

  const wrap = screen("Biblioteca de medios", `Biblioteca de medios <button class="page-title-action" id="media-add">Añadir nuevo medio</button>`, {
    help: `<h3>Resumen</h3><p>Aquí viven las imágenes y los <b>documentos</b> del sitio. <b>Añadir nuevo medio</b>
      sube una imagen (se optimiza a WebP, bajo <code>/uploads</code>) o un documento —PDF, Word, Excel, PowerPoint—
      que se publica tal cual bajo <code>/documentos</code>. Haz clic en cualquier archivo para ver su ruta y
      copiarla, y úsala luego en entradas, páginas o carreras.</p>
      <h3>Documentos</h3><p>Sirven para los informes de <b>rendición de cuentas</b>, las fichas de <b>becas</b> y
      cualquier PDF regulatorio. Para publicar una versión corregida usa <b>Reemplazar</b>: conserva la ruta, así
      los enlaces ya repartidos siguen funcionando.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Imágenes y documentos del sitio. Organízalos en carpetas, arrastra archivos aquí para subirlos, y haz clic en uno para copiar su ruta o reemplazarlo."));
  const detail = el("div"); detail.id = "media-detail";
  // Barra: filtro por carpeta (izquierda) + carpeta de subida (derecha).
  const bar = el("div", "media-bar");
  const filterRow = el("div", "media-folders");
  const upWrap = el("div", "media-upload-folder");
  upWrap.innerHTML = `<label>Subir a <input type="text" id="media-folder" list="media-folder-list" placeholder="(raíz)" autocomplete="off" aria-label="Carpeta de destino" /></label><datalist id="media-folder-list"></datalist>`;
  bar.append(filterRow, upWrap);
  // Barra de selección (acciones en lote): aparece al marcar imágenes.
  const selBar = el("div", "media-selbar"); selBar.hidden = true;
  const grid = el("div", "media-grid");
  wrap.append(bar, selBar, detail, grid);

  let currentFolder = null; // null = todas las carpetas
  const selected = new Set(); // rutas marcadas para acciones en lote

  // Sube uno o varios archivos a la carpeta indicada (input de archivo o soltar).
  // Cada archivo va por su ruta: las imágenes se optimizan a WebP bajo /uploads;
  // los documentos se publican intactos bajo /documentos.
  async function uploadFiles(files, folder) {
    const list = [...files].filter((f) => f.type.startsWith("image/") || DOC_EXT_RE.test(f.name));
    if (!list.length) { notice("err", "Suelta imágenes (WebP, PNG, JPG…) o documentos (PDF, Word, Excel)."); return; }
    notice("ok", `Subiendo ${list.length} archivo${list.length === 1 ? "" : "s"}…`);
    let ok = 0; let lastPath = ""; let docs = 0;
    for (const f of list) {
      const isDoc = !f.type.startsWith("image/") && DOC_EXT_RE.test(f.name);
      try {
        const j = await api(isDoc ? "/api/media/document" : "/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, data: await fileToBase64(f), folder }) });
        lastPath = j.path; ok++; if (isDoc) docs++;
      } catch (e) { notice("err", `No se pudo subir ${esc(f.name)}: ${esc(e.message)}`); }
    }
    if (ok) {
      const detalle = docs === ok ? "" : " (las imágenes se optimizan a WebP)";
      notice("ok", `${ok} archivo${ok === 1 ? "" : "s"} subido${ok === 1 ? "" : "s"}${lastPath ? `: <code>${esc(lastPath)}</code>` : ""}${detalle}. Disponible en ~1 minuto.`);
      data = await api("/api/media");
      // Muestra dónde acaba de subir: los documentos siempre caen en /documentos.
      currentFolder = docs === ok ? (folder ? `documentos/${folder}` : "documentos") : (folder ? `uploads/${folder}` : currentFolder);
      draw();
    }
  }

  const file = el("input"); file.type = "file"; file.accept = `image/*,${DOC_ACCEPT}`; file.multiple = true; file.hidden = true;
  wrap.appendChild(file);
  $("media-add").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (!file.files.length) return;
    const folder = ($("media-folder").value || "").trim().toLowerCase();
    try { await uploadFiles(file.files, folder); } finally { file.value = ""; }
  });

  // Reemplazo en el mismo sitio: sustituye los bytes de un archivo conservando su
  // ruta (todas las referencias siguen funcionando). Solo /uploads y /documentos,
  // solo admin, y sin cambiar de formato.
  const replaceInput = el("input"); replaceInput.type = "file"; replaceInput.accept = "image/*"; replaceInput.hidden = true;
  replaceInput.id = "media-replace-file";
  wrap.appendChild(replaceInput);
  let replaceTarget = null;
  replaceInput.addEventListener("change", async () => {
    const f = replaceInput.files[0];
    if (!f || !replaceTarget) { replaceInput.value = ""; return; }
    const path = replaceTarget;
    const isDoc = DOC_EXT_RE.test(path);
    notice("ok", `Reemplazando ${isDoc ? "documento" : "imagen"}…`);
    try {
      await api(isDoc ? "/api/media/document" : "/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, data: await fileToBase64(f), replacePath: path }) });
      notice("ok", `${isDoc ? "Documento reemplazado" : "Imagen reemplazada"}: <code>${esc(path)}</code>. Todo lo que lo usa se actualiza en ~1 minuto.`);
      data = await api("/api/media");
      draw();
    } catch (e) { notice("err", "" + esc(e.message)); }
    finally { replaceInput.value = ""; replaceTarget = null; }
  });

  // Arrastrar y soltar: resalta la rejilla y sube lo que se suelte encima.
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  ["dragenter", "dragover"].forEach((ev) => grid.addEventListener(ev, (e) => { stop(e); grid.classList.add("dragover"); }));
  ["dragleave", "dragend"].forEach((ev) => grid.addEventListener(ev, (e) => { stop(e); if (e.target === grid) grid.classList.remove("dragover"); }));
  grid.addEventListener("drop", async (e) => {
    stop(e); grid.classList.remove("dragover");
    if (!e.dataTransfer?.files?.length) return;
    const folder = ($("media-folder").value || "").trim().toLowerCase();
    await uploadFiles(e.dataTransfer.files, folder);
  });

  // Elimina en lote las imágenes marcadas (el servidor rechaza las que estén en uso).
  async function deleteSelected() {
    const paths = [...selected];
    if (!paths.length) return;
    if (!(await confirmModal({ title: "Eliminar seleccionados", message: `¿Eliminar permanentemente ${paths.length} archivo${paths.length === 1 ? "" : "s"}?\nLos que estén en uso en alguna página, entrada o carrera se conservarán.`, confirmLabel: "Eliminar seleccionados", danger: true }))) return;
    let done = 0; const failed = [];
    for (const p of paths) {
      try { await api(`/api/media?path=${encodeURIComponent(p)}`, { method: "DELETE" }); done++; selected.delete(p); }
      catch (e) { failed.push(p.split("/").pop()); }
    }
    data = await api("/api/media");
    draw();
    if (done) notice("ok", `${done} archivo${done === 1 ? "" : "s"} eliminado${done === 1 ? "" : "s"}. El sitio se actualiza en ~1 minuto.`);
    if (failed.length) notice("err", `${failed.length} en uso, no se eliminó: ${failed.map((n) => esc(n)).join(", ")}. Quítalo(s) del contenido primero.`);
  }

  function drawSelBar() {
    const n = selected.size;
    selBar.hidden = n === 0;
    if (!n) return;
    selBar.innerHTML = `<span class="media-selcount"><b>${n}</b> seleccionado${n === 1 ? "" : "s"}</span>`;
    const del = el("button", "button button-danger", "Eliminar seleccionados");
    del.addEventListener("click", deleteSelected);
    const clr = el("button", "button", "Limpiar selección");
    clr.addEventListener("click", () => { selected.clear(); draw(); });
    selBar.append(del, clr);
  }

  const folderLabel = mediaFolderLabel;
  function drawFolders() {
    filterRow.innerHTML = "";
    const present = [...new Set(data.items.map((i) => i.folder))]
      .sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a === "news" ? 1 : b === "news" ? -1 : a.localeCompare(b, "es")));
    const chip = (val, label, active) => {
      const c = el("button", "media-folder-chip" + (active ? " active" : ""), esc(label));
      c.addEventListener("click", () => { currentFolder = val; draw(); });
      return c;
    };
    filterRow.appendChild(chip(null, `Todas (${data.items.length})`, currentFolder === null));
    present.forEach((f) => filterRow.appendChild(
      chip(f, `${folderLabel(f)} (${data.items.filter((i) => i.folder === f).length})`, currentFolder === f)));
    // La subida va bajo /uploads/ (imágenes) o /documentos/ (documentos), así que
    // se sugieren las subcarpetas de ambos, sin repetir.
    const dl = $("media-folder-list");
    if (dl) dl.innerHTML = [...new Set((data.folders || [])
      .map((f) => /^(?:uploads|documentos)\/(.+)$/.exec(f)?.[1])
      .filter(Boolean))]
      .map((f) => `<option value="${esc(f)}"></option>`)
      .join("");
  }

  const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
  function draw() {
    drawFolders();
    drawSelBar();
    grid.innerHTML = "";
    const items = currentFolder === null ? data.items : data.items.filter((i) => i.folder === currentFolder);
    if (!items.length) {
      grid.innerHTML = `<p class='muted'>${data.items.length ? "No hay archivos en esta carpeta." : "La biblioteca está vacía. Sube tu primera imagen o documento (o arrastra varios aquí)."}</p>`;
      return;
    }
    for (const it of items) {
      const src = SITE ? SITE + it.path : it.path;
      const isDoc = it.kind === "doc";
      const selectable = EDITABLE_MEDIA(it.path) && isAdmin();
      const cell = el("div", "media-cell" + (selected.has(it.path) ? " selected" : ""));
      const inner = isDoc
        ? `<span class="media-doc-ico" aria-hidden="true">${esc(docExt(it.name))}</span><span class="media-name">${esc(it.name)}</span>`
        : `<img src="${esc(src)}" alt="" loading="lazy" /><span class="media-name">${esc(it.name)}</span>`;
      const b = el("button", "media-item" + (isDoc ? " media-item-doc" : ""), inner);
      cell.appendChild(b);
      // Casilla de selección para acciones en lote (solo /uploads, solo admin).
      if (selectable) {
        const ck = el("input", "media-check"); ck.type = "checkbox"; ck.checked = selected.has(it.path);
        ck.setAttribute("aria-label", `Seleccionar ${it.name}`);
        ck.addEventListener("click", (e) => e.stopPropagation()); // no abrir el detalle
        ck.addEventListener("change", () => {
          if (ck.checked) selected.add(it.path); else selected.delete(it.path);
          cell.classList.toggle("selected", ck.checked);
          drawSelBar();
        });
        cell.appendChild(ck);
      }
      b.addEventListener("click", async () => {
        detail.innerHTML = "";
        const deletable = EDITABLE_MEDIA(it.path) && isAdmin();
        const cosa = isDoc ? "el documento" : "la imagen";
        const box = el("div", "postbox");
        box.innerHTML = `
          <div class="postbox-header"><h2>${esc(it.name)}</h2><span class="muted">${kb(it.size)}</span></div>
          <div class="inside">
            <div class="ed-field"><span class="ed-field-label">Ruta (para usar en páginas y entradas)</span>
              <input type="text" class="form-input" readonly value="${esc(it.path)}" /></div>
            <p class="muted" data-usage><span class="spinner"></span>Buscando dónde se usa…</p>
            <div class="ed-image-btns">
              <button class="button" data-copy="${esc(it.path)}">Copiar ruta</button>
              ${SITE ? `<a class="button" href="${esc(src)}" target="_blank" rel="noopener">Abrir ${isDoc ? "documento" : "imagen"}</a>` : ""}
              ${deletable ? `<button class="button" data-rename="${esc(it.path)}">Renombrar…</button>` : ""}
              ${deletable ? `<button class="button" data-replace="${esc(it.path)}">Reemplazar ${isDoc ? "documento" : "imagen"}…</button>` : ""}
              ${deletable ? `<button class="button-link-delete" data-del="${esc(it.path)}">Eliminar permanentemente</button>` : ""}
            </div>
            ${deletable ? `<div class="media-rename" hidden>
              <label class="ed-field-label" for="media-rename-input">Nuevo nombre de archivo</label>
              <div class="media-rename-row">
                <input id="media-rename-input" class="form-input" type="text" value="${esc(it.name)}" aria-label="Nuevo nombre de archivo" />
                <button class="button button-primary" data-rename-save>Guardar</button>
                <button class="button" data-rename-cancel>Cancelar</button>
              </div>
              <p class="muted ed-field-help">Se mantiene la carpeta y la extensión. Solo funciona si ${cosa} no está en uso (si lo está, usa “Reemplazar”).</p>
            </div>` : ""}
            ${deletable ? `<p class="muted ed-field-help">“Reemplazar” conserva la ruta, así todo lo que usa ${cosa} se actualiza de golpe${isDoc ? " — es la forma de publicar una versión corregida de un informe sin romper los enlaces ya repartidos" : ""}.</p>` : ""}
          </div>`;
        box.querySelector("[data-copy]").addEventListener("click", (ev) => {
          navigator.clipboard.writeText(ev.target.dataset.copy).then(() => (ev.target.textContent = "Copiada"));
        });
        const renameBox = box.querySelector(".media-rename");
        const renameBtn = box.querySelector("[data-rename]");
        if (renameBtn && renameBox) {
          const input = renameBox.querySelector("#media-rename-input");
          renameBtn.addEventListener("click", () => { renameBox.hidden = !renameBox.hidden; if (!renameBox.hidden) { input.focus(); input.select(); } });
          renameBox.querySelector("[data-rename-cancel]").addEventListener("click", () => { renameBox.hidden = true; });
          const doRename = async () => {
            const name = input.value.trim();
            if (!name || name === it.name) { renameBox.hidden = true; return; }
            const save = renameBox.querySelector("[data-rename-save]");
            save.disabled = true; save.textContent = "Guardando…";
            try {
              const r = await api("/api/media/rename", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: it.path, name }) });
              notice("ok", `${isDoc ? "Documento renombrado" : "Imagen renombrada"} a <code>${esc(r.path)}</code>. El sitio se actualiza en ~1 minuto.`);
              detail.innerHTML = "";
              data = await api("/api/media");
              draw();
            } catch (e) {
              const uses = (e.data && e.data.usages) || [];
              notice("err", esc(e.message) + (uses.length ? "<br />En uso por: " + uses.map((u) => esc(`${u.title} (${u.type})`)).join(", ") : ""));
              save.disabled = false; save.textContent = "Guardar";
            }
          };
          renameBox.querySelector("[data-rename-save]").addEventListener("click", doRename);
          input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doRename(); } });
        }
        const repBtn = box.querySelector("[data-replace]");
        if (repBtn) repBtn.addEventListener("click", () => {
          replaceTarget = it.path;
          // El sustituto debe ser del mismo tipo que el original.
          replaceInput.accept = isDoc ? `.${docExt(it.name).toLowerCase()}` : "image/*";
          replaceInput.click();
        });
        const delBtn = box.querySelector("[data-del]");
        if (delBtn) delBtn.addEventListener("click", async () => {
          if (!(await confirmModal({ title: "Eliminar permanentemente", message: `¿Eliminar permanentemente ${it.path}?\nEsta acción no se puede deshacer desde el panel.`, confirmLabel: "Eliminar permanentemente", danger: true }))) return;
          try {
            await api(`/api/media?path=${encodeURIComponent(it.path)}`, { method: "DELETE" });
            notice("ok", `${isDoc ? "Documento eliminado" : "Imagen eliminada"}. El sitio se actualiza en ~1 minuto.`);
            detail.innerHTML = "";
            data = await api("/api/media");
            draw();
          } catch (e) {
            const uses = (e.data && e.data.usages) || [];
            notice("err", esc(e.message) + (uses.length ? "<br />En uso por: " + uses.map((u) => esc(`${u.title} (${u.type})`)).join(", ") : ""));
          }
        });
        detail.appendChild(box);
        detail.scrollIntoView({ block: "nearest" });
        // "Adjunto a": dónde se usa esta imagen (columna de uso de WP).
        try {
          const u = await api(`/api/media/usage?path=${encodeURIComponent(it.path)}`);
          const usageEl = box.querySelector("[data-usage]");
          const label = { page: "Página", career: "Carrera", post: "Entrada" };
          usageEl.innerHTML = u.usages.length
            ? "<b>Adjunto a:</b> " + u.usages.map((x) => {
                const href = x.type === "post" ? `#post/${esc(x.slug)}` : x.type === "page" ? `#page/${esc(x.slug)}` : `#career/${esc(x.slug)}`;
                return `<a href="${href}">${esc(x.title)}</a> <span class="muted">(${label[x.type] || x.type})</span>`;
              }).join(" · ")
            : "<b>Adjunto a:</b> ningún contenido (se puede eliminar con seguridad).";
        } catch { box.querySelector("[data-usage]").textContent = ""; }
      });
      grid.appendChild(cell);
    }
  }
  draw();
}

// Modal selector de medios (para imagen destacada y campos de imagen).
let mediaPickCb = null;
// Qué está eligiendo el modal ahora mismo: "image" (por defecto) o "doc".
let mediaPickKind = "image";
// opts.kind = "doc" limita la biblioteca a documentos (PDF/Word/Excel) y cambia
// lo que acepta el botón de subir. Sin opts se comporta como siempre: imágenes.
export async function openMediaModal(cb, opts = {}) {
  mediaPickCb = cb;
  mediaPickKind = opts.kind === "doc" ? "doc" : "image";
  const isDoc = mediaPickKind === "doc";
  const modal = $("media-modal");
  const grid = $("media-modal-grid");
  grid.innerHTML = "<p class='muted'>Cargando…</p>";
  modal.hidden = false;
  modal.querySelector(".wp-modal-head strong").textContent = isDoc ? "Documentos" : "Biblioteca de medios";
  $("media-modal-file").accept = isDoc ? DOC_ACCEPT : "image/*";
  // Barra de carpetas del modal (se crea una vez, se reutiliza).
  let bar = $("media-modal-folders");
  if (!bar) { bar = el("div", "media-folders"); bar.id = "media-modal-folders"; grid.parentNode.insertBefore(bar, grid); }
  bar.innerHTML = "";
  try {
    const data = await api(`/api/media?kind=${mediaPickKind}`);
    if (!data.items.length) {
      grid.innerHTML = isDoc
        ? "<p class='muted'>Todavía no hay documentos. Sube el primero con “Subir archivo”.</p>"
        : "<p class='muted'>La biblioteca está vacía. Sube una imagen.</p>";
      return;
    }
    let cur = null;
    const folderLabel = mediaFolderLabel;
    const present = [...new Set(data.items.map((i) => i.folder))]
      .sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a === "news" ? 1 : b === "news" ? -1 : a.localeCompare(b, "es")));
    const drawGrid = () => {
      const items = cur === null ? data.items : data.items.filter((i) => i.folder === cur);
      grid.innerHTML = items.length ? "" : `<p class='muted'>Sin ${isDoc ? "documentos" : "imágenes"} en esta carpeta.</p>`;
      for (const it of items) {
        // Un documento no tiene miniatura: se muestra su tipo y su nombre.
        const inner = isDoc
          ? `<span class="media-doc-ico" aria-hidden="true">${esc(docExt(it.name))}</span><span class="media-name">${esc(it.name)}</span>`
          : `<img src="${esc(SITE ? SITE + it.path : it.path)}" alt="" loading="lazy" /><span class="media-name">${esc(it.name)}</span>`;
        const b = el("button", "media-item" + (isDoc ? " media-item-doc" : ""), inner);
        b.addEventListener("click", () => { modal.hidden = true; if (mediaPickCb) mediaPickCb(it.path); });
        grid.appendChild(b);
      }
    };
    const render = () => {
      bar.innerHTML = "";
      if (present.length > 1) { // solo tiene sentido filtrar si hay más de una carpeta
        const chip = (val, label) => {
          const c = el("button", "media-folder-chip" + (cur === val ? " active" : ""), esc(label));
          c.addEventListener("click", () => { cur = val; render(); });
          return c;
        };
        bar.appendChild(chip(null, `Todas (${data.items.length})`));
        present.forEach((f) => bar.appendChild(chip(f, `${folderLabel(f)} (${data.items.filter((i) => i.folder === f).length})`)));
      }
      drawGrid();
    };
    render();
  } catch (e) { grid.innerHTML = `<p class='error'>${esc(e.message)}</p>`; }
}
// Botones "Biblioteca" + "⬆ Subir" para un campo de DOCUMENTO. Los comparten el
// formulario del cajón y el editor del lienzo (rendición de cuentas): subir un
// PDF tiene que hacerse igual en los dos sitios, y con un solo camino de código
// no puede volver a quedarse uno sin la subida.
// onPick(ruta) recibe la ruta pública ya publicada (/documentos/…).
export function docPickerButtons(onPick, opts = {}) {
  const cls = opts.cls || "button";
  const file = el("input"); file.type = "file"; file.accept = DOC_ACCEPT; file.style.display = "none";
  const pick = el("button", cls, "Biblioteca");
  pick.type = "button";
  pick.title = "Elegir un documento ya subido";
  pick.addEventListener("click", (e) => { e.stopPropagation(); openMediaModal(onPick, { kind: "doc" }); });
  const up = el("button", cls, "⬆ Subir");
  up.type = "button";
  up.title = "Subir un PDF o Word desde tu computadora";
  up.addEventListener("click", (e) => { e.stopPropagation(); file.click(); });
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    const antes = up.textContent;
    up.disabled = true; up.textContent = "Subiendo…";
    try {
      const j = await api("/api/media/document", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, data: await fileToBase64(f) }),
      });
      onPick(j.path);
    } catch (err) { alert("No se pudo subir el documento: " + err.message); }
    finally { up.disabled = false; up.textContent = antes; file.value = ""; }
  });
  return [pick, up, file];
}

$("media-modal-close").addEventListener("click", () => ($("media-modal").hidden = true));
$("media-modal").addEventListener("click", (e) => { if (e.target.id === "media-modal") $("media-modal").hidden = true; });
$("media-modal-upload").addEventListener("click", () => $("media-modal-file").click());
$("media-modal-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const btn = $("media-modal-upload");
  const isDoc = mediaPickKind === "doc";
  btn.disabled = true; btn.textContent = "Subiendo…";
  try {
    const j = await api(isDoc ? "/api/media/document" : "/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, data: await fileToBase64(f) }) });
    $("media-modal").hidden = true;
    if (mediaPickCb) mediaPickCb(j.path);
  } catch (err) { alert(`No se pudo subir ${isDoc ? "el documento" : "la imagen"}: ` + err.message); }
  finally { btn.disabled = false; btn.textContent = "Subir archivo"; e.target.value = ""; }
});

