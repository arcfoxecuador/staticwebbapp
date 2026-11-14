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
  descripcion: 'ARCFOX es la marca de vehículos eléctricos premium de BAIC Group. Una propuesta que reúne diseño, innovación y confort para explorar una nueva forma de moverte.',
  fundacion: '',

  email: 'info@arcfox.com.ec',
  /** En E.164, sin espacios: es el formato que exigen `tel:` y schema.org.
      Vacío mientras el número no esté cerrado: el `tel:` y el JSON-LD no
      pueden llevar un placeholder. La página pinta `telefonoLegible`. */
  telefono: '+593964292000',
  /** Como se escribe para un humano. Información oficial, 6-nov-2026. */
  telefonoLegible: '096 429 2000',
  /** Sólo dígitos, como los quiere wa.me. Vacío = sin botón de WhatsApp. */
  whatsapp: '',

  /** Perfiles oficiales. Alimentan `sameAs` del JSON-LD, que es lo que ata esta
      web a la entidad que ya conocen los motores. Fuera los que no existan. */
  redes: [
    'https://www.instagram.com/arcfox_ecuador',
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
  /** Enlace a Maps del cuadro del cliente. Ya no se pinta (pidió quitar
      «Cómo llegar» el 11-nov-2026); se guarda porque de él salen lat/lng. */
  mapa?: string;
  /** Teléfono de la sede, como se lee. Opcional. */
  telefono?: string;
  /** Coordenadas del pin, sacadas del propio enlace de Maps. Las usa el mapa de agencias. */
  lat?: number;
  lng?: number;
};

/* Sólo las diez agencias del cuadro que el cliente confirmó el 9-nov-2026:
   nombre, dirección y enlace a Maps tal como vienen en él. El xlsx anterior
   traía cinco filas más que el cliente dice que no constan; no las recuperes
   de ahí. El teléfono de cada punto aún no llega. */
/* Horario de atención, el mismo en todas las agencias (cliente, 11-nov-2026).
   Va aparte y no repetido en cada sede: si cambia, cambia una vez. */
export const HORARIO_AGENCIAS = [
  { dias: 'Lunes a Viernes', horas: '9h00 a 18h00' },
  { dias: 'Sábados', horas: '10h00 a 14h00' },
] as const;

export const SEDES: Sede[] = [
  {
    nombre: 'Arcfox Cuenca',
    ciudad: 'Cuenca',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Azuay',
    calle: 'Av. España y Granada, esquina.',
    mapa: 'https://maps.app.goo.gl/8dP5KYBgtwznnBi16',
    lat: -2.886824,
    lng: -78.984383,
  },
  {
    nombre: 'Arcfox Juan Tanca Marengo',
    ciudad: 'Guayaquil',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Guayas',
    calle: 'Av. Juan Tanca Marengo km 2 ½ .',
    mapa: 'https://maps.app.goo.gl/CX98nz6REx5SxRgw5',
    lat: -2.1490702,
    lng: -79.9027249,
  },
  {
    nombre: 'Arcfox Las Cámaras',
    ciudad: 'Guayaquil',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Guayas',
    calle: 'Av. Francisco de Orellana y Víctor Hugo Sicouret',
    mapa: 'https://maps.app.goo.gl/ZK6iVgjoZdNjZLVY8',
    lat: -2.1578483,
    lng: -79.8985338,
  },
  {
    nombre: 'Arcfox El Dorado',
    ciudad: 'Guayaquil',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Guayas',
    calle: 'Ciudad Comercial El Dorado, Av. León Febres Cordero km 10 ½, vía a La Aurora.',
    mapa: 'https://maps.app.goo.gl/Dcx4L1CGZrdaGdzv9',
    lat: -2.0543302,
    lng: -79.8737327,
  },
  {
    nombre: 'Arcfox Loja',
    ciudad: 'Loja',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Loja',
    calle: 'Av. Cuxibamba y Tulcán, esquina.',
    mapa: 'https://maps.app.goo.gl/Byhs9zHzct3Xdjv19',
    lat: -3.986303,
    lng: -79.205469,
  },
  {
    nombre: 'Arcfox Machala',
    ciudad: 'Machala',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'El Oro',
    calle: 'Av. 25 de Junio km 1 ½ y Av. Uruguay, esquina.',
    mapa: 'https://maps.app.goo.gl/ZiZWbcScSKmJCREY8',
    lat: -3.2753078,
    lng: -79.9391575,
  },
  {
    nombre: 'Arcfox Manta',
    ciudad: 'Manta',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Manabí',
    calle: 'Av. 4 de Noviembre y calle 304.',
    mapa: 'https://maps.app.goo.gl/dGfqm67PK316nJ3G8',
    lat: -0.9655419,
    lng: -80.7076645,
  },
  {
    nombre: 'Arcfox Eloy Alfaro',
    ciudad: 'Quito',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Pichincha',
    calle: 'Av. Eloy Alfaro entre José Queri y Av. Gaspar de Villarroel.',
    mapa: 'https://maps.app.goo.gl/cupiTtnKAUBnJyGP6',
    lat: -0.1690056,
    lng: -78.4698678,
  },
  {
    nombre: 'Arcfox Orellana',
    ciudad: 'Quito',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Pichincha',
    calle: 'Av. Orellana y Av. 10 de Agosto.',
    mapa: 'https://maps.app.goo.gl/VQn74wdBdqNwnnuR6',
    lat: -0.1961906,
    lng: -78.4948069,
  },
  {
    nombre: 'Arcfox Labrador',
    ciudad: 'Quito',
    pais: 'Ecuador',
    codigoPais: 'EC',
    region: 'Pichincha',
    calle: 'Av. 10 de Agosto y El Inca.',
    mapa: 'https://maps.app.goo.gl/DPBABuL5oUCxKt838',
    lat: -0.1592363,
    lng: -78.4855479,
  },
];

