/* ── EL VERIFICADOR DE LOS AVISOS DE DATOS ─────────────────────────────────
   Lee `dist/` y comprueba lo que pidió el área legal de AYASA (hilo «LEGALES
   ARCFOX», 30-sep y 20-oct-2026):

   - Cada formulario lleva al pie el AVISO DE TRATAMIENTO DE DATOS literal.
     «Su contenido no puede ser modificado»: por eso se comprueban frases
     exactas y no sólo que exista un bloque.
   - Test drive lleva el aviso propio, porque pide datos sensibles (copia de
     cédula y licencia). El resto, el general.
   - La casilla de aceptación es obligatoria y NUNCA viene premarcada.
   - `/privacidad` publica el Aviso de Privacidad (L-00-GG-09-02) completo.

   Desde el 10-nov-2026 la COTIZACIÓN (portada, /cotizalo, /concesionarios y
   cada ficha) usa el formulario de AYASA en un iframe, que lleva su propio Aviso
   de Privacidad y su casilla. Ahí ya no se exige nuestro aviso —sería un segundo
   consentimiento que nadie registra—; se exige que el iframe sea el de AYASA,
   que no quede también nuestro formulario y que haya salida si el marco no carga.

   Desde el 23-nov-2026 TEST DRIVE también: nuestro formulario no tenía destino
   y el cliente lo reportó como roto. Es el mismo formulario de AYASA con el
   origen «Test Drive» de su CRM en la URL, y al terminar va a
   `/gracias-test-drive`, no a `/gracias`, para que la conversión se distinga.

   Va dentro de `npm run verificar`, DESPUÉS de `astro build`. Sin dependencias. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function leer(ruta) {
  const completa = join(DIST, ruta);
  assert.ok(existsSync(completa), `falta ${completa}: ¿se ejecutó astro build?`);
  return readFileSync(completa, 'utf8');
}

const obligatorio = (tag) => /\srequired(?=[\s>=\/])/.test(tag);
const textoPlano = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const FRASES_COMUNES = [
  'AUTOMOTORES Y ANEXOS S.A. (A.Y.A.S.A.), FOTON DEL ECUADOR SOCIEDAD CIVIL Y COMERCIAL, TELEMÁTICA EQUINOCCIAL TELEQUINOX S.A., ALMACENERA AUTOMOTRIZ ALMOTRIZ S.A., ENAERENTACAR S.A.',
  'atender sus requerimientos comerciales, contacto directo y proactivo, actividades de marketing y sondeo de mercado',
  'datos@ayasa.com.ec',
  'Declaración de consentimiento informado.',
  'LAS EMPRESAS no serán responsables de los resultados derivados del procesamiento de datos personales inexactos, erróneos o falaces.',
];
const FRASE_SENSIBLES = 'Los datos personales sensibles (copia de cédula y licencia) serán utilizados para validar la identidad del cliente';
const CASILLA = 'Declaro que he leído y acepto el tratamiento de mis datos personales, así como el Aviso de Privacidad';


const URL_COTIZACION = 'https://ayas-formweb-prd.powerappsportals.com/tools/arcfox/form-quote-general/';
/* El formulario de test drive propio de AYASA; `b=arcfox` elige la marca. */
const URL_PRUEBA = 'https://ayas-formweb-prd.powerappsportals.com/tools/general/test-drive/?b=arcfox';

function comprobarCotizacion(ruta, url = URL_COTIZACION, gracias = '/gracias') {
  const html = leer(ruta);
  const marcos = html.match(/<iframe\b[^>]*>/gi) ?? [];
  const marco = marcos.find((tag) => tag.includes(`src="${url}"`));
  assert.ok(marco, `${ruta}: falta el iframe del formulario de AYASA (${url})`);
  assert.ok(marcos.length === 1, `${ruta}: tiene que haber un solo iframe de AYASA`);
  assert.match(
    html,
    new RegExp(`class="[^"]*cotizacion-externa[^"]*"[^>]*data-gracias="${gracias}"`),
    `${ruta}: al terminar tiene que ir a ${gracias}`,
  );
  assert.match(marco, /\stitle="[^"]+"/, `${ruta}: el iframe necesita title para los lectores de pantalla`);
  assert.ok(!/<form\b[^>]*\bdata-gracias\b/i.test(html), `${ruta}: sobra nuestro formulario junto al de AYASA`);
  assert.match(
    html,
    new RegExp(`<a\\b[^>]*href="${url.replace(/[.?]/g, '\\$&')}"[^>]*target="_blank"[^>]*rel="noopener"`),
    `${ruta}: falta el enlace para abrir el formulario aparte si el marco no carga`,
  );
}

test('test-drive.html: el test drive es el formulario de test drive de AYASA', () =>
  comprobarCotizacion('test-drive.html', URL_PRUEBA, '/gracias-test-drive'));

for (const ruta of ['index.html', 'cotizalo.html', 'concesionarios.html']) {
  test(`${ruta}: la cotización es el formulario de AYASA`, () => comprobarCotizacion(ruta));
}

