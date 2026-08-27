/* ── EL VERIFICADOR ────────────────────────────────────────────────────────
   Comprueba que cada `<script>` en línea de `dist/` es CÓDIGO EJECUTABLE y no una
   cadena de texto con pinta de código.

   POR QUÉ EXISTE. En Astro, un `<script>` escrito dentro de una expresión —
   `{condición && (<script>…</script>)}` — se parsea como JSX. El resultado es que
   el cuerpo del script llega al HTML como un STRING: el marcado se ve perfecto,
   el navegador no ejecuta una línea, y no hay ningún error en ninguna consola.

   Es un fallo que se descubre semanas después y por casualidad. Un caso real
   documentado: un identificador de analítica presente en las cincuenta páginas
   durante un despliegue entero **sin enviar un solo evento**.

   Y por eso «verificar» NO es hacer grep de que el texto está. El texto estaba.

   De paso valida los bloques `application/ld+json`: un JSON-LD que no parsea es
   marcado que Google descarta en silencio, exactamente el mismo tipo de fallo.

   Va dentro de `npm run check`, DESPUÉS de `astro build`. En `dev` no sirve de
   nada: sólo `dist/` es la verdad. */
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import vm from 'node:vm';

const DIST = 'dist';

async function htmls(dir) {
  const salida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await htmls(ruta)));
    else if (entrada.name.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

/* `[\s\S]` y no `.` con la bandera `s`: el patrón se lee igual en cualquier
   versión y no depende de una bandera que alguien puede quitar sin darse cuenta. */
const SCRIPTS = /<script([^>]*)>([\s\S]*?)<\/script>/g;

const atributo = (attrs, nombre) =>
  attrs.match(new RegExp(`${nombre}\\s*=\\s*["']([^"']*)["']`))?.[1] ?? null;

/* Un `<script>` no siempre lleva JavaScript. Estos cuatro tipos llevan JSON, y
   compilarlos como programa da un «Unexpected token ':'» que no significa nada:
   el error sería del verificador, no de la página. Se validan como JSON, que es
   lo que de verdad hay que comprobar de ellos —un JSON-LD roto lo descarta Google
   en silencio, y unas reglas de especulación rotas simplemente no precargan—. */
const TIPOS_JSON = new Set([
  'application/ld+json',
  'speculationrules',
  'importmap',
  'application/json',
]);

const fallos = [];
let scriptsRevisados = 0;
let jsonRevisados = 0;

for (const archivo of await htmls(DIST)) {
  const html = readFileSync(archivo, 'utf8');
  const nombre = relative(DIST, archivo);

  for (const [, attrs, cuerpo] of html.matchAll(SCRIPTS)) {
    // Un script externo no tiene cuerpo que verificar.
    if (atributo(attrs, 'src')) continue;

    const tipo = atributo(attrs, 'type');
    const codigo = cuerpo.trim();
    if (!codigo) continue;

    if (tipo && TIPOS_JSON.has(tipo.toLowerCase())) {
      jsonRevisados++;
      try {
        JSON.parse(codigo);
      } catch (error) {
        fallos.push(`${nombre}: <script type="${tipo}"> no es JSON válido — ${error.message}`);
      }
      continue;
    }

    /* Los módulos con `import` o `export` no se pueden compilar como script
       clásico. Astro los suele extraer a un archivo aparte, así que en `dist/`
       casi nunca quedan en línea; si queda alguno, se salta en vez de dar un
       falso positivo. */
    if (/^\s*(import|export)\b/m.test(codigo)) continue;

    scriptsRevisados++;

    /* LA COMPROBACIÓN QUE DE VERDAD PILLA EL BUG. Un cuerpo que empieza y acaba
       en la misma comilla es una CADENA, no un programa — y compila sin error
       como expresión, así que la comprobación de sintaxis de abajo no lo vería.
       Ésta es la firma exacta del script convertido en JSX. */
    const comilla = codigo[0];
    if (
      (comilla === '"' || comilla === "'" || comilla === '`') &&
      codigo.endsWith(comilla) &&
      codigo.length > 2
    ) {
      fallos.push(
        `${nombre}: un <script> llegó como CADENA de texto y nunca se ejecutará.\n` +
          `    Empieza por ${comilla} y termina igual. Casi siempre es un <script> escrito dentro\n` +
          `    de {condición && (…)}, que Astro parsea como JSX. Solución: renderiza el <script>\n` +
          `    sin condicional (condiciona el COMPONENTE, no la etiqueta) o inyéctalo con set:html.`,
      );
      continue;
    }

    try {
      // Compila y no ejecuta: `new vm.Script` lanza en un error de sintaxis.
      new vm.Script(codigo, { filename: nombre });
    } catch (error) {
      fallos.push(`${nombre}: <script> con sintaxis inválida — ${error.message}`);
    }
  }
}

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} problema(s) en los scripts en línea de dist/\n`);
  for (const f of fallos) console.error(`  · ${f}\n`);
  process.exit(1);
}

console.log(
  `✓ ${scriptsRevisados} script(s) en línea y ${jsonRevisados} bloque(s) JSON-LD verificados en dist/`,
);
