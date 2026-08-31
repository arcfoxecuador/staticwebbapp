/* ── LA FIRMA DEL SITIO ────────────────────────────────────────────────────
   Un dato, un sitio. Ningún componente escribe un teléfono, un correo, una
   dirección ni un nombre: todo sale de aquí.

   No es purismo. Un correo repetido en la cabecera, el pie, la página de
   contacto y el JSON-LD son cuatro sitios que cambian a la vez el día que el
   cliente cambia de dominio, y el cuarto siempre se olvida — normalmente el
   JSON-LD, que es el que leen Google y los motores generativos.

   Los corchetes son deliberados: `'[pendiente]'` marca lo que nadie debe
   publicar creyendo que está cerrado. Si aparece en pantalla, se ve. */

export { SITE, RUTAS_NO_INDEXABLES } from './rutas.mjs';

// ── Organización ────────────────────────────────────────────────────────────

export const ORG = {
  nombreCorto: 'ARCFOX',
  nombreLegal: 'ARCFOX Ecuador',
  tagline: 'Distintos por naturaleza',
  /** Una frase. Es la que va a `description` del JSON-LD y a llms.txt: escríbela
      como la escribiría alguien citando a esta empresa, no como un eslogan. */
  descripcion: 'ARCFOX es la marca de vehículos 100% eléctricos de BAIC que llega a Ecuador con SUV de diseño, autonomía y recarga para uso diario.',
  fundacion: '',

  email: 'contacto@arcfox.com.ec',
  /** En E.164, sin espacios: es el formato que exigen `tel:` y schema.org. */
  telefono: '',
  /** Como se escribe para un humano. */
  telefonoLegible: '',
  /** Sólo dígitos, como los quiere wa.me. Vacío = sin botón de WhatsApp. */
  whatsapp: '',

  /** Perfiles oficiales. Alimentan `sameAs` del JSON-LD, que es lo que ata esta
      web a la entidad que ya conocen los motores. Fuera los que no existan. */
  redes: [
    'https://www.instagram.com/arcfoxecuador',
    'https://www.tiktok.com/@arcfoxecuador',
    'https://www.facebook.com/arcfoxecuador',
  ],
} as const;

// ── Sedes ───────────────────────────────────────────────────────────────────

export type Sede = {
  nombre: string;
  ciudad: string;
  pais: string;
  /** Código ISO de dos letras. Lo usa `areaServed` del JSON-LD. */
  codigoPais: string;
  /* Calle y región son OPCIONALES, y no por comodidad: un `streetAddress` con
     un texto de relleno dentro es una dirección postal falsa publicada en datos
     estructurados, que es peor que no declarar ninguna. Ausentes, ni el JSON-LD
     ni la ficha de contacto ni `llms.txt` los mencionan. */
  calle?: string;
  region?: string;
  /** Enlace a mapas. Opcional: sin él la ficha no pinta el enlace. */
  mapa?: string;
};

export const SEDES: Sede[] = [
  {
    nombre: 'Quito',
    ciudad: 'Quito',
    pais: 'Ecuador',
    codigoPais: 'EC',
  },
];

/** La dirección en una línea, saltándose lo que falte. Existe para que los
    cuatro sitios que la pintan —pie, contacto, llms.txt y el JSON-LD— no
    resuelvan cada uno a su manera qué hacer con una calle ausente, que es como
    aparece una coma suelta al principio de la línea en uno de los cuatro. */
export function direccionLegible(sede: Sede): string {
  return [sede.calle, sede.ciudad, sede.region, sede.pais].filter(Boolean).join(', ');
}

// ── Navegación ──────────────────────────────────────────────────────────────

export type NavHijo = { texto: string; href: string; bajada?: string };
export type NavZona = {
  texto: string;
  href: string;
  /** Con hijos, la zona abre un panel. Sin ellos, es un enlace directo. */
  hijos?: NavHijo[];
};