/** Las ciudades de la red, una vez cada una y en el orden de SEDES. */
export const CIUDADES = [...new Set(SEDES.map((s) => s.ciudad))];

/** Ancla de las fichas de una ciudad en /concesionarios; la usa el mapa. */
export function anclaCiudad(ciudad: string): string {
  return (
    'sede-' +
    ciudad
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
  );
}

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

/** El CTA primario también entra al final del menú: declararlo antes de NAV
    permite que cabecera, barra móvil y cierre compartan texto y destino. */
export const CTA = {
  texto: 'Cotízalo',
  href: '/cotizalo',
} as const;

export const NAV: NavZona[] = [
  {
    texto: 'Modelos',
    href: '/modelos',
    hijos: [
      { texto: 'ARCFOX T1', href: '/#t1', bajada: 'SUV eléctrico' },
      { texto: 'ARCFOX T5', href: '/#t5', bajada: 'SUV eléctrico' },
      { texto: 'ARCFOX S5', href: '/#s5', bajada: 'Sedán deportivo · 100% eléctrico' },
    ],
  },
  { texto: 'Concesionarios', href: '/concesionarios' },
  { texto: 'Test drive', href: '/test-drive' },
  { texto: 'Sobre ARCFOX', href: '/nosotros' },
  { texto: CTA.texto, href: CTA.href },
  /* Postventa NO entra aquí a propósito: la página existe para revisar
     (`/postventa`) pero el servicio no está cerrado. Un enlace en cabecera,
     pie y 404 —los tres leen esta lista— la promocionaría. Vive en
     `RUTAS_NO_INDEXABLES` hasta que haya red de talleres que publicar. */
];

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

/* Vacío a propósito: el cliente pidió ELIMINAR las tres cifras de Nosotros
   (1958, 3 modelos, 100 %) en los ajustes en naranja del 10-nov-2026, y en su
   lugar va la cronología con HUAWEI de abajo. Se conserva el tipo para el
   bloque `Metricas`, que sigue disponible si vuelve a haber cifras con fuente. */
export const METRICAS: Metrica[] = [];

/** Hitos de ARCFOX con HUAWEI, literales del documento del cliente (ajustes en
    naranja, 10-nov-2026). `fecha` es la etiqueta que se lee —en mayúsculas, como
    la escribió el cliente— y `iso` va al `datetime` de `<time>`, que es lo que
    un buscador o un lector de pantalla puede interpretar como fecha. */
