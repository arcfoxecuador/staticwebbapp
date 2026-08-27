// Helpers puros de la biblioteca de medios (sin side effects: se prueban solos).

export const IMG_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

// Documentos publicables: rendición de cuentas, fichas de becas, mallas, PDFs
// regulatorios. Lista CERRADA — cualquier otra extensión se rechaza al subir.
export const DOC_RE = /\.(pdf|docx?|xlsx?|pptx?)$/i;

export type MediaKind = "image" | "doc";

// Tipo de un archivo por su extensión; null si no es un medio publicable.
export function mediaKindOf(nameOrPath: string): MediaKind | null {
  if (IMG_RE.test(nameOrPath)) return "image";
  if (DOC_RE.test(nameOrPath)) return "doc";
  return null;
}

export function isMedia(nameOrPath: string): boolean {
  return mediaKindOf(nameOrPath) !== null;
}

// Carpeta de una ruta pública = su directorio bajo /public. "" para la raíz.
// Ej: "/carreras/x.png" → "carreras"; "/uploads/foo/y.webp" → "uploads/foo";
// "/logo.png" → "".
export function mediaFolderOf(publicPath: string): string {
  const m = publicPath.match(/^\/(.+)\/[^/]+$/);
  return m ? m[1] : "";
}
