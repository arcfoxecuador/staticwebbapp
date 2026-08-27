import { api } from "./api.js";
import { CAREERS, ensureCareers } from "./careers.js";
import { $, el } from "./dom.js";
import { go } from "./router.js";
import { openShortcuts } from "./shortcuts.js";
import { FORMS, isAdmin } from "./state.js";
import { career } from "../views/careers.js";
import { post } from "../views/post-editor.js";

// ── Paleta de comandos / salto rápido (Ctrl/Cmd+K) ───────────────────────────
let cmdPosts = null; // caché de entradas para la paleta (carga perezosa)

// Autores ya usados en el blog (para sugerir en el editor de entradas). Reusa la
// caché de la paleta; si no hay, la carga. Nunca falla: devuelve al menos el
// autor actual. Trata a los autores como valores reutilizables (relación ligera).
export async function knownAuthors(current) {
  if (!cmdPosts) { try { const d = await api("/api/posts"); cmdPosts = d.posts || []; } catch { cmdPosts = null; } }
  const set = new Set();
  if (current) set.add(current);
  (cmdPosts || []).forEach((p) => { if (p.author) set.add(p.author); });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function cmdEntries() {
  const items = [];
  const add = (label, hash, hint) => items.push({ label, hash, hint });
  items.push({ label: "Atajos de teclado", hint: "Ayuda", action: openShortcuts });
  add("Escritorio", "dashboard", "Ir a");
  add("Entradas", "posts", "Ir a");
  add("Nueva entrada", "post/new", "Acción");
  add("Medios", "media", "Ir a");
  add("Páginas", "pages", "Ir a");
  add("Carreras", "careers", "Ir a");
  if (isAdmin()) add("Apariencia", "appearance", "Ir a");
  add("Asistente IA", "agent", "Ir a");
  for (const [s, label] of Object.entries(FORMS.pages || {})) add(`Página: ${label}`, `page/${s}`, "Editar");
  for (const [s, title] of Object.entries(CAREERS || {})) add(`Carrera: ${title}`, `career/${s}`, "Editar");
  for (const p of (cmdPosts || [])) add(`Entrada: ${p.title || p.slug}`, `post/${p.slug}`, p.draft ? "Borrador" : "Editar");
  return items;
}
export function openCommandPalette() {
  if (!FORMS || $("cmdk-back")) return;
  const back = el("div", "cmdk-back"); back.id = "cmdk-back";
  const box = el("div", "cmdk-box");
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Buscar y navegar");
  const input = el("input", "cmdk-input"); input.type = "text"; input.placeholder = "Buscar por nombre o dentro del contenido…";
  input.setAttribute("aria-label", "Buscar y navegar"); input.setAttribute("aria-controls", "cmdk-list");
  const list = el("ul", "cmdk-list"); list.id = "cmdk-list"; list.setAttribute("role", "listbox");
  const foot = el("div", "cmdk-foot muted");
  foot.innerHTML = `<span><kbd>↑</kbd><kbd>↓</kbd> moverse · <kbd>↵</kbd> abrir · <kbd>Esc</kbd> cerrar</span><span><kbd>?</kbd> más atajos</span>`;
  box.append(input, list, foot); back.appendChild(box); document.body.appendChild(back);
  let all = cmdEntries(), filtered = all, active = 0, contentResults = [];
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const draw = () => {
    list.innerHTML = "";
    filtered.slice(0, 60).forEach((it, i) => {
      const li = el("li", "cmdk-item" + (i === active ? " active" : "") + (it.snippet ? " has-snippet" : ""));
      li.setAttribute("role", "option"); li.setAttribute("aria-selected", i === active ? "true" : "false");
      const row = el("div", "cmdk-row");
      const lab = el("span", "cmdk-label"); lab.textContent = it.label;
      const hint = el("span", "cmdk-hint"); hint.textContent = it.hint;
      row.append(lab, hint);
      li.appendChild(row);
      if (it.snippet) { const sn = el("span", "cmdk-snippet"); sn.textContent = it.snippet; li.appendChild(sn); }
      li.addEventListener("click", () => choose(i));
      li.addEventListener("mousemove", () => { if (active !== i) { active = i; paintActive(); } });
      list.appendChild(li);
    });
    if (!filtered.length) list.appendChild(el("li", "cmdk-empty muted", "Sin resultados"));
  };
  const paintActive = () => {
    [...list.children].forEach((li, i) => { li.classList.toggle("active", i === active); li.setAttribute("aria-selected", i === active ? "true" : "false"); });
    const cur = list.children[active]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  };
  // Combina coincidencias por ETIQUETA (instantáneas, cliente) con las de
  // CONTENIDO (del servidor), sin duplicar lo que ya aparece por título.
  const clientFilter = () => {
    const q = norm(input.value.trim());
    const labelMatches = q ? all.filter((it) => norm(it.label).includes(q)) : all;
    const seen = new Set(labelMatches.map((it) => it.hash));
    filtered = [...labelMatches, ...contentResults.filter((it) => !seen.has(it.hash))];
    active = 0; draw();
  };
  // Búsqueda de contenido: con retardo (evita una petición por tecla) y solo
  // con 3+ caracteres. Descarta respuestas viejas si el término ya cambió.
  let searchTimer = null, searchSeq = 0;
  const runContentSearch = (raw) => {
    clearTimeout(searchTimer);
    const seq = ++searchSeq;
    if (raw.length < 3) { if (contentResults.length) { contentResults = []; clientFilter(); } return; }
    searchTimer = setTimeout(async () => {
      try {
        const d = await api(`/api/search?q=${encodeURIComponent(raw)}`);
        if (seq !== searchSeq || !back.isConnected) return; // término cambió o se cerró
        const hashOf = { page: "page/", career: "career/", post: "post/" };
        const hintOf = { page: "En una página", career: "En una carrera", post: "En una entrada" };
        contentResults = (d.results || []).map((r) => ({ label: r.title, hash: hashOf[r.type] + r.slug, hint: hintOf[r.type], snippet: r.snippet }));
        clientFilter();
      } catch { /* la búsqueda de contenido es un extra: si falla, quedan las etiquetas */ }
    }, 220);
  };
  const onInput = () => { clientFilter(); runContentSearch(input.value.trim()); };
  const choose = (i) => { const it = filtered[i]; if (!it) return; close(); if (it.action) it.action(); else go(it.hash); };
  const close = () => { document.removeEventListener("keydown", onKey, true); back.remove(); };
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); paintActive(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paintActive(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(active); }
  };
  input.addEventListener("input", onInput);
  document.addEventListener("keydown", onKey, true);
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  draw(); input.focus();
  // Enriquecer con carreras y entradas (carga perezosa; la paleta ya funciona).
  (async () => {
    try {
      await ensureCareers().catch(() => {});
      if (!cmdPosts) { const d = await api("/api/posts"); cmdPosts = d.posts || []; }
    } catch { /* la paleta sirve igual con lo que ya hay */ }
    if (!back.isConnected) return; // se cerró antes de llegar
    all = cmdEntries(); clientFilter();
  })();
}
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openCommandPalette(); }
});