export const CRONOLOGIA: { fecha: string; iso: string; texto: string }[] = [
  {
    fecha: 'SEPTIEMBRE DE 2017',
    iso: '2017-09',
    texto:
      'BAIC BluePark New Energy Technology Co., Ltd. (ARCFOX) y HUAWEI firmaron un acuerdo de cooperación estratégica para desarrollar una colaboración integral en investigación y desarrollo tecnológico, innovación de productos y transformación inteligente.',
  },
  {
    fecha: 'NOVIEMBRE DE 2018',
    iso: '2018-11',
    texto:
      'ARCFOX y HUAWEI firmaron un acuerdo para profundizar su cooperación estratégica. Ambas partes llevarían a cabo investigaciones y colaboraciones en transformación inteligente, integrando tecnologías TIC con vehículos inteligentes.',
  },
  {
    fecha: 'ENERO DE 2019',
    iso: '2019-01',
    texto:
      'ARCFOX y HUAWEI establecieron conjuntamente el «Laboratorio de Innovación 1873», con el objetivo de desarrollar tecnologías de nueva generación para vehículos eléctricos inteligentes y conectados.',
  },
  {
    fecha: 'OCTUBRE DE 2020',
    iso: '2020-10',
    texto:
      'El ARCFOX T fue presentado oficialmente e inició su producción en serie, incorporando las tecnologías de conectividad inteligente y propulsión eléctrica inteligente de HUAWEI.',
  },
  {
    fecha: 'ABRIL DE 2021',
    iso: '2021-04',
    texto:
      'Se presentó oficialmente la nueva versión del ARCFOX S. Desarrollado conjuntamente por ARCFOX y HUAWEI, fue el primer vehículo producido en serie equipado con la solución integral de tecnología inteligente para automóviles de HUAWEI.',
  },
];

/** Los pasos del servicio, de contacto a resultado. La numeración la pone el
    componente: no la escribas en el texto. */
export const PASOS: { titulo: string; texto: string }[] = [
  { titulo: 'Elige tu modelo', texto: 'Selecciona el ARCFOX que te interesa e indícanos tu ciudad.' },
  { titulo: 'Coordina tu visita', texto: 'Un asesor te contactará para confirmar disponibilidad, lugar y horario.' },
  { titulo: 'Vive la conducción eléctrica', texto: 'Conoce el vehículo al volante y resuelve tus dudas durante la visita.' },
];

/** Los pasos de Cotízalo. Mismo bloque que PASOS, otro recorrido. */
export const PASOS_COTIZACION: { titulo: string; texto: string }[] = [
  { titulo: 'Cuéntanos qué buscas', texto: 'Elige tu modelo e indícanos tu ciudad.' },
  { titulo: 'Recibe asesoría', texto: 'Un asesor se pondrá en contacto contigo para conocer tus necesidades.' },
  { titulo: 'Conoce tu cotización', texto: 'Revisa la propuesta y consulta los detalles para continuar.' },
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
    p: '¿Qué significa ARCFOX?',
    r: 'El nombre combina la inspiración del Ártico con el zorro, símbolo de inteligencia y agilidad.',
  },
  {
    p: '¿Qué relación tiene ARCFOX con BAIC?',
    r: 'ARCFOX es la marca de vehículos eléctricos premium de BAIC Group.',
  },
  {
    p: '¿Qué modelos puedo conocer en Ecuador?',
    r: 'Explora el T1, T5 y S5 y consulta la disponibilidad de cada versión con un asesor.',
  },
  {
    p: '¿Los tres modelos son eléctricos?',
    r: 'Sí. T1, T5 y S5 cuentan con propulsión 100% eléctrica.',
  },
  {
    p: '¿Dónde puedo consultar el equipamiento y la garantía?',
    r: 'Solicita información sobre la versión de tu interés. Un asesor te indicará su equipamiento y las condiciones de garantía aplicables en Ecuador.',
  },
];

/** Preguntas de Concesionarios. */
export const FAQ_CONCESIONARIOS: readonly { p: string; r: string }[] = [
  {
    p: '¿Dónde puedo conocer los vehículos?',
    r: 'Consulta los puntos de atención publicados o envíanos tu ciudad para solicitar información.',
  },
  {
    p: '¿Necesito coordinar mi visita?',
    r: 'Te recomendamos contactarnos antes de acudir para confirmar horarios y disponibilidad del modelo.',
  },
  {
    p: '¿Dónde consulto sobre mantenimiento y posventa?',
    r: 'Envíanos tu consulta e indica tu ciudad y modelo para recibir orientación sobre la atención disponible.',
  },
  {
    p: '¿Cómo puedo contactar a un asesor?',
    r: 'Completa el formulario de esta página con tus datos y el motivo de tu consulta.',
  },
];

