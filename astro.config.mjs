// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { SITE, RUTAS_NO_INDEXABLES, rutasDespublicadas } from './src/lib/rutas.mjs';

/* Se calcula UNA vez, al arrancar la configuración, y no dentro del filtro: el
   filtro corre por cada página del sitio y leer el directorio de contenido en
   cada llamada sería releer los mismos archivos cuarenta veces. */
const FUERA_DEL_SITEMAP = [...RUTAS_NO_INDEXABLES, ...rutasDespublicadas()];

export default defineConfig({
  site: SITE,

  /* `never` + `format: 'file'` produce URLs sin barra final y sin `/index.html`
     por medio. Eso exige que el hosting resuelva `/pagina` → `pagina.html`:
       · Vercel  → `"cleanUrls": true` en vercel.json (ya viene puesto)
       · Netlify → lo hace por defecto
       · Apache / SiteGround → hace falta el .htaccess de docs/02
     Si el hosting no puede reescribir, cambia a `format: 'directory'`. Es la
     única decisión de esta config que depende de dónde se publique. */
  trailingSlash: 'never',
  build: { format: 'file' },

  // Sin backend: el mismo `dist/` sirve en cualquier hosting estático.
  output: 'static',

  /* Autoriza el CDN de un CMS para que Astro pueda optimizar lo que suba un
     editor. Vacío mientras el contenido viva en `src/content/`; al enchufar un
     CMS se añade su host aquí (p. ej. 'a.storyblok.com', 'cdn.sanity.io') y
     Astro descargará la imagen en construcción y la emitirá en `/_astro`, con
     el mismo cache inmutable del resto. Es `domains` y no `remotePatterns` a
     propósito: un patrón admite subdominios que nadie ha decidido autorizar. */
  image: { domains: [] },

  vite: {
    plugins: [tailwindcss()],

    build: {
      /* ── POR QUÉ ESTÁ APAGADA LA MINIFICACIÓN DE CSS ──────────────────────
         El minificador pliega `animation-timeline` dentro del atajo
         `animation`, y eso produce CSS inválido. Sale así:

             .revela{animation:linear both revelar view()}

         cuando el fuente dice `animation: revelar linear both` y, en la línea
         siguiente, `animation-timeline: view()`.

         `animation-timeline` NO se puede declarar dentro del atajo: el atajo lo
         RESETEA a `auto`, pero no lo acepta como valor. Comprobado en Chrome:

             CSS.supports('animation', 'linear both k view()')  → false
             CSS.supports('animation-timeline', 'view()')       → true

         Sobre un elemento con la forma plegada, `animationName` computa a
         `none`: el navegador descarta la declaración ENTERA. No es que la
         animación se vea mal — es que no existe.

         En el proyecto donde se descubrió, esto mató el sistema de motion
         completo en producción durante semanas, y nadie lo vio porque
         `astro dev` NO minifica y en local se veía perfecto.

         Cuesta ~15 kB en crudo, unos 3 kB tras gzip. Si algún día quieres
         recuperar la minificación, hay dos caminos y ninguno está verificado:
           · `animation-timeline: view() !important` en cada regla — un longhand
             con !important no se pliega dentro de un atajo que no lo lleva;
           · o subir el minificador, si ya lo corrigieron aguas arriba.
         Los dos exigen comprobar el `dist/` DESPUÉS de compilar:
         `grep 'animation:.*view()' dist/_astro/*.css` tiene que no devolver
         nada. Si devuelve algo, el bug ha vuelto. */
      cssMinify: false,
    },
  },

  integrations: [
    sitemap({
      /* Fuera las páginas de utilidad Y el contenido despublicado. Las dos cosas
         llevan `noindex` en el <head>, y una URL en el sitemap que pide no ser
         indexada es una contradicción que Search Console reporta como error. */
      filter: (page) => !FUERA_DEL_SITEMAP.some((r) => page.includes(r)),
      changefreq: 'monthly',
      lastmod: new Date(),
    }),
  ],
});
