# Diseño — CMS modular por bloques (Keystatic + Agente IA)

> Documento de diseño para convertir el sitio Astro de IIDEA en un CMS por bloques
> editable tanto desde un editor visual (Keystatic) como por prompts (agente IA).
> Basado en el inventario real de las 11 páginas del sitio.

## 0. Principio rector

Hoy el único patrón seguro probado es el **blog**: el agente solo escribe archivos `.md`
validados por Zod; nunca toca `.astro`, por eso no puede romper el sitio. **Replicamos ese
patrón para todas las páginas**: el contenido editable vive en archivos de datos validados por
esquema; los `.astro` se vuelven *renderizadores tontos* que iteran sobre una lista de bloques.
Ni el editor ni el agente escriben `.astro`. **El esquema ES la barrera.**

## 1. Librería canónica de bloques (15 tipos)

### Presentación (texto/CTA — 80% del valor, bajo riesgo)
- **`hero`** — Encabezado de página (eyebrow, heading, description, CTAs, image, videoURL, showSeal).
- **`richTextSplit`** — Texto con imágenes laterales (eyebrow, heading, body richtext, cta, imágenes).
- **`ctaBanner`** — Banda de conversión final (heading, description, botones, variant light/dark). Cubre 6 secciones.
- **`infoBox`** — Callout informativo (label, text).
- **`richText`** — **Bloque de texto libre insertable en cualquier posición** (cubre "agregar texto donde sea").

### Listas repetibles (datos estructurados)
- **`stats`** — Métricas en cards (items[{value,label}], highlight).
- **`featureGrid`** — Grid de tarjetas título+descripción+icono (el más reutilizado). columns 2/3/4, items[].
- **`stepsProcess`** — Pasos numerados (numeración automática).
- **`faq`** — Acordeón de preguntas (items[{question,answer}]).
- **`featureList`** — Tabla concepto/valor (rows[], note).
- **`numberedList`** — Lista numerada simple.
- **`tagGrid`** — Chips/etiquetas en grupos.

### Referencia (consumen la fuente de verdad, no la duplican)
- **`careerShowcase`** — Carrusel o grid de carreras. **layout carousel/grid; imágenes y datos vienen de `careers`.**
- **`newsGrid`** — Noticias desde la colección blog (limit, showFeatured).
- **`pricingGrid`** — Aranceles derivados de `careers`.

### Islas complejas (se exponen como bloque de configuración, NO se reescriben)
- **`leadForm`** — Formulario → WhatsApp. Solo textos editables; la lógica JS queda intacta.
- **`accountabilityTabs`** — Pestañas de rendición de cuentas. Datos estructurados, componente intacto.

> **Carrusel (pedido del cliente):** las imágenes son una **lista repetible** dentro del bloque
> → agregar/eliminar/reordenar imágenes desde Keystatic (array) y desde el agente (tools).

## 2. Página = lista ordenada de bloques

Cada página editable es un archivo de datos con un array `blocks`. El `.astro` solo itera y
renderiza. **Reordenar** = mover el elemento en el array (arrastrar en Keystatic / `move_block`
en el agente). **Mostrar/ocultar** = campo `hidden` por bloque (oculta sin borrar).

### Singletons globales (no se reordenan)
- **Header** → nav[], CTA, teléfono. (El menú mobile/dropdown NO se expone: es comportamiento.)
- **Footer** → descripción, links, redes, newsletter.
- **Site/Contacto** → CONTACT, SOCIAL, ADDRESS, etc. (única fuente de verdad).
- **Tema** → ya existe (`theme.json`).

## 3. Mapeo a Keystatic (modo local / Git)

El campo clave es **`fields.blocks`** (array discriminado): da al editor exactamente lo pedido —
**arrastrar para reordenar, botón "+" que solo ofrece los tipos del catálogo, ocultar, editar
campos tipados.** Sin acceso a CSS ni clases. Imágenes con `fields.image`, listas con `fields.array`.

## 4. Tools del agente (`pageTools.ts`, snake_case como las existentes)

| Tool | Qué hace |
|---|---|
| `list_pages` | Páginas y singletons editables |
| `list_blocks(page)` | Bloques con índice, tipo, resumen, hidden (llamar antes de mutar) |
| `get_block(page, index)` | Bloque completo |
| `add_block(page, _type, atIndex?, data)` | Inserta bloque del catálogo (valida esquema) |
| `edit_block(page, index, patch)` | Modifica campos (rechaza desconocidos) |
| `move_block(page, index, to)` | Reordena: "up" / "down" / número |
| `toggle_block(page, index, hidden)` | Muestra/oculta |
| `remove_block(page, index)` | Elimina (requiere confirmación) |
| `edit_global(singleton, patch)` | Header/footer/site |
| `get_schema(_type?)` | Esquema de un bloque (para no inventar campos) |