/** Preguntas de Test drive. */
export const FAQ_TEST_DRIVE: readonly { p: string; r: string }[] = [
  {
    p: '¿Cómo solicito un test drive?',
    r: 'Completa el formulario con tus datos, ciudad y modelo de interés.',
  },
  {
    p: '¿Qué modelos puedo probar?',
    r: 'Puedes solicitar información para probar el T1, T5 o S5. Un asesor confirmará cuáles están disponibles.',
  },
  {
    p: '¿Dónde se realiza la prueba?',
    r: 'El lugar se coordinará contigo según tu ciudad y las opciones disponibles.',
  },
  {
    p: '¿Qué debo llevar y cuánto dura?',
    r: 'El asesor te informará los requisitos y la duración al confirmar la cita.',
  },
];

/** Preguntas de Cotízalo. */
export const FAQ_COTIZACION: readonly { p: string; r: string }[] = [
  {
    p: '¿Cómo conozco el precio de un modelo?',
    r: 'Solicita una cotización para recibir el precio y las condiciones vigentes de la versión que te interesa.',
  },
  {
    p: '¿Qué sucede después de enviar el formulario?',
    r: 'Un asesor se pondrá en contacto contigo para atender tu solicitud.',
  },
  {
    p: '¿Qué hago si todavía no sé qué modelo elegir?',
    r: 'Selecciona el que más te llame la atención e indícanos en el mensaje que deseas comparar opciones.',
  },
  {
    p: '¿Puedo solicitar información desde mi ciudad?',
    r: 'Sí. Indica tu ciudad en el formulario para que podamos orientarte sobre las opciones de atención disponibles.',
  },
];

/** La página /nosotros. Hechos de marca de ARCFOX Global › About y de
    ARCFOX Argentina › Nosotros. La garantía en kilómetros de Global, los
    800 V / 708 km / Huawei de Colombia y los programas «un árbol por compra»
    de Argentina no entran: no son la oferta de Ecuador. */
export const SOBRE = {
  rotulo: 'La marca',
  titular: 'Inspirada en el Ártico',
  bajada:
    'Nace del espíritu explorador del Ártico: ir siempre un poco más lejos. ARCFOX es la marca de vehículos 100% eléctricos de BAIC, y en Ecuador su gama la forman el T5, el T1 y el S5.',
  nombre: [
    {
      titulo: 'ARC',
      texto:
        'El Ártico: avances sin miedo y un paisaje que no perdona lo de más. Así nombra la marca su primera mitad.',
    },
    {
      titulo: 'FOX',
      texto:
        'El zorro ártico: sabiduría y agilidad. El animal que sobrevive donde otros no llegan.',
    },
  ],
  filosofia: [
    {
      titulo: 'Visión',
      texto:
        'Marca premium de nueva energía, con desempeño e innovación de diseño. Lo publica ARCFOX Global.',
    },
    {
      titulo: 'Misión',
      texto:
        'Diseño que le da un trato humano a la técnica, y una experiencia más nueva. Lo publica ARCFOX Global.',
    },
    {
      titulo: 'Eslogan',
      texto: 'Born free. El lema oficial de la marca en ARCFOX Global.',
    },
  ],
  diseno: {
    rotulo: 'Identidad',
    titulo: 'Walter de’Silva',
    cargo: 'Concepto e identidad de la marca, con EDAG',
    texto:
      'En más de cuarenta años diseñó para Audi, Lamborghini, Volkswagen, SEAT y Alfa Romeo. Con ARCFOX lideró, por primera vez, un proyecto de nueva energía para la división eléctrica premium de BAIC. Su regla: reducir a lo esencial y quitar lo que no hace falta.',
    cita: 'Es hora de ser libres como la personalidad e impronta del zorro del Ártico.',
    fuente: 'ARCFOX Argentina, Nosotros',
  },
  origen: [
    {
      titulo: 'BAIC',
      texto:
        'Beijing Automotive Group se funda en 1958. ARCFOX es su marca 100% eléctrica: no es un motor de combustión reconvertido.',
    },
    {
      titulo: 'BluePark × Magna',
      texto:
        'Empresa conjunta de BAIC New Energy y Magna (51:49). La planta de Zhenjiang, China, produce 150.000 unidades al año, ampliables a 300.000. Fue la primera vez que Magna fabricó vehículos fuera de Europa.',
    },
  ],
  cronologia: [
    {
      cuando: '2018',
      titulo: 'La alianza',
      texto: 'BAIC y Magna firman la plataforma de vehículos eléctricos de nueva generación.',
    },
    {
      cuando: '2019',
      titulo: 'IMC y Zhenjiang',
      texto:
        'Se lanza la arquitectura IMC y abre la planta inteligente de BluePark Magna. ARCFOX entra en producción ahí.',
    },
    {
      cuando: '2020',
      titulo: 'Alpha T',
      texto:
        'El primer modelo de la marca pasa a producción en serie. Es historia; no está en el catálogo de Ecuador.',
    },
    {
      cuando: '2021',
      titulo: 'Alpha S',
      texto: 'Llegan Alpha S y Alpha S HI. Tampoco se venden aquí: el catálogo local es T5, T1 y S5.',
    },
    {
      cuando: '2026',
      titulo: 'Ecuador',
      texto: 'ARCFOX entra a la red local con dos SUV y un sedán 100% eléctricos.',
    },
  ],
} as const;