export const NAV: NavZona[] = [
  {
    texto: 'Modelos',
    href: '/modelos',
    hijos: [
      { texto: 'ARCFOX T5', href: '/modelos/t5', bajada: 'SUV crossover 100% eléctrico' },
      { texto: 'ARCFOX T1', href: '/modelos/t1', bajada: 'SUV familiar 100% eléctrico' },
      { texto: 'ARCFOX S5', href: '/modelos/s5', bajada: 'SUV de líneas fastback' },
    ],
  },
  { texto: 'Concesionarios', href: '/concesionarios' },
  { texto: 'Test drive', href: '/test-drive' },
  { texto: 'Sobre ARCFOX', href: '/nosotros' },
  /* Postventa NO entra aquí a propósito: la página existe para revisar
     (`/postventa`) pero el servicio no está cerrado. Un enlace en cabecera,
     pie y 404 —los tres leen esta lista— la promocionaría. Vive en
     `RUTAS_NO_INDEXABLES` hasta que haya red de talleres que publicar. */
];

/** El CTA primario. Aparece en la cabecera, en la barra de acción de móvil y al
    cierre de cada página: escribirlo una vez es lo que los mantiene iguales. */
export const CTA = {
  texto: 'Cotízalo',
  href: '/#cotizalo',
} as const;

// ── Contenido de portada ────────────────────────────────────────────────────

/* EL TITULAR DE LA PORTADA, y es LO PRIMERO que hay que reescribir.

   Está separado de `ORG.descripcion` porque los dos textos tienen trabajos
   distintos y el mismo texto no puede hacer los dos. `descripcion` es la frase
   citable: completa, con sujeto y sector, escrita para que un motor generativo la
   copie tal cual. Un `<h1>` con esa frase entera ocupa seis líneas en escritorio,
   empuja el CTA fuera de la primera pantalla y obliga a leer un párrafo antes de
   entender de qué va la empresa.

   El titular es otra cosa: una idea, de seis a diez palabras, la que quieres que
   quede si sólo se lee una línea del sitio. La descripción va debajo, como bajada.

   El valor por defecto es el tagline porque es lo único corto que el brief
   garantiza — construye y no miente, pero rara vez vende. Reescríbelo. */
export const PORTADA = {
  titular: 'Distintos por naturaleza',
  bajada: 'Vehículos 100% eléctricos de BAIC, ahora en Ecuador.',
} as const;

/** Cifras verificables. Cada una necesita `fuente` — un número sin procedencia
    es exactamente lo que un motor generativo no puede citar y lo que un
    visitante no puede creer. Si no hay fuente, no publiques la cifra. */
export type Metrica = { valor: string; etiqueta: string; unidad?: string; fuente?: string };

export const METRICAS: Metrica[] = [
  { valor: '3', etiqueta: 'Modelos en Ecuador', fuente: 'Catálogo inicial ARCFOX Ecuador' },
  { valor: '100%', etiqueta: 'Eléctricos', fuente: 'Ficha de cada modelo' },
  { valor: 'BAIC', etiqueta: 'Grupo', fuente: 'Identidad de marca ARCFOX' },
];

/** Los pasos del servicio, de contacto a resultado. La numeración la pone el
    componente: no la escribas en el texto. */
export const PASOS: { titulo: string; texto: string }[] = [
  { titulo: 'Elige modelo y ciudad', texto: 'T5, T1 o S5, y la ciudad donde quieres verlo o recogerlo.' },
  { titulo: 'Te contactamos', texto: 'Un asesor del concesionario más cercano te escribe para coordinar fecha.' },
  { titulo: 'Prueba o cotiza', texto: 'Test drive, ficha local y siguiente paso, sin cifras de otro país.' },
];

/** Por qué esta empresa y no otra. Tres o cuatro; con seis no se lee ninguno. */
export const PILARES: { titulo: string; texto: string }[] = [
  {
    titulo: 'Manejo ágil y fluido',
    texto: 'Un SUV eléctrico pensado para ciudad y carretera, con respuesta inmediata al acelerar.',
  },
  {
    titulo: 'Frenado inteligente de precisión',
    texto: 'Asistencias de conducción que leen el entorno y ayudan a detener el auto con control.',
  },
  {
    titulo: 'Recarga ultra rápida',
    texto: 'Tiempos de recarga pensados para el uso diario. Las cifras exactas de cada modelo se confirman en el concesionario.',
  },
];

