import { save, watchDeploy } from "../blocks/save.js";
import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { confirmModal, loadingScreen, notice, screen } from "../core/ui.js";

// ── Ajustes del sitio (site.json): navegación, contacto, redes, enlaces ──────
export async function showSettings() {
  loadingScreen("Ajustes del sitio");
  let s;
  try { s = await api("/api/settings"); }
  catch (e) { screen("Ajustes del sitio", "Ajustes del sitio"); notice("err", esc(e.message)); return; }

  const wrap = screen("Ajustes del sitio", "Ajustes del sitio", {
    help: `<h3>Resumen</h3><p>Datos globales del sitio que antes solo se cambiaban tocando código: el
      <b>menú</b> de la cabecera, los <b>datos de contacto</b>, las <b>redes</b> y los <b>enlaces clave</b>
      (Aula Virtual, video, "Aplica"). Se validan antes de guardar y se aplican en todo el sitio.</p>
      <h3>También mandan dentro de las páginas</h3><p>El texto de una página puede llamar a estos datos con un
      atajo en vez de repetirlos: <code>@email</code> (correo de admisiones), <code>@becasEmail</code> (Bienestar),
      <code>@aula</code> y <code>@video</code>. Donde se use el atajo, el sitio pone lo que escribas aquí — así
      cambiar un correo es cambiarlo <b>una vez</b>, no buscarlo página por página.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Navegación, contacto, redes y enlaces del sitio. Se aplican en la cabecera, el pie y los formularios."));

  const box = (title) => {
    const b = el("div", "postbox");
    b.innerHTML = `<div class="postbox-header"><h2>${esc(title)}</h2></div>`;
    const inside = el("div", "inside"); b.appendChild(inside); wrap.appendChild(b); return inside;
  };
  const textRow = (label, get, set, opts = {}) => {
    const row = el("div", "ed-field");
    row.appendChild(el("label", "ed-field-label", esc(label)));
    const inp = el("input", "form-input"); inp.type = opts.type || "text"; inp.value = get() ?? "";
    inp.setAttribute("aria-label", label); // la etiqueta es hermana, no envuelve
    if (opts.ph) inp.placeholder = opts.ph;
    inp.addEventListener("input", () => set(inp.value));
    row.appendChild(inp);
    if (opts.help) row.appendChild(el("span", "ed-field-help muted", esc(opts.help)));
    return row;
  };

  const c = box("Contacto");
  c.append(
    textRow("Teléfono (con código de país)", () => s.contact.phone, (v) => (s.contact.phone = v), { help: "Se usa en el enlace de llamada. Ej. +593997127287" }),
    textRow("Teléfono (como se muestra)", () => s.contact.phoneLabel, (v) => (s.contact.phoneLabel = v)),
    textRow("WhatsApp (solo dígitos)", () => s.contact.whatsapp, (v) => (s.contact.whatsapp = v), { help: "Formato wa.me: sin + ni espacios. Ej. 593997127287" }),
    textRow("Correo de admisiones", () => s.contact.email, (v) => (s.contact.email = v), { type: "email" }),
    textRow("Correo de becas", () => s.contact.becasEmail, (v) => (s.contact.becasEmail = v), { type: "email" }),
    textRow("Dirección", () => s.contact.address, (v) => (s.contact.address = v)),
  );

  const soc = box("Redes sociales");
  soc.append(
    textRow("Facebook (URL)", () => s.social.facebook, (v) => (s.social.facebook = v), { ph: "https://facebook.com/…" }),
    textRow("Instagram (URL)", () => s.social.instagram, (v) => (s.social.instagram = v), { ph: "https://instagram.com/…" }),
  );

  // Bloque "mantente al día" del pie. Un site.json anterior a este campo no lo
  // trae, así que se siembra con lo que muestra hoy el sitio.
  s.footer = s.footer || {
    keepInTouchTitle: "Mantente al día",
    keepInTouchText: "Recibe fechas de inicio y novedades de IIDEA.",
    keepInTouchCta: "Escríbenos por WhatsApp",
  };
  const foot = box("Pie · Mantente al día");
  foot.append(
    textRow("Título", () => s.footer.keepInTouchTitle, (v) => (s.footer.keepInTouchTitle = v)),
    textRow("Texto", () => s.footer.keepInTouchText, (v) => (s.footer.keepInTouchText = v)),
    textRow("Botón", () => s.footer.keepInTouchCta, (v) => (s.footer.keepInTouchCta = v), { help: "Abre WhatsApp con un mensaje ya escrito. El número sale de Contacto, arriba." }),
  );

  // Resto del pie. Antes vivía escrito dentro del componente y no había forma de
  // tocarlo desde aquí. El año del copyright NO se escribe: lo pone el build.
  const pieDefaults = {
    intro: "", waCta: "Escríbenos por WhatsApp", ofertaTitle: "Oferta Académica",
    ofertaExtra: [], institutoTitle: "Instituto", institutoLinks: [], copyright: "",
    creditPrefix: "Powered by", creditName: "ROISense", creditHref: "https://www.roisense.com/",
  };
  for (const [k, v] of Object.entries(pieDefaults)) if (s.footer[k] === undefined) s.footer[k] = v;

  const pie = box("Pie · Textos y columnas");
  pie.append(
    textRow("Presentación", () => s.footer.intro, (v) => (s.footer.intro = v), { help: "El párrafo bajo el logotipo." }),
    textRow("Enlace de WhatsApp", () => s.footer.waCta, (v) => (s.footer.waCta = v)),
    textRow("Título de la columna de oferta", () => s.footer.ofertaTitle, (v) => (s.footer.ofertaTitle = v), { help: "Las carreras se listan solas; debajo van los enlaces extra." }),
    textRow("Título de la columna del instituto", () => s.footer.institutoTitle, (v) => (s.footer.institutoTitle = v)),
    textRow("Aviso de copyright", () => s.footer.copyright, (v) => (s.footer.copyright = v), { help: "Sin el año: el sitio lo pone solo para que no envejezca." }),
    textRow("Crédito · prefijo", () => s.footer.creditPrefix, (v) => (s.footer.creditPrefix = v), { help: "Texto antes de la marca, p. ej. Powered by." }),
    textRow("Crédito · marca", () => s.footer.creditName, (v) => (s.footer.creditName = v), { help: "Wordmark: ROISense." }),
    textRow("Crédito · enlace", () => s.footer.creditHref, (v) => (s.footer.creditHref = v), { help: "Sitio de la marca. Se abre en otra pestaña." }),
  );
  // Reordenar cualquier lista de enlaces (menú, subenlaces, pie). Antes solo el
  // primer nivel del menú se podía mover: cambiar el orden de un subenlace o de
  // una columna del pie obligaba a borrar la fila y volver a escribirla.
  const swap = (arr, i, j) => { [arr[i], arr[j]] = [arr[j], arr[i]]; };
  const moveBtns = (arr, i, redraw, que) => {
    const mk = (glifo, delta, verbo) => {
      const b = el("button", "button-link nav-move", glifo);
      b.type = "button";
      b.title = `${verbo} ${que}`;
      b.setAttribute("aria-label", `${verbo} ${que}`);
      b.disabled = delta < 0 ? i === 0 : i === arr.length - 1;
      b.addEventListener("click", () => { swap(arr, i, i + delta); redraw(); });
      return b;
    };
    return [mk("↑", -1, "Subir"), mk("↓", 1, "Bajar")];
  };

  // Editor de las dos listas de enlaces del pie (etiqueta + ruta). box() ya
  // cuelga la caja de la pantalla y devuelve su interior.
  const linkList = (titulo, key, ayuda) => {
    const caja = box(titulo);
    const lista = el("div", "nav-editor");
    const pinta = () => {
      lista.innerHTML = "";
      s.footer[key].forEach((l, i) => {
        const row = el("div", "nav-child-row");
        const lab = el("input", "form-input"); lab.value = l.label; lab.placeholder = "Etiqueta";
        lab.setAttribute("aria-label", "Etiqueta del enlace"); lab.addEventListener("input", () => (l.label = lab.value));
        const href = el("input", "form-input"); href.value = l.href; href.placeholder = "/ruta";
        href.setAttribute("aria-label", "Ruta del enlace"); href.addEventListener("input", () => (l.href = href.value));
        const del = el("button", "button-link-delete", "×"); del.title = "Quitar";
        del.addEventListener("click", () => { s.footer[key].splice(i, 1); pinta(); });
        row.append(lab, href, ...moveBtns(s.footer[key], i, pinta, "enlace"), del);
        lista.appendChild(row);
      });
      const add = el("button", "button", "＋ Añadir enlace");
      add.addEventListener("click", () => { s.footer[key].push({ label: "Nuevo", href: "/" }); pinta(); });
      lista.appendChild(add);
    };
    pinta();
    if (ayuda) caja.appendChild(el("span", "ed-field-help muted", esc(ayuda)));
    caja.appendChild(lista);
  };
  linkList("Pie · Enlaces extra de oferta", "ofertaExtra", "Se añaden debajo de las carreras, que ya salen solas.");
  linkList("Pie · Enlaces del instituto", "institutoLinks");

  // Rótulos que solo oye un lector de pantalla. Antes vivían dentro de cada
  // componente; aquí el equipo puede corregirlos sin tocar código.
  s.a11y = s.a11y || {};
  const A11Y_DEF = {
    menuToggle: "Abrir menú",
    whatsappFloat: "Escribir a IIDEA por WhatsApp",
    socialFacebook: "Facebook de IIDEA",
    socialInstagram: "Instagram de IIDEA",
    heroVideo: "Ver el video de presentación de IIDEA",
    careerCarousel: "Carrusel de carreras — usa las flechas para desplazarte",
    careerFilter: "Filtrar la oferta por modalidad",
    accountabilityTabs: "Período de rendición de cuentas",
    dualLeadTabs: "Elige tu perfil",
    leadCareer: "Carrera de interés",
    leadTiming: "Momento de inicio",
    seal: "Sello Metodología IA",
    logoHome: "Inicio IIDEA",
  };
  for (const [k, v] of Object.entries(A11Y_DEF)) if (!s.a11y[k]) s.a11y[k] = v;
  const acc = box("Accesibilidad · rótulos de lector de pantalla");
  acc.appendChild(el("span", "ed-field-help muted", esc("No se ven en pantalla: los lee en voz alta un lector de pantalla al llegar a cada control.")));
  acc.append(
    textRow("Botón del menú (móvil)", () => s.a11y.menuToggle, (v) => (s.a11y.menuToggle = v)),
    textRow("Botón flotante de WhatsApp", () => s.a11y.whatsappFloat, (v) => (s.a11y.whatsappFloat = v)),
    textRow("Enlace de Facebook", () => s.a11y.socialFacebook, (v) => (s.a11y.socialFacebook = v)),
    textRow("Enlace de Instagram", () => s.a11y.socialInstagram, (v) => (s.a11y.socialInstagram = v)),
    textRow("Enlace al video del hero", () => s.a11y.heroVideo, (v) => (s.a11y.heroVideo = v)),
    textRow("Carrusel de carreras", () => s.a11y.careerCarousel, (v) => (s.a11y.careerCarousel = v)),
    textRow("Filtro de modalidad", () => s.a11y.careerFilter, (v) => (s.a11y.careerFilter = v)),
    textRow("Pestañas de rendición de cuentas", () => s.a11y.accountabilityTabs, (v) => (s.a11y.accountabilityTabs = v)),
    textRow("Pestañas del formulario de dos rutas", () => s.a11y.dualLeadTabs, (v) => (s.a11y.dualLeadTabs = v)),
    textRow("Selector de carrera", () => s.a11y.leadCareer, (v) => (s.a11y.leadCareer = v)),
    textRow("Selector de momento de inicio", () => s.a11y.leadTiming, (v) => (s.a11y.leadTiming = v)),
    textRow("Sello Metodología IA", () => s.a11y.seal, (v) => (s.a11y.seal = v)),
    textRow("Logotipo de la cabecera", () => s.a11y.logoHome, (v) => (s.a11y.logoHome = v)),
  );

  // Aviso de cookies (LOPDP). Los textos son editables; lo que decide qué se
  // carga es la casilla del visitante, no esta pantalla.
  s.cookies = s.cookies || {};
  const COOKIES_DEF = {
    title: "Tú decides sobre las cookies",
    text: "Usamos cookies para entender cómo se usa el sitio y para medir nuestras campañas. Las esenciales van siempre; las demás, solo si las aceptas.",
    acceptAll: "Aceptar todas",
    essentialOnly: "Solo las esenciales",
    prefs: "Preferencias",
    policyLabel: "Ver la política de privacidad",
    policyHref: "/politica-de-privacidad",
    prefsTitle: "Preferencias de cookies",
    prefsIntro: "Elige qué quieres permitir. Puedes volver a cambiarlo cuando quieras desde el pie del sitio.",
    essentialTitle: "Esenciales",
    essentialText: "Solo guardan esta decisión para no volver a preguntarte. No te identifican y no salen de tu navegador.",
    alwaysOn: "Siempre activas",
    analyticsTitle: "Analítica y marketing",
    analyticsText: "Microsoft Clarity y Meta Pixel: nos dicen qué partes del sitio confunden y qué anuncios funcionan.",
    save: "Guardar preferencias",
  };
  for (const [k, v] of Object.entries(COOKIES_DEF)) if (!s.cookies[k]) s.cookies[k] = v;
  const ck = box("Aviso de cookies");
  ck.appendChild(el("span", "ed-field-help muted", esc("Lo que ve quien entra por primera vez. Mientras no acepte «Analítica y marketing», Clarity y el Meta Pixel no se cargan.")));
  ck.append(
    textRow("Título del aviso", () => s.cookies.title, (v) => (s.cookies.title = v)),
    textRow("Texto del aviso", () => s.cookies.text, (v) => (s.cookies.text = v)),
    textRow("Botón «aceptar todas»", () => s.cookies.acceptAll, (v) => (s.cookies.acceptAll = v)),
    textRow("Botón «solo esenciales»", () => s.cookies.essentialOnly, (v) => (s.cookies.essentialOnly = v)),
    textRow("Enlace a preferencias", () => s.cookies.prefs, (v) => (s.cookies.prefs = v)),
    textRow("Enlace a la política", () => s.cookies.policyLabel, (v) => (s.cookies.policyLabel = v)),
    textRow("Dirección de la política", () => s.cookies.policyHref, (v) => (s.cookies.policyHref = v), { ph: "/politica-de-privacidad" }),
    textRow("Panel · título", () => s.cookies.prefsTitle, (v) => (s.cookies.prefsTitle = v)),
    textRow("Panel · introducción", () => s.cookies.prefsIntro, (v) => (s.cookies.prefsIntro = v)),
    textRow("Panel · nombre de las esenciales", () => s.cookies.essentialTitle, (v) => (s.cookies.essentialTitle = v)),
    textRow("Panel · qué hacen las esenciales", () => s.cookies.essentialText, (v) => (s.cookies.essentialText = v)),
    textRow("Panel · etiqueta «siempre activas»", () => s.cookies.alwaysOn, (v) => (s.cookies.alwaysOn = v)),
    textRow("Panel · nombre de analítica y marketing", () => s.cookies.analyticsTitle, (v) => (s.cookies.analyticsTitle = v)),
    textRow("Panel · qué hace analítica y marketing", () => s.cookies.analyticsText, (v) => (s.cookies.analyticsText = v)),
    textRow("Panel · botón de guardar", () => s.cookies.save, (v) => (s.cookies.save = v)),
  );

  const u = box("Enlaces clave");
  u.append(
    textRow("Aula Virtual (URL)", () => s.urls.aulaVirtual, (v) => (s.urls.aulaVirtual = v), { ph: "https://aula.iidea.edu.ec" }),
    textRow("Video de presentación (URL)", () => s.urls.video, (v) => (s.urls.video = v), { ph: "https://youtube.com/watch?v=…" }),
    textRow('Enlace "Aplica" dentro de una página', () => s.urls.apply, (v) => (s.urls.apply = v), { help: "El que usan las páginas de carrera: un ancla de la misma página (#aplica) o una URL completa." }),
  );

  // Los dos botones de la derecha de la cabecera. Antes estaban escritos dentro
  // del componente —incluido el enlace del CTA— y no había forma de tocarlos.
  s.header = s.header || {};
  const HEADER_DEF = { showAulaVirtual: true, aulaLabel: "Aula Virtual", applyLabel: "Aplica ahora", applyHref: "/#aplica" };
  for (const [k, v] of Object.entries(HEADER_DEF)) if (s.header[k] === undefined) s.header[k] = v;
  const aulaChk = el("label", "ed-field ed-field-check");
  const aulaC = el("input"); aulaC.type = "checkbox"; aulaC.checked = !!s.header.showAulaVirtual;
  aulaC.addEventListener("change", () => (s.header.showAulaVirtual = aulaC.checked));
  aulaChk.append(aulaC, el("span", null, "Mostrar el botón «Aula Virtual» en la cabecera"));

  const head = box("Cabecera · Botones");
  head.appendChild(el("span", "ed-field-help muted", esc("El menú se edita más abajo. El teléfono sale de Contacto y la dirección del Aula, de Enlaces clave.")));
  head.append(
    aulaChk,
    textRow("Etiqueta del botón Aula Virtual", () => s.header.aulaLabel, (v) => (s.header.aulaLabel = v)),
    textRow("Etiqueta del botón principal", () => s.header.applyLabel, (v) => (s.header.applyLabel = v)),
    textRow("Enlace del botón principal", () => s.header.applyHref, (v) => (s.header.applyHref = v), { ph: "/#aplica", help: "Lleva «/» delante: la cabecera está en todas las páginas y solo algunas tienen el formulario." }),
  );

  // Editor del menú (2 niveles). careers:true = se despliega con las carreras.
  const navBox = box("Menú de navegación");
  const navList = el("div", "nav-editor");
  navBox.appendChild(navList);
  const navChildRow = (parent, ch, ci) => {
    const row = el("div", "nav-child-row");
    const lab = el("input", "form-input"); lab.value = ch.label; lab.placeholder = "Etiqueta"; lab.setAttribute("aria-label", "Etiqueta del subenlace"); lab.addEventListener("input", () => (ch.label = lab.value));
    const href = el("input", "form-input"); href.value = ch.href; href.placeholder = "/ruta"; href.setAttribute("aria-label", "Ruta del subenlace"); href.addEventListener("input", () => (ch.href = href.value));
    const del = el("button", "button-link-delete", "×");
    del.addEventListener("click", () => { parent.children.splice(ci, 1); if (!parent.children.length) delete parent.children; drawNav(); });
    row.append(lab, href, ...moveBtns(parent.children, ci, drawNav, "subenlace"), del);
    return row;
  };
  const navItemRow = (item, i) => {
    const card = el("div", "nav-item-card");
    const head = el("div", "nav-item-head");
    const lab = el("input", "form-input"); lab.value = item.label; lab.placeholder = "Etiqueta"; lab.setAttribute("aria-label", "Etiqueta del menú"); lab.addEventListener("input", () => (item.label = lab.value));
    const href = el("input", "form-input"); href.value = item.href; href.placeholder = "/ruta"; href.setAttribute("aria-label", "Ruta del menú"); href.addEventListener("input", () => (item.href = href.value));
    const [up, down] = moveBtns(s.nav, i, drawNav, "elemento del menú");
    const del = el("button", "button-link-delete", "Eliminar");
    del.addEventListener("click", async () => {
      if (await confirmModal({ title: "Eliminar del menú", message: `¿Quitar "${item.label || "(sin nombre)"}" del menú?`, confirmLabel: "Eliminar", danger: true })) { s.nav.splice(i, 1); drawNav(); }
    });
    head.append(lab, href, up, down, del);
    card.appendChild(head);
    const flag = el("label", "nav-careers");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = !!item.careers;
    cb.addEventListener("change", () => { if (cb.checked) item.careers = true; else delete item.careers; });
    flag.append(cb, document.createTextNode(" Desplegar las carreras automáticamente"));
    card.appendChild(flag);
    const kids = el("div", "nav-children");
    (item.children || []).forEach((ch, ci) => kids.appendChild(navChildRow(item, ch, ci)));
    const addKid = el("button", "button-link nav-add-kid", "＋ Subenlace");
    addKid.addEventListener("click", () => { item.children = item.children || []; item.children.push({ label: "Nuevo", href: "/" }); drawNav(); });
    kids.appendChild(addKid);
    card.appendChild(kids);
    return card;
  };
  function drawNav() {
    navList.innerHTML = "";
    s.nav.forEach((item, i) => navList.appendChild(navItemRow(item, i)));
    const add = el("button", "button", "＋ Añadir elemento");
    add.addEventListener("click", () => { s.nav.push({ label: "Nuevo", href: "/" }); drawNav(); });
    navList.appendChild(add);
  }
  drawNav();

  const bar = el("div", "settings-save");
  const saveBtn = el("button", "button button-primary", "Guardar cambios");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true; saveBtn.textContent = "Guardando…";
    try {
      const data = await api("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, baseSha: s._sha }) });
      s._sha = data.sha || s._sha;
      notice("ok", `Ajustes guardados. <span id="publish-status"><span class="spinner"></span> Publicando tus cambios…</span>`);
      watchDeploy($("publish-status"), data.url || "");
    } catch (e) { notice("err", esc(e.message)); }
    finally { saveBtn.disabled = false; saveBtn.textContent = "Guardar cambios"; }
  });
  bar.appendChild(saveBtn);
  wrap.appendChild(bar);
}

