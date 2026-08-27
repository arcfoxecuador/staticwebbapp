import { config } from "../config.js";

// ─────────────────────────────────────────────────────────────────────────────
// Servicio de GitHub: lee y escribe archivos del repo del sitio mediante la
// Git Data API, de modo que varios archivos entran en UN solo commit. Cada
// cambio de un agente crea (o reutiliza) una rama y, opcionalmente, abre un PR
// para que el equipo apruebe antes de hacer merge a producción.
//
// Requiere GITHUB_TOKEN con permisos Contents + Pull requests sobre el repo.
// ─────────────────────────────────────────────────────────────────────────────

const API = "https://api.github.com";

// Oculta el token de GitHub (y cualquier token con formato GitHub) de un texto,
// para que nunca termine en un mensaje de error, en consola ni en una respuesta
// que se devuelva al cliente.
export function redact(text: string): string {
  let out = text;
  const token = config.github.token;
  if (token) out = out.split(token).join("[REDACTED]");
  return out.replace(/\b(gh[posru]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED]");
}

function gh(path: string, init: RequestInit = {}) {
  if (!config.github.token) throw new Error("Falta GITHUB_TOKEN");
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.github.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function ghJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await gh(path, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(redact(`GitHub ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`));
  }
  return (await res.json()) as T;
}

const { owner, repo, baseBranch, prodBranch, siteDir } = config.github;
const base = `/repos/${owner}/${repo}`;

// Convierte una ruta relativa al sitio (ej. "src/config/theme.json") en la ruta
// real dentro del repo (ej. "astro-web/src/config/theme.json").
export function sitePath(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, "");
  return siteDir ? `${siteDir}/${clean}` : clean;
}

// Lee el contenido de texto de un archivo del repo en la rama indicada.
export async function readFile(relativePath: string, ref = baseBranch): Promise<string> {
  const path = sitePath(relativePath);
  const data = await ghJson<{ content: string; encoding: string }>(
    `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
  );
  return Buffer.from(data.content, data.encoding as BufferEncoding).toString("utf-8");
}

// Lee un archivo Y su SHA de blob (para detección de conflictos: el editor
// guarda el sha que cargó y el servidor rechaza el guardado si cambió).
export async function readFileMeta(
  relativePath: string,
  ref = baseBranch,
): Promise<{ content: string; sha: string }> {
  const path = sitePath(relativePath);
  const data = await ghJson<{ content: string; encoding: string; sha: string }>(
    `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
  );
  return {
    content: Buffer.from(data.content, data.encoding as BufferEncoding).toString("utf-8"),
    sha: data.sha,
  };
}