El agente **no tiene acceso libre al filesystem de `.astro`**: solo estas tools de datos. Cada
cambio → rama + PR (flujo actual), nunca push directo a `main`.

## 5. Barreras de seguridad
1. **Nada de HTML/CSS libre** — solo bloques predefinidos y campos tipados. Sin color hex por bloque (colores del tema/`variant`).
2. **Validación triple** — Keystatic al guardar, Zod en el build de Astro, la tool del agente.
3. **richtext controlado** — set mínimo de marcas, no editor abierto.
4. **Islas encapsuladas** — LeadForm, CareerCarousel, header mobile, tabs: JS intacto.
5. **PRs con preview obligatorio** — nadie publica sin ver cómo queda; reversible.
6. **Datos derivados solo-lectura** — carreras/aranceles/noticias desde su fuente, sin duplicar.

## 6. Plan por fases (esfuerzo honesto)

> Lo más grande del proyecto NO es Keystatic ni las tools (días), sino **refactorizar 10 páginas
> que hoy son markup acoplado** (semanas).

| Fase | Alcance | Esfuerzo |
|---|---|---|
| **0 — Fundaciones** | 15 esquemas de bloque (fuente única), registry de componentes, mover CONTACT/SOCIAL a singleton | Medio |
| **1 — Home** (empezar aquí) | Refactor `index.astro` a renderizador de bloques (8 bloques troncales) | Alto |
| **2 — Keystatic sobre Home** | Config Keystatic, `fields.blocks`, singletons header/footer/site | Medio |
| **3 — Tools del agente** | `pageTools.ts`, paridad editor↔agente sobre la Home | Medio |
| **4 — Páginas fáciles** | becas, aranceles, nosotros, oferta (reusan bloques) | Medio |
| **5 — Páginas con islas** | admisiones, noticias, rendición | Medio-Alto |
| **6 — carrera/[slug]** | La más compleja; recomendado: plantilla fija + datos en `careers`, no bloques libres | Alto |

**Fases 0-3 (Home de punta a punta) = ~70% del valor percibido.** El resto es volumen/reutilización.

## 7. Decisiones abiertas
1. **Esquema único** Zod↔Keystatic (recomendado) vs duplicar con tests.
2. **Formato de archivo**: YAML (diffs legibles) vs MDoc (richtext embebido).
3. **¿Quién mergea el PR?** Editor no técnico solo, o revisor técnico obligatorio.
4. **carrera/[slug]**: plantilla fija (recomendado) vs reordenable por bloques (sube el esfuerzo).
5. **Colores por sección**: aceptar que vengan del tema global (barrera anti-roturas) vs set cerrado de variantes.
6. **Reordenamiento global**: solo dentro de página, o también crear páginas y editar el menú.
7. **Newsletter del footer**: conectar a servicio (Mailchimp) o decorativo.

---

## Estado de implementación (build verde)

**Hecho:**
- Fase 0 — Esquema de bloques (`src/content/blocks.ts`, 15 tipos) + colección
  `pages` + `BlockRenderer`. La barrera (Zod) valida en el build.
- Fase 1 + 4 — 8 páginas convertidas a bloques editables y reordenables:
  home, becas, nosotros, oferta, admisiones, aranceles, noticias, rendición.
  Cada página = `src/content/pages/<slug>.json` (lista ordenada de bloques).
- Fase 3 — Agente de Páginas (`cms-panel/src/agents/pageTools.ts`): el agente
  edita texto, reordena (subir/bajar/índice), oculta, agrega y quita bloques
  por prompt. Cada cambio = commit + PR. Router ampliado (blog|design|page).

**Pendiente (requiere decisión del cliente):**
- Fase 2 — Keystatic (editor visual). Implica: React + adaptador de servidor
  (estático → híbrido), y su formato de almacenamiento (`{discriminant,value}`)
  no coincide con el JSON plano `_type` actual. Decidir modo (local vs GitHub
  OAuth) y hosting del editor antes de integrarlo.
- carrera/[slug] — sigue como plantilla fija. Para hacer sus datos editables
  hay que migrar `careers` de `data.js` a una colección; toca Footer y LeadForm
  (presentes en todas las páginas), así que se hace de forma supervisada.
