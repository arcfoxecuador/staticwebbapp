import { watchDeploy } from "../blocks/save.js";
import { api } from "../core/api.js";
import { $, ICONS, el, esc, fileToBase64 } from "../core/dom.js";
import { CSRF, PUBLISH, SITE, isAdmin, isHidden } from "../core/state.js";
import { announce, confirmModal, notice, screen } from "../core/ui.js";

// ── Asistente IA (chat multi-turno con imágenes adjuntas, SSE) ───────────────
// Cada línea del registro se rotula con QUIÉN habla y en qué punto va el trabajo.
// Sin el rótulo, la corrida era una lista de frases sueltas en la que no se
// distinguía "estoy trabajando" de "ya terminé".
const ENTRY_META = {
  you: { icon: "🗣", label: "Tú" },
  routed: { icon: "→", label: "Pedido recibido" },
  agent: { icon: "✳", label: "Trabajando" },
  step: { icon: "•", label: "Paso" },
  pr: { icon: "✓", label: "Publicado" },
  done: { icon: "✓", label: "Asistente" },
  error: { icon: "!", label: "No se pudo" },
};

function addEntry(log, type, message, data) {
  log.querySelector(".ag-empty")?.remove(); // el vacío desaparece al primer mensaje
  const meta = ENTRY_META[type] || ENTRY_META.step;
  const e = el("div", `entry entry-${type}`);
  const head = el("span", "entry-label", `<span class="entry-ico" aria-hidden="true">${meta.icon}</span>${esc(meta.label)}`);
  const body = el("span", "entry-text");
  // "Publicado" solo dice que el commit salió. Si el build del sitio falla (un
  // dato con el tipo equivocado, por ejemplo), el sitio se queda en la versión
  // anterior y antes el chat no se enteraba: decía "listo" igual. watchDeploy
  // vigila ese hueco y reescribe el estado real.
  const watchesDeploy = type === "pr";
  if (watchesDeploy) {
    body.innerHTML = `${esc(message)} <span class="ag-deploy"><span class="spinner"></span> Comprobando que el sitio se reconstruya…</span>`;
  } else body.textContent = message;
  e.append(head, body);
  log.appendChild(e); log.scrollTop = log.scrollHeight;
  // OJO: watchDeploy se arranca DESPUÉS de insertar la línea. Comprueba
  // box.isConnected en cada vuelta, así que llamarlo antes de añadirla al DOM
  // lo cortaba en el primer sondeo y el estado se quedaba en "Comprobando…".
  if (watchesDeploy) watchDeploy(e.querySelector(".ag-deploy"), data?.url || "");
  return e;
}

// Reescribe una línea ya pintada conservando su estructura (rótulo + texto).
// Lo usa la subida de imágenes: "Subiendo foto.jpg…" → "Imagen lista: /uploads/…".
function updateEntry(entry, type, message) {
  const meta = ENTRY_META[type] || ENTRY_META.step;
  entry.className = `entry entry-${type}`;
  entry.querySelector(".entry-label").innerHTML = `<span class="entry-ico" aria-hidden="true">${meta.icon}</span>${esc(meta.label)}`;
  entry.querySelector(".entry-text").textContent = message;
}

