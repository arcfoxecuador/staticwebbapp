/* LAS POLÍTICAS CORPORATIVAS QUE SE PUBLICAN EN /politicas.

   El texto es LITERAL de los documentos que envió Foton («LEGALES WEB ARCFOX»,
   octubre de 2026). No lo redacta quien programa: si una frase está mal, se pide
   la corrección a Foton y se copia la versión nueva, no se arregla aquí. Lo
   único que se quitó es lo interno del documento (control de versiones,
   distribución, responsabilidades), que no es para el público.

   De la de Calidad y la Ambiental se publica la sección POLÍTICAS y su
   referencia normativa; la de Seguridad se publica entera, con su firma. La
   Ambiental llegó aparte (L-80-AW-05-01, elaborada el 07/10/2026) y su propio
   documento asigna a Marketing «subirla a la página web de ARCFOX». */

export interface Politica {
  /** Ancla de la sección dentro de /politicas. */
  id: string;
  titulo: string;
  /** Código del documento en el sistema de gestión, si lo tiene. */
  codigo?: string;
  introduccion: string[];
  compromisos: { titulo?: string; texto: string }[];
  cierre: string[];
  /** Norma o documento de referencia que cita la política. */
  referencia?: string;
  firma?: { lugar: string; cargo: string; nombre: string };
}