export const PLAN_GLOBAL: Metrica[] = [
  { valor: '1958', etiqueta: 'BAIC se funda', fuente: 'ARCFOX Argentina, Nosotros' },
  { valor: '6', etiqueta: 'Regiones', fuente: 'ARCFOX Global, About' },
  { valor: '40+', etiqueta: 'Países y regiones', fuente: 'ARCFOX Global, About' },
];

export const FAQ_MARCA: readonly { p: string; r: string }[] = [
  {
    p: '¿De dónde viene el nombre ARCFOX?',
    r: 'ARC evoca el Ártico; FOX, al zorro ártico: sabiduría y agilidad. El lema oficial de la marca es Born free. Lo publica la ficha de marca de ARCFOX Argentina, sobre la misma identidad global.',
  },
  {
    p: '¿Quién diseñó ARCFOX?',
    r: 'Walter de’Silva, con EDAG, desarrolló el concepto e identidad de la marca y varios modelos para la división eléctrica premium de BAIC. Lo publica ARCFOX Argentina › Nosotros.',
  },
  {
    p: '¿ARCFOX es de BAIC?',
    r: 'Sí. ARCFOX es la marca de vehículos 100% eléctricos de Beijing Automotive Group (BAIC), fundada en 1958. Se fabrica en la planta conjunta de BAIC BluePark y Magna en Zhenjiang.',
  },
  {
    p: '¿Los Alpha S y Alpha T se venden en Ecuador?',
    r: 'No. Son los primeros modelos de la marca, de 2020 y 2021. El catálogo de Ecuador son el T5, el T1 y el S5.',
  },
  {
    p: '¿Puedo copiar la garantía de Global o de Colombia?',
    r: 'No. Global y Colombia publican periodos distintos. La garantía de Ecuador se confirma en el concesionario; un dato de otro país no se vende como local.',
  },
];

/** Cotízalo, test drive y la red: el proceso es el mismo (elige, te
    contactamos, siguiente paso) y las tres páginas lo leen de `PASOS`.
    Lo propio de cada una es qué recibes, qué esperas y qué haces en sede. */
export const COTIZA = {
  rotulo: 'Cotízalo',
  titular: 'Elige tu ARCFOX',
  bajada:
    'Nombre, ciudad y modelo. Un asesor del concesionario te arma la cotización de Ecuador — no la de otro país.',
  incluye: [
    {
      titulo: 'Precio de Ecuador',
      texto:
        'Condiciones comerciales locales. Un precio de Colombia o de la prensa de otro mercado no se publica aquí.',
    },
    {
      titulo: 'El modelo que eliges',
      texto: 'T5, T1 o S5, con la ficha y el equipamiento que correspondan a la versión de este país.',
    },
    {
      titulo: 'El siguiente paso',
      texto: 'Visita, test drive o cierre, en la ciudad de la red que elijas.',
    },
  ],
} as const;

export const FAQ_COTIZA: readonly { p: string; r: string }[] = [
  {
    p: '¿Hay precios publicados en la web?',
    r: 'No. El precio, el equipamiento y las condiciones de Ecuador se confirman en el concesionario. Un precio de otro país no se copia.',
  },
  {
    p: '¿Qué recibo al enviar el formulario?',
    r: 'Un asesor del punto más cercano te contacta con la cotización del modelo que elegiste y el siguiente paso en tu ciudad.',
  },
  {
    p: '¿Puedo cotizar sin elegir modelo?',
    r: 'El formulario pide un modelo. Si aún no decides, elige el que más se acerque: T5 familiar, T1 SUV o S5 sedán deportivo. El asesor te ayuda a comparar.',
  },
  {
    p: '¿En qué ciudades cotizan?',
    r: `En la red de Ecuador: ${CIUDADES.join(', ')}. Indica tu ciudad y te contacta el punto más cercano.`,
  },
];