// SHA actual del blob de un archivo (null si no existe).
export async function fileSha(relativePath: string, ref = baseBranch): Promise<string | null> {
  const path = sitePath(relativePath);
  const res = await gh(
    `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(redact(`GitHub GET contents/${path} → ${res.status}: ${await res.text()}`));
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

export interface CommitInfo {
  sha: string;
  message: string;
  date: string; // ISO
  author: string;
}

// Historial de commits que tocaron una ruta (archivo o carpeta) en la rama.
// Alimenta las "Revisiones" y la "Papelera" del panel.
export async function listCommitsForPath(
  relativePath: string,
  branch = baseBranch,
  perPage = 30,
): Promise<CommitInfo[]> {
  const path = sitePath(relativePath);
  const data = await ghJson<
    Array<{ sha: string; commit: { message: string; author?: { date?: string; name?: string } } }>
  >(`${base}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${perPage}`);
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message.split("\n")[0],
    date: c.commit.author?.date ?? "",
    author: c.commit.author?.name ?? "",
  }));
}

export interface CommitFile {
  filename: string; // ruta completa en el repo
  status: string; // added | modified | removed | renamed
}

// Archivos tocados por un commit (para detectar borrados → Papelera).
export async function getCommitFiles(sha: string): Promise<{ parents: string[]; files: CommitFile[] }> {
  const data = await ghJson<{
    parents: Array<{ sha: string }>;
    files?: Array<{ filename: string; status: string }>;
  }>(`${base}/commits/${sha}`);
  return {
    parents: data.parents.map((p) => p.sha),
    files: (data.files ?? []).map((f) => ({ filename: f.filename, status: f.status })),
  };
}

export interface DeployStatus {
  state: "success" | "pending" | "failure" | "unknown";
  sha: string | null;
  updatedAt: string | null;
  detailUrl: string | null;
}

// Estado del último despliegue de una rama: combina los "commit statuses"
// (Vercel clásico) y los "check runs" (GitHub Apps) del HEAD. Cierra el ciclo
// "publiqué… ¿y el build pasó?" que antes quedaba a ciegas.
export async function getDeployStatus(branch = baseBranch): Promise<DeployStatus> {
  const head = await ghJson<{ object: { sha: string } }>(
    `${base}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  const sha = head.object.sha;
  let state: DeployStatus["state"] = "unknown";
  let updatedAt: string | null = null;
  let detailUrl: string | null = null;

  const combined = await ghJson<{
    state: string;
    statuses: Array<{ updated_at: string; target_url?: string }>;
  }>(`${base}/commits/${sha}/status`).catch(() => null);
  if (combined && combined.statuses.length > 0) {
    state = combined.state === "success" ? "success" : combined.state === "pending" ? "pending" : "failure";
    updatedAt = combined.statuses[0]?.updated_at ?? null;
    detailUrl = combined.statuses[0]?.target_url ?? null;
  } else {
    const checks = await ghJson<{
      check_runs: Array<{ status: string; conclusion: string | null; completed_at: string | null; html_url: string }>;
    }>(`${base}/commits/${sha}/check-runs`).catch(() => null);
    const runs = checks?.check_runs ?? [];
    if (runs.length > 0) {
      if (runs.some((r) => r.status !== "completed")) state = "pending";
      else if (runs.every((r) => r.conclusion === "success" || r.conclusion === "neutral" || r.conclusion === "skipped"))
        state = "success";
      else state = "failure";
      updatedAt = runs[0]?.completed_at ?? null;
      detailUrl = runs[0]?.html_url ?? null;
    }
  }
  return { state, sha, updatedAt, detailUrl };
}

// ¿Existe un archivo en el repo (en la rama indicada)? Sin descargar el contenido.
// Se usa para impedir que el agente referencie una imagen de portada inventada.
export async function fileExists(relativePath: string, ref = baseBranch): Promise<boolean> {
  const path = sitePath(relativePath);
  const res = await gh(
    `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
  );
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(redact(`GitHub GET contents/${path} → ${res.status}: ${await res.text()}`));
  return true;
}

export interface DirEntry {
  name: string;
  path: string; // ruta relativa al sitio (sin SITE_DIR)
  size: number;
  sha: string;
}

// Lista los archivos de un directorio del repo (no recursivo). Devuelve []
// si el directorio no existe todavía (p.ej. public/uploads sin subidas).
export async function listDir(relativePath: string, ref = baseBranch): Promise<DirEntry[]> {
  const path = sitePath(relativePath);
  const res = await gh(
    `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(redact(`GitHub GET contents/${path} → ${res.status}: ${await res.text()}`));
  const data = (await res.json()) as Array<{ name: string; path: string; size: number; sha: string; type: string }>;
  if (!Array.isArray(data)) throw new Error(`${path} no es un directorio`);
  const prefix = siteDir ? `${siteDir}/` : "";
  return data
    .filter((e) => e.type === "file")
    .map((e) => ({ name: e.name, path: e.path.startsWith(prefix) ? e.path.slice(prefix.length) : e.path, size: e.size, sha: e.sha }));
}

// Como listDir pero incluye subdirectorios (con su `type`). Se usa para las
// carpetas de la biblioteca de medios (un nivel: public/uploads/<carpeta>/).
export async function listDirAll(relativePath: string, ref = baseBranch): Promise<Array<DirEntry & { type: "file" | "dir" }>> {
  const path = sitePath(relativePath);
  const res = await gh(
    `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(redact(`GitHub GET contents/${path} → ${res.status}: ${await res.text()}`));
  const data = (await res.json()) as Array<{ name: string; path: string; size: number; sha: string; type: string }>;
  if (!Array.isArray(data)) throw new Error(`${path} no es un directorio`);
  const prefix = siteDir ? `${siteDir}/` : "";
  return data
    .filter((e) => e.type === "file" || e.type === "dir")
    .map((e) => ({ name: e.name, path: e.path.startsWith(prefix) ? e.path.slice(prefix.length) : e.path, size: e.size, sha: e.sha, type: e.type as "file" | "dir" }));
}

// Borra un archivo del repo (API de contenidos: requiere el SHA actual del blob).
export async function deleteFile(relativePath: string, message: string, branch = baseBranch): Promise<void> {
  const path = sitePath(relativePath);
  const url = `${base}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const current = await ghJson<{ sha: string }>(`${url}?ref=${encodeURIComponent(branch)}`);
  const res = await gh(url, {
    method: "DELETE",
    body: JSON.stringify({ message, sha: current.sha, branch }),
  });
  if (!res.ok) throw new Error(redact(`GitHub DELETE contents/${path} → ${res.status}: ${await res.text()}`));
}

export interface FileChange {
  // Ruta relativa al sitio (SITE_DIR). Ej: "src/content/blog/mi-nota.md"
  path: string;
  // Contenido. Si es binario (imagen), pasa base64 y encoding "base64".
  content: string;
  encoding?: "utf-8" | "base64";
}

// Crea una rama (si no existe) a partir de baseBranch y commitea todos los
// archivos en un único commit. Devuelve la rama y el SHA del commit.
export async function commitFiles(
  changes: FileChange[],
  message: string,
  branch: string,
): Promise<{ branch: string; commitSha: string }> {
  // SHA del head de la rama base
  const baseRef = await ghJson<{ object: { sha: string } }>(
    `${base}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
  );
  const baseSha = baseRef.object.sha;

  // Crea la rama si no existe (ignora error 422 = ya existe)
  const createRef = await gh(`${base}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });
  if (!createRef.ok && createRef.status !== 422) {
    throw new Error(redact(`No se pudo crear la rama ${branch}: ${await createRef.text()}`));
  }

  // Head actual de la rama destino (puede haber avanzado si ya existía)
  const headRef = await ghJson<{ object: { sha: string } }>(
    `${base}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  const parentSha = headRef.object.sha;
  const parentCommit = await ghJson<{ tree: { sha: string } }>(
    `${base}/git/commits/${parentSha}`,
  );

  // Crea un blob por archivo
  const tree = await Promise.all(
    changes.map(async (c) => {
      const blob = await ghJson<{ sha: string }>(`${base}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: c.content, encoding: c.encoding ?? "utf-8" }),
      });
      return { path: sitePath(c.path), mode: "100644", type: "blob", sha: blob.sha };
    }),
  );

  // Árbol nuevo basado en el árbol del commit padre
  const newTree = await ghJson<{ sha: string }>(`${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }),
  });

  // Commit
  const commit = await ghJson<{ sha: string }>(`${base}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }),
  });

  // Mueve la rama al nuevo commit
  await ghJson(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { branch, commitSha: commit.sha };
}

