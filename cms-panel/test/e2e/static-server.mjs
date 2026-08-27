// Servidor estático mínimo para las pruebas E2E: sirve la carpeta web/ (la UI del
// panel) para que Playwright cargue editor.html + assets reales. Las /api las
// intercepta Playwright (page.route), no este servidor.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../web/", import.meta.url));
const port = Number(process.env.E2E_PORT || 4322);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

http
  .createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      if (p === "/" || p === "/editor") p = "/editor.html";
      const file = normalize(join(root, p));
      if (!file.startsWith(root + sep) && file !== normalize(root + p)) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      const buf = await readFile(file);
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  })
  .listen(port, () => console.log(`e2e static server on http://localhost:${port} (root ${root})`));
