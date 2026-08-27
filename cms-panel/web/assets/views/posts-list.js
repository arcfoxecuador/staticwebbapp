import { save } from "../blocks/save.js";
import { slug } from "../blocks/state.js";
import { api } from "../core/api.js";
import { $, el, esc, fmtDate } from "../core/dom.js";
import { SITE } from "../core/state.js";
import { confirmModal, loadingScreen, notice, screen } from "../core/ui.js";

// ── Entradas: listado (wp-list-table con lote y edición rápida) ──────────────
const POSTS_COLS = [
  ["thumb", "Miniatura"],
  ["author", "Autor"],
  ["cat", "Categoría"],
  ["tags", "Etiquetas"],
  ["date", "Fecha"],
];
function postsColPrefs() {
  try { return { thumb: true, author: true, cat: true, tags: true, date: true, ...JSON.parse(localStorage.getItem("wp-cols-posts") || "{}") }; }
  catch { return { thumb: true, author: true, cat: true, tags: true, date: true }; }
}

export async function showPosts() {
  loadingScreen("Entradas");
  let data;
  try { data = await api("/api/posts"); }
  catch (e) { screen("Entradas", "Entradas"); notice("err", esc(e.message)); return; }
  const posts = data.posts || [];
  const categories = data.categories || [];
  let cols = postsColPrefs();

  // Opciones de pantalla: columnas visibles (persistidas por usuario).
  const opts = el("div");
  opts.appendChild(el("h3", null, "Columnas"));
  const optsRow = el("div", "cols");
  for (const [key, label] of POSTS_COLS) {
    const lab = el("label");
    const c = el("input"); c.type = "checkbox"; c.checked = !!cols[key];
    c.addEventListener("change", () => {
      cols[key] = c.checked;
      localStorage.setItem("wp-cols-posts", JSON.stringify(cols));
      draw();
    });
    lab.append(c, document.createTextNode(" " + label));
    optsRow.appendChild(lab);
  }
  opts.appendChild(optsRow);

  const help = `
    <h3>Resumen</h3>
    <p>Esta pantalla muestra todas las entradas del blog. Pasa el cursor sobre una fila para ver sus acciones:
    <b>Editar</b> abre el editor completo, <b>Edición rápida</b> permite cambiar título, estado, fecha y categoría sin salir del listado,
    <b>Papelera</b> elimina la entrada (el historial de Git guarda una copia) y <b>Ver</b> la abre en el sitio.</p>
    <p>Usa los enlaces <b>Todas / Publicadas / Borradores</b> para filtrar por estado, la caja de búsqueda para filtrar por texto,
    y las <b>Acciones en lote</b> para mover varias entradas a la papelera a la vez.</p>`;

  const wrap = screen("Entradas", `Entradas <a class="page-title-action" href="#post/new">Añadir nueva entrada</a>`, { screenOptions: opts, help });
  let filter = "all"; let query = "";
  let trashItems = null; // papelera: se carga al entrar al filtro

  const sub = el("ul", "subsubsub");
  const nav = el("div", "tablenav");
  const bulk = el("div", "bulkactions");
  bulk.innerHTML = `
    <select id="bulk-action" aria-label="Acciones en lote">
      <option value="-1">Acciones en lote</option>
      <option value="trash">Mover a la papelera</option>
    </select>
    <button class="button" id="do-bulk">Aplicar</button>`;
  const right = el("div", "bulkactions");
  right.innerHTML = `<input type="search" id="post-search" class="form-input" placeholder="Buscar entradas…" aria-label="Buscar entradas" style="min-width:200px" /> <span class="displaying-num" id="post-count"></span>`;
  nav.append(bulk, right);
  const table = el("table", "wp-list-table");
  wrap.append(sub, nav, table);

  const visible = () => posts.filter((p) =>
    (filter === "all" || (filter === "draft") === !!p.draft) &&
    (!query || (p.title + " " + p.tags.join(" ")).toLowerCase().includes(query)));

  function drawSub() {
    const drafts = posts.filter((p) => p.draft).length;
    const mk = (f, label, n) => `<li><a data-f="${f}" class="${filter === f ? "current" : ""}">${label} <span class="count">(${n})</span></a></li>`;
    sub.innerHTML =
      mk("all", "Todas", posts.length) +
      mk("published", "Publicadas", posts.length - drafts) +
      (drafts ? mk("draft", "Borradores", drafts) : "") +
      mk("trash", "Papelera", trashItems ? trashItems.length : "…");
    sub.querySelectorAll("a[data-f]").forEach((a) => a.addEventListener("click", () => { filter = a.dataset.f; draw(); }));
  }

  async function trashPosts(slugs) {
    let done = 0;
    for (const s of slugs) {
      await api(`/api/posts/${s}`, { method: "DELETE" });
      posts.splice(posts.findIndex((x) => x.slug === s), 1);
      done++;
    }
    return done;
  }

  // Edición rápida: sustituye la fila por el formulario inline de WP.
  function quickEditRow(p, tr, colspan) {
    const edit = el("tr", "inline-edit-row");
    const td = el("td"); td.colSpan = colspan;
    td.innerHTML = `
      <div class="inline-edit-title">Edición rápida</div>
      <div class="inline-edit-fields">
        <label>Título<input type="text" data-qe="title" value="${esc(p.title)}" /></label>
        <label>Fecha<input type="date" data-qe="date" value="${esc(p.date)}" /></label>
        <label>Categoría<select data-qe="cat">${categories.map((c) => `<option ${c === p.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label>Estado<select data-qe="draft">
          <option value="published" ${!p.draft ? "selected" : ""}>Publicada</option>
          <option value="draft" ${p.draft ? "selected" : ""}>Borrador</option>
        </select></label>
      </div>
      <div class="inline-edit-actions">
        <button class="button button-primary" data-qe-save>Actualizar</button>
        <button class="button" data-qe-cancel>Cancelar</button>
        <span class="muted" data-qe-status></span>
      </div>`;
    edit.appendChild(td);
    tr.replaceWith(edit);
    td.querySelector("[data-qe-cancel]").addEventListener("click", draw);
    td.querySelector("[data-qe-save]").addEventListener("click", async () => {
      const btn = td.querySelector("[data-qe-save]");
      const st = td.querySelector("[data-qe-status]");
      btn.disabled = true; st.innerHTML = "<span class='spinner'></span>Actualizando…";
      try {
        // La edición rápida no carga el cuerpo: se lee completo y se guarda encima.
        const full = await api(`/api/posts/${p.slug}`);
        full.title = td.querySelector('[data-qe="title"]').value.trim() || full.title;
        full.date = td.querySelector('[data-qe="date"]').value || full.date;
        full.cat = td.querySelector('[data-qe="cat"]').value;
        full.draft = td.querySelector('[data-qe="draft"]').value === "draft";
        await api(`/api/posts/${p.slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...full, baseSha: full._sha }) });
        Object.assign(p, { title: full.title, date: full.date, cat: full.cat, draft: full.draft });
        notice("ok", "Entrada actualizada.");
        draw();
      } catch (e) { st.textContent = e.message; btn.disabled = false; }
    });
  }

  async function drawTrash() {
    drawSub();
    $("post-count").textContent = "";
    table.innerHTML = `<thead><tr><th>Título</th><th class="column-date">Fecha</th><th class="column-date">Eliminada</th><th></th></tr></thead>`;
    const tbody = el("tbody");
    tbody.innerHTML = `<tr><td colspan="4" class="muted"><span class="spinner"></span>Cargando papelera…</td></tr>`;
    table.appendChild(tbody);
    if (!trashItems) {
      try { trashItems = (await api("/api/trash")).items; drawSub(); }
      catch (e) { tbody.innerHTML = `<tr><td colspan="4" class="error">${esc(e.message)}</td></tr>`; return; }
    }
    tbody.innerHTML = "";
    for (const t of trashItems) {
      const tr = el("tr");
      tr.innerHTML = `
        <td><span class="row-title">${esc(t.title)}</span><div class="muted">${esc(t.slug)}</div></td>
        <td class="column-date">${t.date ? fmtDate(t.date) : ""}</td>
        <td class="column-date">${t.deletedAt ? new Date(t.deletedAt).toLocaleDateString() : ""}</td>
        <td class="wp-row-cta"><button class="button" data-restore="${esc(t.slug)}" data-parent="${esc(t.parentSha)}">Restaurar</button></td>`;
      tbody.appendChild(tr);
    }
    if (!trashItems.length) tbody.innerHTML = `<tr><td colspan="4" class="muted">La papelera está vacía.</td></tr>`;
    tbody.querySelectorAll("[data-restore]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        btn.disabled = true; btn.textContent = "Restaurando…";
        try {
          await api("/api/trash/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: btn.dataset.restore, parentSha: btn.dataset.parent }) });
          notice("ok", `Entrada "${esc(btn.dataset.restore)}" restaurada.`);
          showPosts(); // recarga listado completo (la entrada vuelve a Todas)
        } catch (e) { notice("err", esc(e.message)); btn.disabled = false; btn.textContent = "Restaurar"; }
      }));
  }

  function draw() {
    if (filter === "trash") { drawTrash(); return; }
    drawSub();
    const rows = visible();
    $("post-count").textContent = `${rows.length} elemento${rows.length === 1 ? "" : "s"}`;
    const headCols =
      `<td class="check-column"><input type="checkbox" id="cb-all" aria-label="Seleccionar todo" /></td>` +
      (cols.thumb ? `<th class="column-thumb"></th>` : "") +
      `<th>Título</th>` +
      (cols.author ? `<th class="column-author">Autor</th>` : "") +
      (cols.cat ? `<th class="column-cat">Categoría</th>` : "") +
      (cols.tags ? `<th>Etiquetas</th>` : "") +
      (cols.date ? `<th class="column-date">Fecha</th>` : "");
    const colspan = 2 + ["thumb", "author", "cat", "tags", "date"].filter((k) => cols[k]).length;
    table.innerHTML = `<thead><tr>${headCols}</tr></thead>`;
    const tbody = el("tbody");
    for (const p of rows) {
      const tr = el("tr");
      const img = p.img && p.img.startsWith("/") && SITE ? SITE + p.img : p.img;
      const view = SITE ? `${SITE}/noticias/${p.slug}/` : "";
      tr.innerHTML = `
        <td class="check-column"><input type="checkbox" data-cb="${esc(p.slug)}" aria-label="Seleccionar ${esc(p.title)}" /></td>
        ${cols.thumb ? `<td class="column-thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy" />` : ""}</td>` : ""}
        <td>
          <a class="row-title" href="#post/${esc(p.slug)}">${esc(p.title)}</a>
          ${p.draft ? " — <span class='row-state'>Borrador</span>" : ""}
          <div class="row-actions">
            <span><a href="#post/${esc(p.slug)}">Editar</a></span>
            <span><a data-quick="${esc(p.slug)}">Edición rápida</a></span>
            <span class="trash"><a data-trash="${esc(p.slug)}">Papelera</a></span>
            ${view && !p.draft ? `<span><a href="${esc(view)}" target="_blank" rel="noopener">Ver</a></span>` : ""}
          </div>
        </td>
        ${cols.author ? `<td class="column-author">${esc(p.author)}</td>` : ""}
        ${cols.cat ? `<td class="column-cat">${esc(p.cat)}</td>` : ""}
        ${cols.tags ? `<td class="muted">${p.tags.map(esc).join(", ")}</td>` : ""}
        ${cols.date ? `<td class="column-date">${p.draft ? "Borrador" : "Publicada"}<br /><span class="muted">${fmtDate(p.date)}</span></td>` : ""}`;
      tr.querySelector("[data-quick]").addEventListener("click", () => quickEditRow(p, tr, colspan));
      tbody.appendChild(tr);
    }
    if (!rows.length) tbody.innerHTML = `<tr><td colspan="${colspan}" class="muted">No se encontraron entradas.</td></tr>`;
    table.appendChild(tbody);

    const cbAll = table.querySelector("#cb-all");
    if (cbAll) cbAll.addEventListener("change", () => {
      table.querySelectorAll("[data-cb]").forEach((c) => (c.checked = cbAll.checked));
    });
    table.querySelectorAll("a[data-trash]").forEach((a) =>
      a.addEventListener("click", async () => {
        const s = a.dataset.trash;
        const p = posts.find((x) => x.slug === s);
        if (!(await confirmModal({ title: "Mover a la papelera", message: `¿Mover a la papelera la entrada "${p ? p.title : s}"?\nEl historial de Git guarda una copia por si necesitas restaurarla.`, confirmLabel: "Mover a la papelera", danger: true }))) return;
        try {
          await trashPosts([s]);
          notice("ok", "Una entrada movida a la papelera. El sitio se actualiza en ~1 minuto.");
          draw();
        } catch (e) { notice("err", "" + esc(e.message)); }
      }));
  }

  $("do-bulk").addEventListener("click", async () => {
    if ($("bulk-action").value !== "trash") return;
    const slugs = [...table.querySelectorAll("[data-cb]:checked")].map((c) => c.dataset.cb);
    if (!slugs.length) return;
    if (!(await confirmModal({ title: "Mover a la papelera", message: `¿Mover a la papelera ${slugs.length} entrada${slugs.length === 1 ? "" : "s"}?`, confirmLabel: "Mover a la papelera", danger: true }))) return;
    const btn = $("do-bulk"); btn.disabled = true; btn.textContent = "Aplicando…";
    try {
      const n = await trashPosts(slugs);
      notice("ok", `${n} entrada${n === 1 ? " movida" : "s movidas"} a la papelera.`);
      draw();
    } catch (e) { notice("err", "" + esc(e.message)); draw(); }
    finally { btn.disabled = false; btn.textContent = "Aplicar"; $("bulk-action").value = "-1"; }
  });
  $("post-search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); draw(); });
  draw();
}

