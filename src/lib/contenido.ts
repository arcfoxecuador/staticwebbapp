/* ── LA CAPA DE DATOS ──────────────────────────────────────────────────────
   La única pieza que sabe DE DÓNDE sale el contenido.

   POR QUÉ EXISTE SI HOY TODO ESTÁ EN `src/content/`. Porque el día que llegue
   un CMS —y en un sitio de cliente llega casi siempre— la alternativa es
   reescribir cada página que importa `astro:content`. Con este módulo en medio,
   las páginas no hablan con `astro:content` sino con `coleccion()`,
   `entrada()` y `renderizar()`, y migrar es girar UNA constante. Ni una página
   se toca, ni un componente, ni una ruta dinámica.

   El coste hoy son tres funciones de una línea. El coste de no tenerlo se paga
   entero y de golpe, normalmente con el sitio ya en producción.

   LO QUE SE PIERDE AL SALIR DE LAS COLECCIONES, y hay que reponerlo: hoy
   `content.config.ts` valida con zod, y eso es lo que hace que un artículo sin
   fecha ROMPA LA CONSTRUCCIÓN en vez de publicarse mal. Un CMS no valida nada:
   devuelve lo que el editor escribió. Por eso la rama del CMS tiene que llamar
   a `validar()`, y por eso `validar()` existe ya vacío en vez de ser algo que
   alguien tendrá que acordarse de escribir. */