async function sendAgent(prompt, kind, ui) {
  const { log, sendBtn, stopBtn, promptEl, attachments } = ui;
  sendBtn.hidden = true; stopBtn.hidden = false; promptEl.disabled = true;
  const label = attachments.length ? `${prompt}\n(${attachments.length} imagen${attachments.length === 1 ? "" : "es"} adjunta${attachments.length === 1 ? "" : "s"})` : prompt;
  addEntry(log, "you", label);
  // Indicador vivo mientras dura la corrida: sin él, entre paso y paso la
  // pantalla parecía congelada y la gente volvía a pulsar Enviar.
  const working = el("div", "ag-working", `<span class="spinner"></span><span>El asistente está trabajando… puedes esperar aquí o pulsar “Detener”.</span>`);
  log.appendChild(working); log.scrollTop = log.scrollHeight;
  const abort = new AbortController();
  stopBtn.onclick = () => abort.abort();
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": CSRF },
      body: JSON.stringify({ prompt, kind, attachments: attachments.map((a) => a.path) }),
      signal: abort.signal,
    });
    if (res.status === 401) { location.href = "/login"; return; }
    // Límite de uso alcanzado (429) u otro error antes del stream: se responde
    // JSON, no SSE. Muéstralo como error del asistente y no intentes leer stream.
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      addEntry(log, "error", data.error || `Error ${res.status}`);
      return;
    }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n"); buf = parts.pop() || "";
      for (const p of parts) {
        const line = p.replace(/^data: /, "").trim();
        if (!line || line.startsWith(":")) continue; // ": ping" = latido SSE
        let evt;
        try { evt = JSON.parse(line); } catch { continue; }
        if (evt.type === "done") addEntry(log, "done", evt.message);
        else if (evt.type === "error") addEntry(log, "error", evt.message);
        else if (evt.type === "pr") addEntry(log, "pr", evt.message, evt.data);
        else if (evt.type === "routed" || evt.type === "agent") addEntry(log, evt.type, evt.message);
        else addEntry(log, "step", evt.message);
        // El indicador siempre al final: los pasos nuevos se insertan encima.
        log.appendChild(working); log.scrollTop = log.scrollHeight;
      }
    }
  } catch (e) {
    addEntry(log, "error", e.name === "AbortError" ? "Detuviste el pedido. No se publicó ningún cambio en el sitio." : e.message);
  } finally {
    working.remove();
    sendBtn.hidden = false; stopBtn.hidden = true; promptEl.disabled = false;
    promptEl.value = ""; ui.clearAttachments(); promptEl.focus();
  }
}

// Modos del asistente. La etiqueta dice QUÉ consigues, no cómo se llama el
// agente por dentro; la descripción se lee bajo los botones al elegir uno.
function agentModes(adm) {
  return [
    { kind: "auto", label: "Automático", tip: "Detecta solo qué tipo de tarea es tu pedido",
      desc: "Recomendado. Escribe lo que necesitas y el asistente decide solo qué hay que tocar." },
    { kind: "blog", label: "Entradas del blog", tip: "Crear o corregir notas del blog",
      desc: "Redacta una nota nueva o corrige una publicada: título, texto, portada, categoría o fecha." },
    ...(adm ? [{ kind: "design", label: "Diseño del sitio", tip: "Cambiar colores, banner y efecto de temporada del sitio",
      desc: "Cambia los colores de marca, el banner de promoción y los efectos de temporada de todo el sitio." }] : []),
    { kind: "page", label: "Páginas y carreras", tip: "Editar el contenido y el orden de páginas y carreras",
      desc: "Cambia textos, agrega o reordena secciones de una página, y edita los datos de una carrera." },
    { kind: "media", label: "Imágenes", tip: "Generar o importar imágenes a la biblioteca",
      desc: "Genera una imagen con IA o trae una desde un enlace, y la guarda en la biblioteca de medios." },
  ];
}

// Ejemplos agrupados: además de ahorrar tecleo, son el catálogo de lo que el
// asistente sabe hacer. Quien entra por primera vez aprende leyéndolos.
function agentExamples(adm) {
  return [
    { title: "Para el blog", items: [
      "Escribe una entrada sobre las fechas de inicio de este mes",
      "Revisa y corrige la ortografía de la última entrada publicada",
    ] },
    { title: "Para las páginas", items: [
      "Cambia el título del hero de la página de inicio",
      "Agrega una sección de preguntas frecuentes en Admisiones",
    ] },
    { title: "Para las imágenes", items: [
      "Genera una imagen de portada para una nota sobre becas",
    ] },
    ...(adm ? [{ title: "Para el diseño", items: ["Pon el sitio en modo navideño con nieve"] }] : []),
  ];
}