/** El FAQ de portada. Alimenta el bloque visible Y el `FAQPage` del JSON-LD
    desde el mismo sitio, así que la respuesta que ve un visitante y la que lee
    un motor no pueden divergir. Escribe la respuesta completa en una o dos
    frases autosuficientes: es lo que se cita. */
export const FAQ: readonly { p: string; r: string }[] = [
  {
    p: '¿ARCFOX ya está en Ecuador?',
    r: 'Sí. ARCFOX llega a Ecuador como la marca de vehículos 100% eléctricos de BAIC. El catálogo inicial son el T5, el T1 y el S5.',
  },
  {
    p: '¿Los modelos son 100% eléctricos?',
    r: 'Sí. T5, T1 y S5 son vehículos a batería: no llevan motor de combustión ni híbrido.',
  },
  {
    p: '¿Dónde puedo ver un ARCFOX o pedir un test drive?',
    r: 'En la red de concesionarios. Completa Cotízalo o pide un test drive y te contactamos con el punto más cercano. Las direcciones se publican cuando cada sede esté abierta.',
  },
  {
    p: '¿Puedo copiar precios o autonomías de la web de Argentina?',
    r: 'No. Equipo, cifras y condiciones comerciales de Ecuador se confirman aquí. Un dato de otro país no se publica como si fuera local.',
  },
];

// ── Asistente conversacional (opcional) ─────────────────────────────────────

/* El lanzador flotante. `activo: false` lo apaga entero — no queda marcado ni
   script. La URL es la del embed del proveedor (ioZen u otro).

   Es la ÚNICA pieza del sistema con sombra permitida, y por eso está aquí y no
   en un componente: algo que flota de verdad sobre la página necesita decirlo,
   y la excepción tiene que estar declarada en un sitio donde se vea. */
export const ASISTENTE = {
  activo: false,
  nombre: 'Asistente',
  /** URL del iframe del proveedor. */
  embed: '',
  /** Texto del lanzador. Lo lee un lector de pantalla, así que dice qué hace. */
  etiqueta: 'Abrir el asistente',
} as const;

// ── Campaña (teaser + puerta) ────────────────────────────────────────────────

/* UNA campaña, DOS superficies. El cliente escribió ceja, titular y CTA una
   sola vez; el teaser (cuenta atrás) y la puerta (preguntas) los leen de aquí.
   Si cada página tuviera su propia frase, followdafox diría «pregúntale al
   zorro» y la puerta «Continuar» — dos campañas en el mismo lanzamiento. */
const CAMPAÑA = {
  titulo: 'Antes de abrir la puerta',
  ceja: 'Sé parte de un selecto grupo que experimentará antes que nadie una nueva forma de movilidad.',
  titular: 'Antes de abrir la puerta déjanos hacerte unas preguntas.',
  bajada:
    'Sé parte de un selecto grupo que experimentará antes que nadie una nueva forma de movilidad, con ARCFOX en Ecuador.',
  cta: 'Continuar',
  chatEtiqueta: 'Abrir las preguntas y el chat de ARCFOX',

  /* LA FECHA, y vive en CAMPAÑA y no en TEASER desde que el contador se pinta en
     las DOS superficies. Escrita en cada página, la primera corrección —un
     lanzamiento que se mueve una semana, que es lo que siempre pasa— se aplica
     en una y se olvida en la otra: el teaser contaría hacia un día y la puerta
     hacia otro, en la misma campaña y con el mismo logo arriba. */
  /** Lo que dice el HTML cuando el JavaScript no llega. Sin esto, la pieza
      central de la página sería un hueco. */
  fechaVisible: '15 de septiembre',
  /** El instante del lanzamiento, en UTC: medianoche del 15 de septiembre en
      Ecuador (UTC-5). En ISO y con la Z explícita para que ni el navegador ni
      `datetime` tengan que adivinar la zona del visitante. */
  destinoISO: '2026-09-15T05:00:00.000Z',
  /** Al llegar a cero. No enlaza a arcfox.com.ec: el sitio oficial puede no
      estar público ese día, y una campaña que promete un destino muerto es peor
      que una campaña que sólo anuncia. */
  llegada: 'Ya está aquí',
  /** Las cuatro unidades del contador. `clave` es el nombre que busca el script
      en `data-unidad`; la etiqueta se pinta en versales por CSS. */
  unidades: [
    { clave: 'dias', etiqueta: 'Días' },
    { clave: 'horas', etiqueta: 'Horas' },
    { clave: 'minutos', etiqueta: 'Min' },
    { clave: 'segundos', etiqueta: 'Seg' },
  ],
} as const;

