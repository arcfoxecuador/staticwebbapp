/* ── EL VERIFICADOR DE GOOGLE TAG MANAGER ──────────────────────────────────
   Lee `dist/` y comprueba el pedido del cliente (16-nov-2026): el contenedor
   GTM-P7W7KZBM al principio del <head> de TODAS las páginas, landing incluida,
   y siempre detrás del consentimiento por defecto en `denied`, para que nada
   deje cookies antes de que el visitante acepte.

   Va dentro de `npm run verificar`, DESPUÉS de `astro build`. Sin dependencias. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const ID = 'GTM-P7W7KZBM';

function paginas(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return paginas(ruta);
    return nombre.endsWith('.html') ? [ruta] : [];
  });
}

const todas = paginas(DIST);

test('hay páginas en dist/', () => assert.ok(todas.length > 0, 'dist/ está vacío: ¿falta astro build?'));

for (const ruta of todas) {
  const nombre = relative(DIST, ruta);
  test(`${nombre}: GTM al inicio del <head>, tras el consentimiento por defecto`, () => {
    const html = readFileSync(ruta, 'utf8');
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    const carga = head.indexOf(`https://www.googletagmanager.com/gtm.js?id=${ID}`);
    assert.ok(carga >= 0, `${nombre}: falta el contenedor ${ID} en el <head>`);

    const primerScript = head.search(/<script\b/i);
    const defecto = head.indexOf("gtag('consent', 'default'");
    assert.ok(defecto >= 0, `${nombre}: falta el consentimiento por defecto`);
    assert.ok(primerScript >= 0 && primerScript < defecto && defecto < carga, `${nombre}: el consentimiento tiene que ir antes que gtm.js`);
    /* Sólo el charset puede ir antes: el navegador lo exige en los primeros 1024 bytes. */
    assert.equal(head.slice(0, primerScript).replace(/<meta charset="utf-8"\s*\/?>/i, '').trim(), '', `${nombre}: GTM debería ser lo primero del <head>, tras el charset`);
    assert.ok(html.indexOf('charset="utf-8"') < 1024, `${nombre}: el charset tiene que caer en los primeros 1024 bytes`);
    assert.equal(html.split('charset=').length - 1, 1, `${nombre}: charset duplicado`);
    assert.match(head, /'gtm\.start'/, `${nombre}: falta el evento gtm.start`);
    assert.equal(head.split(`gtm.js?id=${ID}`).length - 1, 1, `${nombre}: GTM cargado más de una vez`);
    assert.match(html, /id="aviso-cookies"/, `${nombre}: con GTM tiene que estar el banner de cookies`);
  });
}
