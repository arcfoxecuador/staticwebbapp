import { refreshSummary } from "./canvas.js";
import { api } from "../core/api.js";
import { $, el, esc, fileToBase64 } from "../core/dom.js";
import { SITE } from "../core/state.js";
import { docPickerButtons, openMediaModal } from "../views/media.js";

// ── Campos (compartidos por páginas y carreras) ──────────────────────────────
function setScalar(obj, name, raw, numeric) {
  if (numeric || /^\d+$/.test(raw)) obj[name] = raw === "" ? undefined : Number(raw);
  else obj[name] = raw;
}
function fieldWrap(label, help, control) {
  const w = el("label", "ed-field");
  w.appendChild(el("span", "ed-field-label", label));
  w.appendChild(control);
  if (help) w.appendChild(el("span", "ed-field-help muted", help));
  return w;
}
export function renderField(field, obj) {
  switch (field.type) {
    case "textarea": {
      const ta = el("textarea"); ta.rows = 3; ta.value = obj[field.name] ?? "";
      ta.addEventListener("input", () => { obj[field.name] = ta.value; refreshSummary(); });
      // Solo los campos que renderizan HTML (su ayuda menciona <b>) llevan barra
      // de formato; los textarea de texto plano (p.ej. heading) no.
      if (!(field.help && field.help.includes("<b>"))) return fieldWrap(field.label, field.help, ta);
      const wrapSel = (open, close) => {
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + open + ta.value.slice(s, e) + close + ta.value.slice(e);
        ta.selectionStart = s + open.length;
        ta.selectionEnd = e + open.length;
        ta.focus();
        obj[field.name] = ta.value;
        refreshSummary();
      };
      const fmt = (lbl, title, fn, cls) => {
        const b = el("button", "ed-rtbtn" + (cls ? " " + cls : ""), lbl); b.type = "button"; b.title = title;
        b.addEventListener("mousedown", (ev) => ev.preventDefault()); // no perder la selección
        b.addEventListener("click", fn);
        return b;
      };
      const bar = el("div", "ed-rtbar");
      bar.append(
        fmt("B", "Negrita", () => wrapSel("<b>", "</b>")),
        fmt("I", "Itálica", () => wrapSel("<i>", "</i>"), "it"),
        fmt("🔗", "Enlace", () => { const url = prompt("URL del enlace:", "https://"); if (url) wrapSel(`<a href="${url}">`, "</a>"); }),
      );
      const box = el("div", "ed-rt"); box.append(bar, ta);
      return fieldWrap(field.label, field.help, box);
    }
    case "checkbox": {
      const c = el("input"); c.type = "checkbox"; c.checked = !!obj[field.name];
      c.addEventListener("change", () => obj[field.name] = c.checked);
      const w = el("label", "ed-field ed-field-check"); w.append(c, el("span", null, field.label));
      return w;
    }
    case "select": {
      const s = el("select");
      field.options.forEach((o) => { const op = el("option"); op.value = o; op.textContent = o; s.appendChild(op); });
      if (obj[field.name] !== undefined) s.value = String(obj[field.name]);
      const apply = () => setScalar(obj, field.name, s.value);
      s.addEventListener("change", apply); apply();
      return fieldWrap(field.label, field.help, s);
    }
    case "number": {
      const inp = el("input"); inp.type = "number"; inp.value = obj[field.name] ?? "";
      inp.addEventListener("input", () => setScalar(obj, field.name, inp.value, true));
      return fieldWrap(field.label, field.help, inp);
    }
    case "cta": {
      const v = obj[field.name] || {};
      const box = el("div", "ed-cta");
      const li = el("input"); li.placeholder = "Texto del botón"; li.value = v.label || "";
      const hi = el("input"); hi.placeholder = "Enlace (/oferta, #aplica)"; hi.value = v.href || "";
      const sync = () => {
        const label = li.value.trim(), href = hi.value.trim();
        if (!label && !href) delete obj[field.name]; else obj[field.name] = { label, href };
      };
      li.addEventListener("input", sync); hi.addEventListener("input", sync);
      box.append(li, hi);
      return fieldWrap(field.label, field.help, box);
    }
    case "tags": {
      const inp = el("input"); inp.value = (obj[field.name] || []).join(", ");
      inp.addEventListener("input", () => obj[field.name] = inp.value.split(",").map((x) => x.trim()).filter(Boolean));
      return fieldWrap(field.label, field.help, inp);
    }
    case "image": {
      const preview = el("div", "ed-image-preview");
      const showImg = (src) => { preview.innerHTML = src ? `<img src="${esc(src)}" alt="" />` : "<span class='muted'>Sin imagen</span>"; };
      // Las rutas relativas (/foto.png) viven en el sitio desplegado, no en el panel.
      const previewSrc = (v) => (v && v.startsWith("/") && SITE ? SITE + v : v);
      const setPrev = () => showImg(previewSrc(obj[field.name]));
      setPrev();
      const inp = el("input"); inp.type = "text"; inp.placeholder = "/ruta/imagen.png"; inp.value = obj[field.name] ?? "";
      inp.addEventListener("input", () => { obj[field.name] = inp.value; setPrev(); refreshSummary(); });
      const file = el("input"); file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      const pickBtn = el("button", "button", "Biblioteca");
      pickBtn.type = "button";
      pickBtn.addEventListener("click", () => openMediaModal((path) => { obj[field.name] = path; inp.value = path; setPrev(); refreshSummary(); }));
      const up = el("button", "button", "⬆ Subir");
      up.type = "button";
      up.addEventListener("click", () => file.click());
      file.addEventListener("change", async () => {
        const f = file.files[0]; if (!f) return;
        up.disabled = true; up.textContent = "Subiendo…";
        showImg(URL.createObjectURL(f)); // preview instantánea local
        try {
          const data = await fileToBase64(f);
          const j = await api("/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, data }) });
          obj[field.name] = j.path; inp.value = j.path; refreshSummary();
        } catch (e) { alert("No se pudo subir la imagen: " + e.message); setPrev(); }
        finally { up.disabled = false; up.textContent = "⬆ Subir"; file.value = ""; }
      });
      const btns = el("div", "ed-image-btns");
      btns.append(pickBtn, up, file);
      const ctrl = el("div", "ed-image-ctrl");
      ctrl.append(preview, inp, btns);
      return fieldWrap(field.label, field.help, ctrl);
    }
    case "doc": {
      // Igual que "image" pero para PDF/Word/Excel: el campo sigue siendo texto
      // libre (admite un enlace externo), y los botones son el atajo para elegir
      // o subir un documento del sitio.
      const state = el("div", "ed-doc-state");
      const showDoc = (v) => {
        state.innerHTML = v
          ? `<span class="ed-doc-file">📄 ${esc(v.split("/").pop())}</span>`
          : "<span class='muted'>Sin documento — se mostrará como “próximamente”</span>";
      };
      showDoc(obj[field.name]);
      const inp = el("input"); inp.type = "text"; inp.placeholder = "/documentos/informe.pdf";
      inp.value = obj[field.name] ?? "";
      inp.addEventListener("input", () => {
        obj[field.name] = inp.value || null;
        showDoc(inp.value); refreshSummary();
      });
      const btns = el("div", "ed-image-btns");
      btns.append(...docPickerButtons((path) => {
        obj[field.name] = path; inp.value = path; showDoc(path); refreshSummary();
      }));
      const ctrl = el("div", "ed-image-ctrl");
      ctrl.append(state, inp, btns);
      return fieldWrap(field.label, field.help, ctrl);
    }
    case "textlist": return renderTextList(field, obj);
    case "object": return renderObject(field, obj);
    case "array": return renderArray(field, obj);
    case "variants": {
      const box = el("div", "ed-array");
      box.appendChild(el("div", "ed-array-title", field.label));
      box.appendChild(el("p", "muted", "Las piezas (texto, imagen, botones, listas…) se agregan y editan directamente en el lienzo."));
      return box;
    }
    default: {
      const inp = el("input"); inp.type = "text"; inp.value = obj[field.name] ?? "";
      inp.addEventListener("input", () => { obj[field.name] = inp.value; refreshSummary(); });
      return fieldWrap(field.label, field.help, inp);
    }
  }
}
function renderArray(field, obj) {
  if (!Array.isArray(obj[field.name])) obj[field.name] = [];
  const list = obj[field.name];
  const box = el("div", "ed-array");
  box.appendChild(el("div", "ed-array-title", field.label));
  const itemsWrap = el("div");
  box.appendChild(itemsWrap);
  const draw = () => {
    itemsWrap.innerHTML = "";
    list.forEach((item, idx) => {
      const it = el("div", "ed-array-item");
      const ihead = el("div", "ed-array-item-head", `<span class="muted">#${idx + 1}</span>`);
      const mk = (lbl, fn) => { const b = el("button", "ed-iconbtn", lbl); b.addEventListener("click", fn); return b; };
      ihead.append(
        mk("↑", () => { if (idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; draw(); } }),
        mk("↓", () => { if (idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; draw(); } }),
        mk("🗑", () => { list.splice(idx, 1); draw(); refreshSummary(); }),
      );
      it.appendChild(ihead);
      field.item.forEach((sf) => it.appendChild(renderField(sf, item)));
      itemsWrap.appendChild(it);
    });
  };
  draw();
  const add = el("button", "button ed-array-add", field.addLabel || "Agregar");
  add.addEventListener("click", () => {
    const blank = {};
    field.item.forEach((sf) => {
      if (sf.type === "array") blank[sf.name] = [];
      else if (sf.type === "select") blank[sf.name] = sf.options[0];
      else if (sf.type === "checkbox") blank[sf.name] = false;
      else if (sf.type === "tags") blank[sf.name] = [];
      else if (sf.type !== "cta") blank[sf.name] = "";
    });
    list.push(blank); draw(); refreshSummary();
  });
  box.appendChild(add);
  return box;
}

// Lista de textos (array de strings); cada uno su propio campo.
function renderTextList(field, obj) {
  if (!Array.isArray(obj[field.name])) obj[field.name] = [];
  const list = obj[field.name];
  const box = el("div", "ed-array");
  box.appendChild(el("div", "ed-array-title", field.label));
  const itemsWrap = el("div");
  box.appendChild(itemsWrap);
  const draw = () => {
    itemsWrap.innerHTML = "";
    list.forEach((val, idx) => {
      const it = el("div", "ed-array-item");
      const head = el("div", "ed-array-item-head", `<span class="muted">#${idx + 1}</span>`);
      const mk = (lbl, fn) => { const b = el("button", "ed-iconbtn", lbl); b.addEventListener("click", fn); return b; };
      head.append(
        mk("↑", () => { if (idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; draw(); } }),
        mk("↓", () => { if (idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; draw(); } }),
        mk("🗑", () => { list.splice(idx, 1); draw(); }),
      );
      it.appendChild(head);
      const tx = el("textarea"); tx.rows = 2; tx.value = val ?? "";
      tx.addEventListener("input", () => (list[idx] = tx.value));
      it.appendChild(tx);
      itemsWrap.appendChild(it);
    });
  };
  draw();
  const add = el("button", "button ed-array-add", field.addLabel || "Agregar");
  add.addEventListener("click", () => { list.push(""); draw(); });
  box.appendChild(add);
  return box;
}

// Objeto anidado con subcampos.
function renderObject(field, obj) {
  if (!obj[field.name] || typeof obj[field.name] !== "object") obj[field.name] = {};
  const sub = obj[field.name];
  const box = el("div", "ed-array");
  box.appendChild(el("div", "ed-array-title", field.label));
  field.item.forEach((sf) => box.appendChild(renderField(sf, sub)));
  return box;
}