// ── Landing de expectativa (followdafox.com) ────────────────────────────────

/* EL TEASER, y por qué su copy vive AQUÍ y no dentro de `landing.astro`.

   La landing dice cuatro cosas —un titular, una bajada, una fecha y la hora
   exacta en que esa fecha vence— y las cuatro aparecen más de una vez en la
   salida: el titular en el <h1> y en el JSON-LD, la bajada en el <p> y en la
   `description` del <head>, la fecha en el texto visible Y en el `datetime` del
   <time>, y el instante del lanzamiento en el atributo que lee la cuenta atrás.
   Escritas en la página, la primera divergencia es silenciosa: el texto dice un
   día y el contador cuenta hacia otro.

   Titular, bajada, CTA y la fecha no se reescriben aquí: salen de `CAMPAÑA`.
   Lo propio del teaser es el cierre con las redes.

   `soloLanding` y `path` son la MISMA decisión que toma `rutas.mjs` con
   `RUTAS_NO_INDEXABLES`, leída desde el mismo interruptor. En el sitio completo
   la landing es `/landing` y no se promociona; en el dominio teaser el HTML se
   renombra a `index.html` (ver `scripts/dist-landing.mjs`) y su ruta canónica
   pasa a ser `/`. Si el canonical y el `@id` del JSON-LD no siguen ese cambio,
   el teaser publica una URL que en su propio dominio no existe.

   `process.env` y no `import.meta.env`: `SOLO_LANDING` no lleva prefijo
   `PUBLIC_` —no es un dato del navegador, es una variable de construcción— así
   que sólo existe en Node, que es donde se evalúa este módulo al compilar. */
const SOLO_LANDING = process.env.SOLO_LANDING === '1';

export const TEASER = {
  soloLanding: SOLO_LANDING,
  /** Ruta canónica de la landing. Ver el comentario de arriba. */
  path: SOLO_LANDING ? '/' : '/landing',

  titulo: CAMPAÑA.titulo,
  titular: CAMPAÑA.titular,
  bajada: CAMPAÑA.bajada,

  fechaVisible: CAMPAÑA.fechaVisible,
  destinoISO: CAMPAÑA.destinoISO,
  llegada: CAMPAÑA.llegada,
  unidades: CAMPAÑA.unidades,

  /** El cierre. Las redes se pintan siempre: el dominio se llama followdafox
      y el chat, cuando llega, no las sustituye. */
  redesRotulo: 'Sigue al zorro',

  /* EL CHAT. ioZen v2 se identifica por el bot (`m4zdh`), no por una URL de
     iframe. Vacío = no se monta el componente: un botón que abre un modal
     vacío es peor que ningún botón. `PUBLIC_IOZEN_BOT` permite apagarlo o
     cambiar de bot sin tocar el copy. */
  iozen: import.meta.env.PUBLIC_IOZEN_BOT ?? 'm4zdh',
  chatNombre: 'ARCFOX Ecuador',
  chatRotulo: CAMPAÑA.cta,
  chatEtiqueta: CAMPAÑA.chatEtiqueta,
} as const;

// ── Puerta de lanzamiento ───────────────────────────────────────────────────

