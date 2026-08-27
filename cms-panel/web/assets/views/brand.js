import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { isHidden } from "../core/state.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Marca (brand.json): guía para los agentes de IA ──────────────────────────
const IMAGE_SIZE_OPTS = [
  ["wide", "Ancho 16:9 (fondo de hero / banner)"],
  ["cover", "Portada 16:10 (entradas / noticias)"],
  ["landscape", "Horizontal 4:3 (lateral / texto+imagen)"],
  ["portrait", "Vertical 4:5 (foto de persona)"],
  ["square", "Cuadrado 1:1 (logo / avatar / ícono)"],
  ["natural", "Natural (sin recorte)"],
];
export async function showBrand() {
  loadingScreen("Marca");
  let b;
  try { b = await api("/api/brand"); }
  catch (e) { screen("Marca", "Marca (guía IA)"); notice("err", esc(e.message)); return; }
  // Normaliza (un brand.json antiguo puede no traer todas las secciones).
  b.identity = b.identity || {}; b.offering = b.offering || {}; b.offering.programAreas = b.offering.programAreas || [];
  b.voice = b.voice || { tone: "", do: [], dont: [] }; b.voice.do = b.voice.do || []; b.voice.dont = b.voice.dont || [];
  b.personas = b.personas || []; b.differentiators = b.differentiators || [];
  b.valueProps = b.valueProps || []; b.keyPhrases = b.keyPhrases || [];
  b.terminology = b.terminology || []; b.rules = b.rules || []; b.compliance = b.compliance || [];
  b.ctas = b.ctas || []; b.seoKeywords = b.seoKeywords || []; b.imageGuide = b.imageGuide || [];

  const wrap = screen("Marca (guía IA)", "Marca (guía IA)", {
    help: `<h3>Resumen</h3><p>El <b>contexto completo de la marca</b> que siguen los agentes de IA al redactar textos y
      generar imágenes (asistente y automatización del blog): quién es IIDEA, qué ofrece, a quién le habla, cómo suena,
      qué reglas respeta (por ejemplo, no nombrar a la competencia), de dónde sacar la información y con qué medidas
      generar imágenes. Se guarda en el sitio y se aplica en la siguiente corrida de cada agente. Los datos que no
      conozcas puedes dejarlos en blanco (la IA no inventa lo que falta).</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Mientras más completo, mejor escribe la IA y más en línea con IIDEA. Deja en blanco lo que no sepas."));

  // Sin este encuadre, la pantalla parece "otro formulario de datos". Lo que
  // importa es que TODO lo de aquí abajo es lo que la IA lee antes de escribir.
  const why = el("section", "brand-why");
  why.innerHTML = `
    <h2>Esta es la ficha que la IA lee antes de escribir</h2>
    <p>Cada vez que el <a href="#agent">Asistente IA</a> o los ${isHidden("automation") ? "<b>Blogs automáticos</b>" : `<a href="#automation">Blogs automáticos</a>`} redactan algo,
    primero leen esta página: quién es IIDEA, a quién le habla, cómo suena y qué no debe decir. Si un texto de la IA
    suena raro o repite algo que no quieres, <b>lo normal es corregirlo aquí</b>, no pedirlo de nuevo cada vez.</p>
    <p class="brand-why-note">Los cambios se aplican en el siguiente pedido que hagas. Lo que no sepas, déjalo vacío: la IA no inventa lo que falta.</p>`;
  wrap.appendChild(why);

  const box = (title, sub) => {
    const bx = el("div", "postbox");
    bx.innerHTML = `<div class="postbox-header"><h2>${esc(title)}</h2></div>`;
    const inside = el("div", "inside");
    if (sub) inside.appendChild(el("p", "muted ba-sub", sub));
    bx.appendChild(inside); wrap.appendChild(bx); return inside;
  };
  const fieldRow = (parent, label, get, set, opts = {}) => {
    const f = el("label", "ed-field");
    f.appendChild(el("span", "ed-field-label", label));
    const inp = opts.area ? el("textarea", "form-input") : el("input", "form-input");
    if (opts.area) inp.rows = opts.rows || 2; else inp.type = "text";
    inp.value = get() ?? ""; inp.setAttribute("aria-label", label);
    if (opts.ph) inp.placeholder = opts.ph;
    inp.addEventListener("input", () => set(inp.value));
    f.appendChild(inp);
    if (opts.help) f.appendChild(el("span", "ed-field-help muted", opts.help));
    parent.appendChild(f);
  };
  const subLabel = (parent, txt) => parent.appendChild(el("div", "ed-field-label", txt));
  // Editor de lista de textos (una línea por ítem, con añadir/quitar).
  const listEditor = (parent, arr, ph) => {
    const list = el("div", "ba-list");
    const draw = () => {
      list.innerHTML = "";
      arr.forEach((_, i) => {
        const rw = el("div", "ba-row");
        const inp = el("input", "form-input"); inp.value = arr[i]; inp.placeholder = ph; inp.setAttribute("aria-label", ph);
        inp.addEventListener("input", () => (arr[i] = inp.value));
        const del = el("button", "button-link-delete", "×"); del.setAttribute("aria-label", "Quitar"); del.addEventListener("click", () => { arr.splice(i, 1); draw(); });
        rw.append(inp, del); list.appendChild(rw);
      });
      const add = el("button", "button", "＋ Añadir"); add.addEventListener("click", () => { arr.push(""); draw(); });
      list.appendChild(add);
    };
    draw(); parent.appendChild(list);
  };
  // Editor de lista de OBJETOS (varias columnas por fila), p. ej. personas o CTAs.
  const objListEditor = (parent, arr, cols, makeEmpty) => {
    const list = el("div", "brand-objlist");
    const draw = () => {
      list.innerHTML = "";
      arr.forEach((item, i) => {
        const row = el("div", "brand-objrow");
        cols.forEach((c) => {
          const inp = el("input", "form-input"); inp.value = item[c.key] ?? ""; inp.placeholder = c.ph; inp.setAttribute("aria-label", c.ph);
          if (c.grow) inp.classList.add("grow");
          inp.addEventListener("input", () => (item[c.key] = inp.value));
          row.appendChild(inp);
        });
        const del = el("button", "button-link-delete", "×"); del.setAttribute("aria-label", "Quitar"); del.addEventListener("click", () => { arr.splice(i, 1); draw(); });
        row.appendChild(del);
        list.appendChild(row);
      });
      const add = el("button", "button", "＋ Añadir"); add.addEventListener("click", () => { arr.push(makeEmpty()); draw(); });
      list.appendChild(add);
    };
    draw(); parent.appendChild(list);
  };

  // 1) Identidad.
  const idn = box("Identidad", "Quién es IIDEA. Deja en blanco lo que no sepas con certeza.");
  fieldRow(idn, "Nombre legal", () => b.identity.legalName, (v) => (b.identity.legalName = v), { ph: "Instituto Superior Tecnológico IIDEA" });
  fieldRow(idn, "Tipo de institución", () => b.identity.type, (v) => (b.identity.type = v), { ph: "Instituto Superior Tecnológico" });
  fieldRow(idn, "Eslogan", () => b.identity.tagline, (v) => (b.identity.tagline = v));
  fieldRow(idn, "Ciudad", () => b.identity.city, (v) => (b.identity.city = v));
  fieldRow(idn, "País", () => b.identity.country, (v) => (b.identity.country = v));
  fieldRow(idn, "Año de fundación", () => b.identity.foundedYear, (v) => (b.identity.foundedYear = v));
  fieldRow(idn, "Aval / regulador", () => b.identity.accreditation, (v) => (b.identity.accreditation = v), { help: "Ej. aprobación de SENESCYT/CES. Déjalo vacío si no lo tienes a mano." });

  // 2) Oferta.
  const off = box("Oferta académica", "Qué ofrece IIDEA (la IA también lee las carreras del sitio).");
  fieldRow(off, "Modalidad", () => b.offering.modality, (v) => (b.offering.modality = v), { ph: "100% online" });
  fieldRow(off, "Metodología", () => b.offering.methodology, (v) => (b.offering.methodology = v), { ph: "dual con IA aplicada" });
  fieldRow(off, "Fechas de inicio", () => b.offering.startDates, (v) => (b.offering.startDates = v), { ph: "10 fechas de inicio al año" });
  subLabel(off, "Áreas / carreras (a alto nivel)");
  listEditor(off, b.offering.programAreas, "Ej: Desarrollo de Software");

  // 3) Audiencia.
  const aud = box("Audiencia", "A quién le hablamos.");
  fieldRow(aud, "Audiencia (general)", () => b.audience, (v) => (b.audience = v), { area: true, ph: "¿A quién le hablamos?" });
  subLabel(aud, "Personas / segmentos");
  objListEditor(aud, b.personas, [{ key: "name", ph: "Nombre del segmento" }, { key: "description", ph: "Descripción", grow: true }], () => ({ name: "", description: "" }));

  // 4) Voz.
  const voice = box("Voz de la marca", "Cómo suena IIDEA al escribir.");
  fieldRow(voice, "Tono", () => b.voice.tone, (v) => (b.voice.tone = v), { ph: "cercano, profesional, optimista…" });
  subLabel(voice, "SÍ (haz esto)");
  listEditor(voice, b.voice.do, "Ej: Frases cortas y claras");
  subLabel(voice, "EVITA (no hagas esto)");
  listEditor(voice, b.voice.dont, "Ej: Promesas exageradas");

  // 5) Misión, visión y mensajes.
  const msg = box("Misión, visión y mensajes", "El norte de la marca y las ideas que siempre queremos transmitir.");
  fieldRow(msg, "Misión", () => b.mission, (v) => (b.mission = v), { area: true });
  fieldRow(msg, "Visión", () => b.vision, (v) => (b.vision = v), { area: true });
  subLabel(msg, "Propuestas de valor");
  listEditor(msg, b.valueProps, "Ej: Carreras 100% online");
  subLabel(msg, "Diferenciadores (por qué IIDEA)");
  listEditor(msg, b.differentiators, "Ej: Empiezas casi cualquier mes");
  subLabel(msg, "Frases clave");
  listEditor(msg, b.keyPhrases, "Ej: Empieza este mes, no en seis");
  fieldRow(msg, "Descripción base (boilerplate)", () => b.boilerplate, (v) => (b.boilerplate = v), { area: true, help: "Un párrafo que describe a IIDEA; se puede usar al cierre de textos." });

  // 6) Terminología.
  const term = box("Terminología", "Qué palabras preferir y cuáles evitar.");
  objListEditor(term, b.terminology, [{ key: "prefer", ph: "Di esto" }, { key: "avoid", ph: "Evita esto" }, { key: "note", ph: "Nota (opcional)", grow: true }], () => ({ prefer: "", avoid: "", note: "" }));

  // 7) Reglas, cumplimiento y fuentes.
  const rules = box("Reglas, cumplimiento y fuentes", "Reglas obligatorias que la IA debe respetar y de dónde sacar la información.");
  subLabel(rules, "Reglas (obligatorias)");
  listEditor(rules, b.rules, "Ej: No menciones a la competencia por su nombre");
  subLabel(rules, "Cumplimiento (límites legales/regulatorios)");
  listEditor(rules, b.compliance, "Ej: No garantices titulación ni empleo");
  fieldRow(rules, "¿De dónde sacar la información?", () => b.sources, (v) => (b.sources = v), { area: true, rows: 3, help: "Fuentes oficiales de confianza. La automatización también usa las fuentes configuradas en Automatización." });

  // 8) Conversión y SEO.
  const conv = box("Conversión y SEO", "Adónde queremos llevar al lector y qué buscamos posicionar.");
  subLabel(conv, "Llamadas a la acción");
  objListEditor(conv, b.ctas, [{ key: "label", ph: "Texto del botón (ej. Aplica ahora)" }, { key: "when", ph: "¿Cuándo usarla?", grow: true }], () => ({ label: "", when: "" }));
  subLabel(conv, "Palabras clave SEO");
  listEditor(conv, b.seoKeywords, "Ej: carreras online Ecuador");

  // 9) Medidas de imagen.
  const imgs = box("Medidas de imagen", "Qué proporción usar según dónde va la imagen. La IA elige la medida al generar.");
  const imgList = el("div", "brand-slots");
  const drawSlots = () => {
    imgList.innerHTML = "";
    b.imageGuide.forEach((s, i) => {
      const card = el("div", "brand-slot");
      const use = el("input", "form-input"); use.value = s.use || ""; use.placeholder = "¿Para qué imagen?"; use.setAttribute("aria-label", "Uso de la imagen");
      use.addEventListener("input", () => (s.use = use.value));
      const sel = el("select", "form-input"); sel.setAttribute("aria-label", "Medida");
      IMAGE_SIZE_OPTS.forEach(([v, l]) => { const o = el("option", null, l); o.value = v; if (s.size === v) o.selected = true; sel.appendChild(o); });
      sel.addEventListener("change", () => (s.size = sel.value));
      const notes = el("input", "form-input"); notes.value = s.notes || ""; notes.placeholder = "Notas de composición (opcional)"; notes.setAttribute("aria-label", "Notas");
      notes.addEventListener("input", () => (s.notes = notes.value));
      const del = el("button", "button-link-delete", "×"); del.setAttribute("aria-label", "Quitar"); del.addEventListener("click", () => { b.imageGuide.splice(i, 1); drawSlots(); });
      card.append(use, sel, notes, del); imgList.appendChild(card);
    });
    const add = el("button", "button", "＋ Añadir medida"); add.addEventListener("click", () => { b.imageGuide.push({ use: "", size: "natural", notes: "" }); drawSlots(); });
    imgList.appendChild(add);
  };
  drawSlots(); imgs.appendChild(imgList);

  // Guardar.
  const bar = el("div", "settings-save");
  const saveBtn = el("button", "button button-primary", "Guardar guía de marca");
  saveBtn.addEventListener("click", async () => {
    const clean = (arr) => arr.map((x) => (x || "").trim()).filter(Boolean);
    b.voice.do = clean(b.voice.do); b.voice.dont = clean(b.voice.dont);
    b.valueProps = clean(b.valueProps); b.differentiators = clean(b.differentiators);
    b.keyPhrases = clean(b.keyPhrases); b.rules = clean(b.rules); b.compliance = clean(b.compliance);
    b.seoKeywords = clean(b.seoKeywords); b.offering.programAreas = clean(b.offering.programAreas);
    // Listas de objetos: descarta las que no tengan su campo obligatorio.
    b.personas = b.personas.filter((p) => (p.name || "").trim());
    b.terminology = b.terminology.filter((t) => (t.prefer || "").trim());
    b.ctas = b.ctas.filter((c) => (c.label || "").trim());
    b.imageGuide = b.imageGuide.filter((s) => (s.use || "").trim());
    saveBtn.disabled = true; saveBtn.textContent = "Guardando…";
    try {
      const r = await api("/api/brand", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...b, baseSha: b._sha }) });
      b._sha = r.sha || b._sha;
      notice("ok", "Guía de marca guardada. Los agentes la usan en su próxima corrida.");
    } catch (e) { notice("err", esc(e.message)); }
    finally { saveBtn.disabled = false; saveBtn.textContent = "Guardar guía de marca"; }
  });
  bar.appendChild(saveBtn); wrap.appendChild(bar);
}

