# Análisis del CMS y paridad con WordPress

Análisis completo del CMS del sitio IIDEA (`cms-panel/`) y del trabajo hecho para
que **se vea, se sienta y funcione como WordPress (wp-admin)**, manteniendo la
arquitectura git-first del proyecto.

## 1. Qué es este CMS (arquitectura)

El CMS es un panel Express + frontend vanilla que **no tiene base de datos**: el
repositorio de GitHub es la fuente de verdad y cada cambio es un commit hecho
mediante la Git Data API. Vercel reconstruye el sitio Astro (~1 min) tras cada
commit; si un contenido quedara inválido, el build falla y el sitio conserva la
versión anterior — el equivalente al "no puedes romper el sitio" de WordPress.

```
Equipo (login Microsoft 365)
        │
        ▼
Panel (Express + web/)  ──►  GitHub (commits)  ──►  Vercel build  ──►  Sitio Astro
        │                        ▲
        └── Agentes Claude ──────┘   (blog / diseño / páginas, con validación Zod)
```

Superficies de edición, todas acotadas y validadas:

| Superficie | Archivo en `astro-web/` | Validación |
|---|---|---|
| Entradas del blog | `src/content/blog/*.md` | `blogFrontmatterSchema` (Zod, espejo de Astro) |
| Páginas por bloques | `src/content/pages/*.json` | Catálogo derivado de `blocks.ts` (codegen) |
| Carreras | `src/content/careers/*.json` | Manifiesto derivado de `career.ts` (codegen) |
| Tema (colores, banner, efectos) | `src/config/theme.json` | `themeSchema` (Zod) |
| Medios | `public/uploads/*` (+ `public/news/*`) | Conversión automática a WebP ≤1920px (sharp) |

Los formularios del panel **se derivan por codegen** (`astro-web npm run codegen`
→ `src/generated/schema-manifest.ts`): si el sitio agrega un campo a un bloque,
el formulario aparece solo. Nada se mantiene a mano por duplicado.

### Fortalezas detectadas

- **Git como historial**: cada edición es un commit auditable y reversible (mejor
  que las revisiones de WordPress).
- **Validación en tres capas**: formulario → API del panel (Zod/catálogo) → build
  de Astro. Un contenido inválido nunca llega a producción.
- **Staging opcional** (`GITHUB_BASE_BRANCH=stage`) con botón "Publicar a
  producción" (merge stage → main).
- **Agentes IA** (blog/diseño/páginas) como capa adicional de edición por prompt,
  con superficies acotadas — algo que WordPress no tiene.
- **Multi-tenant** vía `client.config.json`.

### Brechas que había frente a WordPress (antes de este trabajo)

1. **Las entradas del blog solo se creaban por el agente IA**: no había listado,
   ni edición, ni borradores gestionables, ni papelera — el corazón de WordPress
   no existía como pantalla.
2. **Sin biblioteca de medios**: las imágenes solo se subían inline desde un
   campo; no se podían ver, reutilizar ni copiar rutas.
3. **Sin pantalla de Apariencia**: el tema (`theme.json`) solo se cambiaba por
   prompt al agente de diseño.
4. **Look & feel a medias**: había un lateral "tipo WordPress", pero sin barra de
   administración, sin la paleta wp-admin, sin tablas de listado con acciones de
   fila, sin escritorio con widgets, sin submenús ni rutas por pantalla.
5. **Sin URLs por pantalla**: todo vivía en un solo estado JS (el botón "atrás"
   del navegador no funcionaba entre pantallas).

## 2. Qué se implementó (paridad WordPress)

### Apariencia y navegación (el "se ve y se siente")

- **Barra de administración** superior fija (32px, `#1d2327`): logo con el
  degradado de marca → "Visitar sitio", **"+ Nuevo"** (nueva entrada), "Hola,
  ‹usuario›" y "Cerrar sesión".
- **Menú lateral wp-admin** (160px, `#1d2327`, ítem activo `#2271b1`, hover
  `#72aee6`): Escritorio · Entradas (con submenú *Todas las entradas / Añadir
  nueva*) · Medios · Páginas · Carreras · Apariencia · Asistente IA, con
  separadores y botón **"◀ Cerrar menú"** plegable (persistido), como WP.