/* LA PUERTA, y por qué su copy vive AQUÍ y no dentro de `lanzamiento.astro`.

   La página dice tres cosas que el cliente ya escribió —una ceja, un titular
   y un CTA— y las tres aparecen más de una vez en la salida: el titular en el
   <h1> y en el JSON-LD, la ceja en el párrafo y (como frase citable) en la
   `description` del <head>, el CTA en el botón visible. Escritas en la página,
   la primera divergencia es silenciosa: la pestaña dice una cosa y el grafo
   otra.

   Esta página es la PUERTA: aún no se abre; antes, unas preguntas. El teaser
   de arriba es la cuenta atrás. Ceja, titular y CTA salen de `CAMPAÑA` para
   que followdafox no hable otro idioma.

   `soloLanzamiento` y `path` son la MISMA decisión que `SOLO_LANDING`: en el
   sitio completo la puerta es `/lanzamiento`; en el dominio de campaña el HTML
   se renombra a `index.html` y su ruta canónica pasa a ser `/`. Si el
   canonical y el `@id` del JSON-LD no siguen ese cambio, la campaña publica
   una URL que en su propio dominio no existe.

   `process.env` y no `import.meta.env`: `SOLO_LANZAMIENTO` no lleva prefijo
   `PUBLIC_` —no es un dato del navegador, es una variable de construcción—. */
const SOLO_LANZAMIENTO = process.env.SOLO_LANZAMIENTO === '1';

export const LANZAMIENTO = {
  soloLanzamiento: SOLO_LANZAMIENTO,
  /** Ruta canónica de la puerta. Ver el comentario de arriba. */
  path: SOLO_LANZAMIENTO ? '/' : '/lanzamiento',

  titulo: CAMPAÑA.titulo,
  ceja: CAMPAÑA.ceja,
  titular: CAMPAÑA.titular,
  bajada: CAMPAÑA.bajada,
  cta: CAMPAÑA.cta,

  /* EL MISMO CONTADOR QUE EL TEASER, y por eso sale de `CAMPAÑA` y no se
     escribe otra vez. Las dos superficies cuentan hacia el mismo instante: si
     alguien llega por followdafox y luego por el enlace de campaña, ver dos
     cifras distintas es la clase de detalle que descalifica el lanzamiento
     entero. */
  fechaVisible: CAMPAÑA.fechaVisible,
  destinoISO: CAMPAÑA.destinoISO,
  llegada: CAMPAÑA.llegada,
  unidades: CAMPAÑA.unidades,

} as const;

// ── Formulario de contacto ──────────────────────────────────────────────────

/* El sitio es estático y no tiene servidor, así que el formulario ENVÍA A UN
   TERCERO. `endpoint` es la URL que recibe el POST: un webhook de ioZen, de un
   CRM o de un servicio de formularios. Vacío = el bloque no se pinta, y esto es
   a propósito: un formulario que no va a ningún sitio es peor que ninguno,
   porque el visitante cree que ha escrito y nadie lee.

   `campos` es la lista corta. Cada campo extra cuesta conversiones medibles, así
   que la pregunta antes de añadir uno es «¿alguien va a leer esto antes de
   responder?». Si la respuesta es no, va en la conversación, no en el formulario. */
export const FORMULARIO = {
  /** URL que recibe el POST. Sin ella no se renderiza nada. */
  endpoint: import.meta.env.PUBLIC_FORMULARIO_ENDPOINT ?? '',
  /** A dónde va el visitante si el navegador hace el POST nativo (sin JS). Tiene
      que estar en RUTAS_NO_INDEXABLES: es una página de utilidad. */
  gracias: '/gracias',
  /** El nombre del campo trampa. No se rellena nunca por un humano —está oculto
      y sin foco—, así que si llega con contenido es un bot. */
  trampa: '_ref',
} as const;

// ── Protocolo de la puerta de lanzamiento ───────────────────────────────────

