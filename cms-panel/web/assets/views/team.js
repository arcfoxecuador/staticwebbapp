import { api } from "../core/api.js";
import { $, el, esc } from "../core/dom.js";
import { loadingScreen, notice, screen } from "../core/ui.js";

// ── Equipo y acceso (solo lectura) ───────────────────────────────────────────
// Muestra quién puede entrar y quién es admin. Se configura por variables de
// entorno (no editable por UI, a propósito: el control de acceso vive fuera del
// alcance de quien tenga sesión en el panel).
export async function showTeam() {
  loadingScreen("Equipo y acceso");
  let d;
  try { d = await api("/api/team"); }
  catch (e) { screen("Equipo y acceso", "Equipo y acceso"); notice("err", esc(e.message)); return; }

  const wrap = screen("Equipo y acceso", "Equipo y acceso", {
    help: `<h3>Resumen</h3><p>Quién puede iniciar sesión y quién tiene permisos de administrador.
      El acceso se configura de forma segura por variables de entorno del despliegue
      (<code>ALLOWED_EMAIL_DOMAIN</code>, <code>ALLOWED_EMAILS</code>, <code>ADMIN_EMAILS</code>),
      no desde esta pantalla. Para dar o quitar acceso, pídeselo a quien administra el servidor.</p>`,
  });
  wrap.appendChild(el("p", "wp-subtitle", "Quién entra al panel y con qué rol. Solo lectura: el acceso se gestiona en el despliegue."));

  const box = (title, inner) => {
    const b = el("div", "postbox");
    b.innerHTML = `<div class="postbox-header"><h2>${esc(title)}</h2></div><div class="inside">${inner}</div>`;
    wrap.appendChild(b); return b;
  };
  const chips = (arr) => arr.length ? `<div class="team-chips">${arr.map((x) => `<span class="team-chip">${esc(x)}</span>`).join("")}</div>` : "";

  // Sesión actual.
  box("Tu sesión", `<p><b>${esc(d.me.name || d.me.email)}</b> · ${esc(d.me.email)}
    <span class="ed-tag ${d.me.role === "admin" ? "tag-admin" : ""}">${d.me.role === "admin" ? "Administrador" : "Editor"}</span></p>`);

  // Quién puede entrar.
  const accessInner = `
    <p>Se permite iniciar sesión con cuentas de Microsoft 365 que cumplan:</p>
    <ul class="team-list">
      ${d.allowedDomain ? `<li>Dominio de correo: <code>@${esc(d.allowedDomain)}</code></li>` : ""}
      ${d.allowedEmails.length ? `<li>Correos permitidos (además del dominio):${chips(d.allowedEmails)}</li>` : ""}
      ${!d.allowedDomain && !d.allowedEmails.length ? `<li class="muted">Sin restricción por dominio ni lista — cualquier cuenta del inquilino de Microsoft configurado puede entrar.</li>` : ""}
    </ul>`;
  box("Quién puede iniciar sesión", accessInner);

  // Quién es admin.
  const adminInner = d.everyoneAdmin
    ? `<p class="muted">No hay lista de administradores: <b>todas</b> las cuentas autorizadas son administradores
        (modo de un solo equipo). Para separar editores de administradores, define <code>ADMIN_EMAILS</code>.</p>`
    : `<p>Administradores (acceso total: apariencia, ajustes, categorías, publicar a producción, borrar/renombrar medios):</p>${chips(d.adminEmails)}
       <p class="muted" style="margin-top:8px">El resto de las cuentas autorizadas son <b>editores</b>: crean y editan contenido, sin acciones globales.</p>`;
  box("Administradores", adminInner);
}

