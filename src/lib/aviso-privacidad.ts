/* EL AVISO DE PRIVACIDAD, LITERAL. Documento L-00-GG-09-02 de AYASA, versión
   2.0 (24/11/2025), que llegó en Word el 20-oct-2026 por el hilo «LEGALES
   ARCFOX». «Su contenido no puede ser modificado»: las erratas del original
   («recovar», «personajes», «falases», la dirección «(nueva dirección Quito)»)
   se quedan como están hasta que legal envíe otra versión. Lo único que se
   ajustó es forma: un párrafo que el Word partía a media frase va unido, y las
   viñetas escritas a mano («•») son elementos de lista.

   Se generó desde el .docx y no se escribe a mano. Si llega la versión 3, se
   regenera entero en vez de parchear frases sueltas. */

export type Bloque =
  | { t: 'h2' | 'h3' | 'h4' | 'p'; texto: string }
  | { t: 'ul'; items: { fuerte: string; texto: string; lineas?: string[] }[] }
  | { t: 'versiones' };

export const AVISO_PRIVACIDAD = {
  codigo: 'L-00-GG-09-02',
  version: "2.0",
  fecha: "24/11/2025",
  versiones: { cabecera: ["Versión", "Fecha", "Descripción del Cambio", "Responsable"], filas: [
  [
    "1.0",
    "13/09/2024",
    "Emisión inicial del documento.",
    "Cumplimiento y legal"
  ],
  [
    "2.0",
    "24/11/2025",
    "Actualización de contenidos, estructura y procedimientos internos conforme nueva normativa / práctica interna.",
    "Cumplimiento y legal (conformidad del DPO)"
  ]
] },
  bloques: [
  {
    "t": "h2",
    "texto": "DECLARACIÓN DE COMPROMISO"
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS; expresan su compromiso con la protección de los datos personales de sus clientes, proveedores, colaboradores y terceros en general. Obligándonos a:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Respetar y aplicar los principios establecidos en la Ley Orgánica de Protección de Datos Personales (LOPDP) y su Reglamento."
      },
      {
        "fuerte": "",
        "texto": "Tratar los datos personales únicamente para las finalidades legítimas, explícitas e informadas al titular."
      },
      {
        "fuerte": "",
        "texto": "Implementar medidas técnicas, organizativas y legales que garanticen la seguridad, confidencialidad e integridad de la información."
      },
      {
        "fuerte": "",
        "texto": "Facilitar a los titulares el ejercicio de sus derechos de acceso, rectificación, actualización, eliminación, oposición, portabilidad y demás previstos en la normativa vigente."
      },
      {
        "fuerte": "",
        "texto": "Mantener la transparencia en las operaciones de tratamiento, informando de manera clara y accesible a los titulares sobre el uso de sus datos."
      }
    ]
  },
  {
    "t": "p",
    "texto": "Con esta declaración, reiteramos nuestro compromiso de actuar con responsabilidad y diligencia en el manejo de los datos personales que nos sean confiados."
  },
  {
    "t": "h2",
    "texto": "IDENTIDAD Y DOMICILIO DE LOS RESPONSABLES DEL TRATAMIENTO"
  },
  {
    "t": "p",
    "texto": "A efectos del presente Aviso de Privacidad, serán Responsables del Tratamiento las empresas que se detallan a continuación:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "Responsable del Tratamiento:",
        "texto": "AUTOMOTORES Y ANEXOS S.A. (A.Y.A.S.A.).",
        "lineas": [
          "RUC: 179001479700",
          "Dirección: Av. Orellana E2-30 y Av. 10 de Agosto."
        ]
      },
      {
        "fuerte": "Responsable del Tratamiento:",
        "texto": "FOTON DEL ECUADOR SOCIEDAD CIVIL Y COMERCIAL",
        "lineas": [
          "RUC: 1792364477001",
          "Dirección: AV GALO PLAZA LASSO N64-167 Y JOSE AMESABA"
        ]
      },
      {
        "fuerte": "Responsable del Tratamiento:",
        "texto": "TELEMÁTICA EQUINOCCIAL TELEQUINOX S.A.",
        "lineas": [
          "RUC: 1792469120001",
          "Dirección: AV DE LOS GRANADOS E11-124 Y AV 6 DE DICIEMBRE"
        ]
      },
      {
        "fuerte": "Responsable del Tratamiento:",
        "texto": "ENAERENTACAR S.A.",
        "lineas": [
          "RUC: 1792701600001",
          "Dirección: Av. Orellana E2-30 y Av. 10 de Agosto."
        ]
      },
      {
        "fuerte": "Responsable del Tratamiento:",
        "texto": "ALMACENERA AUTOMOTRIZ ALMOTRIZ S.A.",
        "lineas": [
          "RUC: 1391920857001",
          "Dirección: (nueva dirección Quito)"
        ]
      }
    ]
  },
  {
    "t": "p",
    "texto": "Los titulares de datos personales podrán contactarse con el Delegado de Protección de Datos Personales (DPD) a través del correo electrónico: datos@ayasa.com.ec para cualquiera o todas los Responsables del Tratamiento arriba enlistados."
  },
  {
    "t": "h2",
    "texto": "ALCANCE"
  },
  {
    "t": "p",
    "texto": "El presente Aviso de Privacidad es aplicable a todas las relaciones comerciales o contractuales en donde por su naturaleza, deba realizarse actividades tratamiento de datos personales de: aspirantes, colaboradores, excolaboradores, clientes, prospectos, proveedores, accionistas, directorio, representantes legales, entre otros que mantengan relación directa o potencial con LAS EMPRESAS."
  },
  {
    "t": "h2",
    "texto": "DEFINICIONES"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "Consentimiento:",
        "texto": "manifestación de la voluntad, libre, específica, informada e inequívoca, por el cual el titular de datos personales autoriza al Responsable del tratamiento de datos personales su utilización."
      },
      {
        "fuerte": "Dato biométrico:",
        "texto": "dato personal único, relativo a las características físicas o fisiológicas, o conductas de una persona natural que permita o confirme la identificación única de dicha persona, como imágenes faciales o datos dactiloscópicos, entre otros."
      },
      {
        "fuerte": "Dato personal crediticio:",
        "texto": "son aquellos datos que integran el comportamiento económico de personas naturales, para analizar su capacidad financiera."
      },
      {
        "fuerte": "Dato personal:",
        "texto": "dato que identifica o hace identificable a una persona natural, directa o indirectamente."
      },
      {
        "fuerte": "Dato sensible:",
        "texto": "datos relativos a: etnia, identidad de género, identidad cultural, religión, ideología, filiación política, pasado judicial, condición migratoria, orientación sexual, salud, datos biométricos, datos genéticos y aquellos cuyo tratamiento indebido pueda dar origen a discriminación, atenten o puedan atentar contra los derechos y libertades fundamentales"
      },
      {
        "fuerte": "Delegado de Protección de Datos Personales (DPD):",
        "texto": "Profesional especializado que asesora al Responsable en el cumplimiento de la Ley Orgánica de Protección de Datos Personales y su Reglamento, adicionalmente."
      },
      {
        "fuerte": "Destinatario:",
        "texto": "persona natural o jurídica que ha sido comunicada con datos personales, diferente al titular, Encargado y Responsable del tratamiento de datos."
      },
      {
        "fuerte": "Encargado del tratamiento protección de datos:",
        "texto": "persona natural o jurídica que trata datos personales bajo la instrucción clara del Responsable del tratamiento de datos personales."
      },
      {
        "fuerte": "LAS EMPRESAS:",
        "texto": "Para efectos del presente Aviso de Privacidad, se denomina a: Automotores y Anexos S.A. (A.Y.A.S.A.), Foton del Ecuador Sociedad Civil y Comercial, Telemática Equinoccial Telequinox S.A., Enaerentacar S.A., Almacenera Automotriz Almotriz S.A., como “LAS EMPRESAS”."
      },
      {
        "fuerte": "LOPDP:",
        "texto": "Ley Orgánica de Protección de Datos Personales de 26 de mayo de 2021 Registro Oficial Suplemento 459."
      },
      {
        "fuerte": "Reglamento:",
        "texto": "Reglamento General de la Ley Orgánica de Protección de Datos Personales. Decreto Presidencial No. 904, Tercer Suplemento del Registro Oficial No.435, 13 de Noviembre 2023"
      },
      {
        "fuerte": "Responsable del tratamiento de datos personales:",
        "texto": "persona natural o jurídica que decide sobre la finalidad y tratamiento de los datos personales."
      },
      {
        "fuerte": "Titular:",
        "texto": "persona natural cuyos datos personales son objeto del tratamiento (clientes, proveedores, colaboradores, entre otros)."
      },
      {
        "fuerte": "Transferencia/Comunicación:",
        "texto": "manifestación, declaración, entrega, consulta, interconexión, cesión, transmisión, difusión, divulgación o cualquier forma de revelación de datos personales realizada a una persona distinta al titular, Responsable o Encargado del tratamiento de datos personales. Los datos personales que comuniquen deben ser exactos, completos y actualizados."
      },
      {
        "fuerte": "Tratamiento:",
        "texto": "toda operación o conjunto de operaciones realizadas con datos personales, ya sea por procedimientos técnicos de carácter automatizado, parcialmente automatizado o no automatizado."
      },
      {
        "fuerte": "Vulneración de la seguridad de datos personales:",
        "texto": "incidente de seguridad que afecta la confidencialidad, disponibilidad o integridad de datos personales."
      },
      {
        "fuerte": "Categorías especiales de datos:",
        "texto": "son aquellos datos personales sobre niños, niñas y adolescentes, personas con discapacidad física o mental y aquellas que se encuentren en situación de vulnerabilidad cuyos datos personales podrían afectar directamente los derechos y libertades de titulares."
      }
    ]
  },
  {
    "t": "h2",
    "texto": "MARCO LEGAL APLICABLE"
  },
  {
    "t": "p",
    "texto": "El desarrollo del presente Aviso de Privacidad se realizó en base al cumplimiento de la normativa vigente que regula la ejecución y respeto de la materia."
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Constitución de la República del Ecuador"
      },
      {
        "fuerte": "",
        "texto": "Ley Orgánica de Protección de Datos Personales"
      },
      {
        "fuerte": "",
        "texto": "Reglamento General de la Ley Orgánica de Protección de Datos Personales"
      }
    ]
  },
  {
    "t": "h2",
    "texto": "CONSENTIMIENTO DEL TITULAR"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Dentro de LAS EMPRESAS, los datos personales son tratados en virtud del cumplimiento del principio de transparencia y lealtad, por ende, todo proceso de almacenamiento, recolección, circulación y en general cualquier uso de los datos personales, comienza con la autorización previa e informada del titular, con excepción de aquellas que por su naturaleza no lo requieran."
      },
      {
        "fuerte": "",
        "texto": "La autorización del titular podrá hacerse constar en un documento físico, digital o electrónico, por internet o a través del portal Web y cualquier otro cuya autorización pueda conservarse en el tiempo."
      },
      {
        "fuerte": "",
        "texto": "En caso de las cámaras de vigilancia instaladas en las respectivas agencias o sucursales serán necesarias por temas de seguridad."
      }
    ]
  },
  {
    "t": "h3",
    "texto": "Casos que no requieren consentimiento del titular"
  },
  {
    "t": "p",
    "texto": "En virtud del cumplimiento a la ley, nosotros no solicitaremos la autorización del titular en los siguientes casos o tratamientos:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Los datos personales sean requeridos por una entidad pública, administrativa en ejercicio de sus funciones;"
      },
      {
        "fuerte": "",
        "texto": "Datos personales que sean de acceso al público, cuya finalidad no podrá ser diferente a la que motivó su publicación en un principio;"
      },
      {
        "fuerte": "",
        "texto": "Casos en donde se vean involucrados intereses vitales de un tercero o del titular de datos personales;"
      },
      {
        "fuerte": "",
        "texto": "Para satisfacer un interés legítimo del Responsable de tratamiento o de un tercero, siempre que no prevalezca el interés o derechos fundamentales de los titulares al amparo de lo dispuesto en esta norma."
      }
    ]
  },
  {
    "t": "h3",
    "texto": "Revocatoria del consentimiento"
  },
  {
    "t": "p",
    "texto": "Todo titular de datos personales tiene derecho a recovar su consentimiento en cualquier momento de la relación precontractual o contractual con LAS EMPRESAS, sin que para el efecto medie justificación alguna, en los siguientes casos:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Su revocatoria no afecte derechos o libertades de terceros;"
      },
      {
        "fuerte": "",
        "texto": "Cuando perjudique el cumplimiento de un interés legítimo de LAS EMPRESAS;"
      },
      {
        "fuerte": "",
        "texto": "Cuando la ley se lo permita;"
      }
    ]
  },
  {
    "t": "p",
    "texto": "Su revocatoria podrá ser total o parcial, en el primer caso, se suspenderá todo tratamiento de datos personales; y, será parcial cuando explícitamente solicite la suspensión u oposición de una actividad de tratamiento determinado."
  },
  {
    "t": "p",
    "texto": "En cualquier caso, LAS EMPRESAS se comprometen a atender la petición en los términos y excepciones que prevé la ley, según corresponda el caso."
  },
  {
    "t": "p",
    "texto": "Para que el titular pueda revocar su consentimiento, deberá dirigir su petición al correo electrónico: datos@ayasa.com.ec en donde el Delegado de Protección de Datos Personales se comunicará directamente. LAS EMPRESAS se reservan el derecho de negar la petición total o parcial, en los parámetros exigidos por la ley."
  },
  {
    "t": "h2",
    "texto": "CATEGORÍAS DE TITULARES"
  },
  {
    "t": "p",
    "texto": "A efectos del presente Aviso de Privacidad, los titulares de datos personales son: aspirantes, colaboradores, excolaboradores, clientes, prospectos, accionistas, miembros del Directorio."
  },
  {
    "t": "h3",
    "texto": "Ejercicio de derechos"
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS garantizan el ejercicio de los derechos de protección de datos personales, reconocidos a su favor:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Información y Acceso: Conocer de forma clara y precisa el uso de sus datos y acceder gratuitamente a ellos."
      },
      {
        "fuerte": "",
        "texto": "Rectificación y Actualización: Solicitar la corrección o actualización de datos inexactos o incompletos."
      },
      {
        "fuerte": "",
        "texto": "Eliminación: Pedir la supresión de sus datos cuando el tratamiento no cumpla con la normativa."
      },
      {
        "fuerte": "",
        "texto": "Oposición y Revocatoria del consentimiento: Negarse o revocar su autorización, especialmente para fines de mercadotecnia, siempre que no se afecten derechos de terceros."
      },
      {
        "fuerte": "",
        "texto": "Portabilidad: Solicitar la entrega de sus datos en un formato estructurado e interoperable, o su transmisión a otro responsable."
      },
      {
        "fuerte": "",
        "texto": "Reclamo: Presentar quejas ante la autoridad de control, Superintendencia de Protección de Datos Personales, cuando considere que sus derechos han sido vulnerados."
      }
    ]
  },
  {
    "t": "p",
    "texto": "El ejercicio de estos derechos podrá ser limitado conforme a las excepciones previstas en el artículo 18 de la LOPDP, por ejemplo, cuando los datos sean necesarios para el cumplimiento de obligaciones legales o contractuales, órdenes judiciales, defensa de reclamos, protección de intereses vitales o cuando medie interés público."
  },
  {
    "t": "h3",
    "texto": "Procedimiento para el ejercicio de sus derechos"
  },
  {
    "t": "p",
    "texto": "Todos los titulares de datos personajes podrán, en cualquier momento, presentar solicitudes o quejas acerca del tratamiento de sus datos personales, para el ejercicio oportuno de sus derechos reconocidos en la Ley Orgánica de Protección de Datos Personales."
  },
  {
    "t": "p",
    "texto": "Para ejercer sus derechos usted debe dirigir una solicitud al correo electrónico: datos@ayasa.com.ec , cumpliendo con los siguientes requisitos establecidos en la mencionada ley:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Nombres y apellidos completos del titular de los datos;"
      },
      {
        "fuerte": "",
        "texto": "Número de cédula y dirección (física o electrónica) para notificaciones;"
      },
      {
        "fuerte": "",
        "texto": "Cuando se actúa en calidad de presentante legal, se hará constar también los datos del presentado;"
      },
      {
        "fuerte": "",
        "texto": "La descripción clara y precisa de los datos personales respecto de los cuales busca ejercer algún derecho;"
      },
      {
        "fuerte": "",
        "texto": "La petición de forma clara y precisa;"
      },
      {
        "fuerte": "",
        "texto": "Mencionar los derechos que quiere ejercer;"
      },
      {
        "fuerte": "",
        "texto": "Presentar documentos que acrediten su condición de titular de datos personales, por ejemplo, su cédula de ciudadanía, identidad, pasaporte y documentos del vehículo."
      }
    ]
  },
  {
    "t": "p",
    "texto": "En caso de recibir su solicitud incompleta, nos acojeremos al Art. 14 del Reglamento a la Ley Orgánica de Protección de Datos Personales para solicitarle completar o ampliar su solicitud, lo haremos dentro de los siguientes cinco (5) días laborables desde que recibimos su solictud."
  },
  {
    "t": "p",
    "texto": "Apartir del día siguiente de nuestra notificación, usted tendrá 10 días laborables para completar su solicitud. De no completarla en ese término, procederemos a notificarle con el archivo de su requerimiento."
  },
  {
    "t": "p",
    "texto": "El titular tiene derecho a oponerse al marketing directo, incluyendo la creación de perfiles con esta finalidad. Podrá también rechazar las comunicaciones de marketing, siguiendo las instrucciones que reciba oportunamente en las comunicaciones enviadas por nosotros."
  },
  {
    "t": "h2",
    "texto": "TRATAMIENTO DE DATOS PERSONALES"
  },
  {
    "t": "p",
    "texto": "En virtud del cumplimiento normativo, todos los tratamientos de datos que se realicen LAS EMPRESAS se realizarán en el marco de cumplimiento y respeto a la Ley Orgánica de Protección de Datos Personales y su Reglamento."
  },
  {
    "t": "h3",
    "texto": "Tratamiento de datos personales de clientes o prospectos"
  },
  {
    "t": "p",
    "texto": "Los datos personales obtenidos directamente del titular, en el marco de su interacción comercial con LAS EMPRESAS, serán utilizados conforme el presente apartado. LAS EMPRESAS únicamente realizan actividades de tratamiento por iniciativa del titular."
  },
  {
    "t": "h4",
    "texto": "Origen del dato"
  },
  {
    "t": "p",
    "texto": "Los datos personales del cliente o prospecto serán registrados en los siguientes casos:"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Cuando usted proporciona su información a través de redes sociales, páginas web, ferias promocionales o en nuestras instalaciones, con el fin de solicitar cotizaciones o información sobre nuestros productos y servicios."
      },
      {
        "fuerte": "",
        "texto": "Cuando entrega sus datos al concretar la compra de un producto o la contratación de un servicio."
      }
    ]
  },
  {
    "t": "h4",
    "texto": "Finalidades de las actividades de tratamiento para clientes"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Comunicación personalizada en atención a sus requerimientos;"
      },
      {
        "fuerte": "",
        "texto": "Cotización de vehículos, repuestos, accesorios y servicios posventa."
      },
      {
        "fuerte": "",
        "texto": "Registro y cobertura de garantía;"
      },
      {
        "fuerte": "",
        "texto": "Para realizar actividades de marketing o sondeo de mercado (prospección comercial);"
      },
      {
        "fuerte": "",
        "texto": "Contacto para el recordatorio de servicios de mantenimiento;"
      },
      {
        "fuerte": "",
        "texto": "Comunicación de su información a las marcas de vehículos que comercializamos para fines de registro, seguimiento y garantía;"
      },
      {
        "fuerte": "",
        "texto": "Prospección comercial y análisis estadístico;"
      },
      {
        "fuerte": "",
        "texto": "Comunicación de información relacionada con productos o servicios;"
      },
      {
        "fuerte": "",
        "texto": "Servicio al cliente y atención posventa;"
      },
      {
        "fuerte": "",
        "texto": "Encuestas de satisfacción para la mejora de nuestros procesos para ofrecerle una mejor experiencia;"
      },
      {
        "fuerte": "",
        "texto": "Previa autorización expresa, consulta y verificación de referencias crediticias ante la Superintendencia de Bancos y/o cualquier persona jurídica autorizada para consultas de registro de datos crediticios;"
      },
      {
        "fuerte": "",
        "texto": "Gestión y obtención de financiamiento a través de crédito directo o de entidades financieras autorizadas en Ecuador;"
      },
      {
        "fuerte": "",
        "texto": "Facturación;"
      },
      {
        "fuerte": "",
        "texto": "Cobertura de seguros solicitadas por el cliente;"
      },
      {
        "fuerte": "",
        "texto": "Cumplimiento de obligaciones legales y tributarias;"
      },
      {
        "fuerte": "",
        "texto": "Reporte a autoridades de regulación y control conforme a la normativa aplicable;"
      },
      {
        "fuerte": "",
        "texto": "Almacenamiento de la información para fines de cumplimiento legal y defensa de los intereses de LAS EMPRESAS;"
      },
      {
        "fuerte": "",
        "texto": "Prevención de lavado de activos;"
      },
      {
        "fuerte": "",
        "texto": "Procesos de auditoría externa e interna."
      }
    ]
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS realizarán las actividades de tratamiento en virtud de la ejecución de la relación contractual entre el cliente y los Responsables del Tratamiento."
  },
  {
    "t": "h4",
    "texto": "Finalidades de las actividades de tratamiento para prospectos"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Contacto directo y proactivo con el titular;"
      },
      {
        "fuerte": "",
        "texto": "Atención a los requerimientos comerciales del titular;"
      },
      {
        "fuerte": "",
        "texto": "Actividades de marketing y sondeo de mercado;"
      },
      {
        "fuerte": "",
        "texto": "LAS EMPRESAS realizarán las actividades en virtud del consentimiento explícito e inequívoco del titular, ejecución de medidas precontractuales y por el interés legítimo de LAS EMPRESAS, debidamente comprobado."
      }
    ]
  },
  {
    "t": "h3",
    "texto": "Tratamiento de datos personales en el ámbito laboral"
  },
  {
    "t": "p",
    "texto": "Los datos personales obtenidos directamente del titular, en el marco de su interacción laboral con LAS EMPRESAS, serán utilizados conforme el presente apartado."
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS únicamente realizan actividades de tratamiento por iniciativa del titular, por cumplimiento legal o contractual."
  },
  {
    "t": "h4",
    "texto": "Origen del dato"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Cuando el titular entrega su información personal como parte de un proceso de selección de personal, a través de los medios habilitados por LAS EMPRESAS."
      },
      {
        "fuerte": "",
        "texto": "Cuando el titular facilita su información para la formalización de la relación laboral con LAS EMPRESAS."
      }
    ]
  },
  {
    "t": "h4",
    "texto": "Finalidades de las actividades de tratamiento"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Gestión de la relación laboral, incluyendo la etapa de selección y contratación, administración de personal, pago de remuneraciones y beneficios."
      },
      {
        "fuerte": "",
        "texto": "Cumplimiento de obligaciones legales, tributarias, laborales y de seguridad social."
      },
      {
        "fuerte": "",
        "texto": "Evaluación de desempeño, formación y desarrollo profesional."
      },
      {
        "fuerte": "",
        "texto": "Gestión de seguros, planes de salud y beneficios adicionales."
      },
      {
        "fuerte": "",
        "texto": "Atención de solicitudes, consultas y trámites internos."
      },
      {
        "fuerte": "",
        "texto": "Monitoreo y fortalecimiento de la seguridad en nuestras instalaciones mediante sistemas de cámaras de videovigilancia y control de acceso a las instalaciones."
      },
      {
        "fuerte": "",
        "texto": "Almacenamiento de datos para cumplimiento legal y defensa de los intereses de LAS EMPRESAS."
      },
      {
        "fuerte": "",
        "texto": "Gestión de riesgos del trabajo, vigilancia de la salud."
      },
      {
        "fuerte": "",
        "texto": "Procesos de auditoría interna y externa"
      }
    ]
  },
  {
    "t": "p",
    "texto": "Los datos personales de excolaboradores serán tratados únicamente para cumplimiento legal, solicitud de autoridad competente, defensa y reclamaciones de los Responsables del Tratamiento y su conservación se regirá a lo expuesto por Normativa Especializada."
  },
  {
    "t": "h3",
    "texto": "Tratamiento de datos personales de proveedores"
  },
  {
    "t": "p",
    "texto": "Los datos personales de proveedores, cuando el tratamiento se realice a personas naturales, se sujetarán a lo dispuesto en este apartado:"
  },
  {
    "t": "h4",
    "texto": "Origen del dato"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Cuando el proveedor registe sus datos personales para un proceso de licitación ofertado por LAS EMPRESAS."
      }
    ]
  },
  {
    "t": "h4",
    "texto": "Finalidades de las actividades de Tratamiento"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Gestión de relaciones comerciales, incluyendo la contratación, compra y pago de bienes y/o servicios;"
      },
      {
        "fuerte": "",
        "texto": "Cumplimiento de obligaciones legales, contractuales, contables, fiscales y políticas internas;"
      },
      {
        "fuerte": "",
        "texto": "Evaluación y selección de proveedores;"
      },
      {
        "fuerte": "",
        "texto": "Almacenamiento de datos para fines de cumplimiento legal y defensa de los intereses de LAS EMPRESAS."
      }
    ]
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS tratarán los datos personales de proveedores en virtud de la ejecución de medidas precontractuales y contractuales."
  },
  {
    "t": "h3",
    "texto": "Tratamiento de datos personales de accionistas y miembros del directorio"
  },
  {
    "t": "p",
    "texto": "Los datos personales de accionistas y miembros del directorio serán tratados conforme lo dispuesto en este apartado:"
  },
  {
    "t": "h4",
    "texto": "Origen del dato"
  },
  {
    "t": "p",
    "texto": "Los datos personales se obtienen en virtud de la relación societaria vigente entre LAS PARTES y el titular."
  },
  {
    "t": "h4",
    "texto": "Finalidades de las actividades de Tratamiento"
  },
  {
    "t": "ul",
    "items": [
      {
        "fuerte": "",
        "texto": "Gestión de la relación societaria y comunicación de información corporativa relevante."
      },
      {
        "fuerte": "",
        "texto": "Cumplimiento de obligaciones legales, societarias, contractuales y fiscales."
      },
      {
        "fuerte": "",
        "texto": "Registro y administración de participaciones o acciones."
      },
      {
        "fuerte": "",
        "texto": "Almacenamiento de información para cumplimiento legal y defensa de los intereses de la compañía."
      }
    ]
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS tratarán los datos personales de accionistas y miembros del directorio en virtud del cumplimiento normativo de los Responsables del Tratamiento."
  },
  {
    "t": "h3",
    "texto": "Tratamiento de datos personales de categorías especiales"
  },
  {
    "t": "p",
    "texto": "Dentro de LAS EMPRESAS los datos personales de categorías especiales únicamente serán tratados por cumplimiento normativo."
  },
  {
    "t": "p",
    "texto": "A efectos del presente Aviso de Privacidad, toda información relativa a datos de categorías especiales se considera de carácter confidencial, cuyo tratamiento se alinea a la legislación vigente."
  },
  {
    "t": "h2",
    "texto": "SUBCONTRATACIÓN Y TRANSFERENCIA INTERNACIONAL DE DATOS"
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS podrán realizar subcontrataciones con terceros durante el desarrollo de la relación con el titular, o de forma previa al mismo, para la prestación de determinados bienes o servicios, en tal caso, el tercero podría requerir el acceso a la información personal de la cual nosotros somos responsables."
  },
  {
    "t": "p",
    "texto": "Esta transferencia se permitirá cuando el Responsable del tratamiento haga constar su autorización por escrito o dentro del contrato de encargo con determinado proveedor, ya sea persona natural o jurídica."
  },
  {
    "t": "p",
    "texto": "En caso de requerir la transferencia de datos personales con empresas que se encuentren fuera del territorio ecuatoriano, dicha transferencia se realizará en cumplimiento en cumplimiento de la Ley, previa autorización de la Autoridad de Protección de Datos Personales y asesoría del Delegado de Protección de Datos Personales."
  },
  {
    "t": "p",
    "texto": "Dicha transferencia se enmarca en el cumplimiento de los parámetros de seguridad establecidos en la Ley Orgánica de Protección de Datos Personales y su Reglamento."
  },
  {
    "t": "h2",
    "texto": "COMUNICACIÓN DE INFORMACIÓN PERSONAL"
  },
  {
    "t": "h3",
    "texto": "LAS EMPRESAS"
  },
  {
    "t": "p",
    "texto": "La información personal que sea compartida entre los Responsables del Tratamiento, se regulará mediante un contrato de encargo o de responsabilidad conjunta (según sea el caso). En todo momento se aplicará el principio de minimización y lealtad para aquellos tratamientos."
  },
  {
    "t": "h3",
    "texto": "Fábrica"
  },
  {
    "t": "p",
    "texto": "La naturaleza del negocio y las operaciones nos obliga a compartir su información personal con las marcas de vehículos que distribuimos o a quienes estas deleguen."
  },
  {
    "t": "h3",
    "texto": "Proveedores de servicios y socios comerciales"
  },
  {
    "t": "p",
    "texto": "Compartimos sus datos con terceros como: (1) proveedores de pagos, administración y asistencia técnica o sustituciones de aseguradoras, alquileres corporativos u otros socios; (2) empresas que llevan a cabo análisis de consumidores o encuestas de satisfacción en nuestro nombre; (3) proveedores de comunicaciones que envían en nuestro nombre correos electrónicos y otras comunicaciones de marketing y servicios; (4) proveedores de atención al cliente, como el proveedor de nuestro chat en vivo, con el fin de proporcionarle un servicio de atención al cliente; (5) proveedores de cobro de deudas; (6) procesadores de reclamaciones; (7) nuestros socios de marketing y publicidad, así como medios de comunicación de terceros, incluidos sitios de redes sociales, con quienes compartimos información agregada o anónima acerca de nuestros clientes, para que puedan enviar mensajes de publicidad personalizados en nuestro nombre, analizar, mejorar y gestionar nuestros datos, dirigir servicios de análisis móviles, además de mantener y mejorar nuestros servicios (en virtud de los acuerdos de confidencialidad pertinentes); Auditoría Externa (8) otros."
  },
  {
    "t": "h3",
    "texto": "Autoridades gubernamentales"
  },
  {
    "t": "p",
    "texto": "Sus datos personales también pueden compartirse con autoridades gubernamentales, fiscales y/o judiciales, en los parámetros aquí descritos."
  },
  {
    "t": "h3",
    "texto": "Venta, fusión o cambio en el control"
  },
  {
    "t": "p",
    "texto": "Sus datos se transfieren a otra empresa en caso de traspaso, cambio de la propiedad, reestructuración o cesión de la totalidad o una parte de los activos de LAS EMPRESAS. Esto puede ocurrir si las partes han formalizado un contrato según el cual la recopilación, el uso y la divulgación de la información se encuentra limitada a los mencionados propósitos de la transacción comercial, incluida la determinación de proceder o no con la transacción comercial."
  },
  {
    "t": "h3",
    "texto": "Sistemas de información globales de LAS EMPRESAS"
  },
  {
    "t": "p",
    "texto": "LAS EMPRESAS, podrán mantener sus sistemas de información dentro o fuera del Ecuador, cuyo tratamiento y almacenamiento se regirá en los términos de la Ley Orgánica de Protección de Datos Personales y normativa especializada."
  },
  {
    "t": "h2",
    "texto": "USO DEL PORTAL WEB"
  },
  {
    "t": "p",
    "texto": "El sitio administrado por LAS EMPRESAS constituye un espacio alternativo de comunicación entre el Titular y los Responsables del Tratamiento, a fin de facilitar a ambas partes un mejor servicio."
  },
  {
    "t": "p",
    "texto": "En caso de que usted no autorice su tratamiento de datos, únicamente podrá navegar en el portal web, pero no podrá interactuar con la herramienta para finalidades más específicas."
  },
  {
    "t": "p",
    "texto": "En caso de autorizar su tratamiento, accederemos a información basada en la ubicación o recopilaremos marcadores de ubicación de su dispositivo móvil o basados en su dirección IP. No utilizamos esta información para localizarle de forma específica."
  },
  {
    "t": "p",
    "texto": "Nuestro Sitio Web recoge y almacena de forma automática información sobre la actividad de sus Usuarios/Clientes. Tal información puede incluir la URL de la que provienen (estén o no en el Sitio Web de LAS EMPRESAS), a qué URL acceden seguidamente, qué navegador están utilizando, y sus direcciones IP, las páginas visitadas, cookies y las búsquedas realizadas."
  },
  {
    "t": "p",
    "texto": "Para que el Sitio Web funcione de forma correcta se utilizan cookies propias y de terceros. Ver política de cookies."
  },
  {
    "t": "p",
    "texto": "Nosotros podemos reubicar estos servidores en cualquier otro país, en el futuro; por lo que se puede almacenar datos personales en otros países, con fines de respaldo o back up de información, para Recuperación en Caso de Desastres Tecnológicos."
  },
  {
    "t": "h2",
    "texto": "OBLIGACIONES DEL TITULAR DE DATOS"
  },
  {
    "t": "p",
    "texto": "Es obligación del titular de datos personales proporcionar la información actualizada y correcta para su tratamiento."
  },
  {
    "t": "p",
    "texto": "En consecuencia, LAS EMPRESAS, no serán responsables del tratamiento sobre datos personales inexactos, erróneos o falases que hayan sido registrados directamente por el titular."
  },
  {
    "t": "h2",
    "texto": "OBLIGACIONES DEL RESPONSABLE"
  },
  {
    "t": "p",
    "texto": "Es obligación del Responsable del tratamiento de datos proteger la información personal que voluntariamente ha sido entregada por el titular de datos, implementando todas las medidas técnicas, administrativas u organizacionales para impedir cualquier vulneración a la integridad, confidencialidad y disponibilidad de los datos personales."
  },
  {
    "t": "h2",
    "texto": "MEDIDAS DE SEGURIDAD"
  },
  {
    "t": "p",
    "texto": "Los Responsables del Tratamiento adoptarán medidas físicas, técnicas, legales, organizacionales y administrativas que sean necesarias para garantizar la seguridad de los datos personales y protegerlos contra el acceso no autorizado, alteración, divulgación o destrucción de la información."
  },
  {
    "t": "h2",
    "texto": "ACEPTACIÓN, MODIFICACIONES Y CAMBIOS AL AVISO DE PRIVACIDAD"
  },
  {
    "t": "p",
    "texto": "Este aviso de privacidad podrá ser modificado en cualquier momento por LAS EMPRESAS sin previo consentimiento del titular. Toda actualización se realizará conforme a las disposiciones legales vigentes y se hará público en nuestra web."
  },
  {
    "t": "h2",
    "texto": "HISTORIAL DE VERSIONES"
  },
  {
    "t": "versiones"
  }
] as Bloque[],
} as const;
