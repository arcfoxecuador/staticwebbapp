import type { BlogAutomationConfig } from "../blogAutomationSchema.js";
import { parseFeed, discoverFeedUrl, topicGaps } from "./parse.js";
import { fetchRobots, isAllowed } from "./robots.js";
import { fetchText, type ResearchDeps } from "./sources.js";

export interface CompetitorPost {
  title: string;
  link: string;
  date: Date | null;
}
export interface CompetitorResult {
  domain: string;
  ok: boolean;
  posts: CompetitorPost[];
  error?: string;
}
export interface CompetitorResearch {
  competitors: CompetitorResult[];
  recentTitles: string[];
  // Temas frecuentes en la competencia que NO cubren tus temas (huecos).
  gaps: string[];
}

// Rutas de feed habituales que probar si el sitio no declara uno en su HTML.
const FEED_PATHS = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml", "/blog/feed", "/blog/rss.xml", "/noticias/rss.xml"];

function toUrl(domain: string): string {
  const d = domain.trim();
  return /^https?:\/\//i.test(d) ? d : `https://${d}`;
}

// Encuentra y parsea el feed de un competidor: primero descubre uno declarado en
// su portada; si no, prueba rutas comunes. Devuelve [] si no hay feed detectable.
async function findFeedItems(startUrl: string, deps: ResearchDeps) {
  try {
    const home = await fetchText(startUrl, deps);
    if (/<rss[\s>]|<feed[\s>]/i.test(home)) return parseFeed(home);
    const feedUrl = discoverFeedUrl(home, startUrl);
    if (feedUrl) {
      const items = parseFeed(await fetchText(feedUrl, deps));
      if (items.length) return items;
    }
  } catch {
    // seguimos con las rutas comunes
  }
  const origin = new URL(startUrl).origin;
  for (const p of FEED_PATHS) {
    try {
      const items = parseFeed(await fetchText(origin + p, deps));
      if (items.length) return items;
    } catch {
      /* prueba la siguiente */
    }
  }
  return [];
}

// Investiga a la competencia: posts recientes por dominio (dentro de la ventana)
// y análisis de huecos de temas frente a los propios. Nunca lanza por dominio.
export async function researchCompetitors(
  cfg: BlogAutomationConfig["competitors"],
  myTopics: string[],
  deps: ResearchDeps = {},
): Promise<CompetitorResearch> {
  const now = (deps.now ?? (() => new Date()))();
  const cutoff = now.getTime() - cfg.lookbackDays * 86_400_000;

  const competitors = await Promise.all(
    cfg.domains.map(async (domain): Promise<CompetitorResult> => {
      try {
        const url = toUrl(domain);
        const origin = new URL(url).origin;
        const robots = await fetchRobots(origin, deps.fetchFn ?? fetch, deps.timeoutMs);
        if (!isAllowed(robots, "/", deps.userAgent ?? "iidea-blogbot")) {
          return { domain, ok: false, posts: [], error: "Bloqueado por robots.txt" };
        }
        const items = await findFeedItems(url, deps);
        const posts = items
          .filter((it) => !it.date || it.date.getTime() >= cutoff)
          .slice(0, cfg.postsPerCompetitor)
          .map((it) => ({ title: it.title, link: it.link, date: it.date }));
        return { domain, ok: items.length > 0, posts, error: items.length ? undefined : "Sin feed detectable" };
      } catch (err) {
        return { domain, ok: false, posts: [], error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );

  const recentTitles = competitors.flatMap((c) => c.posts.map((p) => p.title)).filter(Boolean);
  return { competitors, recentTitles, gaps: topicGaps(recentTitles, myTopics) };
}
