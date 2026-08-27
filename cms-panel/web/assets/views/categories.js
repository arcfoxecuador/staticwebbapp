import { api } from "../core/api.js";
import { el, esc } from "../core/dom.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Categorías del blog (Entradas → Categorías) ─────────────────────────────
export async function showCategories() {
  loadingScreen("Categorías");
  let data;
  try { data = await api("/api/categories"); }
  catch (e) { screen("Categorías", "Categorías"); notice("err", esc(e.message)); return; }

  const wrap = screen("Categorías", "Categorías", {
    help: `<h3>Resumen</h3><p>Las categorías organizan las entradas y aparecen como filtros en /noticias.
      No puedes eliminar una categoría que tenga entradas: reasígnalas primero desde <a href="#posts">Entradas</a>.
      Los cambios se publican al guardar (el sitio se reconstruye en ~1 minuto).</p>`,
  });
  const box = el("div", "postbox"); box.style.maxWidth = "560px";
  box.innerHTML = `<div class="postbox-header"><h2>Categorías del blog</h2></div>`;
  const inside = el("div", "inside");
  box.appendChild(inside);
  wrap.appendChild(box);

  let cats = [...data.categories];
  let catsSha = data._sha || null; // control de concurrencia (ver PUT más abajo)
  const usage = data.usage || {};

  const list = el("ul", "cat-manage");
  const drawCats = () => {
    list.innerHTML = "";
    cats.forEach((cat, i) => {
      const n = usage[cat] ?? 0;
      const li = el("li", "cat-manage-row");
      li.innerHTML = `<span class="cat-name">${esc(cat)}</span><span class="muted">${n} entrada${n === 1 ? "" : "s"}</span>`;
      const x = el("button", "ed-iconbtn danger", "✕");
      x.title = n > 0 ? "No se puede eliminar: tiene entradas" : "Eliminar categoría";
      x.disabled = n > 0;
      x.addEventListener("click", () => { cats.splice(i, 1); drawCats(); });
      li.appendChild(x);
      list.appendChild(li);
    });
  };
  drawCats();
  inside.appendChild(list);

  const addRow = el("div", "cat-add");
  const addInput = el("input", "form-input"); addInput.type = "text"; addInput.placeholder = "Nueva categoría";
  const addBtn = el("button", "button", "Añadir");
  const add = () => {
    const v = addInput.value.trim();
    if (!v) return;
    if (cats.some((c) => c.toLowerCase() === v.toLowerCase())) { notice("err", "Esa categoría ya existe."); return; }
    cats.push(v); addInput.value = ""; drawCats();
  };
  addBtn.addEventListener("click", add);
  addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  addRow.append(addInput, addBtn);
  inside.appendChild(addRow);

  const save = el("button", "button button-primary", "Guardar cambios");
  save.style.marginTop = "10px";
  save.addEventListener("click", async () => {
    save.disabled = true; save.textContent = "Guardando…";
    try {
      const r = await api("/api/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: cats, baseSha: catsSha }) });
      cats = [...r.categories];
      catsSha = r.sha || catsSha;
      drawCats();
      notice("ok", "Categorías guardadas. El sitio se actualiza en ~1 minuto.");
    } catch (e) { notice("err", esc(e.message)); }
    finally { save.disabled = false; save.textContent = "Guardar cambios"; }
  });
  inside.appendChild(save);
}

