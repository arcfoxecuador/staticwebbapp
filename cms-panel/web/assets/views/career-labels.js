import { watchDeploy } from "../blocks/save.js";
import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Textos de la plantilla de carrera ────────────────────────────────────────
// La página /carrera/<slug> no está hecha de bloques: su maquetación la mandan
// los datos de cada carrera. Por eso sus ROTULOS fijos (títulos de sección,
// botones, etiquetas de la ficha) se editan aquí, y no tocando código.
const CAREER_LABEL_GROUPS = [
  ["hero", "Cabecera", "Migas, botones y la ficha de datos de la derecha."],
  ["campos", "Etiquetas de la ficha", "Los nombres de cada dato de la carrera."],
  ["modalidades", "Cómo se nombra cada modalidad", "Lo que se lee en los chips y en la ficha."],
  ["tituloOficial", "Título que obtiene", ""],
  ["pilares", "¿Por qué IIDEA?", ""],
  ["egreso", "Perfil de egreso", ""],
  ["malla", "Malla curricular", "Incluye el botón de descarga del PDF oficial."],
  ["campoOcupacional", "Campo ocupacional", ""],
  ["aranceles", "Aranceles", "La nota admite HTML simple (por ejemplo el enlace a becas)."],
  ["cierre", "Banda de cierre", "El texto cambia según la modalidad de la carrera."],
  ["noticia", "Detalle de noticia", ""],
];

export async function showCareerLabels() {
  loadingScreen("Textos de carrera");
  let s;
  try { s = await api("/api/career-labels"); }
  catch (e) { screen("Textos de carrera", "Textos de carrera"); notice("err", esc(e.message)); return; }

  const wrap = screen("Textos de carrera", "Textos de carrera", {
    help: `<h3>Resumen</h3><p>Los textos fijos de la página de cada carrera: los títulos de sección, los botones
      y las etiquetas de la ficha de datos. Los <b>datos</b> de cada carrera (nombre, créditos, malla, aranceles)
      se editan en <a href="#careers">Carreras</a>; aquí se cambian los <b>rótulos</b> que los rodean.</p>
      <h3>Por qué está aparte</h3><p>Esa página no se arma con bloques como el resto del sitio: su maquetación
      la mandan los datos de la carrera. Antes estos textos estaban en el código; ahora se editan aquí.</p>
      <h3>Ojo</h3><p>Un rótulo vacío deja un hueco en las seis carreras a la vez, así que el panel no te dejará
      guardarlo en blanco.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Rótulos de la plantilla de carrera. Cambian a la vez en las seis carreras."));

  for (const [clave, titulo, ayuda] of CAREER_LABEL_GROUPS) {
    if (!s[clave]) continue;
    const box = el("div", "postbox");
    box.innerHTML = `<div class="postbox-header"><h2>${esc(titulo)}</h2></div>`;
    const inside = el("div", "inside");
    if (ayuda) inside.appendChild(el("p", "wp-subtitle", ayuda));
    for (const campo of Object.keys(s[clave])) {
      const valor = s[clave][campo];
      if (typeof valor !== "string") continue;
      const row = el("label", "cl-row");
      row.innerHTML = `<span class="cl-key">${esc(campo)}</span>`;
      const input = valor.length > 70 ? el("textarea") : el("input");
      if (input.tagName === "INPUT") input.type = "text";
      input.value = valor;
      input.addEventListener("input", () => { s[clave][campo] = input.value; });
      row.appendChild(input);
      inside.appendChild(row);
    }
    box.appendChild(inside);
    wrap.appendChild(box);
  }

  const bar = el("div", "ed-savebar");
  const saveBtn = el("button", "button button-primary", "Guardar cambios");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true; saveBtn.textContent = "Guardando…";
    try {
      const data = await api("/api/career-labels", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, baseSha: s._sha }),
      });
      s._sha = data.sha || s._sha;
      notice("ok", `Textos guardados. <span id="publish-status"><span class="spinner"></span> Publicando tus cambios…</span>`);
      watchDeploy($("publish-status"), data.url || "");
    } catch (e) { notice("err", esc(e.message)); }
    finally { saveBtn.disabled = false; saveBtn.textContent = "Guardar cambios"; }
  });
  bar.appendChild(saveBtn);
  wrap.appendChild(bar);
}