- **Paleta y componentes de WP**: fondo `#f0f0f1`, tipografía de sistema a 13px,
  títulos de pantalla de 23px con botón `page-title-action`, botones `.button` /
  `.button-primary` (radio 3px), avisos `.notice` con borde izquierdo de color,
  cajas `.postbox`, tablas `.wp-list-table` con filas cebra y **acciones de fila
  visibles al pasar el mouse** (Editar | Papelera | Ver), filtros `subsubsub`
  (Todas | Publicadas | Borradores), buscador y contador de elementos.
- **Rutas por pantalla** (`#posts`, `#post/<slug>`, `#media`, `#pages`,
  `#page/<slug>`, `#careers`, `#appearance`, `#agent`): atrás/adelante del
  navegador funcionan y cada pantalla tiene URL y `<title>` propios ("Entradas ‹
  IIDEA — Panel"), como las pantallas de wp-admin.
- **Pie**: "Gracias por crear con el Panel IIDEA" + versión.
- Guard de **cambios sin guardar** también en la navegación interna.

### Escritorio (dashboard de WP)

- **Panel de bienvenida** con accesos "Primeros pasos / Siguientes pasos / Más
  acciones".
- **De un vistazo**: nº de entradas, páginas, carreras, medios y borradores.
- **Actividad**: últimas entradas con fecha y enlace directo a edición.
- **Borrador rápido** (crea una entrada `draft: true` real).
- **Publicar a producción** como caja destacada (solo en modo staging; el panel
  ahora recibe `publish` desde `/api/forms`).

### Entradas (el flujo completo de WordPress)

- **Listado** `wp-list-table`: miniatura, título (con estado "— Borrador"),
  autor, categoría, etiquetas, fecha con estado (Publicada/Borrador), filtros,
  búsqueda y **Papelera** (con aviso de que git guarda copia).
- **Editor clásico de WP**: título grande + **enlace permanente** derivado del
  título, cuerpo **Markdown** con barra de formato (B, I, enlace, H2, H3, lista,
  cita), caja **Extracto**; columna lateral con cajas **Publicar** (estado
  Borrador/Publicada, fecha, autor, "Mover a la papelera", botón
  Publicar/Actualizar), **Categorías** (radio del catálogo real del sitio),
  **Etiquetas** e **Imagen destacada** (elegir de la biblioteca o subir).
- Crear ("Añadir nueva"), editar, publicar/despublicar y borrar — todo commitea
  al repo con mensajes claros (`feat(blog): …`, `content(blog/slug): …`).

### Medios (biblioteca de WP)

- Pantalla **Biblioteca de medios**: grid con las imágenes de `public/uploads`
  y `public/news`, detalle con ruta copiable y "Añadir nuevo medio".
- **Modal selector de medios** reutilizable (como el de WP): lo usan la imagen
  destacada de las entradas y todos los campos de imagen de páginas/carreras
  ("Biblioteca" | "Subir").

### Apariencia (Personalizador)

- Editor visual de `theme.json`: nombre del tema, colores tinta/nube (color
  picker + hex), **degradado de marca editable por paradas con vista previa en
  vivo**, banner promocional (texto, CTA, colores) y efecto de temporada
  (nieve/confeti + intensidad). Guarda validando contra `themeSchema` (los
  errores Zod se muestran legibles en un `.notice`).

### Backend nuevo (REST, todo autenticado)

| Endpoint | Función |
|---|---|
| `GET/POST /api/posts` · `GET/PUT/DELETE /api/posts/:slug` | CRUD de entradas (frontmatter parseado/serializado con el mismo esquema del sitio; slugs validados contra path traversal) |
| `GET /api/media` | Lista `public/uploads` + `public/news` |
| `GET/PUT /api/theme` | Lee y guarda `theme.json` validado |
| `/api/forms` ahora incluye `publish` | El escritorio sabe si hay staging |

Soporte en `lib/github.ts`: `listDir()` y `deleteFile()` (API de contenidos).
Nuevo `lib/posts.ts` con parser/serializador de frontmatter (round-trip estable)
y `lib/markdown.ts` reutilizado para que **todo lo guardado sea válido para el
build de Astro**.

## 3. Equivalencias WordPress ↔ Panel

| WordPress | Panel IIDEA |
|---|---|
| Escritorio + De un vistazo + Actividad + Borrador rápido | ✅ Igual |
| Entradas (lista, estados, papelera, editor + metaboxes) | ✅ Igual (cuerpo en Markdown; papelera = commit de borrado, restaurable desde git) |
| Medios | ✅ Biblioteca + modal selector (optimización WebP automática al subir) |
| Páginas | ✅ Lista + editor de bloques (lienzo + ajustes, insertar/duplicar/ocultar/arrastrar) |
| Apariencia / Personalizador | ✅ Editor del tema con preview en vivo |
| Barra admin, menú lateral, plegado, rutas por pantalla | ✅ Igual |
| Revisiones | Historial de Git (cada cambio es un commit) |
| Usuarios/roles | Login Microsoft 365 restringido por dominio/lista + roles **admin/editor** (`ADMIN_EMAILS`) |
| Plugins / Comentarios | Fuera de alcance deliberado (sitio institucional SSG) |
| — | ➕ Asistente IA (blog/diseño/páginas por prompt), staging con "Publicar a producción" |

## 3b. Pasada de fidelidad ("que no se note que no es WordPress")

Sobre la paridad funcional se afinaron los detalles que delataban al panel:

- **Iconos SVG monocromos estilo Dashicons** en menú, barra y "De un vistazo"
  (nada de emojis en la interfaz de administración).
- **Barra de administración con flyouts** al pasar el mouse, como en WP:
  sitio → "Visitar sitio", **"+ Nuevo"** → Entrada/Medio/Página, y usuario con
  **avatar de iniciales** → "Salir".
- **Submenús del menú lateral**: desplegados en la sección activa y **flotantes
  (flyout) con cabecera** al pasar el mouse por las demás secciones — también
  con el menú plegado, exactamente el comportamiento de wp-admin.
- **Listado de entradas completo**: columna de **casillas + "Acciones en lote →
  Mover a la papelera" + Aplicar**, y **"Edición rápida"** inline (título,
  fecha, categoría, estado) con Actualizar/Cancelar.
