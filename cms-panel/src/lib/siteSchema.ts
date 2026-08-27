import { z } from "zod";

// Esquema de los ajustes globales del sitio (astro-web/src/config/site.json).
// El panel valida con esto ANTES de guardar; así un ajuste inválido nunca llega
// al repositorio (y si llegara, rompería el build y el sitio conservaría la
// versión anterior — "sin kaboom"). Espejo de la forma que consume src/data.js.

const url = z.string().trim().url("Debe ser una URL válida (https://…)");

const navChild = z.object({
  label: z.string().trim().min(1, "La etiqueta no puede estar vacía"),
  href: z.string().trim().min(1, "El enlace no puede estar vacío"),
});

const navItem = navChild.extend({
  careers: z.boolean().optional(),
  children: z.array(navChild).optional(),
});

export const siteSchema = z.object({
  contact: z.object({
    phone: z.string().trim().min(1, "Teléfono requerido"),
    phoneLabel: z.string().trim().min(1, "Etiqueta de teléfono requerida"),
    whatsapp: z.string().trim().regex(/^\d{6,15}$/, "Solo dígitos, formato wa.me (sin + ni espacios)"),
    email: z.string().trim().email("Correo inválido"),
    becasEmail: z.string().trim().email("Correo de becas inválido"),
    address: z.string().trim().min(1, "Dirección requerida"),
  }),
  social: z.object({
    facebook: url.or(z.literal("")),
    instagram: url.or(z.literal("")),
  }),
  // Cabecera: el interruptor y los rótulos de los dos botones de la derecha.
  // Todo opcional: un site.json anterior a estos campos sigue validando y el
  // componente pone sus valores por defecto.
  header: z
    .object({
      showAulaVirtual: z.boolean().optional(),
      aulaLabel: z.string().trim().min(1, "La etiqueta del Aula Virtual no puede estar vacía").optional(),
      applyLabel: z.string().trim().min(1, "La etiqueta del botón principal no puede estar vacía").optional(),
      // Lleva "/" delante a propósito: la cabecera está en todas las páginas y
      // solo algunas tienen el ancla #aplica.
      applyHref: z.string().trim().min(1, "El enlace del botón principal no puede estar vacío").optional(),
    })
    .optional(),
  urls: z.object({
    aulaVirtual: url,
    video: url.or(z.literal("")),
    // "apply" puede ser un ancla (#aplica) o una URL, así que solo exige no-vacío.
    apply: z.string().trim().min(1, "Enlace de 'Aplica' requerido"),
  }),
  nav: z.array(navItem).min(1, "Debe haber al menos un elemento de menú"),
  // Bloque de contacto del pie. Opcional: un site.json anterior a este campo
  // sigue validando y el componente pone su texto por defecto.
  footer: z
    .object({
      keepInTouchTitle: z.string().trim().min(1, "El título no puede estar vacío"),
      keepInTouchText: z.string().trim().min(1, "El texto no puede estar vacío"),
      keepInTouchCta: z.string().trim().min(1, "La etiqueta del botón no puede estar vacía"),
      intro: z.string().trim().min(1).optional(),
      waCta: z.string().trim().min(1).optional(),
      ofertaTitle: z.string().trim().min(1).optional(),
      // Enlaces que se suman a las carreras en la columna de oferta.
      ofertaExtra: z.array(navChild).optional(),
      institutoTitle: z.string().trim().min(1).optional(),
      institutoLinks: z.array(navChild).optional(),
      // El año NO se escribe aquí: lo pone el build, para que no envejezca.
      copyright: z.string().trim().min(1).optional(),
      creditPrefix: z.string().trim().min(1).optional(),
      creditName: z.string().trim().min(1).optional(),
      creditHref: url.optional(),
    })
    .optional(),
  // Rótulos que solo oye un lector de pantalla (aria-label). Opcional: si no
  // están, cada componente usa el suyo por defecto.
  a11y: z.record(z.string(), z.string().trim().min(1)).optional(),
  // Textos del aviso de cookies y del panel de preferencias. Mismo criterio que
  // a11y: opcional, y lo que falte lo pone CookieConsent.astro.
  cookies: z.record(z.string(), z.string().trim().min(1)).optional(),
});

export type SiteSettings = z.infer<typeof siteSchema>;
