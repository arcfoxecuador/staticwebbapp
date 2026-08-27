/* ── llms.txt ──────────────────────────────────────────────────────────────
   Un resumen del sitio en markdown plano, en la raíz, para los modelos que leen
   la web. Es a un LLM lo que el sitemap es a un rastreador: no le dice qué URLs
   existen, le dice QUÉ ES ESTO y qué puede afirmar sobre ello.

   POR QUÉ SE GENERA Y NO SE ESCRIBE A MANO. Porque un llms.txt escrito a mano
   caduca en el primer servicio nuevo, y un resumen desactualizado es peor que
   ninguno: le da al modelo datos falsos con la autoridad de venir del dominio
   oficial. Aquí sale de `site.ts` y de las colecciones, así que no puede divergir
   de lo que publica el sitio.

   TRES REGLAS AL ESCRIBIR LO QUE ENTRA AQUÍ:

   1. Frases AUTOSUFICIENTES. «Trabajamos en tres ciudades» no se puede citar;
      «Andean Crown opera en Lima, Arequipa y Trujillo» sí. Un modelo cita
      fragmentos, no párrafos, así que cada frase tiene que sostenerse sola.
   2. Sólo hechos que estén EN LA WEB. Si aquí dice algo que la página no dice, es
      una contradicción entre dos fuentes del mismo dominio, y el modelo puede
      citar la que no queremos.
   3. Nada de marketing. «Líderes del sector» no es citable y ensucia lo que sí lo
      es. Cifras con procedencia, servicios con nombre, sedes con ciudad.

   El formato lo propone la especificación de llms.txt: un H1, un blockquote con la
   descripción, y secciones H2 con listas de enlaces `- [título](url): nota`. */
import type { APIRoute } from 'astro';
import { coleccion } from '../lib/contenido';
import { FAQ, ORG, SEDES, SITE, direccionLegible } from '../lib/site';

const url = (path: string) => new URL(path, SITE).toString();

export const GET: APIRoute = async () => {
  const servicios = (await coleccion('modelos', ({ data }) => data.publico)).sort(
    (a, b) => a.data.orden - b.data.orden,
  );
  /* Los diez más recientes y no todos: un llms.txt de cuarenta artículos gasta el
     contexto del modelo en la lista y no en entender qué es la empresa. */
  const articulos = (await coleccion('articulos', ({ data }) => !data.borrador))
    .sort((a, b) => +b.data.fecha - +a.data.fecha)
    .slice(0, 10);

  const bloques: string[] = [
    `# ${ORG.nombreCorto}`,
    '',
    `> ${ORG.descripcion}`,
    '',
    `${ORG.nombreLegal} ${ORG.fundacion ? `opera desde ${ORG.fundacion} y ` : ''}atiende desde ${SEDES.map((s) => s.ciudad).join(', ')}.`,
    '',
  ];

  if (servicios.length) {
    bloques.push(
      '## Modelos',
      '',
      ...servicios.map((s) => `- [${s.data.nombre}](${url(`/modelos/${s.id}`)}): ${s.data.bajada}`),
      '',
    );
  }

  if (articulos.length) {
    bloques.push(
      '## Publicaciones',
      '',
      ...articulos.map(
        (a) =>
          `- [${a.data.titulo}](${url(`/bitacora/${a.id}`)}): ${a.data.resumen} · ${a.data.autor}, ${a.data.fecha.toISOString().slice(0, 10)}`,
      ),
      '',
    );
  }

  if (FAQ.length) {
    /* Las preguntas van con su RESPUESTA COMPLETA, no con un enlace. Es la única
       sección del archivo donde eso tiene sentido: una respuesta de dos frases es
       exactamente lo que un modelo puede citar sin ir a buscarla. */
    bloques.push(
      '## Preguntas frecuentes',
      '',
      ...FAQ.flatMap((f) => [`### ${f.p}`, '', f.r, '']),
    );
  }

  bloques.push(
    '## Contacto',
    '',
    `- Correo: ${ORG.email}`,
    `- Teléfono: ${ORG.telefono}`,
    ...SEDES.map((s) => `- ${s.nombre}: ${direccionLegible(s)}`),
    '',
    `## Fuentes`,
    '',
    `- [Sitio completo](${url('/')})`,
    `- [Sitemap](${url('/sitemap-index.xml')})`,
    '',
  );

  return new Response(bloques.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
