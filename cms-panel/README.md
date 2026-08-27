# Panel CMS — ARCFOX

El mismo panel de IIDEA y Alpha Aviation: git como base, Express, agentes.
En un sitio del kit lee `KIT.md`. No es WordPress ni Storyblok.

Panel web (subdominio, ej. `cms.arcfox.com.ec`) para que el equipo
**cree artículos** y **pida cambios con prompts**. Cada acción commitea al
repo. En el kit, el día uno están Entradas, Medios, Asistente y Marca.

## Las cuatro pantallas de IA (lo que ve el equipo)

En el menú lateral viven juntas bajo el grupo **Inteligencia artificial**, porque
son piezas del mismo sistema y no ajustes sueltos:

| Pantalla | Para qué sirve | Quién entra |
|---|---|---|
| **Asistente IA** (`#agent`) | Pedir un cambio escribiéndolo en español. Se publica al terminar. | Todos |
| **Blogs automáticos** (`#automation`) | Programar que la IA escriba entradas sola: cuándo, sobre qué y con qué estilo. | Solo admin |
| **Cola de revisión** (`#review`) | Aprobar o rechazar lo que escribió la IA. **Nada se publica sin pasar por aquí.** | Todos |
| **Marca (guía IA)** (`#brand`) | La ficha que todos los agentes leen antes de redactar: voz, público, reglas. | Solo admin |

Dos reglas que el panel repite en pantalla porque son las que generan dudas:

1. El **Asistente IA publica directo** (el aviso amarillo bajo el cuadro de texto
   lo dice). Los **blogs automáticos NO**: quedan en la cola de revisión.
2. Si un texto de la IA suena mal de forma repetida, se corrige en **Marca**, no
   repitiendo la instrucción en cada pedido.

## Arquitectura

```
Equipo (login Microsoft 365)
        │  prompt
        ▼
  Panel (Express)  ──►  Router (Haiku)  ──►  ┌─ Agente de Blogs ─┐
        │                                     │   herramienta:     │
        │                                     │   publish_blog_post│──┐
        │                                     └────────────────────┘  │
        │                                     ┌─ Agente de Diseño ─┐   │ commit + PR
        │                                     │   herramientas:    │   │ (Git Data API)
        │                                     │   get_current_theme│──┤
        │                                     │   apply_theme      │   │
        │                                     └────────────────────┘   ▼
        └──────────── progreso SSE ◄───────────────────────  GitHub repo
                                                                   │ push
                                                                   ▼
                                                         Vercel/Amplify → preview
```

**Idea central:** los agentes no reescriben componentes. Trabajan sobre dos
superficies seguras y acotadas:

- **Blog** → un archivo Markdown nuevo en `astro-web/src/content/blog/*.md`
  (validado por el esquema de Astro Content Collections).
- **Diseño** → el archivo `astro-web/src/config/theme.json` (validado contra un
  esquema Zod estricto antes de commitear).

Si el agente produce algo inválido, se rechaza y nunca llega al sitio.

## Estructura

```
src/
  config.ts          Carga de variables de entorno
  models.ts          Modelo por agente (ver recomendación abajo)
  auth.ts            Login con Microsoft 365 (dominio restringido)
  server.ts          Express: sesión, rutas, endpoint SSE del agente
  lib/
    anthropic.ts     Cliente de Claude
    github.ts        Commit multi-archivo + apertura de PR (Git Data API)
    images.ts        Generación de imágenes por IA (proveedor configurable)
    markdown.ts      Construcción del Markdown del blog + slug
    themeSchema.ts   Esquema Zod del tema (espeja theme.schema.json de Astro)
  agents/
    context.ts       Contexto compartido por las herramientas (rama + progreso)
    blogTools.ts     Herramienta del Agente de Blogs
    designTools.ts   Herramientas del Agente de Diseño
    run.ts           Prompts de sistema + ejecución + router
web/
  login.html         Pantalla de acceso
  editor.html        Administración (estilo WordPress): Escritorio, Entradas,
                     Medios, Páginas, Carreras, Apariencia y las cuatro
                     pantallas de IA (ver la tabla de arriba)
  assets/            Frontend en módulos ES (sin empaquetador, ver ADR-2)
    editor.js        Punto de entrada: solo el arranque
    core/            Cimientos: dom, api, state, router, ui, sidebar, palette…
    views/           Una pantalla por fichero: dashboard, media, settings, agent…
    blocks/          Editor visual de páginas: canvas, paint, fields, ops, save…
    styles.css       Estilos del panel
```

## Puesta en marcha

```bash
cp .env.example .env     # y rellena los valores
npm install
npm run dev              # desarrollo (http://localhost:4321)
npm run build && npm start  # producción
```

Requiere **Node 18+**.

### Secretos necesarios (cuando lo despleguemos)

1. **`ANTHROPIC_API_KEY`** — consola de Anthropic.
2. **GitHub** — `GITHUB_TOKEN` (GitHub App o fine-grained PAT) con permisos
   *Contents: Read and write* y *Pull requests: Read and write* sobre el repo.
3. **Microsoft 365 (Entra ID)** — `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
   (app tipo "Web", con `…/auth/microsoft/callback` como redirect URI),
   `MICROSOFT_TENANT_ID` (Directory/tenant ID de IIDEA, u `organizations`) y
   `ALLOWED_EMAIL_DOMAIN=iidea.edu.ec` (opcional: `ALLOWED_EMAILS` para restringir
   a una lista de correos).
4. *(Opcional)* **Imágenes IA** — `IMAGE_PROVIDER=openai` + `OPENAI_API_KEY`
   (Claude no genera imágenes). Si lo dejas en `none`, el equipo sube imágenes
   manualmente y el agente las usa por ruta/URL.

## Recomendación de modelos por agente

Configurable en `src/models.ts` o por entorno.

| Agente | Modelo recomendado | Por qué |
|---|---|---|
| **Diseño** | `claude-opus-4-8` · effort **high** | Edita `theme.json` con precisión absoluta (hex válidos, esquema estricto) y toma decisiones estéticas. Es la cara visible del sitio: aquí la calidad pesa más que el costo. |
| **Blogs** | `claude-opus-4-8` (o `claude-sonnet-4-6`) | Redacta con voz institucional y buen SEO. Opus 4.8 da la mejor calidad; **Sonnet 4.6** es el equilibrio costo/calidad si publicas mucho volumen. |
| **Router** | `claude-haiku-4-5` | Solo clasifica "blog" vs "diseño". Tarea trivial y de baja latencia; no necesita un modelo grande. |

Todos usan *adaptive thinking*. El costo por acción es bajo (un blog o un cambio
de tema son pocas llamadas), así que el valor por defecto es Opus 4.8 en ambos
agentes y solo bajaría Blogs a Sonnet si el volumen lo justifica.