import { getCollection, getEntry, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Coleccion = 'modelos' | 'articulos' | 'equipo';
export type Entrada<C extends Coleccion> = CollectionEntry<C>;

/* EL INTERRUPTOR.

   'colecciones' → el contenido sale de `src/content/`, versionado en git. Cada
   cambio es un commit, y el Pull Request es el control de publicación.

   'cms' → el contenido sale de la API de un gestor. Publicar deja de requerir
   un commit, lo que es exactamente lo que el cliente quiere y exactamente lo
   que retira el control anterior: antes de girar esto, alguien tiene que decidir
   QUIÉN puede publicar. Es una decisión de proyecto, no de código.

   Y `src/content/` NO se borra al migrar. Es la copia de seguridad: si el CMS
   cae, si alguien vacía una entrada o si el token caduca, se devuelve esta línea
   a 'colecciones' y el sitio vuelve a construir. Un CMS externo es una
   dependencia nueva en la ruta crítica del despliegue; la forma barata de que no
   sea un punto único de fallo es no tirar lo que ya funcionaba. */
const ORIGEN: 'colecciones' | 'cms' = 'colecciones';

/* ── Validación para la rama del CMS ─────────────────────────────────────────
   Las reglas que hoy hace cumplir zod, escritas a mano porque con un CMS ya no
   hay quien las haga cumplir. Devuelve la lista de problemas: vacía es correcto.

   Cuando enchufes el CMS, replica aquí las reglas de `content.config.ts`. Las
   dos listas tienen que cambiar juntas — es la única duplicación que este
   archivo acepta, y sólo porque la alternativa es publicar sin red. */
export function validar(coleccion: Coleccion, id: string, d: Record<string, unknown>): string[] {
  const fallos: string[] = [];

  const tope = (campo: string, max: number) => {
    const v = d[campo];
    if (typeof v === 'string' && v.length > max) fallos.push(`${campo} de ${v.length} · máximo ${max}`);
  };

  /* UNA IMAGEN SUBIDA SIN TEXTO ALTERNATIVO ROMPE LA CONSTRUCCIÓN.

     Es la decisión difícil de este bloque. La alternativa era degradar en
     silencio, que es lo que hace `imagenes.ts` cuando NO hay imagen. Pero
     cuando alguien SÍ subió una, ese silencio es la peor respuesta posible: el
     editor ve su fotografía en el panel, publica, y en la web no aparece nada,
     sin un solo mensaje que explique por qué. Se pasaría la tarde buscando el
     fallo en el sitio equivocado.

     Falla, y falla nombrando el campo y la entrada. Un despliegue detenido con
     un motivo legible es más barato que una portada que nadie sabe por qué no
     sale — y el alt no es un adorno: sin él la imagen no existe para quien usa
     un lector de pantalla. */
  const conAlt = (campo: string, respaldo?: string) => {
    const a = d[campo] as { filename?: string | null; alt?: string | null } | null | undefined;
    if (!a?.filename?.trim()) return;
    const alt = (a.alt ?? '').trim() || (respaldo ? String(d[respaldo] ?? '').trim() : '');
    if (!alt) {
      fallos.push(
        `${campo} tiene imagen y NO tiene texto alternativo — escríbelo en el campo «alt» del asset` +
          (respaldo ? `, o en ${respaldo}` : ''),
      );
    }
  };

  if (coleccion === 'modelos') {
    tope('seoDescripcion', 165);
    if (!d.nombre) fallos.push('nombre ausente');
    conAlt('imagen');
  }

  if (coleccion === 'articulos') {
    tope('resumen', 200);
    tope('seoDescripcion', 165);
    if (!d.fecha) fallos.push('fecha ausente');
    if (!d.autor) fallos.push('autor ausente — un artículo sin firma no es citable');
    conAlt('portada', 'portadaAlt');
  }

  if (coleccion === 'equipo') {
    if (!d.cargo) fallos.push('cargo ausente');
    conAlt('retrato');
  }

  return fallos.map((f) => `${coleccion}/${id}: ${f}`);
}

/* Un CMS devuelve TODO como cadena, incluidas las fechas. Las colecciones no:
   `z.coerce.date()` las convierte a `Date`, y las páginas cuentan con eso —
   ordenan con `+b.data.fecha - +a.data.fecha` y llaman a `.toISOString()`. Sin
   este paso el sitio construye igual y las fechas salen mal ordenadas o
   revientan al formatear. */
const FECHAS = ['fecha', 'actualizado'] as const;

export function normalizar(datos: Record<string, unknown>): Record<string, unknown> {
  const d = { ...datos };
  for (const campo of FECHAS) {
    if (typeof d[campo] === 'string' && d[campo]) d[campo] = new Date(d[campo] as string);
    else if (d[campo] === '') delete d[campo];
  }
  if (typeof d.orden === 'string') d.orden = Number(d.orden);
  /* Los opcionales vacíos se borran en vez de quedarse como cadena vacía:
     `portadaAlt ?? 'algo'` no salta con `''`, y ahí se cuela un pie vacío. */
  for (const k of ['portadaAlt', 'categoria', 'subtitulo']) {
    if (d[k] === '') delete d[k];
  }
  return d;
}

/** Sustituye a `getCollection`. Misma firma y mismo tipo de vuelta, para que
    los consumidores no noten el cambio de origen. */
export async function coleccion<C extends Coleccion>(
  nombre: C,
  filtro?: (entrada: Entrada<C>) => boolean,
): Promise<Entrada<C>[]> {
  if (ORIGEN === 'colecciones') {
    return (filtro ? await getCollection(nombre, filtro) : await getCollection(nombre)) as Entrada<C>[];
  }

  /* ── RAMA DEL CMS ─────────────────────────────────────────────────────────
     Sin implementar a propósito: cada gestor tiene su API y escribir la de uno
     concreto ahora sería adivinar. Lo que SÍ está decidido, y hay que respetar
     al escribirla, son cinco cosas que se aprendieron caras:

     1. `fetch` directo, no el helper del SDK. Los helpers necesitan que la
        integración se haya inicializado, y en el prerender de una página
        estática no lo está: devuelven silencio, la colección sale vacía y la
        página revienta después, al buscar el primer elemento de una lista de
        cero.

     2. El token se lee de `process.env` Y de `import.meta.env`. Astro sólo
        expone a `import.meta.env` las variables con prefijo `PUBLIC_`, y ésta
        no lo lleva —ni debe, porque acabaría en el JavaScript del navegador—.
        En construcción `process.env` sí las tiene.

     3. `throw`, nunca un array vacío. Si el token falta o la API responde mal,
        el sitio TIENE que dejar de construir. Un catálogo vacío publicado en
        silencio es mucho peor que un build roto.

     4. Cero entradas es un fallo, no un caso válido. Con `version=published` y
        nada aprobado, la mayoría de las APIs responden 200 con lista vacía.

     5. Ordenar por `id` antes de devolver. Las colecciones lo hacen al leer el
        directorio; una API no promete ningún orden, y con dos entradas que
        comparten fecha el desempate lo decide el orden de llegada. Sin esto,
        dos construcciones del MISMO contenido dan HTML distinto.

     El detalle completo está en docs/05-contenido.md. */
  throw new Error(
    'ORIGEN es "cms" pero la rama del CMS no está implementada. Ver docs/05-contenido.md.',
  );
}

/** Sustituye a `getEntry`. */
export async function entrada<C extends Coleccion>(
  nombre: C,
  id: string,
): Promise<Entrada<C> | undefined> {
  if (ORIGEN === 'colecciones') return (await getEntry(nombre, id)) as Entrada<C> | undefined;
  return (await coleccion(nombre)).find((e) => e.id === id);
}

/** Sustituye a `render`.

    Con las colecciones, Astro compila el `.md` a un componente y `render()`
    devuelve ese componente listo. Con un CMS el cuerpo llega como una cadena de
    markdown en un campo de texto, así que hay que procesarla y envolverla en
    algo que las páginas puedan pintar como `<Content />`.

    Cuando llegue ese día: usa el MISMO procesador de markdown que usa Astro, no
    `marked` ni `markdown-it`. Con otro, el HTML cambia —identificadores de
    encabezado, comillas tipográficas, guiones— y el sitio cambia de aspecto el
    día del interruptor. Eso no sería una decisión, sería un efecto secundario. */
export async function renderizar<C extends Coleccion>(e: Entrada<C>) {
  if (ORIGEN === 'colecciones') return render(e);
  throw new Error('ORIGEN es "cms" pero `renderizar` no está implementado. Ver docs/05-contenido.md.');
}
