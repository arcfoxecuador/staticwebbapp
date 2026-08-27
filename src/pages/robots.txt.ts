/* ── robots.txt ────────────────────────────────────────────────────────────
   Generado, no estático, y la razón es concreta: `RUTAS_NO_INDEXABLES` tiene que
   producir sus tres efectos —`noindex`, fuera del sitemap y `Disallow`— desde UNA
   sola lista. Con un `public/robots.txt` a mano, el tercero se olvida siempre.

   LOS RASTREADORES DE IA ESTÁN PERMITIDOS EXPLÍCITAMENTE, y es una decisión que
   conviene entender antes de cambiarla:

     · GPTBot, ClaudeBot, PerplexityBot y compañía son los que alimentan las
       respuestas de ChatGPT, Claude y Perplexity. Bloquearlos no protege nada
       —el contenido es público— y garantiza no aparecer citado cuando alguien
       pregunta por este sector.
     · Los que rastrean para ENTRENAR y los que rastrean para RESPONDER EN VIVO
       son distintos, y algunos proveedores usan agentes separados justo para que
       se puedan tratar distinto. Si el cliente no quiere que su contenido entrene
       modelos pero sí quiere ser citado, se bloquea el de entrenamiento y se deja
       el de recuperación. Esa decisión es del cliente, no de quien programa.
     · La lista se escribe explícita, con `Allow: /`, en vez de confiar en el
       comodín. No cambia el comportamiento, pero DOCUMENTA la decisión: dentro de
       un año, nadie va a saber si el silencio era deliberado.

   `Crawl-delay` no se pone: Google lo ignora y en los demás sólo consigue que un
   sitio estático de cuarenta páginas tarde días en rastrearse. */
import type { APIRoute } from 'astro';
import { RUTAS_NO_INDEXABLES, SITE } from '../lib/rutas.mjs';

/* Los agentes que responden preguntas de usuarios en tiempo real. Estos son los
   que deciden si esta web se cita en una respuesta generada. */
const IA_QUE_CITA = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent'];

export const GET: APIRoute = () => {
  const bloqueos = RUTAS_NO_INDEXABLES.map((r) => `Disallow: ${r}`).join('\n');

  const cuerpo = `# ${new URL(SITE).hostname}

User-agent: *
Allow: /
${bloqueos}

${IA_QUE_CITA.map((agente) => `User-agent: ${agente}\nAllow: /\n${bloqueos}`).join('\n\n')}

Sitemap: ${SITE}/sitemap-index.xml
`;

  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      /* Un robots.txt cacheado un año es un robots.txt que no se puede corregir.
         Una hora deja margen para arreglar un bloqueo accidental el mismo día. */
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