export const POLITICAS: Politica[] = [
  {
    id: 'calidad',
    titulo: 'Política de Gestión de la Calidad',
    codigo: '90-AQ-00-01',
    introduccion: [
      'ARCFOX, es una compañía del Grupo AYASA, que distribuye una marca de vehículos comerciales más grande de China especializada en vehículos livianos, talleres y repuestos.',
      'Nos comprometemos a proporcionar productos y servicios de alta calidad que cumplan con las expectativas y requisitos de nuestros clientes en el sector de vehículos comerciales. Para asegurar esto, hemos establecido la siguiente Política de Calidad:',
    ],
    compromisos: [
      {
        titulo: 'Compromiso con la satisfacción del cliente',
        texto:
          'Nos esforzamos por entender y satisfacer las necesidades actuales y futuras de nuestros clientes, asegurando la calidad de nuestros productos y servicios en todo momento.',
      },
      {
        titulo: 'Cumplimiento con los requisitos',
        texto:
          'Cumplimos con todos los requisitos legales y reglamentarios aplicables, así como con los requisitos específicos de nuestros clientes.',
      },
      {
        titulo: 'Mejora continua',
        texto:
          'Promovemos la mejora continua de nuestros procesos, productos y servicios, utilizando métodos de evaluación y retroalimentación para asegurar la eficacia de nuestro Sistema de Gestión de Calidad.',
      },
      {
        titulo: 'Desarrollo de competencias',
        texto:
          'Fomentamos el desarrollo y la capacitación de nuestro personal, proporcionándoles las habilidades y conocimientos necesarios para desempeñarse eficazmente en sus funciones.',
      },
      {
        titulo: 'Relaciones con proveedores',
        texto:
          'Trabajamos en estrecha colaboración con nuestros proveedores para asegurar la calidad de los componentes y servicios que recibimos, garantizando así la calidad final de nuestros productos.',
      },
      {
        titulo: 'Comunicación efectiva',
        texto:
          'Fomentamos la comunicación efectiva dentro de la organización y con todas las partes interesadas relevantes, asegurando una comprensión clara de nuestra Política de Calidad y nuestros objetivos.',
      },
    ],
    cierre: [
      'Esta Política de Calidad es comunicada y entendida dentro de toda la organización y está disponible para las partes interesadas pertinentes. Nos comprometemos a revisar regularmente nuestra Política de Calidad para asegurar su continua adecuación y relevancia.',
    ],
    referencia: 'ISO 9001:2015',
  },
  {
    id: 'ambiental',
    titulo: 'Política Ambiental',
    codigo: 'L-80-AW-05-01',
    introduccion: [
      'En ARCFOX, estamos comprometidos con la excelencia en la gestión ambiental en todas nuestras operaciones de comercialización. Reconocemos la importancia de la sostenibilidad ambiental y estamos comprometidos al cuidado y conservación del ambiente y al cumplimiento de los requisitos legales, normativa ambiental vigente y las expectativas de nuestros clientes y partes interesadas.',
      'Para asegurar esto, hemos establecido la siguiente Política Ambiental:',
    ],
    compromisos: [
      {
        titulo: 'Cumplimiento Legal y Reglamentario',
        texto:
          'Nos comprometemos a cumplir con todas las leyes, regulaciones y normativas ambientales aplicables a nuestras operaciones de comercialización. Mantendremos un sistema de monitoreo continuo para asegurar que nuestras prácticas se alineen con las exigencias legales vigentes.',
      },
      {
        titulo: 'Prevención de la Contaminación y Reducción de Impactos',
        texto:
          'Implementaremos medidas para prevenir la contaminación y minimizar los impactos ambientales asociados con nuestras actividades, incluyendo la gestión adecuada de residuos no peligrosos, generados en nuestras operaciones.',
      },
      {
        titulo: 'Uso Eficiente de Recursos',
        texto:
          'Fomentaremos el uso eficiente de recursos naturales en nuestras operaciones, promoviendo prácticas sostenibles en la gestión de energía, agua y materiales. Estableceremos objetivos para reducir el consumo de recursos y minimizar el desperdicio en nuestros centros de servicio.',
      },
      {
        titulo: 'Innovación y Mejora Continua',
        texto:
          'Adoptaremos tecnologías y prácticas innovadoras que contribuyan a la sostenibilidad ambiental, incluyendo la optimización de procesos y la implementación de soluciones que reduzcan nuestro impacto ambiental. Evaluaremos y revisaremos continuamente nuestro desempeño para identificar áreas de mejora y establecer metas ambientales claras.',
      },
      {
        titulo: 'Responsabilidad y Participación',
        texto:
          'Promoveremos una cultura de responsabilidad ambiental entre nuestros empleados, proveedores y clientes. Realizamos capacitaciones sobre prácticas ambientales y motivaremos a nuestro personal a participar activamente en iniciativas de sostenibilidad.',
      },
      {
        titulo: 'Comunicación y Transparencia',
        texto:
          'Mantendremos una comunicación abierta y transparente con nuestros empleados, clientes y la comunidad sobre nuestras políticas y desempeño ambiental.',
      },
      {
        titulo: 'Adaptabilidad y Resiliencia',
        texto:
          'Evaluaremos y gestionaremos los riesgos ambientales asociados con nuestras operaciones para garantizar nuestra capacidad de adaptación.',
      },
    ],
    cierre: [],
    referencia: 'ISO 14001:2026',
  },
  {
    id: 'seguridad',
    titulo: 'Política de Seguridad, Salud Ocupacional',
    introduccion: [
      'FOTON DEL ECUADOR SCC, empresa del sector automotriz dedicada a la distribución, comercialización y servicio postventa de vehículos, repuestos, lubricantes y accesorios a nivel nacional, declara su compromiso de proteger la seguridad y salud de todos sus trabajadores, contratistas, proveedores y demás partes interesadas.',
      'Para ello, la organización se compromete a:',
    ],
    compromisos: [
      {
        texto:
          'Proporcionar condiciones de trabajo seguras y saludables para la prevención de lesiones y deterioro de la salud relacionados con el trabajo.',
      },
      {
        texto:
          'Identificar peligros, eliminar los mismos cuando sea posible y reducir los riesgos de seguridad y salud ocupacional derivados de sus actividades, productos y servicios.',
      },
      {
        texto:
          'Cumplir con la legislación nacional vigente en materia de seguridad y salud en el trabajo, así como con otros requisitos aplicables asumidos por la organización.',
      },
      {
        texto:
          'Promover la consulta y participación de los trabajadores y sus representantes en la gestión de la seguridad y salud ocupacional.',
      },
      {
        texto:
          'Garantizar la asignación de los recursos humanos, técnicos y económicos necesarios para la implementación, mantenimiento y mejora continua del Sistema de Gestión de Seguridad y Salud en el Trabajo.',
      },
      {
        texto:
          'Mejorar continuamente el desempeño del Sistema de Gestión de Seguridad y Salud en el Trabajo mediante la revisión periódica de objetivos, indicadores y programas de prevención.',
      },
    ],
    cierre: [
      'La presente política constituye el marco de referencia para el establecimiento de los objetivos del Sistema de Gestión de Seguridad y Salud en el Trabajo y será comunicada, comprendida y aplicada en todos los niveles de la organización.',
    ],
    firma: {
      lugar: 'DM Quito, Mayo 2026',
      cargo: 'Representante legal',
      nombre: 'PAGOLA LANGER ENRIQUE JAVIER',
    },
  },
];