test('cada página de modelo cotiza con el formulario de AYASA', () => {
  const modelos = existsSync(join(DIST, 'modelos'))
    ? readdirSync(join(DIST, 'modelos')).filter((archivo) => archivo.endsWith('.html'))
    : [];
  assert.ok(modelos.length > 0, 'no hay páginas en dist/modelos/');
  for (const archivo of modelos) comprobarCotizacion(join('modelos', archivo));
});

/* LA PUERTA TAMBIÉN RECOGE DATOS PERSONALES —nombre, correo, WhatsApp— y los
   manda a la hoja de cálculo, así que lleva el mismo aviso que un formulario:
   el general, porque no pide cédula ni licencia. No es un `<form data-gracias>`
   ni su casilla lleva `required`: el protocolo valida paso a paso en JS, y un
   control obligatorio oculto bloquearía el Enter de cada pregunta anterior.
   `/landing` pinta la misma puerta, así que se comprueba también allí. */
function comprobarPuerta(ruta) {
  const bloque = leer(ruta).match(/<div\b[^>]*\bdata-consentimiento\b[^>]*>[\s\S]*?<\/label>/i)?.[0];
  assert.ok(bloque, `${ruta}: el protocolo no tiene paso de consentimiento`);
  const texto = textoPlano(bloque);
  for (const frase of FRASES_COMUNES) {
    assert.ok(texto.includes(frase), `${ruta}: el aviso no dice literalmente «${frase.slice(0, 60)}…»`);
  }
  assert.ok(!texto.includes(FRASE_SENSIBLES), `${ruta}: el aviso de datos sensibles es sólo para test drive`);
  assert.ok(texto.includes('identificativos y de contacto para que LAS EMPRESAS puedan'), `${ruta}: la declaración debería ser la general`);
  assert.match(
    bloque,
    /<strong\b[^>]*>\s*Más información en nuestro Aviso de Privacidad colocado en la Página Web\.\s*<\/strong>/,
    `${ruta}: «Más información en nuestro Aviso de Privacidad…» va en negrita, como en el correo de legal`,
  );
  const casilla = bloque.match(/<input\b[^>]*\btype="checkbox"[^>]*>/i)?.[0];
  assert.ok(casilla, `${ruta}: falta la casilla de aceptación`);
  assert.ok(!/\schecked(?=[\s>=\/])/.test(casilla), `${ruta}: la casilla no puede venir premarcada`);
  assert.ok(texto.includes(CASILLA), `${ruta}: el texto de la casilla no es el literal de legal`);
  /* Absoluta: la landing de Azure se poda a esta sola página y un
     `/privacidad` relativo daría 404 allí (LEGAL.privacidadPuerta). */
  assert.match(
    bloque,
    /<a\b[^>]*href="https:\/\/arcfox-ruddy\.vercel\.app\/privacidad"[^>]*>\s*Aviso de Privacidad\s*<\/a>/,
    `${ruta}: «Aviso de Privacidad» de la puerta debería enlazar al aviso publicado en el sitio completo`,
  );
}

for (const ruta of ['lanzamiento.html', 'landing.html']) {
  test(`${ruta}: la puerta lleva el aviso de datos y la casilla sin marcar`, () => comprobarPuerta(ruta));
}

/* Se comprueban el principio, el final y el código del documento, para notar
   si la conversión desde el Word dejó algo fuera. */
test('privacidad.html publica el Aviso de Privacidad completo', () => {
  const texto = textoPlano(leer('privacidad.html'));
  for (const frase of [
    'L-00-GG-09-02',
    'LAS EMPRESAS; expresan su compromiso con la protección de los datos personales',
    'RUC: 1792364477001',
    'Ley Orgánica de Protección de Datos Personales de 26 de mayo de 2021 Registro Oficial Suplemento 459.',
    'Este aviso de privacidad podrá ser modificado en cualquier momento por LAS EMPRESAS sin previo consentimiento del titular.',
    'Actualización de contenidos, estructura y procedimientos internos conforme nueva normativa / práctica interna.',
  ]) {
    assert.ok(texto.includes(frase), `privacidad.html no dice «${frase.slice(0, 60)}…»`);
  }
});

/* El pie sigue la barra que pidió Foton («Legal | Políticas SIG | Términos y
   Condiciones | Aviso de Privacidad») con los documentos que ya existen, y cada
   página legal enlaza a las demás: quien lee una busca casi siempre otra. */
test('el pie y las páginas legales enlazan los documentos publicados', () => {
  const pie = leer('index.html').match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? '';
  assert.match(pie, /<a\b[^>]*href="\/politicas"[^>]*>\s*Políticas SIG\s*<\/a>/, 'el pie debería enlazar «Políticas SIG»');
  assert.match(pie, /<a\b[^>]*href="\/privacidad"[^>]*>\s*Aviso de Privacidad\s*<\/a>/, 'el pie debería enlazar «Aviso de Privacidad»');
  assert.ok(pie.indexOf('href="/politicas"') < pie.indexOf('href="/privacidad"'), 'el orden del pie es el de la barra de Foton');

  const main = (ruta) => leer(ruta).match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? '';
  assert.match(main('privacidad.html'), /href="\/politicas"/, '/privacidad debería enlazar a /politicas');
  assert.match(main('politicas.html'), /href="\/privacidad"/, '/politicas debería enlazar a /privacidad');
});
