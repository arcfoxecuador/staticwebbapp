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

/** El formulario de contacto es el que lleva `data-gracias`; así no se confunde
    con el del protocolo de lanzamiento, que no lo lleva. */
function formulario(html, ruta) {
  const form = html.match(/<form\b[^>]*\bdata-gracias\b[^>]*>[\s\S]*?<\/form>/i);
  assert.ok(form, `${ruta} no tiene formulario de contacto`);
  return form[0];
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

function comprobarAviso(ruta) {
  const form = formulario(leer(ruta), ruta);
  const texto = textoPlano(form);
  for (const frase of FRASES_COMUNES) {
    assert.ok(texto.includes(frase), `${ruta}: el aviso de datos no dice literalmente «${frase.slice(0, 60)}…»`);
  }

  const esPrueba = ruta === 'test-drive.html';
  assert.equal(
    texto.includes(FRASE_SENSIBLES),
    esPrueba,
    esPrueba ? `${ruta}: test drive necesita el aviso de datos sensibles` : `${ruta}: el aviso de datos sensibles es sólo para test drive`,
  );
  assert.equal(
    texto.includes('identificativos, de contacto y sensibles'),
    esPrueba,
    `${ruta}: la declaración de consentimiento no corresponde al formulario`,
  );

  /* Como en la imagen que adjuntó legal: el aviso entero a la vista, sin caja
     con scroll que lo esconda, y la remisión al Aviso de Privacidad en negrita
     como en su correo. */
  assert.match(
    form,
    /<strong\b[^>]*>\s*Más información en nuestro Aviso de Privacidad colocado en la Página Web\.\s*<\/strong>/,
    `${ruta}: «Más información en nuestro Aviso de Privacidad…» va en negrita, como en el correo de legal`,
  );
  const css = readdirSync(join(DIST, '_astro'))
    .filter((archivo) => archivo.endsWith('.css'))
    .map((archivo) => readFileSync(join(DIST, '_astro', archivo), 'utf8'))
    .join('\n');
  assert.ok(!/\.aviso-datos[^{]*\{[^}]*overflow/.test(css), `${ruta}: el aviso no puede ir en una caja con scroll`);

  const casilla = form.match(/<input\b[^>]*\btype="checkbox"[^>]*>/i)?.[0];
  assert.ok(casilla, `${ruta}: falta la casilla de aceptación`);
  assert.ok(obligatorio(casilla), `${ruta}: la casilla de aceptación debería ser obligatoria`);
  assert.ok(!/\schecked(?=[\s>=\/])/.test(casilla), `${ruta}: la casilla no puede venir premarcada`);
  assert.ok(texto.includes(CASILLA), `${ruta}: el texto de la casilla no es el literal de legal`);
  assert.match(
    form,
    /<a\b[^>]*href="\/privacidad"[^>]*>\s*Aviso de Privacidad\s*<\/a>/,
    `${ruta}: «Aviso de Privacidad» de la casilla debería enlazar a /privacidad`,
  );
}

for (const ruta of ['index.html', 'cotizalo.html', 'test-drive.html', 'concesionarios.html']) {
  test(`${ruta}: lleva el aviso de datos y la casilla sin marcar`, () => comprobarAviso(ruta));
}

test('cada página de modelo lleva el aviso de datos', () => {
  const modelos = existsSync(join(DIST, 'modelos'))
    ? readdirSync(join(DIST, 'modelos')).filter((archivo) => archivo.endsWith('.html'))
    : [];
  assert.ok(modelos.length > 0, 'no hay páginas en dist/modelos/');
  for (const archivo of modelos) comprobarAviso(join('modelos', archivo));
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
  assert.match(
    bloque,
    /<a\b[^>]*href="\/privacidad"[^>]*>\s*Aviso de Privacidad\s*<\/a>/,
    `${ruta}: «Aviso de Privacidad» de la casilla debería enlazar a /privacidad`,
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
