import { editEl } from "../blocks/canvas.js";
import { closeDrawer, ensureDrawer } from "../blocks/editor.js";
import { renderField } from "../blocks/fields.js";
import { watchDeploy } from "../blocks/save.js";
import { api } from "../core/api.js";
import { CAREERFORM, CAREERS, CAREERSTATES, ensureCareers, invalidateCareers } from "../core/careers.js";
import { $, el, esc } from "../core/dom.js";
import { revisionsBox } from "../core/revisions.js";
import { SITE } from "../core/state.js";
import { loadingScreen, notice, screen } from "../core/ui.js";
import { openMediaModal } from "./media.js";

// ── Carreras: listado ────────────────────────────────────────────────────────
export async function showCareers() {
  if (!CAREERS) loadingScreen("Carreras");
  try { await ensureCareers(); }
  catch (e) { screen("Carreras", "Carreras"); notice("err", esc(e.message)); return; }

  const wrap = screen("Carreras", `Carreras <button class="page-title-action" id="career-add">Añadir nueva carrera</button>`);
  wrap.appendChild(el("p", "wp-subtitle", "Edita el contenido de cada carrera: textos, pilares, malla, aranceles e imagen."));

  // Alta de carrera: nace oculta y como "próximamente", con lo mínimo para que
  // el sitio compile. Se completa en el editor y se publica quitando "oculta".
  const form = el("form", "career-new");
  form.hidden = true;
  form.innerHTML = `
    <label for="career-new-title">Nombre de la carrera</label>
    <input id="career-new-title" type="text" required maxlength="80" placeholder="Ej. Contabilidad" autocomplete="off" />
    <button type="submit" class="button button-primary">Crear</button>
    <button type="button" class="button" id="career-new-cancel">Cancelar</button>
    <p class="wp-subtitle">Se creará oculta y marcada como “próximamente”: nadie la ve hasta que la completes y la publiques.</p>`;
  wrap.appendChild(form);
  const input = form.querySelector("#career-new-title");
  wrap.querySelector("#career-add").addEventListener("click", () => {
    form.hidden = !form.hidden;
    if (!form.hidden) input.focus();
  });
  form.querySelector("#career-new-cancel").addEventListener("click", () => { form.hidden = true; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const d = await api("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      invalidateCareers(); // se relee del repo, ya incluye la nueva
      location.hash = `#career/${d.slug}`;
    } catch (err) {
      notice("err", esc(err.message));
      btn.disabled = false;
    }
  });

  const table = el("table", "wp-list-table");
  table.innerHTML = `<thead><tr><th>Carrera</th><th>Estado</th><th>Dirección</th></tr></thead>`;
  const tbody = el("tbody");
  for (const [s, title] of Object.entries(CAREERS)) {
    const st = (CAREERSTATES && CAREERSTATES[s]) || {};
    const estado = st.hidden
      ? `<span class="row-state">Oculta</span>`
      : st.proximamente
        ? `<span class="row-state">Próximamente</span>`
        : `<span class="muted">En vivo</span>`;
    const tr = el("tr");
    tr.innerHTML = `
      <td>
        <a class="row-title" href="#career/${esc(s)}">${esc(title)}</a>
        <div class="row-actions">
          <span><a href="#career/${esc(s)}">Editar</a></span>
          ${SITE && !st.hidden ? `<span><a href="${esc(`${SITE}/carrera/${st.routeSlug || s}`)}" target="_blank" rel="noopener">Ver</a></span>` : ""}
        </div>
      </td>
      <td>${estado}</td>
      <td class="muted">/carrera/${esc(st.routeSlug || s)}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}

// ── Carreras: editor ─────────────────────────────────────────────────────────
export let career = null, careerSlug = null;
export async function openCareer(s) {
  careerSlug = s;
  try { await ensureCareers(); }
  catch (e) { screen("Carreras", "Carreras"); notice("err", esc(e.message)); return; }

  loadingScreen(CAREERS[s] || "Carrera");
  try { career = await api(`/api/careers/${s}`); }
  catch (e) { screen("Carreras", "Carreras"); notice("err", esc(e.message)); return; }
  renderCareerScreen();
}

// Dibuja el editor de carreras a partir de `career`. Separado del fetch para
// poder re-dibujar tras cargar una revisión (historial), como en páginas.
// Campos que se editan EN EL LIENZO (encabezado visual, no en un formulario).
const CAREER_HERO_FIELDS = ["img", "banner", "title", "tag", "tagline", "desc"];
// El resto se agrupa en tarjetas por sección, en vez de un muro de campos.
const CAREER_SECTIONS = [
  { title: "Ficha académica", fields: ["modalidad", "titulo", "nivel", "resolucion", "duracion", "creditos", "asignaturas", "inicio", "dual"] },
  { title: "Aranceles", fields: ["arancelTotal", "arancelPeriodo"] },
  { title: "Perfil de egreso", fields: ["perfil", "egreso"] },
  { title: "Pilares del programa", fields: ["pilares"] },
  { title: "Competencias", fields: ["competencias"] },
  { title: "Campo ocupacional", fields: ["campo", "sectores"] },
  { title: "Malla curricular", fields: ["malla"] },
];

// Control de imagen para el encabezado de carrera: muestra la imagen y permite
// cambiarla con la biblioteca; se re-dibuja solo (sin depender del lienzo).
function careerImageCtl(key, label, main) {
  const wrap = el("div", "cv-img" + (main ? " cv-img-main" : ""));
  const paint = () => {
    const v = career[key];
    const src = v && v.startsWith("/") && SITE ? SITE + v : v;
    wrap.innerHTML = v
      ? `<img src="${esc(src)}" alt="" /><button type="button" class="button cv-img-btn">Cambiar ${esc(label)}</button>`
      : `<button type="button" class="button cv-img-empty">＋ Añadir ${esc(label)}</button>`;
    wrap.querySelector("button").addEventListener("click", () => openMediaModal((p) => { career[key] = p; paint(); }));
  };
  paint();
  return wrap;
}

// Editor VISUAL de carreras: encabezado editable in-situ (como el lienzo de
// páginas) + secciones en tarjetas. Aunque una carrera es un registro
// estructurado (no bloques), se edita "haciendo clic y escribiendo", no en un muro
// de campos. El modelo de datos y el guardado son los mismos.
function renderCareerScreen() {
  const wrap = screen(career.title || CAREERS[careerSlug], `Editar carrera <a class="page-title-action" href="#careers">← Todas las carreras</a>`);
  wrap.classList.add("wrap-wide");
  const shell = el("div", "vc-shell");
  const top = el("div", "vc-topbar");
  const hidden = !!career.hidden;
  top.innerHTML = `
    <span class="vc-crumb">${esc(career.title || CAREERS[careerSlug])}<small>/carrera/${esc(careerSlug)}</small></span>
    <span class="vc-spacer"></span>
    <button class="button cv-vis" id="career-visibility" title="Mostrar u ocultar esta carrera del sitio"></button>
    <button class="button" id="career-history">Historial</button>
    ${SITE ? `<a class="button" href="${esc(`${SITE}/carrera/${careerSlug}`)}" target="_blank" rel="noopener">Vista previa</a>` : ""}
    <button class="button button-primary gb-save">Actualizar</button>`;

  const canvas = el("div", "vc-device cv-canvas");
  const fieldByName = Object.fromEntries((CAREERFORM.fields || []).map((f) => [f.name, f]));

  // Encabezado visual: reproduce la cabecera REAL de /carrera/[slug]. El BANNER es
  // el fondo (con overlay oscuro) y el texto va encima; sin banner, fondo navy como
  // en el sitio. La "imagen de tarjeta" (img) es un slot pequeño y rotulado (se usa
  // en la oferta y otros listados, no en esta cabecera).
  const hero = el("div", "cv-hero");
  const setBanner = (v) => {
    if (v) { hero.classList.add("has-banner"); hero.style.backgroundImage = `url("${v.startsWith("/") && SITE ? SITE + v : v}")`; }
    else { hero.classList.remove("has-banner"); hero.style.backgroundImage = ""; }
  };
  setBanner(career.banner);
  const heroBody = el("div", "cv-hero-body");
  heroBody.append(
    editEl(career, "tag", "cv-eyebrow", { ph: "Etiqueta (ej. Tecnología)" }),
    editEl(career, "title", "cv-title", { ph: "Nombre de la carrera" }),
    editEl(career, "tagline", "cv-tagline", { ph: "Frase gancho (opcional)" }),
    editEl(career, "desc", "cv-desc", { pre: true, multiline: true, ph: "Descripción breve de la carrera" }),
  );
  hero.appendChild(heroBody);
  // Control del banner (fondo de la cabecera).
  if (fieldByName.banner) {
    const bannerBtn = el("button", "button cv-banner-btn");
    const paintBannerBtn = () => { bannerBtn.textContent = career.banner ? "Cambiar banner" : "＋ Añadir banner"; };
    paintBannerBtn();
    bannerBtn.addEventListener("click", () => openMediaModal((p) => { career.banner = p; setBanner(p); paintBannerBtn(); }));
    hero.appendChild(bannerBtn);
  }
  // Imagen de tarjeta (img): slot pequeño y rotulado.
  const card = el("div", "cv-hero-card");
  card.appendChild(el("div", "cv-hero-card-cap", "Imagen de tarjeta"));
  card.appendChild(careerImageCtl("img", "imagen", true));
  hero.appendChild(card);
  canvas.appendChild(hero);

  // Secciones en tarjetas (usan los mismos controles de campo que antes).
  const used = new Set(CAREER_HERO_FIELDS);
  CAREER_SECTIONS.forEach((sec) => {
    const specs = sec.fields.map((n) => fieldByName[n]).filter(Boolean);
    sec.fields.forEach((n) => used.add(n));
    if (!specs.length) return;
    const card = el("div", "cv-section");
    card.appendChild(el("div", "cv-section-head", esc(sec.title)));
    const inner = el("div", "cv-section-body");
    specs.forEach((f) => inner.appendChild(renderField(f, career)));
    card.appendChild(inner);
    canvas.appendChild(card);
  });
  // Red de seguridad: cualquier campo no mapeado se muestra igual (nunca se pierde).
  const rest = (CAREERFORM.fields || []).filter((f) => !used.has(f.name));
  if (rest.length) {
    const card = el("div", "cv-section");
    card.appendChild(el("div", "cv-section-head", "Otros ajustes"));
    const inner = el("div", "cv-section-body");
    rest.forEach((f) => inner.appendChild(renderField(f, career)));
    card.appendChild(inner);
    canvas.appendChild(card);
  }

  shell.append(top, canvas);
  wrap.appendChild(shell);
  ensureDrawer();
  top.querySelector(".gb-save").addEventListener("click", saveCareer);
  top.querySelector("#career-history").addEventListener("click", openCareerHistory);

  // Toggle de visibilidad (oculta/publica la carrera sin borrarla).
  const visBtn = top.querySelector("#career-visibility");
  const paintVis = () => {
    visBtn.classList.toggle("is-hidden", !!career.hidden);
    visBtn.innerHTML = career.hidden
      ? `<span class="cv-dot"></span>Oculta`
      : `<span class="cv-dot"></span>Visible`;
  };
  paintVis();
  visBtn.addEventListener("click", () => {
    career.hidden = !career.hidden;
    paintVis();
    notice("ok", career.hidden
      ? "La carrera se ocultará del sitio al pulsar Actualizar (no se borra)."
      : "La carrera volverá a publicarse al pulsar Actualizar.");
  });
}

// Revisiones de la carrera (mismo componente que páginas/entradas). El backend ya
// soporta type=career; al cargar una revisión se re-dibuja el formulario y se
// restaura al pulsar Actualizar.
function openCareerHistory() {
  ensureDrawer();
  $("vc-drawer-title").textContent = "Revisiones";
  const body = $("vc-drawer-body"); body.innerHTML = "";
  body.appendChild(revisionsBox("career", careerSlug, (loaded) => {
    career = { ...loaded, _sha: career._sha };
    closeDrawer(); renderCareerScreen();
    notice("ok", "Revisión cargada. Revisa y pulsa Actualizar para restaurarla.");
  }));
  $("vc-drawer").classList.add("open"); $("vc-drawer-back").classList.add("open");
}

async function saveCareer() {
  const btn = document.querySelector(".gb-save");
  btn.disabled = true; btn.textContent = "Actualizando…";
  try {
    const data = await api(`/api/careers/${careerSlug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...career, baseSha: career._sha }) });
    if (data.sha) career._sha = data.sha;
    // Estado de publicación en vivo, igual que en el editor de páginas (UX-3).
    notice("ok", `Cambios guardados. <span id="publish-status"><span class="spinner"></span> Publicando tus cambios…</span>`);
    watchDeploy($("publish-status"), data.url ? `${data.url}/carrera/${careerSlug}` : "");
  } catch (e) { notice("err", "" + esc(e.message)); }
  finally { btn.disabled = false; btn.textContent = "Actualizar"; }
}