export const PRUEBA = {
  rotulo: 'Pruébalo',
  titular: 'Pide un test drive',
  bajada:
    'Reserva una prueba de T5, T1 o S5 en Ecuador. El concesionario de tu ciudad coordina fecha y auto.',
  esperas: [
    {
      titulo: 'Un auto 100% eléctrico',
      texto: 'T5, T1 o S5. Sin motor de combustión ni híbrido: la prueba es la respuesta al acelerar.',
    },
    {
      titulo: 'Tu ciudad',
      texto: 'Una ciudad de la red de Ecuador. No se agenda en una sede de otro país.',
    },
    {
      titulo: 'Fecha coordinada',
      texto:
        'Un asesor te escribe para cerrar día y hora. Qué llevar a la cita lo confirma esa sede: aquí no se inventa.',
    },
  ],
} as const;

export const FAQ_PRUEBA: readonly { p: string; r: string }[] = [
  {
    p: '¿Tengo que comprar para probarlo?',
    r: 'No. El test drive es para conocer el auto. Si después quieres cotizar, el mismo concesionario sigue la conversación.',
  },
  {
    p: '¿Qué modelos puedo probar?',
    r: 'Los tres del catálogo de Ecuador: T5, T1 y S5. La disponibilidad del auto el día de la cita la confirma el concesionario.',
  },
  {
    p: '¿En qué ciudades hay prueba?',
    r: `En ${CIUDADES.join(', ')}. Elige ciudad en el formulario y te contactamos desde el punto más cercano.`,
  },
  {
    p: '¿Cuánto dura y qué documento llevo?',
    r: 'Lo define el concesionario al coordinar. No publicamos una duración ni una lista de papeles que aún no está cerrada.',
  },
];

export const RED = {
  rotulo: 'Red',
  titular: 'Concesionarios en Ecuador',
  bajada:
    'Tres ciudades. Ver el auto, cotizar o pedir un test drive. La calle y el horario de cada sede se publican cuando el concesionario los cierre.',
  acciones: [
    {
      titulo: 'Ver el auto',
      texto: 'T5, T1 o S5 en persona. Las cifras de ficha se confirman ahí, no con la web de otro país.',
    },
    {
      titulo: 'Cotizar',
      texto: 'Precio, equipamiento y condiciones de Ecuador. El formulario de esta página llega al punto más cercano.',
    },
    {
      titulo: 'Probarlo',
      texto: 'Reserva un test drive. El mismo concesionario coordina fecha y modelo.',
    },
  ],
} as const;

