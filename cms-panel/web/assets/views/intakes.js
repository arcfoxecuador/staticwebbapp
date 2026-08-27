import { watchDeploy } from "../blocks/save.js";
import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Fechas de inicio (intakes.json) ─────────────────────────────────────────
// El calendario de inicios es la ÚNICA fuente de la que el sitio saca el
// "próximo inicio" y el "X inicios al año". Antes solo se podía tocar a mano en
// el repositorio, y es justo el dato que más cambia cada año.
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const parseISO = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const labelISO = (s) => {
  const d = parseISO(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`;
};

export async function showIntakes() {
  loadingScreen("Fechas de inicio");
  let s;
  try { s = await api("/api/intakes"); }
  catch (e) { screen("Fechas de inicio", "Fechas de inicio"); notice("err", esc(e.message)); return; }
  s.intakes = Array.isArray(s.intakes) ? s.intakes : [];

  const wrap = screen("Fechas de inicio", "Fechas de inicio", {
    help: `<h3>Resumen</h3><p>El calendario de inicios de IIDEA. De esta lista —y solo de ella— salen dos cosas
      que aparecen en todo el sitio: el <b>próximo inicio</b> que se muestra en los heros y las insignias, y el
      <b>número de inicios al año</b> del que habla la copia ("10 fechas de inicio al año"). No hay ninguna fecha
      escrita a mano en las páginas.</p>
      <h3>Cómo se calcula</h3><p>El <b>próximo inicio</b> es la primera fecha de hoy en adelante. Los
      <b>inicios al año</b> son los que caen en los próximos 12 meses. Por eso hay que mantener siempre fechas
      futuras: el panel no te dejará guardar una lista en la que todas hayan pasado.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Calendario de inicios. Cambia estas fechas y cambia la urgencia de todas las páginas de conversión a la vez."));

  const resumen = el("div", "postbox");
  const lista = el("div", "postbox");
  wrap.append(resumen, lista);

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const sorted = () => [...new Set(s.intakes.filter(Boolean))].sort();

  function drawResumen() {
    const all = sorted();
    const prox = all.find((d) => parseISO(d) >= hoy);
    const fin = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
    const porAno = all.filter((d) => { const x = parseISO(d); return x >= hoy && x < fin; }).length;
    const pasadas = all.filter((d) => parseISO(d) < hoy).length;
    resumen.innerHTML = `
      <div class="postbox-header"><h2>Lo que verá el sitio</h2></div>
      <div class="inside">
        <div class="intake-summary">
          <div class="intake-stat">
            <span class="intake-stat-label">Próximo inicio</span>
            <b class="intake-stat-value">${prox ? esc(labelISO(prox)) : "—"}</b>
          </div>
          <div class="intake-stat">
            <span class="intake-stat-label">Inicios en los próximos 12 meses</span>
            <b class="intake-stat-value">${porAno}</b>
          </div>
        </div>
        ${prox ? "" : `<p class="ed-field-help intake-warn">No queda ninguna fecha futura: agrega al menos una antes de guardar.</p>`}
        ${pasadas ? `<p class="muted ed-field-help">${pasadas} fecha${pasadas === 1 ? "" : "s"} ya pasada${pasadas === 1 ? "" : "s"}. Puedes dejarlas como histórico: el sitio solo mira las futuras.</p>` : ""}
      </div>`;
  }

  function drawLista() {
    lista.innerHTML = `<div class="postbox-header"><h2>Calendario</h2></div>`;
    const inside = el("div", "inside");
    const all = sorted();
    const anos = [...new Set(all.map((d) => d.slice(0, 4)))];
    if (!all.length) inside.appendChild(el("p", "muted", "Todavía no hay fechas. Agrega la primera."));
    for (const ano of anos) {
      inside.appendChild(el("h3", "intake-year", esc(ano)));
      const row = el("div", "intake-row");
      for (const fecha of all.filter((d) => d.startsWith(ano))) {
        const pasada = parseISO(fecha) < hoy;
        const chip = el("div", "intake-chip" + (pasada ? " is-past" : ""));
        const inp = el("input", "intake-date"); inp.type = "date"; inp.value = fecha;
        inp.setAttribute("aria-label", `Fecha de inicio ${labelISO(fecha)}`);
        inp.addEventListener("change", () => {
          const i = s.intakes.indexOf(fecha);
          if (i >= 0) s.intakes[i] = inp.value;
          draw();
        });
        const del = el("button", "intake-del", "✕");
        del.type = "button";
        del.setAttribute("aria-label", `Quitar ${labelISO(fecha)}`);
        del.addEventListener("click", () => {
          s.intakes = s.intakes.filter((d) => d !== fecha);
          draw();
        });
        chip.append(inp, del);
        row.appendChild(chip);
      }
      inside.appendChild(row);
    }
    const add = el("button", "button", "+ Agregar fecha");
    add.type = "button";
    add.addEventListener("click", () => {
      // Sugiere un mes después de la última fecha: casi siempre es lo correcto.
      const all2 = sorted();
      const base = all2.length ? parseISO(all2[all2.length - 1]) : new Date();
      const next = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
      const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      if (!s.intakes.includes(iso)) s.intakes.push(iso);
      draw();
      // Deja el foco en la fecha recién creada para poder ajustarla al momento.
      const nuevo = lista.querySelector(`input[value="${iso}"]`);
      nuevo?.focus();
    });
    inside.appendChild(add);
    lista.appendChild(inside);
  }

  const draw = () => { drawResumen(); drawLista(); };
  draw();

  const bar = el("div", "ed-savebar");
  const saveBtn = el("button", "button button-primary", "Guardar cambios");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true; saveBtn.textContent = "Guardando…";
    try {
      const data = await api("/api/intakes", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, intakes: sorted(), baseSha: s._sha }),
      });
      s._sha = data.sha || s._sha;
      if (Array.isArray(data.intakes)) s.intakes = data.intakes;
      draw();
      notice("ok", `Fechas guardadas. <span id="publish-status"><span class="spinner"></span> Publicando tus cambios…</span>`);
      watchDeploy($("publish-status"), data.url || "");
    } catch (e) { notice("err", esc(e.message)); }
    finally { saveBtn.disabled = false; saveBtn.textContent = "Guardar cambios"; }
  });
  bar.appendChild(saveBtn);
  wrap.appendChild(bar);
}

