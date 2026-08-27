import type { SourceConfig } from "../blogAutomationSchema.js";
import { parseFeed, parseSitemap, discoverFeedUrl, htmlToText, htmlTitle, decodeXml, type FeedItem } from "./parse.js";
import { fetchRobots, isAllowed } from "./robots.js";

export interface ResearchDeps {
  // fetch inyectable (para pruebas). Por defecto, el global de Node.
  fetchFn?: typeof fetch;
  now?: () => Date;
  userAgent?: string;
  timeoutMs?: number;
}

export interface SourceResult {
  url: string;
  ok: boolean;
  required: boolean;
  items: FeedItem[];
  error?: string;
}

const UA = "IIDEA-BlogBot/1.0 (+https://iidea.edu.ec)";

export async function fetchText(url: string, deps: ResearchDeps): Promise<string> {
  const f = deps.fetchFn ?? fetch;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), deps.timeoutMs ?? 10000);
  try {
    const res = await f(url, { signal: ctrl.signal, headers: { "user-agent": deps.userAgent ?? UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

// Enlaces internos (mismo origen) con su texto de ancla, para la profundidad de
// rastreo cuando la fuente es una página HTML (no un feed).
function internalLinks(html: string, baseUrl: string): Array<{ title: string; link: string }> {
  const origin = new URL(baseUrl).origin;
  const seen = new Set<string>();
  const out: Array<{ title: string; link: string }> = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let abs: string;
    try { abs = new URL(m[1], baseUrl).toString(); } catch { continue; }
    if (!abs.startsWith(origin) || seen.has(abs) || abs === baseUrl) continue;
    const title = htmlToText(m[2]);
    if (!title || title.length < 8) continue; // descarta "inicio", iconos, etc.
    seen.add(abs);
    out.push({ title, link: abs });
  }
  return out;
}

function applyFilters(items: FeedItem[], source: SourceConfig, now: Date): FeedItem[] {
  let out = items;
  const kws = source.keywordFilter.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (kws.length) {
    out = out.filter((it) => {
      const hay = `${it.title} ${it.summary}`.toLowerCase();
      return kws.some((k) => hay.includes(k));
    });
  }
  if (source.newerThanDays > 0) {
    const cutoff = now.getTime() - source.newerThanDays * 86_400_000;
    // Conserva los ítems sin fecha (muchos feeds/fallbacks no la traen).
    out = out.filter((it) => !it.date || it.date.getTime() >= cutoff);
  }
  return out.slice(0, source.maxResults);
}

// Investiga UNA fuente: feeds/sitemap primero; si es HTML, descubre su feed o
// cae a leer la página (y a rastrear enlaces si crawlDepth>0). Aplica los
// filtros de la fuente. Nunca lanza: devuelve ok:false con el error.
export async function researchSource(source: SourceConfig, deps: ResearchDeps = {}): Promise<SourceResult> {
  const now = (deps.now ?? (() => new Date()))();
  const base: Omit<SourceResult, "items" | "ok"> = { url: source.url, required: source.required };
  try {
    const u = new URL(source.url);
    const robots = await fetchRobots(u.origin, deps.fetchFn ?? fetch, deps.timeoutMs);
    if (!isAllowed(robots, u.pathname, deps.userAgent ?? "iidea-blogbot")) {
      return { ...base, ok: false, items: [], error: "Bloqueado por robots.txt" };
    }

    const body = await fetchText(source.url, deps);
    let items: FeedItem[] = [];

    if (/<rss[\s>]|<feed[\s>]/i.test(body)) {
      items = parseFeed(body);
    } else if (/<urlset[\s>]|<sitemapindex[\s>]/i.test(body)) {
      items = parseSitemap(body).map((s) => ({ title: "", link: s.link, date: s.date, summary: "" }));
    } else {
      // HTML: intenta descubrir un feed declarado; si no, usa la página.
      const feedUrl = discoverFeedUrl(body, source.url);
      if (feedUrl) {
        items = parseFeed(await fetchText(feedUrl, deps));
      } else if (source.crawlDepth > 0) {
        // Rastreo: enlaces internos como ítems; con profundidad ≥2, además baja
        // cada página para su título/resumen reales (acotado a maxResults).
        const links = internalLinks(body, source.url).slice(0, source.maxResults);
        if (source.crawlDepth >= 2) {
          items = await Promise.all(
            links.map(async (l) => {
              try {
                const page = await fetchText(l.link, deps);
                return { title: htmlTitle(page) || l.title, link: l.link, date: null, summary: htmlToText(page).slice(0, 500) };
              } catch {
                return { title: l.title, link: l.link, date: null, summary: "" };
              }
            }),
          );
        } else {
          items = links.map((l) => ({ title: l.title, link: l.link, date: null, summary: "" }));
        }
      } else {
        items = [{ title: htmlTitle(body) || source.url, link: source.url, date: null, summary: decodeXml(htmlToText(body)).slice(0, 800) }];
      }
    }

    return { ...base, ok: true, items: applyFilters(items, source, now) };
  } catch (err) {
    return { ...base, ok: false, items: [], error: err instanceof Error ? err.message : String(err) };
  }
}
