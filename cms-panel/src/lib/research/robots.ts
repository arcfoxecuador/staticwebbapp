// robots.txt: cortesía básica. `isAllowed` es puro (se prueba sin red); es
// conservador (ante la duda, respeta Disallow) — preferimos no molestar a un
// sitio antes que raspar de más.

export function isAllowed(robotsTxt: string, path: string, ua = "*"): boolean {
  if (!robotsTxt) return true;
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
  type Group = { agents: string[]; disallow: string[] };
  const groups: Group[] = [];
  let cur: Group | null = null;
  let expectingAgents = false;
  for (const line of lines) {
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !expectingAgents) { cur = { agents: [], disallow: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      expectingAgents = true;
    } else if (cur) {
      expectingAgents = false;
      if (key === "disallow" && val) cur.disallow.push(val);
    }
  }
  const uaLower = ua.toLowerCase();
  const match =
    groups.find((g) => g.agents.some((name) => name !== "*" && uaLower.includes(name))) ||
    groups.find((g) => g.agents.includes("*"));
  if (!match) return true;
  return !match.disallow.some((d) => d !== "" && path.startsWith(d));
}

// Descarga /robots.txt de un origen. Nunca lanza: si no se puede leer, devuelve
// "" (que `isAllowed` interpreta como "permitido").
export async function fetchRobots(origin: string, fetchFn: typeof fetch, timeoutMs = 8000): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetchFn(`${origin}/robots.txt`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}