- **"Opciones de pantalla" y "Ayuda"**: las pestañas superiores de wp-admin,
  con columnas mostrables/ocultables persistidas por usuario y paneles de ayuda
  por pantalla (Entradas, Medios, Páginas).
- **Avisos descartables** con la ✕ ("Descartar este aviso"), texto sin emojis,
  y **spinner** de carga.
- **Login clonado de wp-login.php**: logo circular sobre caja blanca, botón
  primario "Acceder con Microsoft", error con borde rojo y "← Ir a IIDEA".
- **Textos de WP**: escritorio con "¡Te damos la bienvenida a WordPress!",
  pie "Gracias por crear con WordPress." + versión, títulos de pestaña
  "Pantalla ‹ IIDEA — WordPress", "Salir" en lugar de "Cerrar sesión".

## 4. Verificación

- `npm run typecheck` ✅ y `npm test` ✅ (35 pruebas, incluidas las nuevas de
  `posts.ts`: parsing del frontmatter real, round-trip estable, categorías
  inválidas rechazadas, slugs seguros).
- Recorrido E2E con Playwright sobre la UI real con API simulada (contenido real
  del repo): **33/33 comprobaciones** — escritorio, borrador rápido, listado y
  filtros de entradas, editor con toolbar, modal de medios, biblioteca, editor de
  bloques de páginas, carreras, apariencia (guardado del tema), asistente, menú
  plegable y papelera.
- Segundo recorrido E2E para la pasada de fidelidad: **23/23 comprobaciones** —
  login, iconos SVG, flyouts de barra y menú (también plegado), opciones de
  pantalla (ocultar/mostrar columnas), ayuda, edición rápida (guardado y cambio
  de estado), avisos descartables y acciones en lote.
- Se regeneró `src/generated/schema-manifest.ts` (estaba desactualizado: faltaban
  las páginas *educacion-continua* y *estudiantes*).

## 5. Ronda de mejoras implementada (análisis del 2026-07)

Del análisis de mejoras pendientes se implementó TODO lo identificado:

**Medios y agentes de imagen**
- Toda imagen que entra al sitio pasa por el optimizador (WebP, tope 1920px;
  portadas recortadas a 16:10) — también las generadas/descargadas por agentes,
  que antes entraban como PNG de varios MB.
