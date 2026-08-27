import { esc } from "./dom.js";

// Mini-renderizador de Markdown para la pestaña "Vista previa" del editor de
// entradas (autónomo: la CSP del panel no permite CDNs). Cubre lo que produce
// la barra de formato: encabezados, negrita/itálica, enlaces, listas y citas.
export function mdToHtml(md) {
  const inline = (t) =>
    esc(t)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = [];
  let list = null; // "ul" | "ol"
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const rawLine of String(md).split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) { closeList(); out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); }
    else if ((m = line.match(/^[-*]\s+(.*)/))) { if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\d+\.\s+(.*)/))) { if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^>\s?(.*)/))) { closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if (line === "") { closeList(); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  return out.join("\n");
}

