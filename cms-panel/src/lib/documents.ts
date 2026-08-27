import { createHash } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Documentos del sitio (PDF y ofimática): informes de rendición de cuentas,
// fichas de becas, mallas, reglamentos.
//
// A diferencia de las imágenes NO se transforman —un PDF firmado debe llegar
// intacto—, así que el control de seguridad es más estricto: la extensión tiene
// que estar en una lista CERRADA y además los primeros bytes deben coincidir con
// la firma real del formato. Así renombrar un ejecutable a ".pdf" no cuela.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20 MB

// Firmas de archivo. Los formatos "x" de Office (docx/xlsx/pptx) son ZIP; los
// antiguos (doc/xls/ppt) son contenedores OLE2.
const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP = [0x50, 0x4b]; // PK
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const DOC_TYPES: Record<string, { mime: string; magic: number[][] }> = {
  pdf: { mime: "application/pdf", magic: [PDF] },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [ZIP] },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: [ZIP] },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: [ZIP] },
  doc: { mime: "application/msword", magic: [OLE] },
  xls: { mime: "application/vnd.ms-excel", magic: [OLE] },
  ppt: { mime: "application/vnd.ms-powerpoint", magic: [OLE] },
};

export const DOC_EXTENSIONS = Object.keys(DOC_TYPES);

function extensionOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function startsWith(buf: Buffer, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  return magic.every((b, i) => buf[i] === b);
}

export interface ValidatedDoc {
  ext: string;
  mime: string;
  bytes: Buffer;
}

// Valida un documento en base64. Lanza con un mensaje en español apto para el
// panel si la extensión no está permitida, el contenido no coincide con ella o
// pesa de más.
export function assertDocument(base64: string, filename: string): ValidatedDoc {
  const ext = extensionOf(filename);
  const type = DOC_TYPES[ext];
  if (!type) {
    throw new Error(`Formato no permitido (.${ext || "sin extensión"}). Se aceptan: ${DOC_EXTENSIONS.join(", ")}.`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength === 0) throw new Error("El documento está vacío.");
  if (bytes.byteLength > MAX_DOC_BYTES) {
    throw new Error(`Documento demasiado grande (${Math.round(bytes.byteLength / 1024 / 1024)} MB; máx. 20 MB).`);
  }
  if (!type.magic.some((m) => startsWith(bytes, m))) {
    throw new Error(`El archivo no parece un .${ext} real (su contenido no coincide con el formato).`);
  }
  return { ext, mime: type.mime, bytes };
}

// Nombre estable por CONTENIDO, conservando la extensión original. Igual que en
// las imágenes: subir dos veces el mismo documento no duplica archivos.
export function hashedDocName(bytes: Buffer, originalName: string, ext: string): string {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const base =
    originalName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "documento";
  return `${base}-${hash}.${ext}`;
}
