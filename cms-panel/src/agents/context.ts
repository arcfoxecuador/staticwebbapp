import type { FileChange } from "../lib/github.js";

// Contexto que comparten las herramientas durante una ejecución de agente.
//
// Los cambios NO se commitean herramienta por herramienta: se ACUMULAN aquí
// (staging) y run.ts los publica en UN solo commit al terminar la corrida.
// Ventajas: una edición múltiple ("cambia el hero y sube las noticias") es un
// único commit y un único build de Vercel; si la corrida falla a mitad no se
// publica nada a medias; y el mensaje del commit registra quién lo pidió.
export interface AgentEvent {
  type: string;
  message: string;
  data?: unknown;
}

export interface RunContext {
  branch: string;
  emit: (event: AgentEvent) => void;
  // Correo del miembro del equipo que pidió el cambio (auditoría en el commit).
  userEmail?: string;
  // Cambios preparados en esta corrida: ruta (relativa al sitio) → contenido.
  staged: Map<string, FileChange>;
  // Resumen de cada acción, para el mensaje del commit final.
  actions: string[];
  stage(change: FileChange, action?: string): void;
  // Overlay de lectura: si una herramienta ya preparó ese archivo en esta
  // corrida, las siguientes deben ver ESA versión (no la del repo).
  readStaged(path: string): FileChange | undefined;
  // Sha del archivo tal como lo LEYÓ el agente. Una corrida puede durar
  // minutos, y mientras tanto una persona puede guardar ese mismo archivo desde
  // el panel; sin esto, el commit final la pisaba en silencio. Se anota en la
  // primera lectura (las siguientes ya ven la versión preparada).
  noteBase(path: string, sha: string | null): void;
  baseShas: Map<string, string | null>;
}

export function createRunContext(
  branch: string,
  emit: (event: AgentEvent) => void,
  userEmail?: string,
): RunContext {
  const staged = new Map<string, FileChange>();
  const actions: string[] = [];
  const baseShas = new Map<string, string | null>();
  return {
    branch,
    emit,
    userEmail,
    staged,
    actions,
    baseShas,
    stage(change, action) {
      staged.set(change.path, change);
      if (action) actions.push(action);
    },
    readStaged(path) {
      return staged.get(path);
    },
    noteBase(path, sha) {
      // Solo la PRIMERA lectura: es la versión sobre la que se construyó todo
      // lo demás de la corrida.
      if (!baseShas.has(path)) baseShas.set(path, sha);
    },
  };
}
