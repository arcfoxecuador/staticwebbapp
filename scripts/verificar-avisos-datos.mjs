/* ── EL VERIFICADOR DEL AVISO DE DATOS DE LA PUERTA ────────────────────────
   Lee `dist/` y comprueba lo que pidió el área legal de AYASA (hilo «LEGALES
   ARCFOX», 30-sep y 20-oct-2026) en el único formulario de este despliegue, el
   protocolo de la puerta:
   - El paso de consentimiento lleva el AVISO DE TRATAMIENTO DE DATOS literal.
     «Su contenido no puede ser modificado»: por eso se comprueban frases
     exactas y no sólo que exista un bloque. Es el general: la puerta no pide
     cédula ni licencia.
   - La casilla dice el literal de legal, NUNCA viene premarcada y enlaza al
     Aviso de Privacidad, que publica el sitio completo en Vercel: este
     repositorio sólo sirve la puerta. Que esa página siga viva no se comprueba
     aquí, porque obligaría a salir a la red en cada construcción.
   Es la misma regla que `verificar-avisos-datos.mjs` del sitio completo
   (Retr1to/ARCFOX), recortada a lo que existe aquí.

   Va dentro de `npm run verificar`, DESPUÉS de `astro build`. Sin dependencias. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function leer(ruta) {
  const completa = join(DIST, ruta);
  assert.ok(existsSync(completa), `falta ${completa}: ¿se ejecutó astro build?`);
  return readFileSync(completa, 'utf8');
}

const textoPlano = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const FRASES = [
  'AUTOMOTORES Y ANEXOS S.A. (A.Y.A.S.A.), FOTON DEL ECUADOR SOCIEDAD CIVIL Y COMERCIAL, TELEMÁTICA EQUINOCCIAL TELEQUINOX S.A., ALMACENERA AUTOMOTRIZ ALMOTRIZ S.A., ENAERENTACAR S.A.',
  'atender sus requerimientos comerciales, contacto directo y proactivo, actividades de marketing y sondeo de mercado',
  'La base legal para la ejecución de estas actividades es su consentimiento expreso e inequívoco.',
  'datos@ayasa.com.ec',
  'Declaración de consentimiento informado.',
  'tratar sus datos personales: identificativos y de contacto para que LAS EMPRESAS puedan',
  'LAS EMPRESAS no serán responsables de los resultados derivados del procesamiento de datos personales inexactos, erróneos o falaces.',
];
const CASILLA = 'Declaro que he leído y acepto el tratamiento de mis datos personales, así como el Aviso de Privacidad';

test('lanzamiento.html: el paso de consentimiento lleva el aviso literal de legal', () => {
  const html = leer('lanzamiento.html');
  const bloque = html.match(/<div\b[^>]*\bdata-consentimiento\b[^>]*>[\s\S]*?<\/label>/i)?.[0];
  assert.ok(bloque, 'lanzamiento.html: el protocolo no tiene paso de consentimiento');
  const texto = textoPlano(bloque);

  for (const frase of FRASES) {
    assert.ok(texto.includes(frase), `lanzamiento.html: el aviso no dice literalmente «${frase.slice(0, 60)}…»`);
  }
  assert.ok(!texto.includes('copia de cédula y licencia'), 'lanzamiento.html: el aviso de datos sensibles es sólo para test drive');
  assert.match(
    bloque,
    /<strong\b[^>]*>\s*Más información en nuestro Aviso de Privacidad colocado en la Página Web\.\s*<\/strong>/,
    'lanzamiento.html: «Más información en nuestro Aviso de Privacidad…» va en negrita, como en el correo de legal',
  );

  const casilla = bloque.match(/<input\b[^>]*\btype="checkbox"[^>]*>/i)?.[0];
  assert.ok(casilla, 'lanzamiento.html: falta la casilla de aceptación');
  assert.ok(!/\schecked(?=[\s>=\/])/.test(casilla), 'lanzamiento.html: la casilla no puede venir premarcada');
  assert.ok(texto.includes(CASILLA), 'lanzamiento.html: el texto de la casilla no es el literal de legal');
  assert.match(
    bloque,
    /<a\b[^>]*href="https:\/\/arcfox-ruddy\.vercel\.app\/privacidad"[^>]*>\s*Aviso de Privacidad\s*<\/a>/,
    'lanzamiento.html: «Aviso de Privacidad» de la casilla debería enlazar al aviso publicado en el sitio completo',
  );
});