export const FAQ_RED: readonly { p: string; r: string }[] = [
  {
    p: '¿Dónde están las sedes?',
    r: `En ${CIUDADES.join(', ')}. La calle exacta y el horario se publican cuando cada concesionario los cierre. Escríbenos y te contactamos desde el punto de tu ciudad.`,
  },
  {
    p: '¿Puedo ir sin cita?',
    r: 'Mejor escribe primero: así el asesor confirma auto, horario y sede. El formulario de esta página o el de Cotízalo bastan.',
  },
  {
    p: '¿Hay postventa en el menú?',
    r: 'La página de postventa existe para revisar, pero la red de talleres aún no está cerrada. No se promociona hasta que haya talleres que publicar.',
  },
  {
    p: '¿Atienden un teléfono o WhatsApp?',
    r: 'El correo oficial está en esta página. Teléfono y WhatsApp se publican cuando el número esté cerrado; mientras tanto, el formulario es la vía.',
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
  ceja: 'Sé parte de un selecto grupo que experimentará antes que nadie una nueva forma de movilidad eléctrica.',
  titular: 'Si esto te encontró, es para ti.',
  /* La segunda frase grande, DESPUÉS de la ceja (orden del cliente,
     12-nov-2026): titular grande → ceja → llamada grande. */
  llamada: 'Déjanos tus datos para enviarte más información.',
  bajada:
    'Sé parte de un selecto grupo que experimentará antes que nadie una nueva forma de movilidad eléctrica, con ARCFOX en Ecuador.',
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
  /** Al llegar a cero. Vacío a propósito: el cliente pidió retirar «Ya está
      aquí» (revisión del 2026-10-13) y, con la fecha pasada, la regla sola
      cierra el titular sin anunciar nada. Vacío no deja un hueco: el contador
      quita el párrafo de la fecha en vez de pintarlo sin texto. */
  llegada: '',
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
  llamada: CAMPAÑA.llamada,
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
  /** Acuse tras un envío correcto. Test drive pasa el suyo. */
  confirmacion:
    '¡Gracias por tu interés en ARCFOX Ecuador! Recibimos tu solicitud. Un asesor se pondrá en contacto contigo.',
  confirmacionPrueba:
    'Recibimos tu solicitud. Un asesor te contactará para confirmar disponibilidad, fecha y lugar de la prueba.',
  error: 'No pudimos enviar tu solicitud. Inténtalo nuevamente.',
} as const;

/* EL FORMULARIO DE COTIZACIÓN ES EL DE AYASA, no el nuestro (correo del cliente,
   10-nov-2026): va en un iframe y los datos llegan directo a su CRM, con su
   propio Aviso de Privacidad y su propia casilla. Por eso esas páginas no pintan
   `AVISO_DATOS`: duplicarlo al lado de un formulario ajeno pediría un
   consentimiento que no es el que se registra.

   OJO: el portal sólo se deja incrustar en los dominios de su cabecera
   `frame-ancestors`. Si el del sitio no está en esa lista, el navegador pinta
   el marco vacío; por eso el bloque lleva siempre el enlace para abrirlo aparte. */
export const FORMULARIO_COTIZACION = {
  url: 'https://ayas-formweb-prd.powerappsportals.com/tools/arcfox/form-quote-general/',
  titulo: 'Formulario de cotización de ARCFOX',
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
/* La pantalla de «gracias» que cierra el protocolo (pedido del cliente,
   11-nov-2026: «un thank you page que cierre la conversación»). Vive DENTRO
   de la página y no en una URL aparte porque followdafox y la puerta se
   despliegan podados a una sola página: un `/gracias` no existiría ahí.
   Sólo se pinta si el envío LLEGÓ; sin endpoint o sin red no se agradece un
   registro que no ha ocurrido. Texto del cliente (12-nov-2026). */
export const GRACIAS_PROTOCOLO = {
  titular: 'Gracias por registrarte',
  texto: 'Te estaremos enviando más información.',
  redes: 'Síguenos en Instagram',
} as const;

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
  'Las imágenes son referenciales. Los colores, acabados y equipamiento pueden variar según la versión disponible en Ecuador. Consulta las especificaciones y condiciones comerciales del modelo de tu interés.';

/** Nota corta junto a cada bloque de cifras. Misma idea que AVISO_LEGAL. */
export const AVISO_CIFRAS =
  'Las cifras de esta ficha son las que confirma ARCFOX Ecuador sobre la ficha global de la marca. La versión para Ecuador se confirma en el concesionario.';

/* LAS RUTAS LEGALES. Las que siguen vacías lo están a propósito: `cookies` y
   `terminos` esperan el texto de Foton (Iván Esparza y Darío Pacheco en el hilo
   «LEGALES ARCFOX»).

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
  /** La política de cookies. Foton la llama «Legal» en su barra. */
  cookies: '/cookies',
  /* Calidad, Ambiental y Seguridad y Salud Ocupacional, en una página propia. Ésta sí
     tiene texto: lo envió Foton y vive literal en `lib/politicas.ts`. */
  politicas: '/politicas',
  terminos: '',
  /** El Aviso de Privacidad de AYASA (L-00-GG-09-02), publicado literal. */
  privacidad: '/privacidad',
} as const;

/* Los documentos legales en el orden y con los nombres de la barra que pidió
   Foton: «Legal | Políticas SIG | Términos y Condiciones | Aviso de Privacidad».
   El pie y cada página legal leen esta lista; sólo entra lo que tiene ruta. */
export const DOCUMENTOS_LEGALES: { ruta: string; etiqueta: string }[] = [
  { ruta: LEGAL.cookies, etiqueta: 'Legal' },
  { ruta: LEGAL.politicas, etiqueta: 'Políticas SIG' },
  { ruta: LEGAL.terminos, etiqueta: 'Términos y Condiciones' },
  { ruta: LEGAL.privacidad, etiqueta: 'Aviso de Privacidad' },
].filter((documento) => documento.ruta);

/* EL AVISO DE TRATAMIENTO DE DATOS, LITERAL. Lo redactó el área legal de AYASA
   (Vanessa Estévez, 30-sep-2026) y «su contenido no puede ser modificado»: ni
   una coma se corrige aquí, ni siquiera las que parecen erratas. Va al pie de
   cada formulario con su casilla, que NUNCA sale marcada.

   Dos variantes porque test drive pide además datos sensibles (copia de cédula
   y licencia) y legal redactó un aviso propio para eso. Cotización, citas de
   posventa y cotización de repuestos usan el general.

   `scripts/verificar-formulario.mjs` comprueba frases literales en `dist/`: si
   alguien «mejora» la redacción, la puerta falla. */
const RESPONSABLES =
  'AUTOMOTORES Y ANEXOS S.A. (A.Y.A.S.A.), FOTON DEL ECUADOR SOCIEDAD CIVIL Y COMERCIAL, TELEMÁTICA EQUINOCCIAL TELEQUINOX S.A., ALMACENERA AUTOMOTRIZ ALMOTRIZ S.A., ENAERENTACAR S.A., en adelante (LAS EMPRESAS) en calidad de Responsables del Tratamiento, informan al cliente sobre el uso interno de sus datos personales:';
const FINALIDADES =
  'LAS EMPRESAS tratarán sus datos personales identificativos y de contacto para las siguientes finalidades: atender sus requerimientos comerciales, contacto directo y proactivo, actividades de marketing y sondeo de mercado, envío de encuestas de satisfacción y gestión de la relación comercial.';
const CONSERVACION =
  'La conservación de los datos personales será por el tiempo estrictamente necesario para el cumplimiento de las finalidades detalladas en el presente aviso, empleando las medidas tecnológicas, administrativas o jurídicas que sean necesarias para garantizar la protección de sus datos.';
const CORREO_DATOS = 'datos@ayasa.com.ec';
const consentimiento = (datos: string) =>
  `El Cliente, libre y voluntariamente autoriza a LAS EMPRESAS a tratar sus datos personales: ${datos} para que LAS EMPRESAS puedan: consultar, transferir, validar; y, en general, tratar los datos personales únicamente en cumplimiento de las finalidades detalladas en el presente aviso. El Cliente declara que ha sido informado sobre los usos internos de sus datos personales y el proceso para el ejercicio de sus derechos, por tanto, garantiza la veracidad de la información entregada y se compromete a comunicar de manera oportuna cualquier cambio o modificación de los mismos. LAS EMPRESAS no serán responsables de los resultados derivados del procesamiento de datos personales inexactos, erróneos o falaces.`;

export const AVISO_DATOS = {
  titulo: 'AVISO DE TRATAMIENTO DE DATOS',
  correo: CORREO_DATOS,
  /** Lo sigue `correo`, que se pinta como enlace. */
  derechos: 'El Cliente, en calidad de titular, puede ejercer sus derechos de protección de datos personales enviando un correo electrónico a:',
  /** Cierra el párrafo de finalidades. Va aparte porque legal la escribe en negrita. */
  masInformacion: 'Más información en nuestro Aviso de Privacidad colocado en la Página Web.',
  tituloConsentimiento: 'Declaración de consentimiento informado. -',
  /** «Declaro que he leído…» — el final, «Aviso de Privacidad», enlaza a LEGAL.privacidad. */
  casilla: 'Declaro que he leído y acepto el tratamiento de mis datos personales, así como el',
  casillaEnlace: 'Aviso de Privacidad',
  general: {
    responsables: RESPONSABLES,
    finalidades: `${FINALIDADES} La base legal para la ejecución de estas actividades es su consentimiento expreso e inequívoco. ${CONSERVACION}`,
    consentimiento: consentimiento('identificativos y de contacto'),
  },
  pruebaManejo: {
    responsables: RESPONSABLES,
    finalidades: `${FINALIDADES} Los datos personales sensibles (copia de cédula y licencia) serán utilizados para validar la identidad del cliente que se encuentra en posesión temporal del vehículo y para acreditar que se encuentra legalmente habilitado para su conducción durante la prueba de manejo solicitada. ${CONSERVACION}`,
    consentimiento: consentimiento('identificativos, de contacto y sensibles'),
  },
} as const;
