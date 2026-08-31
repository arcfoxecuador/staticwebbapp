/* LAS REGLAS DE LOS CUATRO CAMPOS ABIERTOS DEL PROTOCOLO.

   En `.mjs` y no en `.ts` por la misma razón que `rutas.mjs`: aquí lo importa
   `scripts/verificar-protocolo.mjs`, que corre en Node crudo dentro de
   `npm run check` y desde ahí no se puede importar TypeScript. El componente lo
   importa igual —Vite resuelve `.mjs` sin ceremonia— así que la regla vive una
   sola vez y la prueba mira exactamente el código que corre en el navegador.

   VALIDAR NO ES LO IMPORTANTE AQUÍ; NORMALIZAR SÍ. El destino de estas
   respuestas es una hoja de cálculo desde la que alguien va a escribir por
   WhatsApp y por Instagram una por una. Si el mismo teléfono llega escrito de
   cuatro maneras, la hoja parece llena y la mitad de las filas no son
   accionables. Por eso cada función devuelve el valor YA en formato canónico y
   no un simple booleano.

   Y el mensaje de error siempre dice QUÉ HACER. «Correo inválido» deja al
   visitante mirando la pantalla; «Escribe un correo con dominio, como
   nombre@correo.com» le da la salida. */

/** @typedef {{ ok: true, valor: string } | { ok: false, error: string }} Resultado */

/** @type {(valor: string) => Resultado} */
const bien = (valor) => ({ ok: true, valor });
/** @type {(error: string) => Resultado} */
const mal = (error) => ({ ok: false, error });

/* Tope de una celda. No hay campo libre largo en el protocolo, así que
   cualquier cosa por encima de esto es una pegada accidental o un bot. */
const MAXIMO = 120;

/** Nombre: lo mínimo para poder saludar a alguien por su nombre.
    La regla que de verdad hace trabajo es la de «al menos una letra»: sin ella,
    quien va en piloto automático teclea su número aquí y la fila queda con un
    teléfono en la columna del nombre. */
function nombre(valor) {
  if (!valor) return mal('Escribe tu nombre para poder dirigirnos a ti.');
  if (valor.length < 2) return mal('El nombre es demasiado corto.');
  if (valor.length > 60) return mal('El nombre es demasiado largo.');
  if (!/\p{L}/u.test(valor)) return mal('Escribe tu nombre, no un número.');
  return bien(valor);
}

/** Correo. El `type="email"` del navegador acepta `ana@correo`, que fuera de
    una intranet no existe: exigimos un punto en el dominio. En minúsculas
    porque el destino es una hoja donde `Ana@` y `ana@` serían dos invitadas. */
function correo(valor) {
  if (!valor) return mal('Escribe tu correo para enviarte la invitación.');
  const limpio = valor.toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(limpio)) {
    return mal('Escribe un correo con dominio, como nombre@correo.com.');
  }
  return bien(limpio);
}

/** WhatsApp de Ecuador, en E.164.

    El móvil ecuatoriano es `09` + ocho dígitos en formato nacional, o `+593` +
    `9` + ocho en internacional. Se acepta cualquiera de las formas en las que
    la gente lo escribe de verdad —con espacios, guiones, paréntesis, con `0`,
    sin `0`, con `00593`— y sale una sola. Un fijo (`02…`, `04…`) se rechaza a
    propósito: no recibe WhatsApp, y una invitación enviada ahí no llega a
    nadie sin que nadie se entere. */
function whatsapp(valor) {
  if (!valor) return mal('Escribe tu número de WhatsApp.');
  let digitos = valor.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.startsWith('593')) digitos = digitos.slice(3);
  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (!/^9\d{8}$/.test(digitos)) {
    return mal('Escribe un celular ecuatoriano, como 0987654321.');
  }
  return bien(`+593${digitos}`);
}

/** Usuario de Instagram, guardado como `@usuario`.

    Se acepta el enlace del perfil pegado tal cual porque, desde el móvil,
    compartir el enlace es más cómodo que escribir el usuario — y es lo que hace
    media sala. Rechazarlo sería castigar el atajo obvio. */
function instagram(valor) {
  if (!valor) return mal('Escribe tu usuario de Instagram.');
  const usuario = valor
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^(www\.)?instagram\.com\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/^@/, '');
  /* 30 caracteres es el tope de Instagram; letras, números, punto y guion bajo
     el alfabeto que permite. Una `ñ` o un espacio significan que ahí hay un
     nombre escrito a mano, no un usuario. */
  if (!/^[a-z0-9._]{1,30}$/.test(usuario)) {
    return mal('Escribe tu usuario, como @arcfoxecuador.');
  }
  return bien(`@${usuario}`);
}

/** @type {Record<string, (valor: string) => Resultado>} */
const REGLAS = { nombre, correo, whatsapp, instagram };

/**
 * Valida y normaliza una respuesta del protocolo.
 *
 * Una clave sin regla propia —las de opciones, o una pregunta nueva— sólo tiene
 * que traer contenido. Es deliberado: añadir una pregunta al protocolo no puede
 * exigir tocar este archivo, o el día que se añada nadie se acordará.
 *
 * @param {string} clave  La clave del paso (`nombre`, `whatsapp`…).
 * @param {string} valor  Lo que escribió el visitante, sin tocar.
 * @returns {Resultado}
 */
export function validar(clave, valor) {
  const limpio = String(valor ?? '').trim().slice(0, MAXIMO);
  const regla = REGLAS[clave];
  if (regla) return regla(limpio);
  return limpio ? bien(limpio) : mal('Escribe una respuesta para continuar.');
}
