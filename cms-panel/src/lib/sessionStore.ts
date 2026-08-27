// ─────────────────────────────────────────────────────────────────────────────
// Store de sesión configurable.
//
// Por defecto express-session usa un MemoryStore: las sesiones se pierden al
// reiniciar el panel y NO se pueden compartir entre varias instancias. Para
// producción real, definir SESSION_REDIS_URL → las sesiones viven en Redis
// (sobreviven reinicios y permiten escalar horizontalmente).
//
// Diseño tolerante: si no hay URL, o Redis no está disponible, se cae a memoria
// con un aviso — el panel siempre arranca.
// ─────────────────────────────────────────────────────────────────────────────

import type session from "express-session";
import { log } from "./observability.js";

export async function buildSessionStore(): Promise<session.Store | undefined> {
  const url = process.env.SESSION_REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      log.warn(
        "sessions: usando memoria (SESSION_REDIS_URL no definido). Se pierden al reiniciar y no escalan a más de una instancia.",
      );
    }
    return undefined; // → MemoryStore por defecto
  }
  try {
    const redisMod: any = await import("redis");
    const connectMod: any = await import("connect-redis");
    const RedisStore = connectMod.RedisStore ?? connectMod.default;
    const client = redisMod.createClient({ url });
    client.on("error", (e: unknown) =>
      log.error("redis error", { err: e instanceof Error ? e.message : String(e) }),
    );
    await client.connect();
    log.info("sessions: Redis conectado.");
    // TTL alineado con la cookie (8 h).
    return new RedisStore({ client, prefix: "iidea-sess:", ttl: 60 * 60 * 8 });
  } catch (e) {
    log.error("sessions: no se pudo iniciar Redis; usando memoria.", {
      err: e instanceof Error ? e.message : String(e),
    });
    return undefined;
  }
}
