// Estado de arranque del panel: se escribe UNA vez (tras /api/me y /api/forms)
// y se lee desde todas las pantallas. Se exporta como enlace vivo de módulo, así
// que quien importa `FORMS` ve el valor actualizado sin necesidad de getters.

export let FORMS = null; // { pages, schema, catalog, siteUrl, publish }
export let SITE = ""; // URL pública del sitio (previews y enlaces "Ver")
export let PUBLISH = { toProd: true, where: "el sitio", url: "" };
// Token CSRF de la sesión (lo entrega /api/me); viaja en toda mutación.
export let CSRF = "";
// Rol del usuario (de /api/me). "editor" no ve/usa acciones globales: apariencia,
// categorías, publicar a producción, borrado permanente de medios. El servidor
// también lo exige (requireAdmin); esto es solo UX.
export let ROLE = "admin";

export const isAdmin = () => ROLE === "admin";
// Acciones (hash) reservadas a admin, para el guard de navegación directa.
export const ADMIN_ONLY = new Set(["appearance", "settings", "automation", "categories", "team", "brand", "intakes", "career-labels"]);

// Pantallas OCULTAS del panel: no salen en el menú lateral ni en el Escritorio.
// No están borradas —la ruta sigue respondiendo si se escribe el hash— porque
// esto es un interruptor de visibilidad, no una eliminación: para volver a
// mostrar una, quítala de este conjunto y reaparece donde estaba.
/* En un sitio del kit las páginas son .astro y el catálogo es markdown
   (servicios / articulos / equipo), no JSON de bloques ni carreras IIDEA.
   Esas pantallas siguen en el código —quitarlas del set las devuelve—
   pero no se ofrecen: editarlas escribiría archivos que el sitio no pinta. */
export const HIDDEN_VIEWS = new Set([
  "pages",
  "careers",
  "appearance",
  "settings",
  "intakes",
  "career-labels",
  "categories",
  "automation",
  "review",
  "team",
]);
export const isHidden = (view) => HIDDEN_VIEWS.has(view);

// Única escritura de CSRF/ROLE: la respuesta de /api/me.
export function setSession(u) {
  CSRF = u.csrf || "";
  ROLE = u.role || "admin";
}

// Única escritura de FORMS/SITE/PUBLISH: la respuesta de /api/forms.
export function setForms(data) {
  FORMS = data;
  SITE = data.siteUrl || "";
  if (data.publish) PUBLISH = data.publish;
}