/* EL DESTINO DE LOS REGISTROS DE `/lanzamiento` y `/landing`. Misma decisión que
   `FORMULARIO`, distinto destino: aquí el POST va a una implementación web de
   Google Apps Script ligada a la hoja de cálculo (`scripts/hoja-protocolo.gs`).

   POR QUÉ APPS SCRIPT Y NO UNA FUNCIÓN. El sitio es estático y no tiene
   servidor; una función de Vercel obligaría a una cuenta de servicio, su clave
   JSON y una dependencia de producción más. Apps Script es cero dependencias y
   cero infraestructura, y el volumen de una lista de invitados le sobra.

   `token` NO ES UN SECRETO Y NO PUEDE SERLO: lleva prefijo `PUBLIC_` porque lo
   necesita el navegador, así que viaja en el JavaScript servido. Sirve para que
   quien tropiece con la URL `/exec` no pueda escribir en la hoja sin haberla
   leído de aquí; no sirve contra alguien decidido. Si algún día llega spam de
   verdad, la respuesta no es un token más largo: es mover el POST a una función
   con la credencial del lado del servidor.

   Vacío = el protocolo funciona igual pero NO promete registro. Ver
   `ProtocoloComando.astro`: un formulario que dice «registrado» sin que nada se
   haya guardado es la peor de las tres opciones posibles. */
export const PROTOCOLO = {
  /** URL `…/exec` de la implementación web de Apps Script. */
  endpoint: import.meta.env.PUBLIC_PROTOCOLO_ENDPOINT ?? '',
  /** Cadena compartida con el script de la hoja. Ver el aviso de arriba. */
  token: import.meta.env.PUBLIC_PROTOCOLO_TOKEN ?? '',
} as const;

// ── Analítica ───────────────────────────────────────────────────────────────

/* Los identificadores viven en el entorno, no aquí. Este objeto sólo decide
   QUÉ se carga y BAJO QUÉ condición. Nada se inyecta antes del consentimiento
   → ver components/seo/Analitica.astro. */
export const ANALITICA = {
  ga4: import.meta.env.PUBLIC_GA4_ID ?? '',
  clarity: import.meta.env.PUBLIC_CLARITY_ID ?? '',
  /** Rutas donde NO se graba sesión nunca, pase lo que pase con el consentimiento.
      Aquí van los formularios sensibles y cualquier canal que prometa anonimato. */
  sinGrabacion: [] as string[],
} as const;

// ── Textos legales ──────────────────────────────────────────────────────────

/** El aviso del pie. Vacío = no se pinta. Si el sector está regulado, esto no
    es opcional y no lo redacta quien programa. */
export const AVISO_LEGAL =
  'Las imágenes son ilustrativas. Las cifras que se publican corresponden a la homologación global de ARCFOX; la versión, el equipamiento y las condiciones comerciales para Ecuador se confirman en el concesionario oficial. Un dato de otro país no se vende como local.';

/** Nota corta junto a cada bloque de cifras. Misma idea que AVISO_LEGAL, en una línea. */
export const AVISO_CIFRAS =
  'Cifras de homologación global ARCFOX. La versión para Ecuador se confirma en el concesionario.';

/* LAS DOS RUTAS LEGALES, VACÍAS A PROPÓSITO — y cada una vacía por un motivo
   distinto del otro.

   Vacío = el enlace no se pinta. Es la alternativa a lo que hace casi cualquier
   plantilla: dejar `/privacidad` escrito en el pie desde el primer día. Ese
   enlace apunta a un 404 durante todo el tiempo que el texto tarde en llegar —
   semanas, normalmente— y un 404 enlazado desde las cuarenta páginas del sitio
   es la clase de fallo que ve el rastreador antes que nadie del equipo.

   Y no se rellenan con un texto de relleno. Una política de privacidad es una
   declaración jurídica sobre qué datos se recogen y con qué base legal: puesta
   de adorno no protege, compromete. No la redacta quien programa.

   `privacidad` tiene una consecuencia técnica además de la legal: el banner de
   cookies enlaza aquí, y sin enlace el consentimiento que recoge queda cojo —
   quien acepta no puede leer a qué. Si vas a encender la analítica, esta ruta
   deja de ser opcional.

   Acepta una ruta propia ('/privacidad', con su página en `src/pages/`) o una
   URL externa, que es lo habitual cuando el texto lo publica el gestor legal del
   cliente. */
export const LEGAL = {
  privacidad: '',
  terminos: '',
} as const;
