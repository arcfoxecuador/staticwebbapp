import { slug } from "../blocks/state.js";
import { api } from "../core/api.js";
import { currentPostSnapshot } from "../core/dirty.js";
import { $, el, esc, fileToBase64, fmtDate } from "../core/dom.js";
import { mdToHtml } from "../core/markdown.js";
import { knownAuthors } from "../core/palette.js";
import { revisionsBox, slugifyClient } from "../core/revisions.js";
import { go, setCurrentHash } from "../core/router.js";
import { SITE } from "../core/state.js";
import { confirmModal, loadingScreen, notice, screen } from "../core/ui.js";
import { openMediaModal } from "./media.js";

// Entrada abierta en el editor.
export let post = null, postIsNew = false, postSnapshot = null;

// ── Vista previa completa de una entrada (como artículo) ─────────────────────
// Un borrador no existe en ninguna URL del sitio (Astro filtra draft:true), así
// que la vista previa se arma aquí: monta el artículo (portada + título + meta +
// cuerpo) en un iframe aislado (srcdoc, sin scripts) con estilo propio, así se
// ve parecido al sitio sin heredar el CSS del panel. Muestra el ESTADO ACTUAL
// del editor (incluye cambios sin guardar).
function articlePreviewDoc(post) {
  const cover = post.img
    ? (/^https?:/.test(post.img) ? post.img : (SITE && post.img.startsWith("/") ? SITE + post.img : ""))
    : "";
  const meta = [post.cat, post.date ? fmtDate(post.date) : "", post.author].filter(Boolean).join(" · ");
  const body = mdToHtml(post.body) || "<p><em>Sin contenido todavía.</em></p>";
  const badge = post.draft ? `<div class="pv-badge">Borrador — aún no publicado</div>` : "";
  const cover_ = cover
    ? `<img class="pv-cover" src="${esc(cover)}" alt="${esc(post.imgAlt || "")}" />`
    : (post.img ? `<div class="pv-cover pv-cover-missing">Portada: ${esc(post.img)}<br><small>(se verá en el sitio publicado)</small></div>` : "");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1a2340;background:#fff;line-height:1.7}
    .pv{max-width:720px;margin:0 auto;padding:32px 22px 80px}
    .pv-badge{display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;padding:4px 11px;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:18px}
    .pv-cover{width:100%;border-radius:14px;margin:0 0 26px;display:block;aspect-ratio:16/9;object-fit:cover;background:#eef1f8}
    .pv-cover-missing{display:grid;place-items:center;text-align:center;color:#5b6b8c;font-size:14px;padding:20px}
    h1.pv-title{font-size:34px;line-height:1.2;color:#01154a;margin:0 0 12px}
    .pv-meta{color:#5b6b8c;font-size:14px;margin:0 0 30px}
    .pv-body h2{font-size:24px;color:#01154a;margin:34px 0 10px}
    .pv-body h3{font-size:19px;color:#01154a;margin:26px 0 8px}
    .pv-body p{margin:0 0 16px}
    .pv-body ul,.pv-body ol{margin:0 0 16px 22px}
    .pv-body li{margin:4px 0}
    .pv-body a{color:#3a4fe3}
    .pv-body blockquote{border-left:4px solid #c7d0ec;margin:18px 0;padding:4px 0 4px 16px;color:#5b6b8c;font-style:italic}
    .pv-body code{background:#f1f3fb;padding:2px 5px;border-radius:4px;font-size:.92em}
  </style></head><body><article class="pv">
    ${badge}${cover_}
    <h1 class="pv-title">${esc(post.title || "Sin título")}</h1>
    <div class="pv-meta">${esc(meta)}</div>
    <div class="pv-body">${body}</div>
  </article></body></html>`;
}

function openPostPreview(post) {
  if ($("pv-back")) return;
  const back = el("div", "pv-back"); back.id = "pv-back";
  back.setAttribute("role", "dialog"); back.setAttribute("aria-modal", "true"); back.setAttribute("aria-label", "Vista previa de la entrada");
  const shell = el("div", "pv-shell");
  const bar = el("div", "pv-bar");
  const t = el("span", "pv-bar-title", `Vista previa${post.draft ? " · borrador" : ""}`);
  const close = el("button", "button", "Cerrar");
  bar.append(t, close);
  const frame = el("iframe", "pv-frame");
  frame.setAttribute("title", "Vista previa de la entrada");
  frame.setAttribute("sandbox", "allow-same-origin"); // solo se muestra; sin scripts
  frame.srcdoc = articlePreviewDoc(post);
  shell.append(bar, frame);
  back.appendChild(shell);
  document.body.appendChild(back);
  const closeFn = () => { document.removeEventListener("keydown", onKey, true); back.remove(); };
  const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); closeFn(); } };
  close.addEventListener("click", closeFn);
  back.addEventListener("click", (e) => { if (e.target === back) closeFn(); });
  document.addEventListener("keydown", onKey, true);
  close.focus();
}

// ── Entradas: editor (clásico de WP) ─────────────────────────────────────────
// Clave del autoguardado local de la entrada abierta.
export function postAutosaveKey() { return `wp-autosave-post-${postIsNew ? "new" : post.slug}`; }

export async function openPost(s) {
  postIsNew = !s;
  let categories = [];
  try {
    if (s) {
      loadingScreen("Editar entrada");
      const [p, list] = await Promise.all([api(`/api/posts/${s}`), api("/api/posts")]);
      post = p; categories = list.categories || [];
    } else {
      const list = await api("/api/posts");
      categories = list.categories || [];
      post = {
        slug: "", title: "", cat: categories[0] || "", date: new Date().toISOString().slice(0, 10),
        excerpt: "", img: "", imgAlt: "", draft: true, author: "Equipo IIDEA", tags: [], body: "",
      };
    }
  } catch (e) { screen("Entradas", "Entradas"); notice("err", esc(e.message)); return; }

  renderPostEditor(categories);
  offerAutosaveRestore(categories);
}

// Si hay una copia local más nueva que lo guardado (el navegador se cerró con
// cambios sin guardar), ofrece restaurarla — como el autoguardado de WP.
function offerAutosaveRestore(categories) {
  let stash = null;
  try { stash = JSON.parse(localStorage.getItem(postAutosaveKey()) || "null"); } catch { /* corrupto */ }
  if (!stash || !stash.post) return;
  const clean = (x) => JSON.stringify({ ...x, _sha: undefined });
  if (clean(stash.post) === clean(post)) { localStorage.removeItem(postAutosaveKey()); return; }
  notice("ok", `Hay una copia local con cambios sin guardar (autoguardado ${new Date(stash.at).toLocaleString()}). <a data-as-restore>Restaurarla</a> · <a data-as-discard>Descartarla</a>`);
  const area = $("screen-notice");
  area.querySelector("[data-as-restore]").addEventListener("click", () => {
    post = { ...stash.post, _sha: post._sha }; // el sha vigente manda (conflictos)
    renderPostEditor(categories);
    notice("ok", "Copia local restaurada. Revisa y pulsa Actualizar para guardarla.");
  });
  area.querySelector("[data-as-discard]").addEventListener("click", () => {
    localStorage.removeItem(postAutosaveKey());
    area.innerHTML = "";
  });
}

function renderPostEditor(categories) {
  const wrap = screen(postIsNew ? "Añadir nueva entrada" : "Editar entrada",
    `${postIsNew ? "Añadir nueva entrada" : "Editar entrada"} <a class="page-title-action" href="#posts">← Todas las entradas</a>`);

  const grid = el("div", "post-editor");
  const main = el("div", "post-editor-main");
  const side = el("div", "post-side");
  grid.append(main, side);
  wrap.appendChild(grid);

  // Título + enlace permanente (editable mientras la entrada es nueva)
  const title = el("input", "post-title-input");
  title.type = "text"; title.placeholder = "Añade un título"; title.value = post.title; title.setAttribute("aria-label", "Título de la entrada");
  const permalink = el("p", "post-permalink");
  let slugTouched = !!post.slug && postIsNew; // si vino de un borrador local
  const updPermalink = () => {
    if (postIsNew) {
      const s2 = post.slug || slugifyClient(post.title);
      permalink.innerHTML = s2
        ? `<b>Enlace permanente:</b> ${esc(SITE || "")}/noticias/<input type="text" class="form-input post-slug-input" value="${esc(s2)}" aria-label="Slug de la entrada" />/`
        : "";
      const inp = permalink.querySelector("input");
      if (inp) inp.addEventListener("input", () => { slugTouched = true; post.slug = slugifyClient(inp.value); });
    } else {
      permalink.innerHTML = `<b>Enlace permanente:</b> <a href="${esc(SITE)}/noticias/${esc(post.slug)}/" target="_blank" rel="noopener">${esc(SITE || "")}/noticias/${esc(post.slug)}/</a>`;
    }
  };
  title.addEventListener("input", () => {
    post.title = title.value;
    if (postIsNew && !slugTouched) { post.slug = ""; updPermalink(); }
  });
  updPermalink();
  main.append(title, permalink);

  // Cuerpo (Markdown) con barra de formato y pestaña de vista previa
  const bodyBox = el("div", "postbox post-body-box");
  bodyBox.innerHTML = `<div class="postbox-header"><h2>Contenido</h2>
    <span class="md-tabs"><button class="md-tab current" data-md="edit">Editar</button><button class="md-tab" data-md="preview">Vista previa</button></span></div>`;
  const bodyInside = el("div", "inside");
  const ta = el("textarea", "form-input");
  ta.value = post.body; ta.setAttribute("aria-label", "Contenido de la entrada (Markdown)");
  ta.addEventListener("input", () => (post.body = ta.value));
  const previewBox = el("div", "md-preview"); previewBox.hidden = true;
  const mdWrap = (open, close, blockPrefix) => {
    const st = ta.selectionStart, en = ta.selectionEnd;
    if (blockPrefix != null) {
      const before = ta.value.slice(0, st);
      const lineStart = before.lastIndexOf("\n") + 1;
      ta.value = ta.value.slice(0, lineStart) + blockPrefix + ta.value.slice(lineStart);
      ta.selectionStart = ta.selectionEnd = en + blockPrefix.length;
    } else {
      ta.value = ta.value.slice(0, st) + open + ta.value.slice(st, en) + close + ta.value.slice(en);
      ta.selectionStart = st + open.length; ta.selectionEnd = en + open.length;
    }
    ta.focus(); post.body = ta.value;
  };
  const bar = el("div", "ed-rtbar");
  const fmt = (lbl, titleTxt, fn, cls) => {
    const b = el("button", "ed-rtbtn" + (cls ? " " + cls : ""), lbl);
    b.type = "button"; b.title = titleTxt;
    b.addEventListener("mousedown", (ev) => ev.preventDefault());
    b.addEventListener("click", fn);
    return b;
  };
  bar.append(
    fmt("B", "Negrita", () => mdWrap("**", "**")),
    fmt("I", "Itálica", () => mdWrap("*", "*"), "it"),
    fmt("🔗", "Enlace", () => { const url = prompt("URL del enlace:", "https://"); if (url) mdWrap("[", `](${url})`); }),
    fmt("H2", "Título de sección", () => mdWrap(null, null, "## ")),
    fmt("H3", "Subtítulo", () => mdWrap(null, null, "### ")),
    fmt("• Lista", "Elemento de lista", () => mdWrap(null, null, "- ")),
    fmt("❝ Cita", "Cita", () => mdWrap(null, null, "> ")),
  );
  bodyInside.append(bar, ta, previewBox);
  bodyBox.appendChild(bodyInside);
  main.appendChild(bodyBox);
  bodyBox.querySelectorAll(".md-tab").forEach((t) =>
    t.addEventListener("click", () => {
      bodyBox.querySelectorAll(".md-tab").forEach((x) => x.classList.toggle("current", x === t));
      const preview = t.dataset.md === "preview";
      ta.hidden = preview; bar.hidden = preview; previewBox.hidden = !preview;
      if (preview) previewBox.innerHTML = mdToHtml(post.body) || "<p class='muted'>Sin contenido todavía.</p>";
    }));

  // Extracto
  const exBox = el("div", "postbox");
  exBox.innerHTML = `<div class="postbox-header"><h2>Extracto</h2></div>`;
  const exInside = el("div", "inside");
  const ex = el("textarea", "form-input"); ex.rows = 3; ex.maxLength = 280; ex.value = post.excerpt; ex.setAttribute("aria-label", "Extracto de la entrada");
  ex.addEventListener("input", () => (post.excerpt = ex.value));
  exInside.appendChild(ex);
  exInside.appendChild(el("p", "muted", "Resumen breve para el listado de noticias y para SEO (máx. 280 caracteres)."));
  exBox.appendChild(exInside);
  main.appendChild(exBox);

  // ── Caja Publicar ──
  const pub = el("div", "postbox");
  pub.innerHTML = `<div class="postbox-header"><h2>Publicar</h2></div>`;
  const pubIn = el("div", "inside");
  const stateSec = el("div", "misc-pub-section");
  stateSec.innerHTML = `Estado: <select id="post-status" aria-label="Estado de la entrada">
      <option value="draft">Borrador</option><option value="published">Publicada</option>
    </select>`;
  const dateSec = el("div", "misc-pub-section");
  dateSec.innerHTML = `Fecha: <input type="date" id="post-date" value="${esc(post.date)}" aria-label="Fecha de la entrada" />
    <span class="ed-field-help muted" style="display:block">Una fecha futura programa la publicación (aparece en el primer build tras esa fecha).</span>`;
  const authorSec = el("div", "misc-pub-section");
  // Autor con sugerencias de autores ya usados (evita variantes tipográficas del
  // mismo nombre). Sigue admitiendo texto libre para un autor nuevo.
  authorSec.innerHTML = `Autor: <input type="text" class="form-input" id="post-author" list="post-author-list" value="${esc(post.author)}" style="width:auto" autocomplete="off" aria-label="Autor de la entrada" /><datalist id="post-author-list"></datalist>`;
  knownAuthors(post.author).then((authors) => {
    const dl = $("post-author-list");
    if (dl) dl.innerHTML = authors.map((a) => `<option value="${esc(a)}"></option>`).join("");
  });
  const previewBtn = el("button", "button pv-open", "👁 Vista previa");
  previewBtn.type = "button";
  previewBtn.title = "Ver la entrada como artículo (incluye cambios sin guardar)";
  previewBtn.addEventListener("click", () => openPostPreview(post));
  const actions = el("div", "publishing-actions");
  const trash = el("button", "button-link-delete", postIsNew ? "" : "Mover a la papelera");
  const saveBtn = el("button", "button button-primary", postIsNew ? "Publicar" : "Actualizar");
  actions.append(trash, saveBtn);
  pubIn.append(stateSec, dateSec, authorSec, previewBtn, actions);
  pub.appendChild(pubIn);
  side.appendChild(pub);

  const statusSel = stateSec.querySelector("#post-status");
  statusSel.value = post.draft ? "draft" : "published";
  const syncSaveLabel = () => {
    post.draft = statusSel.value === "draft";
    saveBtn.textContent = postIsNew ? (post.draft ? "Guardar borrador" : "Publicar") : "Actualizar";
  };
  statusSel.addEventListener("change", syncSaveLabel);
  syncSaveLabel();
  dateSec.querySelector("#post-date").addEventListener("input", (e) => (post.date = e.target.value));
  authorSec.querySelector("#post-author").addEventListener("input", (e) => (post.author = e.target.value));

  // ── Categorías (radio: la colección admite una) ──
  const catBox = el("div", "postbox");
  catBox.innerHTML = `<div class="postbox-header"><h2>Categorías</h2></div>`;
  const catIn = el("div", "inside");
  const catList = el("ul", "cat-list");
  for (const c of categories) {
    const li = el("li");
    const lab = el("label");
    const r = el("input"); r.type = "radio"; r.name = "post-cat"; r.value = c; r.checked = post.cat === c;
    r.addEventListener("change", () => { if (r.checked) post.cat = c; });
    lab.append(r, document.createTextNode(" " + c));
    li.appendChild(lab);
    catList.appendChild(li);
  }
  catIn.appendChild(catList);
  catIn.appendChild(el("p", "muted", `<a href="#categories">Gestionar categorías</a>`));
  catBox.appendChild(catIn);
  side.appendChild(catBox);

  // ── Etiquetas ──
  const tagBox = el("div", "postbox");
  tagBox.innerHTML = `<div class="postbox-header"><h2>Etiquetas</h2></div>`;
  const tagIn = el("div", "inside");
  const tagInput = el("input", "form-input");
  tagInput.type = "text"; tagInput.value = post.tags.join(", "); tagInput.setAttribute("aria-label", "Etiquetas de la entrada");
  tagInput.addEventListener("input", () => (post.tags = tagInput.value.split(",").map((x) => x.trim()).filter(Boolean)));
  tagIn.appendChild(tagInput);
  tagIn.appendChild(el("p", "muted", "Separa las etiquetas con comas."));
  tagBox.appendChild(tagIn);
  side.appendChild(tagBox);

  // ── Imagen destacada (con texto alternativo) ──
  const featBox = el("div", "postbox");
  featBox.innerHTML = `<div class="postbox-header"><h2>Imagen destacada</h2></div>`;
  const featIn = el("div", "inside");
  const featPrev = el("div", "ed-image-preview featured-preview");
  const setFeat = () => {
    const src = post.img && post.img.startsWith("/") && SITE ? SITE + post.img : post.img;
    featPrev.innerHTML = src ? `<img src="${esc(src)}" alt="" />` : "<span class='muted'>Sin imagen destacada</span>";
  };
  setFeat();
  const featBtns = el("div", "ed-image-btns");
  const pick = el("button", "button", "Elegir de la biblioteca");
  pick.addEventListener("click", () => openMediaModal((path) => { post.img = path; setFeat(); }));
  const upload = el("button", "button", "⬆ Subir");
  const file = el("input"); file.type = "file"; file.accept = "image/*"; file.hidden = true;
  upload.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    upload.disabled = true; upload.textContent = "Subiendo…";
    try {
      const data = await fileToBase64(f);
      const j = await api("/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, data }) });
      post.img = j.path; setFeat();
    } catch (e) { alert("No se pudo subir la imagen: " + e.message); }
    finally { upload.disabled = false; upload.textContent = "⬆ Subir"; file.value = ""; }
  });
  featBtns.append(pick, upload, file);
  const altField = el("label", "ed-field");
  const altInput = el("input", "form-input"); altInput.type = "text"; altInput.value = post.imgAlt || "";
  altInput.placeholder = "Describe la imagen (accesibilidad y SEO)";
  altInput.addEventListener("input", () => (post.imgAlt = altInput.value));
  altField.append(el("span", "ed-field-label", "Texto alternativo"), altInput);
  featIn.append(featPrev, featBtns, altField);
  featBox.appendChild(featIn);
  side.appendChild(featBox);

  // ── Revisiones (historial del documento, restaurable) ──
  if (!postIsNew) {
    side.appendChild(revisionsBox("post", post.slug, (loaded) => {
      post = { ...loaded, slug: post.slug, _sha: post._sha };
      renderPostEditor(categories);
      notice("ok", "Revisión cargada. Revisa y pulsa Actualizar para restaurarla.");
    }));
  }

  // ── Guardar / papelera ──
  saveBtn.addEventListener("click", async () => {
    if (!post.title.trim()) { notice("err", "La entrada necesita un título."); return; }
    if (!post.img) { notice("err", "Elige una imagen destacada (portada) antes de guardar."); return; }
    if (!post.excerpt.trim()) post.excerpt = post.title.trim().slice(0, 270);
    saveBtn.disabled = true; const old = saveBtn.textContent; saveBtn.textContent = "Guardando…";
    try {
      let data;
      if (postIsNew) {
        const body = { ...post, slug: post.slug || undefined };
        data = await api("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        localStorage.removeItem(postAutosaveKey()); // limpia el stash "new"
        post.slug = data.slug; postIsNew = false;
        history.replaceState(null, "", `#post/${data.slug}`);
      setCurrentHash(`post/${data.slug}`);
        trash.textContent = "Mover a la papelera";
        saveBtn.textContent = "Actualizar";
      } else {
        data = await api(`/api/posts/${post.slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...post, baseSha: post._sha }) });
        if (data.sha) post._sha = data.sha;
      }
      postSnapshot = currentPostSnapshot();
      localStorage.removeItem(postAutosaveKey());
      const link = data.url && !post.draft ? ` <a href="${esc(data.url)}" target="_blank" rel="noopener">Ver la entrada →</a>` : "";
      notice("ok", `${post.draft ? "Borrador guardado" : "Publicada"}. El sitio se actualiza en ~1 minuto.${link}`);
      updPermalink();
    } catch (e) {
      if (e.status === 409 && e.data?.conflict) {
        notice("err", `${esc(e.message)} <a data-reload>Recargar la entrada</a>`);
        $("screen-notice").querySelector("[data-reload]").addEventListener("click", () => { postSnapshot = null; openPost(post.slug); });
      } else {
        notice("err", esc(e.message));
      }
    } finally { saveBtn.disabled = false; if (saveBtn.textContent === "Guardando…") saveBtn.textContent = old; }
  });
  trash.addEventListener("click", async () => {
    if (postIsNew || !post.slug) return;
    if (!(await confirmModal({ title: "Mover a la papelera", message: `¿Mover a la papelera la entrada "${post.title}"?\nEl historial de Git guarda una copia por si necesitas restaurarla.`, confirmLabel: "Mover a la papelera", danger: true }))) return;
    try {
      await api(`/api/posts/${post.slug}`, { method: "DELETE" });
      localStorage.removeItem(postAutosaveKey());
      postSnapshot = null; post = null;
      go("posts");
    } catch (e) { notice("err", esc(e.message)); }
  });

  postSnapshot = currentPostSnapshot();
}

// Sale del editor de entradas (lo llama el router en cada navegación).
export function resetPostEditor() { post = null; postSnapshot = null; }

