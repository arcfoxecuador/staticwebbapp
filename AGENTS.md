# AGENTS.md — ARCFOX

Sitio público de **ARCFOX Ecuador**. Astro estático, sin backend.
Generado con `~/.cursor/astro-kit/`; la skill **`astro-kit`** tiene el detalle de
cada capa y **este archivo manda sobre ella** — aquí viven las decisiones de ESTE
cliente.

Rellena las secciones marcadas con «pendiente» a medida que el proyecto avanza. Un
`AGENTS.md` que no se actualiza es peor que ninguno: da contexto falso con
apariencia de autoridad.

---

## Lo mínimo para empezar

```bash
npm install && npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor en `http://localhost:4321`. **`dev` no minifica**, así que hay bugs de producción invisibles aquí |
| `npm run build` | Compila a `dist/` |
| `npm run build:vercel` | `astro build` + poda del teaser si `SOLO_LANDING=1` |
| `npm run check` | `astro check` + build + los tres verificadores de `dist/`. **Es la puerta.** |
| `npm run preview` | Sirve `dist/` compilado |
| `npm run imagenes` | Procesa `imagenes-entrada/` → `src/assets/` en WebP, sin EXIF |
| `npm run og` | Genera la imagen de compartición provisional |
| `npm --prefix cms-panel run dev` | Panel CMS en `http://localhost:4322` |

Node ≥ 22.12 (`.nvmrc` fija 22). **Seis dependencias de producción** —astro,
tailwindcss, @tailwindcss/vite, @astrojs/sitemap y las dos tipografías—. Añadir una
séptima es una decisión, no un trámite: el argumento está escrito en
`src/lib/ui.ts`.

---

## Mapa

```
astro.config.mjs      sitio, sitemap y la minificación de CSS APAGADA a propósito
vercel.json           cabeceras de seguridad, cache inmutable de /_astro, cleanUrls
cms-panel/            el CMS (git, Express, agentes). No es Storyblok.
src/config/brand.json guía de los agentes; el build del sitio no la lee
src/
├── lib/
│   ├── rutas.mjs         SITE + RUTAS_NO_INDEXABLES. .mjs para que astro.config lo importe
│   ├── site.ts           LA FIRMA: ORG, SEDES, NAV, CTA, METRICAS, PASOS, PILARES, FAQ…
│   ├── schema.ts         constructores de JSON-LD (@graph único por página)
│   ├── contenido.ts      la capa de datos: interruptor ORIGEN (colecciones | cms)
│   ├── imagenes.ts       de dónde sale una imagen: CMS → src/assets → nada
│   └── ui.ts             variantes() — cva reescrito en 40 líneas, sin dependencia
├── content.config.ts     colecciones zod: servicios · articulos · equipo
├── content/              los .md que las alimentan
├── layouts/              Base.astro · Teaser.astro (landing de expectativa)
├── components/
│   ├── seo/              BaseHead · Analitica · BannerCookies
│   ├── layout/           Header · Footer · BarraAccion
│   ├── ui/               Boton · Chip · Figura · Marca · Asistente
│   └── bloques/          14 bloques de composición
├── pages/                16 archivos
├── styles/
│   ├── global.css        tokens @theme + 5 utilidades + capa base
│   └── motion.css        todo el movimiento, en CSS puro con animation-timeline
└── assets/               imágenes que Astro optimiza (ver su LEEME.md)
public/                   favicon, marca/, og/
scripts/                  cuatro verificadores · pipeline de imágenes · og · dist-landing.mjs
                          hoja-protocolo.gs NO se ejecuta aquí: se pega en Google Apps Script
```

### Las páginas

| Ruta | Archivo |
| --- | --- |
| `/` | `pages/index.astro` |
| `/modelos` | `pages/modelos/index.astro` |
| `/modelos/{slug}` | `pages/modelos/[slug].astro` |
| `/nosotros` | `pages/nosotros.astro` |
| `/concesionarios` | `pages/concesionarios.astro` |
| `/test-drive` | `pages/test-drive.astro` |
| `/postventa` | `pages/postventa.astro` — `noindex`, fuera del menú; URL viva para revisar |
| `/bitacora` | `pages/bitacora/index.astro` |
| `/bitacora/{slug}` | `pages/bitacora/[slug].astro` |
| `/contacto` | `pages/contacto.astro` |
| `/landing` | `pages/landing.astro` — `noindex` en arcfox.com.ec; home de followdafox.com |
| `/lanzamiento` | `pages/lanzamiento.astro` — `noindex` en arcfox.com.ec; home del proyecto `arcfox-lanzamiento` |
| `/gracias` | `pages/gracias.astro` — `noindex` |
| `/404` | `pages/404.astro` — `noindex` |
| `/robots.txt` · `/llms.txt` | generados en construcción |