// Renombra/mueve un archivo en UN solo commit: el nuevo path apunta al MISMO
// blob (sin re-subir bytes) y el viejo se borra (sha:null en el árbol). Atómico:
// nunca queda a medias. Se usa para renombrar imágenes que no están en uso.
export async function renameFile(from: string, to: string, message: string, branch = baseBranch): Promise<void> {
  const fromPath = sitePath(from);
  const toPath = sitePath(to);
  // Blob sha del archivo de origen (el "sha" de la Contents API es el del blob).
  const meta = await ghJson<{ sha: string }>(
    `${base}/contents/${encodeURIComponent(fromPath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
  );
  const headRef = await ghJson<{ object: { sha: string } }>(
    `${base}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  const parentSha = headRef.object.sha;
  const parentCommit = await ghJson<{ tree: { sha: string } }>(`${base}/git/commits/${parentSha}`);
  const newTree = await ghJson<{ sha: string }>(`${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: [
        { path: toPath, mode: "100644", type: "blob", sha: meta.sha }, // nuevo nombre → mismo blob
        { path: fromPath, mode: "100644", type: "blob", sha: null },   // borra el viejo
      ],
    }),
  });
  const commit = await ghJson<{ sha: string }>(`${base}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }),
  });
  await ghJson(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}

// Abre un Pull Request de `branch` hacia baseBranch (si no hay uno abierto).
// Devuelve la URL del PR para que el equipo lo revise/apruebe.
export async function openPullRequest(
  branch: string,
  title: string,
  body: string,
): Promise<{ url: string; number: number }> {
  // ¿Ya hay un PR abierto para esta rama?
  const existing = await ghJson<Array<{ html_url: string; number: number }>>(
    `${base}/pulls?head=${encodeURIComponent(`${owner}:${branch}`)}&state=open`,
  );
  if (existing.length > 0) {
    return { url: existing[0].html_url, number: existing[0].number };
  }
  const pr = await ghJson<{ html_url: string; number: number }>(`${base}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head: branch, base: baseBranch, body }),
  });
  return { url: pr.html_url, number: pr.number };
}

// Promueve STAGING → PRODUCCIÓN: mergea baseBranch (stage) dentro de prodBranch
// (main) con la API de GitHub. Vercel reconstruye producción al recibir el merge.
// Devuelve el SHA del merge, o alreadyUpToDate si no había cambios que promover.
export async function promoteToProduction(
  message: string,
): Promise<{ sha: string | null; alreadyUpToDate: boolean }> {
  const res = await gh(`${base}/merges`, {
    method: "POST",
    body: JSON.stringify({ base: prodBranch, head: baseBranch, commit_message: message }),
  });
  if (res.status === 204) return { sha: null, alreadyUpToDate: true }; // nada nuevo en stage
  if (res.status === 409) {
    throw new Error(`Conflicto al promover ${baseBranch} → ${prodBranch}. Resuélvelo en GitHub.`);
  }
  if (!res.ok) {
    throw new Error(redact(`No se pudo promover ${baseBranch} → ${prodBranch}: ${await res.text()}`));
  }
  const data = (await res.json()) as { sha: string };
  return { sha: data.sha, alreadyUpToDate: false };
}
