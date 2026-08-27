import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Apariencia (theme.json) ──────────────────────────────────────────────────
export async function showAppearance() {
  loadingScreen("Apariencia");
  let theme;
  try { theme = await api("/api/theme"); }
  catch (e) { screen("Apariencia", "Apariencia"); notice("err", esc(e.message)); return; }

  const wrap = screen("Apariencia", "Apariencia");
  wrap.appendChild(el("p", "wp-subtitle", "Personaliza colores, degradado de marca, banner promocional y efectos del sitio. También puedes pedírselo al <a href='#agent'>Asistente IA</a>."));
  const editor = el("div", "theme-editor");
  wrap.appendChild(editor);

  const colorRow = (label, get, set) => {
    const row = el("div", "color-row");
    const c = el("input"); c.type = "color"; c.value = get(); c.setAttribute("aria-label", `${label} (selector de color)`);
    const t = el("input", "form-input"); t.type = "text"; t.value = get(); t.style.width = "110px"; t.setAttribute("aria-label", `${label} (código hex)`);
    c.addEventListener("input", () => { t.value = c.value; set(c.value); paint(); });
    t.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(t.value)) { c.value = t.value; set(t.value); paint(); } });
    row.append(c, t, el("span", "muted", label));
    return row;
  };

  // Identidad
  const ident = el("div", "postbox");
  ident.innerHTML = `<div class="postbox-header"><h2>Tema activo</h2></div>`;
  const identIn = el("div", "inside");
  const labelField = el("input", "form-input");
  labelField.type = "text"; labelField.value = theme.label || "";
  labelField.addEventListener("input", () => (theme.label = labelField.value));
  const lf = el("label", "ed-field");
  lf.append(el("span", "ed-field-label", "Nombre del tema"), labelField);
  identIn.appendChild(lf);
  ident.appendChild(identIn);
  editor.appendChild(ident);

  // Colores + degradado
  const colors = el("div", "postbox");
  colors.innerHTML = `<div class="postbox-header"><h2>Colores</h2></div>`;
  const colIn = el("div", "inside");
  const gradPrev = el("div", "theme-grad-preview");
  const stopsBox = el("div", "theme-stops");
  const paint = () => {
    const stops = [...theme.colors.accent].sort((a, b) => a.at - b.at).map((s) => `${s.color} ${s.at}%`).join(", ");
    gradPrev.style.background = `linear-gradient(162deg, ${stops})`;
  };
  colIn.appendChild(colorRow("Tinta (texto y superficies oscuras)", () => theme.colors.ink, (v) => (theme.colors.ink = v)));
  colIn.appendChild(colorRow("Nube (fondo claro)", () => theme.colors.cloud, (v) => (theme.colors.cloud = v)));
  colIn.appendChild(el("div", "ed-field-label", "Degradado de marca"));
  colIn.append(gradPrev, stopsBox);
  const drawStops = () => {
    stopsBox.innerHTML = "";
    theme.colors.accent.forEach((stop, i) => {
      const row = el("div", "theme-stop");
      const c = el("input"); c.type = "color"; c.value = stop.color; c.setAttribute("aria-label", `Color de la parada ${i + 1}`);
      c.addEventListener("input", () => { stop.color = c.value; paint(); });
      const at = el("input", "form-input"); at.type = "number"; at.min = 0; at.max = 100; at.value = stop.at; at.setAttribute("aria-label", `Posición de la parada ${i + 1} (%)`);
      at.addEventListener("input", () => { stop.at = Number(at.value); paint(); });
      const del = el("button", "ed-iconbtn danger", "🗑");
      del.title = "Quitar parada";
      del.disabled = theme.colors.accent.length <= 2;
      del.addEventListener("click", () => { theme.colors.accent.splice(i, 1); drawStops(); paint(); });
      row.append(c, at, el("span", "muted", "%"), del);
      stopsBox.appendChild(row);
    });
    const add = el("button", "button", "Añadir parada");
    add.addEventListener("click", () => { theme.colors.accent.push({ color: "#a93fc4", at: 50 }); drawStops(); paint(); });
    stopsBox.appendChild(add);
  };
  drawStops(); paint();
  colors.appendChild(colIn);
  editor.appendChild(colors);

  // Banner promocional
  const promo = el("div", "postbox");
  promo.innerHTML = `<div class="postbox-header"><h2>Banner promocional</h2></div>`;
  const promoIn = el("div", "inside");
  const en = el("label", "ed-field ed-field-check");
  const enC = el("input"); enC.type = "checkbox"; enC.checked = !!theme.promoBanner.enabled;
  enC.addEventListener("change", () => (theme.promoBanner.enabled = enC.checked));
  en.append(enC, el("span", null, "Mostrar el banner en todo el sitio"));
  promoIn.appendChild(en);
  const txt = (label, key, help) => {
    const w = el("label", "ed-field");
    const inp = el("input", "form-input"); inp.type = "text"; inp.value = theme.promoBanner[key] || "";
    inp.addEventListener("input", () => (theme.promoBanner[key] = inp.value));
    w.append(el("span", "ed-field-label", label), inp);
    if (help) w.append(el("span", "ed-field-help muted", help));
    return w;
  };
  promoIn.appendChild(txt("Texto", "text", "Ej: “Última semana para inscribirte al inicio de agosto”"));
  promoIn.appendChild(txt("Texto del botón", "ctaLabel"));
  promoIn.appendChild(txt("Enlace del botón", "ctaHref", "Ej: /admisiones"));
  promoIn.appendChild(colorRow("Fondo del banner", () => theme.promoBanner.bg || "#01154a", (v) => (theme.promoBanner.bg = v)));
  promoIn.appendChild(colorRow("Texto del banner", () => theme.promoBanner.fg || "#ffffff", (v) => (theme.promoBanner.fg = v)));
  promo.appendChild(promoIn);
  editor.appendChild(promo);

  // Efecto de temporada
  const seasonal = el("div", "postbox");
  seasonal.innerHTML = `<div class="postbox-header"><h2>Efecto de temporada</h2></div>`;
  const seaIn = el("div", "inside");
  const effSel = el("select", "form-input");
  [["none", "Ninguno"], ["snow", "Nieve ❄️"], ["confetti", "Confeti 🎉"]].forEach(([v, l]) => {
    const o = el("option", null, l); o.value = v; effSel.appendChild(o);
  });
  effSel.value = theme.seasonal.effect;
  effSel.addEventListener("change", () => (theme.seasonal.effect = effSel.value));
  const intSel = el("select", "form-input");
  [["low", "Suave"], ["medium", "Media"], ["high", "Alta"]].forEach(([v, l]) => {
    const o = el("option", null, l); o.value = v; intSel.appendChild(o);
  });
  intSel.value = theme.seasonal.intensity || "medium";
  intSel.addEventListener("change", () => (theme.seasonal.intensity = intSel.value));
  const f1 = el("label", "ed-field"); f1.append(el("span", "ed-field-label", "Efecto"), effSel);
  const f2 = el("label", "ed-field"); f2.append(el("span", "ed-field-label", "Intensidad"), intSel);
  seaIn.append(f1, f2);
  seasonal.appendChild(seaIn);
  editor.appendChild(seasonal);

  // Seguimiento / Analítica (Microsoft Clarity y futuros IDs de marketing)
  theme.tracking = theme.tracking || {};
  const track = el("div", "postbox");
  track.innerHTML = `<div class="postbox-header"><h2>Seguimiento y analítica</h2></div>`;
  const trackIn = el("div", "inside");
  const clInput = el("input", "form-input");
  clInput.type = "text";
  clInput.placeholder = "ej. xjb3c8v9s9";
  clInput.value = theme.tracking.clarityId || "";
  clInput.addEventListener("input", () => (theme.tracking.clarityId = clInput.value.trim()));
  const clField = el("label", "ed-field");
  clField.append(el("span", "ed-field-label", "Microsoft Clarity — Project ID"), clInput);
  const clHelp = el("p", "muted");
  clHelp.style.marginTop = "6px";
  clHelp.innerHTML = "Mapas de calor y grabación de sesiones. Cópialo de clarity.microsoft.com (Settings → Overview). Déjalo vacío para desactivarlo.";
  const fbInput = el("input", "form-input");
  fbInput.type = "text";
  fbInput.inputMode = "numeric";
  fbInput.placeholder = "ej. 1806601677174645";
  fbInput.value = theme.tracking.metaPixelId || "";
  fbInput.addEventListener("input", () => (theme.tracking.metaPixelId = fbInput.value.trim()));
  const fbField = el("label", "ed-field");
  fbField.style.marginTop = "16px";
  fbField.append(el("span", "ed-field-label", "Meta Pixel — ID del conjunto de datos"), fbInput);
  const fbHelp = el("p", "muted");
  fbHelp.style.marginTop = "6px";
  fbHelp.innerHTML = "Anuncios de Facebook e Instagram. Solo dígitos; cópialo del Administrador de eventos de Meta. Déjalo vacío para desactivarlo.";
  trackIn.append(clField, clHelp, fbField, fbHelp);
  track.appendChild(trackIn);
  editor.appendChild(track);

  // Guardar
  const saveRow = el("div");
  const save = el("button", "button button-primary button-hero", "Guardar y publicar");
  save.addEventListener("click", async () => {
    save.disabled = true; save.textContent = "Guardando…";
    try {
      const data = await api("/api/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...theme, baseSha: theme._sha }) });
      theme._sha = data.sha || theme._sha;
      notice("ok", `Tema guardado. El sitio se repinta en ~1 minuto.${data.url ? ` <a href="${esc(data.url)}" target="_blank" rel="noopener">Ver el sitio →</a>` : ""}`);
    } catch (e) { notice("err", "" + esc(e.message)); }
    finally { save.disabled = false; save.textContent = "Guardar y publicar"; }
  });
  saveRow.appendChild(save);
  editor.appendChild(saveRow);
}

