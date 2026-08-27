# Decisiones de arquitectura (ADR)

Registro breve de decisiones estructurales del panel, con su razón, para que
quien mantenga esto en el futuro entienda **por qué** está así y no lo "arregle"
rompiendo un compromiso deliberado.

---

## ADR-1 · ¿WordPress en lugar de (o junto a) este CMS?

**Pregunta del equipo:** ¿Se puede conectar la página con WordPress en vez de
nuestro propio CMS y conectar el agente a eso? ¿O tener WordPress y el agente en
paralelo? ¿O que los cambios del agente se vean primero en WordPress?

**Contexto.** El sitio es Astro (SSG): se compila a HTML estático y se sirve por
CDN (Vercel/Amplify). La fuente de verdad es el repositorio de GitHub; cada
edición —de una persona o de un agente— es un commit, y el build de Astro valida
todo con Zod, así que **contenido inválido nunca llega a producción**. No hay
base de datos ni servidor de aplicación en el camino del visitante.

**Opciones evaluadas.**

1. **Reemplazar por WordPress (headless o tradicional).** WordPress necesita
   PHP + MySQL corriendo permanentemente, mantenimiento de seguridad (plugins,
   parches), y su modelo de datos es una base de datos, no git. Perderíamos:
   el historial auditable por commit, la garantía "no se puede romper el sitio"
   (Zod en el build), el costo casi-cero del hosting estático y la superficie de
   ataque mínima. A cambio ganaríamos un ecosistema de plugins que un sitio
   institucional SSG no necesita. **Descartada.**

2. **WordPress y el agente en paralelo (dos fuentes de verdad).** Tendríamos dos
   sistemas editando el mismo sitio: habría que sincronizar WP ⇄ git en ambos
   sentidos, resolver conflictos entre ellos y duplicar el modelo de contenido.
   Es la opción con más piezas móviles y más formas de romperse ("¿cuál gana si
   los dos editaron la misma página?"). **Descartada.**

3. **WordPress como front de edición y git como destino (WP → git).** Técnica­
   mente posible (un plugin que al guardar haga commit), pero implica mantener un
   WordPress **solo por su editor**, cuando ya tenemos un panel que edita git
   directo, con validación y con agentes. Sería añadir toda la infraestructura de
   WP para no usar casi nada de WP. **Descartada.**

**Decisión.** Mantener el CMS git-first propio. Ya **se ve y se siente como
wp-admin** (ver `ANALISIS-CMS-WORDPRESS.md`) sin arrastrar su infraestructura, y
además tiene algo que WordPress no da: **agentes de IA con superficies acotadas
y validadas** que no pueden romper el sitio. El agente edita git directamente;
esa ES la vía canónica, no una copia de lo que hace WordPress.

**Cuándo reconsiderar.** Si el sitio dejara de ser mayormente estático y
necesitara funciones dinámicas por usuario (membresías, comercio, comentarios en
vivo) que justifiquen un CMS con base de datos. Hoy no es el caso.

---

## ADR-2 · Frontend del panel sin empaquetador (bundler)

> **Actualizado.** La decisión original (archivo único, sin empaquetador) se tomó
> con `editor.js` en ~2,7k líneas y previó su propio disparador de salida. El
> fichero llegó a **5.369 líneas**, así que se ejecutó el camino de migración que
> este mismo ADR describía: **módulos ES nativos, sin empaquetador**. La decisión
> de fondo —nada de bundler— **no cambia**.

**Contexto.** El frontend del panel (`web/assets/` y `styles.css`) es JavaScript
y CSS **vanilla servidos tal cual**, sin paso de build para el navegador. Se
evaluó en su momento introducir un empaquetador (esbuild) para minificar y
dividir el editor en módulos.

**Decisión.** **No** añadir empaquetador. El frontend se sirve directo; desde la
modularización se reparte en **37 módulos ES** que el navegador resuelve solo:

```
web/assets/
  editor.js      punto de entrada (<script type="module">): solo el arranque
  core/          cimientos: dom, api, state, router, ui, sidebar, palette…
  views/         una pantalla por fichero: dashboard, media, settings, agent…
  blocks/        el editor visual de páginas: canvas, paint, fields, ops, save…
```

**Razón.**

- **Es una herramienta interna** detrás de login, usada por unas pocas personas.
  Sobre HTTPS con gzip el editor viaja en decenas de KB y se carga una vez: el
  rendimiento no es un problema real que un bundler venga a resolver. Medido tras
  la división: **37 peticiones, ~60 ms de arranque** en local.
- **Un bundler agrega modos de fallo**: un paso de build en la imagen Docker, el
  riesgo de que el artefacto compilado quede desincronizado del fuente, y una
  historia de source-maps para depurar. Todo eso para cero beneficio funcional.
- **Simplicidad de mantenimiento**: cualquiera del equipo puede abrir el módulo de
  la pantalla que toca y editarlo sin cadena de herramientas. Es coherente con la
  filosofía git-first del resto (sin base de datos, sin capas ocultas).
- **Ya está protegido**: la suite E2E (Playwright) carga el panel en un navegador
  real en cada corrida de CI, así que un error de sintaxis, un import que no
  resuelve o una regresión de interacción **fallan el pipeline** igual que lo
  haría un compilador.

**El estado compartido, que es lo delicado.** Un `import` es un enlace de **solo
lectura**: `FORMS = data` desde otro módulo lanza TypeError en runtime, no en
build. Por eso el estado mutable vive en tres módulos y **solo ellos lo escriben**:

| Módulo | Qué guarda | Cómo se escribe |
|---|---|---|
| `core/state.js` | `FORMS` `SITE` `PUBLISH` `CSRF` `ROLE` | `setSession()` / `setForms()`, una vez en el arranque |
| `core/careers.js` | caché de carreras | `ensureCareers()` / `invalidateCareers()` |
| `blocks/state.js` | `doc` `slug` `sel` `insertAt`… del editor visual | `setDoc()` `setSel()` … y `resetPageEditor()` |

Las **lecturas** no necesitan nada: el enlace vivo del módulo ya ve el valor
actualizado. Si añades estado compartido, sigue este patrón — no exportes una
variable que otro módulo vaya a asignar.

**Cuándo sí tocaría un empaquetador.** Solo si hubiera que soportar navegadores
muy viejos (sin módulos ES) o bajar mucho el tamaño transferido. No antes.

---

## ADR-3 · Límites de uso del Asistente IA en memoria (no en base de datos)

**Contexto.** El Asistente IA consume tokens de la API de Anthropic (costo real).
Se añadió un limitador de tasa + techo de tokens mensual (`lib/agentBudget.ts`).

**Decisión.** Llevar la contabilidad **en memoria del proceso**, no en una base
de datos ni en git.

**Razón.** Es una **barrera anti-abuso/anti-sorpresa-de-costo**, no contabilidad
fiscal. Un contador en memoria es suficiente para frenar un bucle accidental o un
uso desmedido; se reinicia si el panel se reinicia, y eso es aceptable para su
propósito. Añadir persistencia (Redis/DB) solo por esto contradiría el "sin base
de datos" del proyecto. Si en el futuro se corre el panel en varias instancias y
se necesita un límite global exacto, el mismo Redis de las sesiones
(`SESSION_REDIS_URL`) sería el lugar natural para moverlo — no antes.
