import { readFile } from "./github.js";
import { PAGES, pagePath } from "./pageBlocks.js";
import { careerPath, listCareers } from "./careersForm.js";
import { listPosts, readPost } from "./posts.js";

// ─────────────────────────────────────────────────────────────────────────────
// "Adjunto a": dónde se usa una imagen dentro del contenido del sitio.
// Escanea páginas, carreras y entradas buscando la ruta (/uploads/x.webp,
// /news/y.png). Lo usan la biblioteca de medios (columna de uso) y el borrado
// seguro (no se elimina una imagen que alguna página siga mostrando).
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaUsage {
  type: "page" | "career" | "post";
  slug: string;
  title: string;
}

export async function findMediaUsage(mediaPath: string, branch: string): Promise<MediaUsage[]> {
  const needle = mediaPath.trim();
  if (!needle) return [];
  const usages: MediaUsage[] = [];

  const pageScan = Object.entries(PAGES).map(async ([slug, title]) => {
    try {
      const raw = await readFile(pagePath(slug), branch);
      if (raw.includes(needle)) usages.push({ type: "page", slug, title });
    } catch {
      /* página ilegible: no bloquea el escaneo */
    }
  });
  const careerScan = Object.entries(await listCareers(branch)).map(async ([slug, title]) => {
    try {
      const raw = await readFile(careerPath(slug), branch);
      if (raw.includes(needle)) usages.push({ type: "career", slug, title });
    } catch {
      /* ídem */
    }
  });
  const postScan = (async () => {
    const posts = await listPosts(branch);
    await Promise.all(
      posts.map(async (p) => {
        if (p.img === needle) {
          usages.push({ type: "post", slug: p.slug, title: p.title });
          return;
        }
        try {
          const full = await readPost(p.slug, branch);
          if (full.body.includes(needle)) usages.push({ type: "post", slug: p.slug, title: p.title });
        } catch {
          /* ídem */
        }
      }),
    );
  })();

  await Promise.all([...pageScan, ...careerScan, postScan]);
  return usages.sort((a, b) => (a.type + a.slug < b.type + b.slug ? -1 : 1));
}