// Tarjeta "cómo funciona": el modelo mental completo en tres pasos. Se puede
// ocultar (queda recordado por navegador) y volver a abrir desde la cabecera.
const AI_INTRO_KEY = "ia-intro-oculta";
function agentIntroCard(adm) {
  const card = el("section", "ai-intro");
  card.innerHTML = `
    <div class="ai-intro-head">
      <h2>Cómo funciona el Asistente IA</h2>
      <button class="ai-intro-x" type="button" aria-label="Ocultar la explicación">✕</button>
    </div>
    <ol class="ai-steps">
      <li>
        <span class="ai-step-n" aria-hidden="true">1</span>
        <b>Escríbelo con tus palabras</b>
        <span>Como se lo dirías a un compañero: <i>“cambia el título del inicio”</i>. No hace falta saber de código.</span>
      </li>
      <li>
        <span class="ai-step-n" aria-hidden="true">2</span>
        <b>El asistente hace el cambio</b>
        <span>Solo puede tocar textos, secciones, imágenes y colores del sitio. Verás cada paso mientras trabaja.</span>
      </li>
      <li>
        <span class="ai-step-n" aria-hidden="true">3</span>
        <b>Se publica y lo revisas</b>
        <span>El sitio se actualiza en aproximadamente un minuto. Todo cambio queda guardado con tu nombre y se puede revertir.</span>
      </li>
    </ol>
    ${isHidden("automation") && isHidden("review") ? "" : `<p class="ai-intro-foot">
      ${adm && !isHidden("automation")
        ? `¿Prefieres que la IA escriba el blog sola cada semana? Eso se configura en
           <a href="#automation">Blogs automáticos</a>, y esos borradores nunca se publican sin que alguien los apruebe.`
        : `La IA también escribe entradas del blog por su cuenta. Esas no salen solas: te esperan en la
           <a href="#review">Cola de revisión</a> para que las apruebes o las rechaces.`}
    </p>`}`;
  return card;
}

