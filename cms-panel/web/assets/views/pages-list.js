import { $, el, esc } from "../core/dom.js";
import { FORMS, SITE, isAdmin } from "../core/state.js";
import { screen } from "../core/ui.js";

// ── Páginas: listado ─────────────────────────────────────────────────────────
export function showPages() {
  const wrap = screen("Páginas", "Páginas", {
    help: `<h3>Resumen</h3><p>Cada página del sitio se compone de <b>secciones</b> (bloques) que puedes reordenar,
      ocultar, duplicar o editar. Haz clic en <b>Editar</b> para abrir el editor de bloques y en <b>Ver</b> para abrir
      la página publicada. Al pulsar <b>Actualizar</b> los cambios se publican y el sitio se reconstruye en ~1 minuto.</p>
      <h3>Atajos de datos del sitio</h3><p>Si ves <code>@becasEmail</code>, <code>@email</code>, <code>@aula</code> o
      <code>@video</code> en un texto o enlace, <b>no los reemplaces por el dato real</b>: son atajos que el sitio
      cambia solo por lo que esté en ${isAdmin() ? `<a href="#settings">Ajustes del sitio</a>` : "<b>Ajustes del sitio</b>"}.
      Así, cuando cambie el correo o el enlace, se actualiza en todas las páginas a la vez. Escríbelos tal cual
      donde quieras que aparezca el dato.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Edita las secciones (bloques) de cada página del sitio."));
  const table = el("table", "wp-list-table");
  table.innerHTML = `<thead><tr><th>Título</th><th>Dirección</th></tr></thead>`;
  const tbody = el("tbody");
  for (const [s, title] of Object.entries(FORMS.pages)) {
    const url = s === "home" ? "/" : `/${s}`;
    const tr = el("tr");
    tr.innerHTML = `
      <td>
        <a class="row-title" href="#page/${esc(s)}">${esc(title)}</a>
        <div class="row-actions">
          <span><a href="#page/${esc(s)}">Editar</a></span>
          ${SITE ? `<span><a href="${esc(SITE + url)}" target="_blank" rel="noopener">Ver</a></span>` : ""}
        </div>
      </td>
      <td class="muted">${esc(url)}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}

