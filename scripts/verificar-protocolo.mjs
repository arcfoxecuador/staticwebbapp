/* ── EL VERIFICADOR DE LA VALIDACIÓN DEL PROTOCOLO ─────────────────────────
   Comprueba `src/lib/protocolo.mjs`: las cuatro reglas que deciden qué llega a
   la hoja de cálculo y en qué formato.

   POR QUÉ EXISTE. Los tres verificadores hermanos miran `dist/`; éste mira una
   función pura, y es el único sitio del repositorio donde eso hace falta. El
   motivo es el formato del teléfono: un mismo número ecuatoriano se escribe
   `0987654321`, `+593 98 765 4321`, `(09) 8765-4321` y `593987654321`. Si la
   normalización se equivoca, el error NO se ve —la hoja se llena igual— y sólo
   aparece semanas después, cuando alguien intenta escribir por WhatsApp a una
   lista con cuatro formatos y descubre que la mitad no son números marcables.
   Un caso que el navegador no detecta: `type="tel"` no valida nada.

   Cero dependencias: `node:test` viene con Node. Va dentro de `npm run
   verificar`, y por tanto dentro de `npm run check`, que es la puerta. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { validar } from '../src/lib/protocolo.mjs';

/** Atajo: la validación pasó y devolvió exactamente este valor normalizado. */
function pasa(clave, entrada, esperado) {
  const resultado = validar(clave, entrada);
  assert.equal(resultado.ok, true, `«${entrada}» debería ser válido y dio: ${resultado.error}`);
  assert.equal(resultado.valor, esperado);
}

/** Atajo: la validación falló y devolvió un mensaje para el visitante. */
function falla(clave, entrada) {
  const resultado = validar(clave, entrada);
  assert.equal(resultado.ok, false, `«${entrada}» debería ser inválido y pasó`);
  assert.ok(resultado.error.length > 0, 'un rechazo sin mensaje deja al visitante sin salida');
}

test('nombre: pide algo que se pueda usar para saludar', () => {
  pasa('nombre', '  Ana  ', 'Ana');
  pasa('nombre', 'josé maría', 'josé maría');
  /* Dos letras es el mínimo real: hay nombres de dos letras y no vamos a
     rechazar a nadie por llamarse Bo. */
  pasa('nombre', 'Bo', 'Bo');
  falla('nombre', '');
  falla('nombre', '   ');
  falla('nombre', 'a');
  /* Sin esta regla, «0987654321» en el paso del nombre pasa como nombre válido:
     es lo que teclea quien va en piloto automático rellenando el WhatsApp. */
  falla('nombre', '0987654321');
  falla('nombre', '...');
});

test('correo: exige dominio con punto, que el navegador no', () => {
  pasa('correo', ' Ana@Correo.COM ', 'ana@correo.com');
  pasa('correo', 'ana.maria+lista@sub.dominio.ec', 'ana.maria+lista@sub.dominio.ec');
  falla('correo', '');
  /* `type="email"` del navegador ACEPTA esto. Un correo sin punto en el dominio
     no existe fuera de una intranet, y aquí significa invitación no entregada. */
  falla('correo', 'ana@correo');
  falla('correo', 'ana correo.com');
  falla('correo', '@correo.com');
  falla('correo', 'ana@@correo.com');
});

test('whatsapp: cuatro formas de escribir el mismo número ecuatoriano', () => {
  /* Las cuatro entradas de este bloque son EL MISMO teléfono. Que salgan
     idénticas de la función es todo el motivo por el que existe este archivo. */
  pasa('whatsapp', '0987654321', '+593987654321');
  pasa('whatsapp', '+593 98 765 4321', '+593987654321');
  pasa('whatsapp', '(09) 8765-4321', '+593987654321');
  pasa('whatsapp', '593987654321', '+593987654321');
  /* Sin cero inicial: nueve dígitos que empiezan por 9. Se teclea así a menudo. */
  pasa('whatsapp', '987654321', '+593987654321');

  falla('whatsapp', '');
  falla('whatsapp', '0987654');           // corto
  falla('whatsapp', '09876543210');       // largo
  falla('whatsapp', '022345678');         // fijo de Quito: no recibe WhatsApp
  falla('whatsapp', 'no tengo');
  falla('whatsapp', '+34 600 123 456');   // otro país
});

test('instagram: guarda el usuario, no la URL', () => {
  pasa('instagram', 'arcfoxecuador', '@arcfoxecuador');
  pasa('instagram', '@arcfoxecuador', '@arcfoxecuador');
  pasa('instagram', '  @ArcfoxEcuador ', '@arcfoxecuador');
  /* Pegar el enlace del perfil es lo más cómodo desde el móvil, y es lo que
     hace la mitad de la gente. Rechazarlo sería castigar el atajo obvio. */
  pasa('instagram', 'https://www.instagram.com/arcfoxecuador/', '@arcfoxecuador');
  pasa('instagram', 'instagram.com/arcfoxecuador?igshid=abc', '@arcfoxecuador');
  pasa('instagram', 'perfil.con_punto', '@perfil.con_punto');

  falla('instagram', '');
  falla('instagram', '@');
  falla('instagram', 'con espacio');
  falla('instagram', 'acento_ñ');
  falla('instagram', 'a'.repeat(31)); // Instagram corta en 30
});

test('una clave sin regla propia sólo exige contenido', () => {
  pasa('ciudad', '  Quito ', 'Quito');
  falla('ciudad', '   ');
});

/* LA OTRA MITAD DEL SISTEMA VIVE EN GOOGLE. `scripts/hoja-protocolo.gs` decide
   el orden de las columnas y descarta en silencio cualquier clave que no
   conozca. Añadir una pregunta al protocolo y olvidar la hoja no rompe nada
   visible: la hoja se sigue llenando, sin esa columna. Esta comprobación es lo
   único que hace ruido cuando las dos listas se separan. */
test('las claves del protocolo y las columnas de la hoja son la misma lista', () => {
  const componente = readFileSync(new URL('../src/components/ui/ProtocoloComando.astro', import.meta.url), 'utf8');
  const hoja = readFileSync(new URL('./hoja-protocolo.gs', import.meta.url), 'utf8');

  const claves = [...componente.matchAll(/^\s{4}clave: '([^']+)'/gm)].map((c) => c[1]);
  const bloque = hoja.match(/const CAMPOS = \[([\s\S]*?)\];/);
  assert.ok(bloque, 'no se encontró CAMPOS en hoja-protocolo.gs');
  const columnas = [...bloque[1].matchAll(/'([^']+)'/g)].map((c) => c[1]);

  assert.ok(claves.length >= 9, `sólo se leyeron ${claves.length} claves del componente`);
  assert.deepEqual(columnas, claves, 'CAMPOS de la hoja no coincide con las claves del protocolo');
});