export async function showAgent() {
  // Capacidades role-aware: el diseño/apariencia es solo para admins (el backend
  // también lo exige), así que a los editores no se les ofrece esa opción.
  const adm = isAdmin();
  const wrap = screen("Asistente IA",
    `Asistente IA <button class="page-title-action" id="ag-how">¿Cómo funciona?</button>` +
    `<button class="page-title-action" id="ag-reset">Nueva conversación</button>`);
  wrap.appendChild(el("p", "wp-subtitle",
    `Pídele cambios al sitio escribiendo en español, sin tocar código: entradas del blog, textos y secciones de las páginas, datos de las carreras${adm ? ", colores del sitio" : ""} e imágenes.`));

  // La explicación aparece por defecto y se oculta cuando la persona ya la
  // entendió; el botón "¿Cómo funciona?" la devuelve en cualquier momento.
  const intro = agentIntroCard(adm);
  wrap.appendChild(intro);
  const setIntro = (show) => {
    intro.hidden = !show;
    try { localStorage.setItem(AI_INTRO_KEY, show ? "0" : "1"); } catch { /* modo privado */ }
  };
  let introHidden = false;
  try { introHidden = localStorage.getItem(AI_INTRO_KEY) === "1"; } catch { /* modo privado */ }
  intro.hidden = introHidden;
  intro.querySelector(".ai-intro-x").addEventListener("click", () => {
    setIntro(false);
    $("ag-how").focus(); // el foco no se pierde al desaparecer la tarjeta
    announce("Explicación oculta. Puedes volver a verla con el botón ¿Cómo funciona?");
  });
  $("ag-how").addEventListener("click", () => {
    setIntro(true);
    intro.scrollIntoView({ block: "nearest" });
  });

  const modes = agentModes(adm);
  const panel = el("div", "wp-agent");
  panel.innerHTML = `
    <div class="mode" role="group" aria-label="¿Qué quieres cambiar?">
      <span class="ag-modes-lead">¿Qué quieres cambiar?</span>
      ${modes.map((m, i) => `<button class="mode-btn${i === 0 ? " active" : ""}" type="button" data-kind="${m.kind}" aria-pressed="${i === 0}" title="${esc(m.tip)}">${esc(m.label)}</button>`).join("")}
    </div>
    <p class="ag-mode-desc" id="ag-mode-desc" aria-live="polite">${esc(modes[0].desc)}</p>
    <section id="ag-log" class="log" role="log" aria-live="polite" aria-label="Conversación con el asistente"></section>
    <div id="ag-suggest" class="ag-suggest"></div>
    <div id="ag-attach-list" class="ag-attach-list"></div>
    <label class="ag-prompt-label" for="ag-prompt">Escribe tu pedido</label>
    <textarea id="ag-prompt" rows="2" placeholder="Ej.: “Escribe una nota sobre la nueva beca” · “Pon esta foto en el hero de inicio”"></textarea>
    <div class="ag-actions">
      <button id="ag-attach" class="button" type="button"><span class="btn-ico">${ICONS.media}</span>Adjuntar imagen</button>
      <button id="ag-send" class="button button-primary" type="button">Enviar al asistente</button>
      <button id="ag-stop" class="button" type="button" hidden>Detener</button>
      <span class="ag-hint muted" aria-hidden="true"><kbd>Enter</kbd> envía · <kbd>Shift</kbd>+<kbd>Enter</kbd> salto de línea</span>
    </div>
    <p class="ag-publish-note">
      <span class="ag-publish-ico" aria-hidden="true">⬤</span>
      ${PUBLISH.toProd
        ? `Lo que pidas aquí <b>se publica en el sitio real</b> y se ve en aproximadamente un minuto. Si te equivocas, pídele el cambio contrario o avisa a un administrador: nada se pierde.`
        : `Lo que pidas aquí se envía a <b>${esc(PUBLISH.where)}</b> para revisarlo antes de que llegue al sitio real.`}
    </p>
    <input id="ag-file" type="file" accept="image/*" multiple hidden />`;
  wrap.appendChild(panel);

  let kind = "auto";
  const modeDesc = panel.querySelector("#ag-mode-desc");
  panel.querySelectorAll(".mode-btn").forEach((b) =>
    b.addEventListener("click", () => {
      panel.querySelectorAll(".mode-btn").forEach((x) => { x.classList.remove("active"); x.setAttribute("aria-pressed", "false"); });
      b.classList.add("active"); b.setAttribute("aria-pressed", "true");
      kind = b.dataset.kind;
      modeDesc.textContent = modes.find((m) => m.kind === kind)?.desc || "";
    }));

  const log = $("ag-log"), sendBtn = $("ag-send"), stopBtn = $("ag-stop"), promptEl = $("ag-prompt");
  const attachList = $("ag-attach-list"), fileInput = $("ag-file");

  // Conversación previa de la sesión (multi-turno): "hazlo más corto" funciona.
  try {
    const h = await api("/api/agent/history");
    for (const m of h.messages || []) {
      addEntry(log, m.role === "user" ? "you" : "done", m.content.replace(/\n\n\[Imagen adjunta:[^\]]+\]/g, " (imagen adjunta)"));
    }
  } catch { /* sin historial */ }
  // Vacío explicado: sin esto la primera visita muestra una caja en blanco y no
  // queda claro que aquí abajo aparecerá el trabajo del asistente.
  if (!log.querySelector(".entry")) {
    log.appendChild(el("div", "ag-empty",
      "<b>Aquí verás al asistente trabajar.</b><span>Escribe tu pedido abajo y cada paso irá apareciendo en esta zona, hasta el aviso de publicado.</span>"));
  }

  // Adjuntos: la foto se sube a la biblioteca (optimizada, con dedupe) y su
  // ruta viaja con el prompt para que el agente la coloque donde se indique.
  const attachments = [];
  const drawAttachments = () => {
    attachList.innerHTML = "";
    attachments.forEach((a, i) => {
      const chip = el("span", "ag-attach-chip");
      const img = el("img"); img.src = SITE ? SITE + a.path : a.path; img.alt = "";
      chip.append(img, el("span", null, esc(a.name)));
      const x = el("button", "ag-attach-x", "✕"); x.title = "Quitar";
      x.addEventListener("click", () => { attachments.splice(i, 1); drawAttachments(); });
      chip.appendChild(x);
      attachList.appendChild(chip);
    });
  };
  $("ag-attach").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    for (const f of fileInput.files) {
      const entry = addEntry(log, "step", `Subiendo ${f.name}…`);
      try {
        const j = await api("/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, data: await fileToBase64(f) }) });
        attachments.push({ path: j.path, name: f.name });
        updateEntry(entry, "step", `Imagen lista: ${j.path}`);
        drawAttachments();
      } catch (e) { updateEntry(entry, "error", `No se pudo subir ${f.name}: ${e.message}`); }
    }
    fileInput.value = "";
  });

  $("ag-reset").addEventListener("click", async () => {
    if (!(await confirmModal({ title: "Nueva conversación", message: "¿Empezar una conversación nueva? El asistente olvidará el hilo actual.", confirmLabel: "Empezar de nuevo" }))) return;
    try {
      await api("/api/agent/reset", { method: "POST" });
      log.innerHTML = "";
      log.appendChild(el("div", "ag-empty",
        "<b>Aquí verás al asistente trabajar.</b><span>Escribe tu pedido abajo y cada paso irá apareciendo en esta zona, hasta el aviso de publicado.</span>"));
      sug.style.display = ""; // los ejemplos vuelven a servir en un hilo nuevo
      announce("Conversación nueva. El asistente olvidó el hilo anterior.");
    } catch (e) { notice("err", esc(e.message)); }
  });

  const ui = { log, sendBtn, stopBtn, promptEl, attachments, clearAttachments: () => { attachments.length = 0; drawAttachments(); } };
  const autogrow = () => { promptEl.style.height = "auto"; promptEl.style.height = Math.min(promptEl.scrollHeight, 200) + "px"; };
  const run = () => { const p = promptEl.value.trim(); if (p) { sendAgent(p, kind, ui); promptEl.style.height = ""; } };
  sendBtn.addEventListener("click", run);
  promptEl.addEventListener("input", autogrow);
  // Enter envía; Shift+Enter (o durante composición IME) hace salto de línea.
  promptEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); run(); }
  });

  // Ejemplos agrupados por tema: al hacer clic precargan el prompt (editable) y
  // enfocan. El diseño solo se ofrece a admins (coherente con los modos).
  const sug = $("ag-suggest");
  sug.appendChild(el("p", "ag-suggest-lead", "Ejemplos de lo que puedes pedir — toca uno para escribirlo en el cuadro:"));
  agentExamples(adm).forEach((group) => {
    const g = el("div", "ag-suggest-group");
    g.appendChild(el("h3", "ag-suggest-title", esc(group.title)));
    const row = el("div", "ag-suggest-row");
    group.items.forEach((text) => {
      const chip = el("button", "ag-chip"); chip.type = "button"; chip.textContent = text;
      chip.addEventListener("click", () => {
        promptEl.value = text;
        promptEl.focus();
        promptEl.setSelectionRange(text.length, text.length);
      });
      row.appendChild(chip);
    });
    g.appendChild(row);
    sug.appendChild(g);
  });
  // Al empezar a escribir o cuando ya hay conversación, las sugerencias sobran.
  const hideSug = () => { sug.style.display = "none"; };
  promptEl.addEventListener("input", () => { if (promptEl.value.trim()) hideSug(); });
  if (log.querySelector(".entry")) hideSug(); // ya hay historial cargado
}