---

## Reglas que no se negocian

1. **Todo en español**: componentes (`Boton`, `Seccion`), props (`titulo`, `bajada`,
   `tono`), clases propias (`.revela`, `.traza`, `.medida`), comentarios y commits.
2. **Ningún dato se escribe dos veces.** Correo, teléfono, sedes, navegación y CTA
   salen de `src/lib/site.ts`. Un correo repetido en cabecera, pie, contacto y
   JSON-LD son cuatro sitios que cambian a la vez y el cuarto siempre se olvida.
3. **La paleta está cerrada.** Nueve tokens de sitio en `global.css`, más dos de
   campaña (`campana-fria`, `campana-calida`) que sólo usa `.puerta`. Ningún
   hexadecimal suelto. `acento` queda **reservado al CTA primario**: si aparece
   en otro sitio, es un error.
4. **Cero sombras**, con la única excepción del lanzador flotante del asistente. La
   elevación se hace con el escalón de luminancia entre `fondo` y `superficie`.
5. **El motion es CSS puro** con `animation-timeline: view()`. Sin observers y sin
   JavaScript. Y **ningún ancestro de un elemento animado puede llevar
   `overflow: hidden`** → usa `overflow: clip`.
6. **No añadas dependencias sin justificarlo por escrito** en el código.
7. **Verifica en `dist/`, no en `dev`.** Y verificar no es hacer grep de que el texto
   está: un `<script>` escrito dentro de `{condición && (…)}` se parsea como JSX y
   llega al HTML **como una cadena** que nunca se ejecuta. `npm run verificar` lo
   detecta, y además comprueba que ningún enlace interno apunta a una página
   inexistente. `npm run check` tiene que salir con **0 errores, 0 avisos y 0
   pistas** — un aviso tolerado tapa al siguiente.
8. **Los comentarios explican POR QUÉ, no qué.** Es el estilo del repositorio y lo
   que lo hace mantenible. Consérvalo.
9. **El CMS es `cms-panel/`** (git como base, el de IIDEA/Alpha). No enchufes
   Storyblok ni gires `ORIGEN`. Arranque: `npm --prefix cms-panel run dev` en
   `http://localhost:4322`. Detalle en la skill, `reference/cms.md`.

---

## Estado del proyecto

- **Titular de portada**: `PORTADA.titular` arranca con el tagline. Construye, pero
  es lo primero que hay que reescribir — un `<h1>` es una idea de seis a diez
  palabras, no la frase citable (esa es `PORTADA.bajada`).
- **Contenido**: `METRICAS`, `PASOS`, `PILARES` y `FAQ` de `site.ts` — *pendiente*.
  Sus bloques no se pintan mientras estén vacíos.
- **Colecciones**: los tres `ejemplo.md` de `src/content/` vienen **despublicados**
  (`publico: false` / `borrador: true`). Bórralos al entrar contenido real.
- **Logo**: `public/marca/logo.svg` es un placeholder tipográfico. `schema.ts` lo
  referencia, así que el archivo tiene que existir — *pendiente el real*.
- **Imagen de compartición**: `npm run og` genera un provisional. *Pendiente el
  diseño real* (1200×630, mismo nombre de archivo).
- **Fotografía**: *pendiente*. Todo lo que entre generado se queda declarado como
  tal (`portadaGenerada: true`) hasta que llegue una fotografía real.
- **Formulario**: `PUBLIC_FORMULARIO_ENDPOINT` — *pendiente*. Sin él, el bloque no
  se pinta y `/contacto` muestra las vías directas.
- **Analítica**: `PUBLIC_GA4_ID` / `PUBLIC_CLARITY_ID` — *pendiente*. Sin ninguno no
  se monta ni el script ni el banner de cookies.
- **Asistente**: `ASISTENTE.activo` en `false` en el sitio. El chat de la teaser
  lo enciende `PUBLIC_IOZEN_BOT` vía `TEASER.iozen` (popup de ioZen v2).
- **Landing de expectativa**: `/landing` (layout `Teaser.astro`). Fecha y
  contador viven en `TEASER`; titular, bajada y CTA salen de `CAMPAÑA` (los
  mismos que la puerta). Lanzamiento: 15 de septiembre de 2026, medianoche
  Ecuador (`2026-09-15T05:00:00.000Z`). Dominio propio **followdafox.com**,
  segundo proyecto Vercel (`followdafox`). Variables: `SOLO_LANDING=1` poda
  `dist/` a esa página; `SITE_URL=https://followdafox.com` fija canonical y
  sitemap; `PUBLIC_IOZEN_BOT` (id `m4zdh`) pinta el chat como popup. Sin el
  bot no se monta y quedan las redes. `tsconfig.json` excluye `cms-panel/`
  para que `astro check` no tipe el panel.
