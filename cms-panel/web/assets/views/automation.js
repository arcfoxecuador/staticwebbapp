import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Automatización del blog (blog-automation.json) ──────────────────────────
export async function showAutomation() {
  loadingScreen("Automatización");
  let a;
  try { a = await api("/api/automation"); }
  catch (e) { screen("Blogs automáticos", "Blogs automáticos"); notice("err", esc(e.message)); return; }

  const wrap = screen("Blogs automáticos", "Blogs automáticos", {
    help: `<h3>Resumen</h3><p>El bot investiga tus <b>fuentes</b> y a la <b>competencia</b>, elige un <b>tema</b>
      por prioridad/rotación y redacta un <b>borrador</b> con IA en la cadencia que definas. Nada se publica
      solo: cada borrador queda para tu revisión antes de publicarse.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Deja que la IA escriba entradas del blog sola, con la frecuencia que tú decidas. Abajo configuras cuándo escribe, sobre qué y con qué estilo."));

  // El recorrido completo, siempre a la vista. Antes vivía dentro del panel
  // "Ayuda" plegado: quien abría esta pantalla por primera vez veía un
  // formulario de opciones sin saber qué desencadenaba ni dónde termina.
  const flow = el("section", "ba-howto");
  flow.innerHTML = `
    <h2>Qué hace, paso a paso</h2>
    <ol class="ba-flow">
      <li><span class="ba-flow-n" aria-hidden="true">1</span><b>Investiga</b><span>Lee las fuentes que le indiques y revisa qué publicó la competencia.</span></li>
      <li><span class="ba-flow-n" aria-hidden="true">2</span><b>Elige un tema</b><span>Toma el siguiente de tu lista, rotando para no repetir siempre el mismo.</span></li>
      <li><span class="ba-flow-n" aria-hidden="true">3</span><b>Redacta</b><span>Escribe la entrada con la voz de la <a href="#brand">guía de marca</a>, en el largo y tono que fijes.</span></li>
      <li><span class="ba-flow-n" aria-hidden="true">4</span><b>Espera tu visto bueno</b><span>El texto queda como borrador en la <a href="#review">Cola de revisión</a>.</span></li>
      <li><span class="ba-flow-n" aria-hidden="true">5</span><b>Tú publicas</b><span>Lo lees, lo corriges si hace falta y decides si sale al sitio.</span></li>
    </ol>
    <p class="ba-howto-safe"><b>Nada se publica solo.</b> La IA nunca pone una entrada en el sitio sin que una persona la apruebe en la cola de revisión.</p>`;
  wrap.appendChild(flow);

  const box = (title) => {
    const b = el("div", "postbox");
    b.innerHTML = `<div class="postbox-header"><h2>${esc(title)}</h2></div>`;
    const inside = el("div", "inside"); b.appendChild(inside); wrap.appendChild(b); return inside;
  };
  const hint = (inside, txt) => inside.appendChild(el("p", "muted ba-sub", txt));
  const row = (label, get, set, opts = {}) => {
    const r = el("div", "ed-field");
    r.appendChild(el("label", "ed-field-label", esc(label)));
    const inp = el("input", "form-input"); inp.type = opts.type || "text";
    inp.setAttribute("aria-label", label); // nombre accesible (la etiqueta es hermana, no envuelve)
    if (opts.min != null) inp.min = String(opts.min);
    if (opts.max != null) inp.max = String(opts.max);
    if (opts.width) inp.style.width = opts.width;
    inp.value = get() ?? "";
    if (opts.ph) inp.placeholder = opts.ph;
    inp.addEventListener("input", () => set(opts.type === "number" ? Number(inp.value) : inp.value));
    r.appendChild(inp);
    if (opts.help) r.appendChild(el("span", "ed-field-help muted", esc(opts.help)));
    return r;
  };

  // 1) Programación + interruptor global.
  const sched = box("1. Cuándo escribe");
  hint(sched, "Mientras el interruptor esté apagado no se genera nada. Enciéndelo cuando la lista de temas de abajo esté lista.");
  const toggle = el("label", "ba-toggle");
  const cb = el("input"); cb.type = "checkbox"; cb.checked = !!a.enabled;
  cb.addEventListener("change", () => { a.enabled = cb.checked; toggle.classList.toggle("on", cb.checked); });
  toggle.classList.toggle("on", !!a.enabled);
  toggle.append(cb, el("span", "ba-toggle-txt", "Automatización activada"));
  sched.appendChild(toggle);
  sched.appendChild(row("Blogs por semana (1–7)", () => a.schedule.perWeek, (v) => (a.schedule.perWeek = v), { type: "number", min: 1, max: 7, width: "90px" }));
  const dayNames = { mon: "Lun", tue: "Mar", wed: "Mié", thu: "Jue", fri: "Vie", sat: "Sáb", sun: "Dom" };
  const daysWrap = el("div", "ed-field");
  daysWrap.appendChild(el("label", "ed-field-label", "Días preferidos"));
  const daysRow = el("div", "ba-days");
  Object.entries(dayNames).forEach(([k, lbl]) => {
    const d = el("label", "ba-day");
    const dc = el("input"); dc.type = "checkbox"; dc.checked = a.schedule.days.includes(k);
    d.classList.toggle("on", dc.checked);
    dc.addEventListener("change", () => {
      const set = new Set(a.schedule.days);
      dc.checked ? set.add(k) : set.delete(k);
      a.schedule.days = WEEKDAY_ORDER.filter((w) => set.has(w));
      d.classList.toggle("on", dc.checked);
    });
    d.append(dc, document.createTextNode(lbl));
    daysRow.appendChild(d);
  });
  daysWrap.appendChild(daysRow);
  sched.appendChild(daysWrap);
  sched.appendChild(row("Hora preferida (24h)", () => a.schedule.time, (v) => (a.schedule.time = v), { type: "time", width: "130px" }));
  sched.appendChild(row("Zona horaria", () => a.schedule.timezone, (v) => (a.schedule.timezone = v), { width: "230px", help: "Ej. America/Guayaquil" }));

  // 2) Temas (orden = prioridad; rotación por menos usado).
  const topBox = box("2. Sobre qué escribe");
  hint(topBox, "La lista de temas de los que hablará. El orden es la prioridad (arriba = primero) y va rotando: siempre elige el que menos ha usado, para no repetirse. Con el engranaje ⚙ le das a un tema su propio tono y largo.");
  a.topicOverrides = a.topicOverrides || {};
  const topList = el("div", "ba-list"); topBox.appendChild(topList);
  function drawTopics() {
    topList.innerHTML = "";
    a.topics.forEach((t, i) => {
      const wrap2 = el("div", "ba-topic");
      const rw = el("div", "ba-row");
      const inp = el("input", "form-input"); inp.value = t; inp.placeholder = "Tema del blog"; inp.setAttribute("aria-label", "Tema del blog");
      inp.addEventListener("input", () => {
        const old = a.topics[i];
        a.topics[i] = inp.value;
        // Si el tema tenía ajustes propios y cambió de nombre, migra la clave.
        if (old !== inp.value && a.topicOverrides[old]) { a.topicOverrides[inp.value] = a.topicOverrides[old]; delete a.topicOverrides[old]; }
      });
      const adv = el("div", "ba-topic-adv"); adv.hidden = true;
      const hasOv = () => { const o = a.topicOverrides[a.topics[i]]; return o && Object.keys(o).length; };
      const gear = el("button", "button-link ba-gear" + (hasOv() ? " on" : ""), "⚙");
      gear.type = "button"; gear.title = "Ajustes de este tema (tono y largo)"; gear.setAttribute("aria-label", "Ajustes avanzados del tema");
      const drawAdv = () => {
        const name = a.topics[i];
        const ov = a.topicOverrides[name] || {};
        adv.innerHTML = "";
        adv.appendChild(el("p", "muted ba-sub", "Ajustes solo para este tema. Deja un campo vacío para usar el valor global de “Redacción”."));
        const setField = (key, val) => {
          a.topicOverrides[name] = a.topicOverrides[name] || {};
          if (val === "" || val == null || (typeof val === "number" && Number.isNaN(val))) delete a.topicOverrides[name][key];
          else a.topicOverrides[name][key] = val;
          if (!Object.keys(a.topicOverrides[name]).length) delete a.topicOverrides[name];
          gear.classList.toggle("on", !!hasOv());
        };
        const field = (label, type, key) => {
          const f = el("div", "ba-opt");
          f.appendChild(el("label", "ed-field-label", label));
          const x = el("input", "form-input"); x.type = type; x.setAttribute("aria-label", `${label} (tema)`);
          if (type === "number") { x.min = "200"; x.max = "5000"; }
          if (ov[key] != null) x.value = ov[key];
          x.addEventListener("input", () => setField(key, type === "number" ? (x.value === "" ? "" : Number(x.value)) : x.value));
          f.appendChild(x); return f;
        };
        const grid = el("div", "ba-opts");
        grid.append(field("Tono", "text", "tone"), field("Palabras (mínimo)", "number", "minWords"), field("Palabras (máximo)", "number", "maxWords"));
        adv.appendChild(grid);
      };
      gear.addEventListener("click", () => { adv.hidden = !adv.hidden; if (!adv.hidden) drawAdv(); });
      const up = el("button", "button-link nav-move", "↑"); up.addEventListener("click", () => { if (i > 0) { [a.topics[i - 1], a.topics[i]] = [a.topics[i], a.topics[i - 1]]; drawTopics(); } });
      const down = el("button", "button-link nav-move", "↓"); down.addEventListener("click", () => { if (i < a.topics.length - 1) { [a.topics[i + 1], a.topics[i]] = [a.topics[i], a.topics[i + 1]]; drawTopics(); } });
      const del = el("button", "button-link-delete", "×"); del.addEventListener("click", () => { delete a.topicOverrides[a.topics[i]]; a.topics.splice(i, 1); drawTopics(); });
      rw.append(inp, gear, up, down, del);
      wrap2.append(rw, adv); topList.appendChild(wrap2);
    });
    const add = el("button", "button", "＋ Añadir tema"); add.addEventListener("click", () => { a.topics.push(""); drawTopics(); });
    topList.appendChild(add);
  }
  drawTopics();

  // 3) Fuentes por defecto (cada una con sus opciones).
  const srcBox = box("3. De dónde saca la información");
  hint(srcBox, "Páginas que lee antes de escribir, para que los datos sean reales y no inventados. Marcar una como “requerida” significa: si esa página no responde, mejor no escribir nada.");
  const srcList = el("div", "ba-cards"); srcBox.appendChild(srcList);
  function drawSources() {
    srcList.innerHTML = "";
    a.sources.forEach((s, i) => {
      const card = el("div", "ba-card");
      const head = el("div", "ba-card-head");
      const url = el("input", "form-input"); url.value = s.url; url.placeholder = "https://…"; url.addEventListener("input", () => (s.url = url.value));
      const del = el("button", "button-link-delete", "Eliminar"); del.addEventListener("click", () => { a.sources.splice(i, 1); drawSources(); });
      head.append(url, del); card.appendChild(head);
      const reqL = el("label", "ba-check");
      const req = el("input"); req.type = "checkbox"; req.checked = !!s.required; req.addEventListener("change", () => (s.required = req.checked));
      reqL.append(req, document.createTextNode(" Requerida (si falla, no se genera el blog)")); card.appendChild(reqL);
      const opts = el("div", "ba-opts");
      const opt = (label, get, set, o = {}) => {
        const f = el("div", "ba-opt");
        f.appendChild(el("label", "ed-field-label", label));
        const inp = el("input", "form-input"); inp.type = o.type || "text";
        inp.setAttribute("aria-label", label); // nombre accesible (la etiqueta es hermana)
        if (o.min != null) inp.min = String(o.min); if (o.max != null) inp.max = String(o.max);
        inp.value = get(); if (o.ph) inp.placeholder = o.ph;
        inp.addEventListener("input", () => set(o.type === "number" ? Number(inp.value) : inp.value));
        f.appendChild(inp); return f;
      };
      opts.append(
        opt("Filtro de palabras (coma)", () => s.keywordFilter, (v) => (s.keywordFilter = v), { ph: "becas, empleo" }),
        opt("Solo más nuevo que (días, 0=todo)", () => s.newerThanDays, (v) => (s.newerThanDays = v), { type: "number", min: 0 }),
        opt("Profundidad de rastreo (0–3)", () => s.crawlDepth, (v) => (s.crawlDepth = v), { type: "number", min: 0, max: 3 }),
        opt("Máx. resultados", () => s.maxResults, (v) => (s.maxResults = v), { type: "number", min: 1, max: 50 }),
      );
      card.appendChild(opts); srcList.appendChild(card);
    });
    const add = el("button", "button", "＋ Añadir fuente"); add.addEventListener("click", () => { a.sources.push({ url: "", required: false, keywordFilter: "", newerThanDays: 0, crawlDepth: 0, maxResults: 10 }); drawSources(); });
    srcList.appendChild(add);
  }
  drawSources();

  // 4) Competencia.
  const compBox = box("4. A quién vigila (opcional)");
  hint(compBox, "Otros institutos cuyo blog quieres seguir. El botón de abajo te dice de qué escriben ellos y tú no: cada hueco se añade a tus temas con un clic.");
  compBox.appendChild(row("Ventana (últimos N días)", () => a.competitors.lookbackDays, (v) => (a.competitors.lookbackDays = v), { type: "number", min: 1, max: 365, width: "90px" }));
  compBox.appendChild(row("Posts por competidor", () => a.competitors.postsPerCompetitor, (v) => (a.competitors.postsPerCompetitor = v), { type: "number", min: 1, max: 50, width: "90px" }));
  compBox.appendChild(el("label", "ed-field-label", "Dominios / URLs de competidores"));
  const compList = el("div", "ba-list"); compBox.appendChild(compList);
  function drawComp() {
    compList.innerHTML = "";
    a.competitors.domains.forEach((dv, i) => {
      const rw = el("div", "ba-row");
      const inp = el("input", "form-input"); inp.value = dv; inp.placeholder = "competidor.com"; inp.addEventListener("input", () => (a.competitors.domains[i] = inp.value));
      const del = el("button", "button-link-delete", "×"); del.addEventListener("click", () => { a.competitors.domains.splice(i, 1); drawComp(); });
      rw.append(inp, del); compList.appendChild(rw);
    });
    const add = el("button", "button", "＋ Añadir competidor"); add.addEventListener("click", () => { a.competitors.domains.push(""); drawComp(); });
    compList.appendChild(add);
  }
  drawComp();

  // Analizar competencia bajo demanda: trae sus posts recientes y los HUECOS de
  // temas (lo que cubren y tú no), para inspirar la lista de temas.
  const analyzeRow = el("div", "ba-analyze");
  const analyzeBtn = el("button", "button", "🔍 Analizar competencia ahora");
  const analyzeOut = el("div", "ba-gaps"); analyzeOut.hidden = true;
  analyzeRow.appendChild(analyzeBtn);
  compBox.append(analyzeRow, analyzeOut);
  analyzeBtn.addEventListener("click", async () => {
    const domains = a.competitors.domains.map((d) => (d || "").trim()).filter(Boolean);
    if (!domains.length) { notice("err", "Añade al menos un competidor antes de analizar."); return; }
    analyzeBtn.disabled = true; analyzeBtn.textContent = "Analizando…";
    analyzeOut.hidden = false; analyzeOut.innerHTML = `<p class="muted"><span class="spinner"></span>Leyendo los feeds de la competencia…</p>`;
    try {
      const r = await api("/api/automation/competitors");
      const gaps = (r.gaps || []);
      const gapsHtml = gaps.length
        ? `<p><b>Huecos de temas</b> (frecuentes en la competencia, ausentes en los tuyos):</p>
           <div class="ba-gap-chips">${gaps.map((g) => `<button class="ba-gap-chip" data-gap="${esc(g)}">＋ ${esc(g)}</button>`).join("")}</div>`
        : `<p class="muted">Sin huecos claros: tus temas ya cubren lo que publican (o no se detectaron feeds).</p>`;
      const perComp = (r.competitors || []).map((c) => {
        if (!c.ok) return `<li><b>${esc(c.domain)}</b> <span class="muted">— ${esc(c.error || "sin datos")}</span></li>`;
        const titles = c.posts.slice(0, 5).map((p) => `<li>${esc(p.title)}</li>`).join("");
        return `<li><b>${esc(c.domain)}</b> <span class="muted">(${c.posts.length} recientes)</span><ul class="ba-titles">${titles}</ul></li>`;
      }).join("");
      analyzeOut.innerHTML = `${gapsHtml}${perComp ? `<ul class="ba-comp-list">${perComp}</ul>` : ""}`;
      // Un clic en un hueco lo añade como tema nuevo.
      analyzeOut.querySelectorAll("[data-gap]").forEach((chip) =>
        chip.addEventListener("click", () => {
          const g = chip.dataset.gap;
          if (!a.topics.some((t) => (t || "").toLowerCase() === g.toLowerCase())) {
            a.topics.push(g); drawTopics();
            notice("ok", `Tema "${esc(g)}" añadido. Recuerda guardar la configuración.`);
          }
          chip.disabled = true;
        }));
    } catch (e) { analyzeOut.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
    finally { analyzeBtn.disabled = false; analyzeBtn.textContent = "🔍 Analizar competencia ahora"; }
  });

  // 5) Redacción.
  const genBox = box("5. Cómo escribe");
  hint(genBox, "El largo y el tono de cada entrada. La personalidad de la marca (voz, público, qué no decir) sale de la guía de Marca, no de aquí.");
  genBox.appendChild(row("Palabras (mínimo)", () => a.generation.minWords, (v) => (a.generation.minWords = v), { type: "number", min: 200, max: 5000, width: "100px" }));
  genBox.appendChild(row("Palabras (máximo)", () => a.generation.maxWords, (v) => (a.generation.maxWords = v), { type: "number", min: 200, max: 5000, width: "100px" }));
  genBox.appendChild(row("Tono", () => a.generation.tone, (v) => (a.generation.tone = v), { ph: "profesional y cercano" }));
  genBox.appendChild(row("Idioma", () => a.generation.language, (v) => (a.generation.language = v), { width: "90px", help: "Código, ej. es" }));

  // Estimación de volumen y consumo: sale de la programación + el largo. Se
  // recalcula en vivo al cambiar cualquier campo. Aproximada (el consumo real
  // varía con la investigación); no incluye costo porque el precio del modelo
  // no vive en el navegador.
  const estBox = box("Cuánto va a escribir");
  const est = el("div", "ba-estimate"); estBox.appendChild(est);
  const fmtN = (n) => Math.round(n).toLocaleString("es-EC");
  function updateEstimate() {
    const perWeek = Number(a.schedule.perWeek) || 0;
    const draftsMonth = perWeek * 4.33;
    const avgWords = ((Number(a.generation.minWords) || 0) + (Number(a.generation.maxWords) || 0)) / 2;
    const outTok = avgWords * 1.4;        // ~1.4 tokens por palabra en español
    const inTok = 5000;                    // sistema + investigación (estimado)
    const tokMonth = draftsMonth * (outTok + inTok);
    est.innerHTML = perWeek
      ? `<p><b>${fmtN(draftsMonth)}</b> borradores/mes · <b>${fmtN(avgWords)}</b> palabras c/u ·
         ≈ <b>${fmtN(tokMonth)}</b> tokens/mes con Claude Sonnet.</p>
         <p class="muted ba-sub">Estimación aproximada: el consumo real depende de cuánta investigación traiga cada tema.
         Los borradores NO se publican solos; requieren tu revisión.</p>`
      : `<p class="muted">Activa la automatización y define “Blogs por semana” para ver la estimación.</p>`;
  }
  updateEstimate();
  // Recalcula en vivo ante cualquier cambio de la config (delegación en el wrap).
  wrap.addEventListener("input", updateEstimate);

  // Guardar (limpia entradas vacías antes de validar).
  const bar = el("div", "settings-save");
  const saveBtn = el("button", "button button-primary", "Guardar configuración");
  saveBtn.addEventListener("click", async () => {
    a.topics = a.topics.map((t) => (t || "").trim()).filter(Boolean);
    a.competitors.domains = a.competitors.domains.map((d) => (d || "").trim()).filter(Boolean);
    a.sources = a.sources.filter((s) => (s.url || "").trim());
    // Poda ajustes por-tema huérfanos o vacíos (temas borrados/renombrados).
    for (const k of Object.keys(a.topicOverrides || {})) {
      if (!a.topics.includes(k) || !a.topicOverrides[k] || !Object.keys(a.topicOverrides[k]).length) delete a.topicOverrides[k];
    }
    drawTopics(); drawComp(); drawSources();
    saveBtn.disabled = true; saveBtn.textContent = "Guardando…";
    try {
      // baseSha = la versión que se cargó. Si otro admin (o el asistente) tocó
      // esto mientras tanto, el servidor responde 409 en vez de pisarlo.
      const r = await api("/api/automation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...a, baseSha: a._sha }) });
      a._sha = r.sha || a._sha; // refresco: sin esto el 2.º guardado da un 409 falso
      notice("ok", "Configuración de automatización guardada.");
    } catch (e) { notice("err", esc(e.message)); }
    finally { saveBtn.disabled = false; saveBtn.textContent = "Guardar configuración"; }
  });
  bar.appendChild(saveBtn); wrap.appendChild(bar);
}

const WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

