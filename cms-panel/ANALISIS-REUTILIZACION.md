# Análisis del CMS + Agente — estructura, reutilización y mejoras

Auditoría de las dos piezas con foco en **reutilizar para otros clientes** (solo el
CMS, solo el agente, o ambos). Ambos proyectos compilan hoy.

## TL;DR
- Arquitectura **bien separada**: el **sitio/CMS** (`astro-web`, motor de bloques) y el
  **panel/agente** (`cms-panel`, editor estilo WordPress + agente IA).
- **Reutilizable como motor ≈ 40–50%**; el resto es contenido/diseño/datos de IIDEA.
- **Problema #1**: el **esquema de bloques está definido 3 veces** (Zod del sitio,
  catálogo del panel, formularios del panel) y se sincroniza **a mano**. Igual con
  carreras (2 veces) y las listas de páginas/carreras (hardcodeadas en ambos lados).
  Ya hay descuadres reales (ej. `hero.variant` = `brand|dark` en el panel vs
  `brand|light` en el sitio).
- **Separabilidad ya buena**: el editor funciona **sin** la API de Anthropic (solo CMS);
  el agente necesita `ANTHROPIC_API_KEY` + `GITHUB_TOKEN`; comparten `github.ts` y los catálogos.

---

## 1. Cómo está estructurado

### A. Sitio/CMS — `astro-web` (el motor de contenido)
- **Bloques**: `src/content/blocks.ts` (Zod, **15 tipos**) = fuente de verdad.
  `components/blocks/BlockRenderer.astro` mapea `_type` → componente. Página = JSON con
  lista ordenada de bloques.
- **Colecciones** (`src/content/config.ts`): `pages` (JSON), `careers` (6 JSON), `blog` (markdown).
- **Tema**: `src/config/theme.json` (5 colores) → variables CSS inyectadas en `<html>`
  (`theme.ts`). Paleta de marca en `tailwind.config.mjs`.
- **SEO** (rama reciente): JSON-LD (`lib/schema.js` + `Schema.astro`), sitemap, `llms.txt`,
  headers de seguridad.
- Git-as-database, estático → Vercel.

### B. Panel/Agente — `cms-panel` (el editor + el cerebro)
- **Express + Microsoft OAuth** (passport), sesiones in-memory.
- **Editor visual WP**: `/api/forms` entrega el esquema, `editor.js` genera los formularios.
  Escritorio / Páginas / Carreras / Asistente IA.
- **Agente**: `agents/run.ts` (router + prompts + `toolRunner` del SDK). Tools: blog, design,
  page, career. Commits vía `lib/github.ts` (Git Data API), publicación directa.
- **Catálogos**: `lib/pageBlocks.ts` (BLOCK_CATALOG + PAGES), `lib/blockForms.ts` (FORM_SCHEMA),
  `lib/careersForm.ts` (CAREER_FORM + CAREERS).

---

## 2. Reutilizable (motor) vs específico de IIDEA

| Motor reutilizable | Específico de IIDEA (cambiar por cliente) |
|---|---|
| Sistema de bloques + `BlockRenderer` | `src/data.js` (CONTACT, SOCIAL, ADDRESS, NAV) |
| Motor de tema (`theme.json`/`theme.ts`) | `Footer.astro`, `Header.astro`, `LeadForm.astro` |
| Builders SEO (`schema.js`) | Esquema de `careers` (regulación EC: resolución, malla, nivel) |
| `lib/github.ts` (lectura/escritura) | Categorías de blog (enum) |
| Auth + arquitectura REST del editor | Branding: gradiente en `tailwind.config.mjs`, `{wordmark}` |
| Framework del agente (`toolRunner`) | System prompts del agente (texto IIDEA) |
| | Listas `PAGES` / `CAREERS` (hardcodeadas) y rutas de páginas |

**Para otro cliente cambiarías:** `data.js` → `institution.json`; `theme.json` + paleta Tailwind;
esquema de `careers` (o renombrarlo a "programas/productos"); categorías de blog; `Footer/Header/LeadForm`;
los system prompts; las listas de páginas/carreras.

---

## 3. Puntos a mejorar (priorizados)

### 🔴 Críticos
1. **Duplicación de esquema** — bloques en 3 lugares, carreras en 2, listas hardcodeadas en ambos.
   *Riesgo:* descuadres → el panel valida distinto al sitio → se puede publicar algo que rompe el build.
   *Fix:* **fuente única** — generar el catálogo y los formularios del panel a partir del Zod de `blocks.ts`
   (o un paquete/JSON compartido). Externalizar `PAGES`/`CAREERS` (derivarlas del repo).
2. **Prompts del agente hardcodeados a IIDEA** (`run.ts`).
   *Fix:* parametrizar `{orgName, orgDescription, location, style}` desde config.
3. **`SESSION_SECRET` por defecto + sesiones in-memory.**
   *Fix:* fallar en producción si es el valor por defecto; store persistente si escalas a varias instancias.

### 🟠 Altos
4. **Sin tests** (ni de validación de bloques, ni del agente).
5. **Validación floja en el panel** (la real solo ocurre en el build de Vercel).
   *Fix:* reusar el mismo Zod del sitio para validar en el panel antes de commitear.
6. **Publicación directa por-operación del agente** → muchos commits/rebuilds en una sola tarea.
   *Fix:* opción de agrupar cambios (un commit por tarea) o PR opcional.
7. **Gradiente y `SITE_URL` duplicados** (`tailwind.config.mjs` vs `theme.ts`; SITE_URL en 3 sitios).

### 🟡 Medios
8. `data.js` sin API (edición manual, propenso a inconsistencias).
9. **Token de GitHub podría filtrarse en logs de error** → enmascararlo.
10. `Footer`/`LeadForm` acoplados a `getCareers()` → frágil si cambia el esquema de carreras.

---

## 4. Estrategia para reutilizar con otros clientes

Conviértelo en un **producto de 3 capas**:

1. **Motor (compartido, agnóstico):** esquema de bloques (fuente única) + renderer + motor de
   tema + el panel (auth, REST, runner del agente, `github.ts`).
2. **Config por cliente (una sola fuente):** un archivo define catálogo de bloques + tema +
   branding + prompts + repo + colecciones. **Onboarding de cliente = llenar esta config.**
3. **Diseño por cliente:** las clases Tailwind de los componentes de bloque (el "look").

**Cómo ofrecer los 3 modos:**
- **Solo CMS:** editor + motor del sitio, sin agente (sin llave de Anthropic). *Ya funciona así.*
- **Solo agente:** el agente + `github.ts` + catálogos, apuntando a un sitio existente que siga
  la convención de bloques. *Necesita los catálogos.*
- **Ambos:** como hoy.

**La jugada de mayor impacto:** definir el **esquema de bloques una sola vez**. Mata el bug de
sincronización **y** hace real el "cliente nuevo = config nueva".

---

## 5. Plan sugerido
- **Quick wins (~1 día):** validar `SESSION_SECRET`, enmascarar token, unificar `SITE_URL`/gradiente,
  parametrizar prompts con `{orgName}` + un `client.config.json`.
- **Medio (~2–3 días):** fuente única del esquema de bloques (generar catálogo+forms desde `blocks.ts`),
  externalizar `PAGES`/`CAREERS`, `institution.json`.
- **Mayor (~1 semana):** tests, opción PR/batch en el agente, config multi-tenant.