- **Protocolo de la puerta**: las diez preguntas de `ProtocoloComando.astro`
  terminan en una **hoja de cálculo de Google** por POST a una implementación
  web de Apps Script. El script a pegar en Google es `scripts/hoja-protocolo.gs`
  —lleva dentro las instrucciones— y `CAMPOS` de ese archivo tiene que seguir
  siendo la misma lista que las claves del protocolo: `npm run verificar` lo
  comprueba y falla si se separan. Variables: `PUBLIC_PROTOCOLO_ENDPOINT` (URL
  `…/exec`) y `PUBLIC_PROTOCOLO_TOKEN`, **en Environment de los dos proyectos que
  sirven la puerta** (`arcfox-lanzamiento` y `followdafox`), no sólo en uno. Sin
  endpoint el flujo funciona pero dice «SIN DESTINO» en vez de «registrado». La
  validación de nombre, correo, WhatsApp e Instagram vive en
  `src/lib/protocolo.mjs` —normaliza además de validar— y se prueba en
  `scripts/verificar-protocolo.mjs`.
- **Puerta de lanzamiento**: `/lanzamiento` (mismo layout `Teaser.astro`). Copy
  en `CAMPAÑA` / `LANZAMIENTO` de `site.ts` — ceja, titular y CTA «Continuar»
  de la maqueta. CONTINUAR abre el protocolo. Tercer proyecto Vercel
  (`arcfox-lanzamiento`). Variables: `SOLO_LANZAMIENTO=1` poda `dist/` a esa
  página; `SITE_URL` fija canonical. No combinar con `SOLO_LANDING` en el mismo
  build. Fuera de `NAV`; `noindex` en arcfox.com.ec.
- **Postventa**: fuera de `NAV` y en `RUTAS_NO_INDEXABLES` hasta que haya red
  de talleres. La URL `/postventa` sigue viva para revisar; no aparece en
  cabecera, pie, 404, sitemap ni robots.
- **CMS**: el panel está en `cms-panel/`. `ORIGEN` en `'colecciones'`. No es
  Storyblok. Quién publica lo deciden las variables de `cms-panel/.env`.
- **Textos legales**: *pendiente*. `AVISO_LEGAL` y las dos rutas de `LEGAL`
  (privacidad, términos) están vacíos, así que ni el aviso ni los enlaces del pie
  se pintan. No los redacta quien programa. **`LEGAL.privacidad` es requisito para
  encender la analítica**: sin ella el banner de cookies pide un consentimiento que
  el visitante no puede informar.
- **`overrides.satteri` en `package.json` es un parche, no una decisión.** El
  procesador de markdown que trae Astro depende de `satteri`, cuya versión 0.10.4
  se publicó **sin el binario nativo de macOS ARM** (`@bruits/satteri-darwin-arm64`
  llega sólo hasta 0.10.3). Sin el override, `astro check` y `astro build` mueren
  con «Cannot find native binding» en cuanto tocan una colección de markdown, y el
  mensaje culpa a npm de un problema que no es de npm. **Retíralo** cuando
  `npm view @bruits/satteri-darwin-arm64 versions` liste la versión que pide el
  Astro instalado; hasta entonces, quitarlo rompe la construcción en cualquier Mac
  con Apple Silicon.

---

## Contexto

- **Cliente:** ARCFOX · **Dominio:** arcfox.com.ec · **Sede:** Quito, Ecuador
- **Teaser:** followdafox.com — proyecto Vercel `followdafox`
  (`https://followdafox.vercel.app`). El dominio se añade en el panel. Para que
  cada deploy futuro pode `dist/`, `SOLO_LANDING=1` y
  `SITE_URL=https://followdafox.com` tienen que vivir en Environment del
  proyecto teaser, no en el de `arcfox`.
- **Puerta:** proyecto Vercel `arcfox-lanzamiento`
  (`https://arcfox-lanzamiento.vercel.app`). `SOLO_LANZAMIENTO=1` y `SITE_URL`
  viven en Environment de ESE proyecto. Un push a `main` reconstruye los tres
  si están ligados al mismo repo.
- **Descripción oficial** (la que va al JSON-LD y a `llms.txt`):
  «ARCFOX es la marca de vehículos 100% eléctricos de BAIC que llega a Ecuador con SUV de diseño, autonomía y recarga para uso diario.»
- **El primer commit es el andamiaje del kit, no trabajo de este proyecto.** Por eso
  existe: `git diff <ese commit>` responde «¿esto lo escribimos nosotros o venía de
  la plantilla?», que es justo la pregunta que aparece al revisar el sitio antes de
  publicarlo. No lo aplastes con un `--amend`.