- Descarga por URL endurecida: solo http(s) públicos (bloqueo SSRF de hosts
  privados/metadata), content-type imagen y tope de 10 MB.
- Respaldo entre proveedores de imagen (Gemini ⇄ OpenAI si hay API key).
- Nombres por hash de contenido → subir dos veces la misma imagen no duplica.
- Biblioteca: "Adjunto a" (escaneo de uso en páginas/carreras/entradas),
  "Eliminar permanentemente" solo para /uploads y bloqueado si está en uso.
- `imgAlt` en el frontmatter del blog (sitio + panel + agentes lo escriben).

**Asistente IA**
- **Fotos adjuntas en el chat**: el equipo sube una imagen (📎), esta entra a la
  biblioteca optimizada y el agente la coloca donde diga el prompt (portada,
  hero, tarjeta, carrera) usando la ruta real.
- Conversación multi-turno por sesión ("hazlo más corto" funciona), botón
  "Nueva conversación", botón "Detener" (aborta sin publicar), latido SSE.
- Un ÚNICO commit por corrida (staging interno con overlay de lectura): sin
  estados a medias publicados y un solo build de Vercel por pedido.
- El agente de Blogs ahora también EDITA entradas (list/get/edit_post);
  herramientas de medios (generate_image, import_image_from_url, list_media)
  para blogs, páginas y un nuevo agente de Medios; el router clasifica
  también "media" y PREGUNTA en vez de adivinar cuando el pedido es ambiguo.
- Auditoría: cada commit (agentes y panel) registra el correo del solicitante.

**Flujo editorial**
- **Estado del sitio** en el Escritorio: ✓/⏳/✗ del último build (statuses +
  check-runs de GitHub) — se acabó el "publiqué pero no sé si llegó".
- **Detección de conflictos**: los editores guardan con el sha que cargaron;
  si otro editor (o el asistente) cambió el archivo, 409 + aviso de recarga
  (entradas, edición rápida, páginas y carreras).
- **Papelera** real en Entradas (commits de borrado → Restaurar) y
  **Revisiones** por documento (historial → Cargar → Actualizar = restaurar).
- **Vista previa** Markdown en el editor de entradas (renderizador propio, sin
  CDNs) y **publicación programada** (fecha futura = aparece en el primer
  build posterior; filtro en getPublishedPosts del sitio).
- **Autoguardado local** (entradas y páginas) con oferta de restauración,
  **enlace permanente editable** en entradas nuevas, gestor de **Categorías**
  (fuente única en src/config/blog-categories.json, editable en vivo, con
  bloqueo si la categoría tiene entradas).

**Infraestructura**
- Cache TTL del listado de entradas (adiós al N+1 contra GitHub por pantalla).
- Token CSRF por sesión en toda mutación de /api.
- Modelos re-evaluados: claude-opus-4-8 para los agentes (vigente), Haiku 4.5
  para el router; claude-sonnet-5 documentado como alternativa de costo vía env.

Verificación de la ronda: typecheck limpio, **40/40 pruebas unitarias** (nuevas:
SSRF, hash/dedupe, optimizador, categorías, imgAlt) y **26/26 comprobaciones
E2E** nuevas + las 23 de fidelidad sin regresiones; build de astro-web OK.

## 6. Posibles siguientes pasos

1. ~~**Roles** (editor vs. administrador)~~ ✅ Implementado — roles admin/editor
   por `ADMIN_EMAILS`, con `requireAdmin` en las acciones globales. Ver
   `DEPLOY.md` §7 y `DECISIONES.md`.
2. ~~**Preview de borradores por rama**~~ ✅ Documentado — modo staging
   (`GITHUB_BASE_BRANCH=stage`) con botón "Publicar a producción". Ver
   `DEPLOY.md` §8.
3. **SEO por página** ✅ Implementado — título/descripción/imagen OG editables
   por página (panel + agente), validados en las tres capas.
4. **Comentarios/notas internas** por documento entre editores (pendiente).

> Las decisiones estructurales (WordPress vs. CMS propio, frontend sin bundler,
> límites del asistente en memoria) están registradas en `DECISIONES.md`.
