// Parsers PUROS (sin red) para la investigación del bot: feeds RSS/Atom,
// sitemaps, descubrimiento de feeds en HTML, HTML→texto y extracción de
// palabras clave. Todo es determinista y se prueba sin fetch.

export interface FeedItem {
  title: string;
  link: string;
  date: Date | null;
  summary: string;
}

// Decodifica CDATA + entidades básicas y recorta espacios.
export function decodeXml(raw: string): string {
  let s = raw ?? "";
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#0*38;|&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return s.trim();
}

function firstTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeXml(m[1]) : "";
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

// Parsea un feed RSS 2.0 o Atom en una lista de ítems (título, enlace, fecha,
// resumen). Tolerante: si un campo falta, queda vacío/null.
export function parseFeed(xml: string): FeedItem[] {
  if (!xml) return [];
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const items: FeedItem[] = [];
  if (isAtom) {
    for (const m of xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)) {
      const b = m[1];
      // <link rel="alternate" href="..."> o el primer <link href="...">.
      const linkAlt = b.match(/<link[^>]*\brel=["']?alternate["']?[^>]*\bhref=["']([^"']+)["']/i);
      const linkAny = b.match(/<link[^>]*\bhref=["']([^"']+)["']/i);
      items.push({
        title: firstTag(b, "title"),
        link: decodeXml(linkAlt?.[1] || linkAny?.[1] || ""),
        date: parseDate(firstTag(b, "updated") || firstTag(b, "published")),
        summary: firstTag(b, "summary") || firstTag(b, "content"),
      });
    }
  } else {
    for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
      const b = m[1];
      items.push({
        title: firstTag(b, "title"),
        link: firstTag(b, "link") || decodeXml((b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || ""),
        date: parseDate(firstTag(b, "pubDate") || firstTag(b, "dc:date") || firstTag(b, "date")),
        summary: firstTag(b, "description") || firstTag(b, "content:encoded"),
      });
    }
  }
  return items.filter((it) => it.title || it.link);
}

// Parsea un sitemap.xml en enlaces con su lastmod (si lo trae).
export function parseSitemap(xml: string): Array<{ link: string; date: Date | null }> {
  if (!xml) return [];
  const out: Array<{ link: string; date: Date | null }> = [];
  for (const m of xml.matchAll(/<url[\s>]([\s\S]*?)<\/url>/gi)) {
    const b = m[1];
    const loc = firstTag(b, "loc");
    if (loc) out.push({ link: loc, date: parseDate(firstTag(b, "lastmod")) });
  }
  return out;
}

// Descubre la URL de un feed declarado en el <head> del HTML (rel=alternate).
export function discoverFeedUrl(html: string, baseUrl: string): string | null {
  const m = html.match(/<link[^>]*\btype=["']application\/(?:rss|atom)\+xml["'][^>]*>/i);
  if (!m) return null;
  const href = m[0].match(/\bhref=["']([^"']+)["']/i);
  if (!href) return null;
  try { return new URL(href[1], baseUrl).toString(); } catch { return null; }
}

// HTML → texto plano (quita scripts/estilos/etiquetas, decodifica entidades).
export function htmlToText(html: string): string {
  return decodeXml(
    (html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

export function htmlTitle(html: string): string {
  return firstTag(html, "title") || firstTag(html, "h1");
}

// Palabras vacías (ES + comunes) para el análisis de temas de la competencia.
const STOPWORDS = new Set(
  ("de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si " +
    "porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les " +
    "ni contra otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra tan the of to and in for on")
    .split(" "),
);

// Palabras significativas de un texto (minúsculas, sin acentos, sin stopwords, ≥4 letras).
export function keywords(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

// Análisis de huecos: temas frecuentes en la competencia que NO cubren los míos.
export function topicGaps(competitorTitles: string[], myTopics: string[], limit = 8): string[] {
  const mine = new Set(myTopics.flatMap((t) => keywords(t)));
  const freq = new Map<string, number>();
  for (const title of competitorTitles) {
    // Únicas por título para no sobrecontar un mismo post.
    for (const w of new Set(keywords(title))) {
      if (!mine.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}
