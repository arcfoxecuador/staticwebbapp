/* ── LA HOJA DE CÁLCULO DE LA PUERTA ───────────────────────────────────────
   ESTE ARCHIVO NO SE EJECUTA EN ESTE REPOSITORIO. Se pega en Google Apps
   Script. Vive aquí versionado porque es la otra mitad de
   `ProtocoloComando.astro`: si alguien cambia una clave del protocolo y no
   cambia `CAMPOS`, la respuesta nueva se escribe en la columna equivocada y
   nadie se entera — la hoja se sigue llenando igual.

   CÓMO SE INSTALA
   1. Crea la hoja de cálculo. La pestaña `Protocolo` la crea el script solo.
   2. Extensiones › Apps Script. Pega este archivo entero encima del `Code.gs`
      que viene por defecto.
   3. Cambia `TOKEN` por una cadena larga e inventada. La MISMA que va en
      `PUBLIC_PROTOCOLO_TOKEN` en Vercel.
   4. Implementar › Nueva implementación › Aplicación web.
      · Ejecutar como: **Yo**  · Quién tiene acceso: **Cualquier usuario**
      «Cualquier usuario» es obligatorio: quien envía el formulario no ha
      iniciado sesión en Google. La hoja NO queda pública — sólo este script
      puede escribir en ella, y sólo añadiendo filas.
   5. Copia la URL que termina en `/exec` → `PUBLIC_PROTOCOLO_ENDPOINT`.

   CADA CAMBIO DE CÓDIGO EXIGE UNA IMPLEMENTACIÓN NUEVA (Implementar › Gestionar
   implementaciones › editar › Versión: Nueva). Guardar el archivo NO actualiza
   lo que sirve la URL, y es el error que cuesta media tarde encontrar. */

const HOJA = 'Protocolo';

/** La misma cadena que `PUBLIC_PROTOCOLO_TOKEN`. NO es un secreto —viaja en el
    JavaScript del navegador—: filtra a quien tropiece con la URL, no a quien
    quiera entrar. Ver el comentario de `PROTOCOLO` en `src/lib/site.ts`. */
const TOKEN = 'CAMBIA-ESTO-POR-UNA-CADENA-LARGA';

/** Milisegundos mínimos entre cargar la puerta y enviar. Diez preguntas no se
    contestan en tres segundos; un bot que hace POST directo tarda cero. */
const SELLO_MINIMO = 3000;

/* EL ORDEN DE ESTA LISTA ES EL ORDEN DE LAS COLUMNAS. Son las claves de
   `protocolo` en `ProtocoloComando.astro`, y tienen que coincidir literalmente:
   una clave que no esté aquí se descarta en silencio. */
const CAMPOS = [
  'busqueda',
  'momento',
  'novedad',
  'experiencias',
  'tecnologia',
  'ciudad',
  'nombre',
  'correo',
  'whatsapp',
];

const CABECERA = ['fecha', 'id', 'origen'].concat(CAMPOS);

function doPost(e) {
  /* El bloqueo es lo que evita que dos personas que envían a la vez escriban en
     la misma fila. `appendRow` no es atómico entre invocaciones concurrentes, y
     una campaña de lanzamiento es justo el escenario donde llegan a la vez. */
  const bloqueo = LockService.getScriptLock();
  try {
    bloqueo.waitLock(20000);

    const datos = JSON.parse(e.postData.contents);
    if (datos.token !== TOKEN) return salida({ ok: false, motivo: 'token' });
    if (Number(datos.sello) < SELLO_MINIMO) return salida({ ok: false, motivo: 'sello' });

    /* La pestaña se crea sola si no existe. Antes había que renombrar «Hoja 1»
       a mano y era el paso que más fácil se salta: el script devolvía un error
       que sólo se ve en el registro de ejecuciones, y desde fuera parecía que
       el formulario estaba roto sin decir por qué. */
    const libro = SpreadsheetApp.getActive();
    const hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
    if (hoja.getLastRow() === 0) hoja.appendRow(CABECERA);

    /* IDEMPOTENCIA. El navegador reintenta un envío que no pudo CONFIRMAR, que
       no es lo mismo que un envío que no llegó: sin esta comprobación, un corte
       de red en el momento justo mete al mismo invitado dos veces. */
    if (datos.id && yaRegistrado(hoja, datos.id)) return salida({ ok: true, duplicado: true });

    const respuestas = datos.respuestas || {};
    hoja.appendRow(
      [new Date(), datos.id || '', datos.origen || ''].concat(
        CAMPOS.map(function (campo) {
          /* El apóstrofo delante es deliberado: sin él, Google convierte
             `+593987654321` en un número, se come el `+` y el teléfono deja de
             ser marcable. Pasa igual con cualquier respuesta que empiece por
             `+`, `=` o `-`. */
          const valor = respuestas[campo] == null ? '' : String(respuestas[campo]);
          return /^[+=\-@]/.test(valor) ? "'" + valor : valor;
        })
      )
    );

    return salida({ ok: true });
  } catch (error) {
    /* El detalle va al registro de ejecuciones de Apps Script, no a la
       respuesta: el mensaje de una excepción puede describir la hoja. */
    console.error(error);
    return salida({ ok: false, motivo: 'error' });
  } finally {
    bloqueo.releaseLock();
  }
}

/** ¿Ya está esta id en la columna B? Lee sólo esa columna, no la hoja entera. */
function yaRegistrado(hoja, id) {
  const filas = hoja.getLastRow();
  if (filas < 2) return false;
  const columna = hoja.getRange(2, 2, filas - 1, 1).getValues();
  for (let i = 0; i < columna.length; i++) {
    if (String(columna[i][0]) === String(id)) return true;
  }
  return false;
}

/** Respuesta JSON. `ContentService` sirve desde un origen que permite lectura
    entre dominios, que es lo que deja al navegador confirmar el registro. */
function salida(cuerpo) {
  return ContentService.createTextOutput(JSON.stringify(cuerpo)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** Un GET a la URL responde algo legible en vez de un error. Sirve para
    comprobar de un vistazo que la implementación está viva. */
function doGet() {
  return salida({ ok: true, servicio: 'protocolo-arcfox' });
}
