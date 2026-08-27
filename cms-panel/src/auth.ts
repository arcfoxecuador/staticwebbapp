import passport from "passport";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import type { Express, RequestHandler } from "express";
import { config } from "./config.js";

export type PanelRole = "admin" | "editor";

export interface PanelUser {
  email: string;
  name: string;
  picture?: string;
  role: PanelRole;
}

// Restringe el acceso al dominio del correo de IIDEA (M365) y, opcionalmente, a
// una lista de correos. Cualquier cuenta fuera de eso es rechazada.
function isAllowed(email: string): boolean {
  const e = email.toLowerCase();
  if (config.microsoft.allowedEmails.length > 0) {
    return config.microsoft.allowedEmails.includes(e);
  }
  return e.endsWith(`@${config.microsoft.allowedDomain}`);
}

// Rol del usuario. Si no hay lista de admins configurada, TODOS son admin
// (compatibilidad con setups de un solo usuario).
function roleFor(email: string): PanelRole {
  if (config.adminEmails.length === 0) return "admin";
  return config.adminEmails.includes(email.toLowerCase()) ? "admin" : "editor";
}

// La estrategia passport-microsoft expone el correo en distintos campos según
// la cuenta; lo buscamos de forma robusta.
function extractEmail(profile: any): string {
  return (
    profile?.emails?.[0]?.value ||
    profile?._json?.mail ||
    profile?._json?.userPrincipalName ||
    ""
  );
}

export function configurePassport(app: Express) {
  const configured = Boolean(config.microsoft.clientId && config.microsoft.clientSecret);

  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user, done) => done(null, user as PanelUser));
  passport.deserializeUser((obj, done) => done(null, obj as PanelUser));

  if (!configured) {
    // Sin credenciales de Microsoft el panel igual arranca (health check OK),
    // pero el login no funciona. Avisamos y respondemos claro si lo intentan.
    console.warn("⚠️  MICROSOFT_CLIENT_ID/SECRET no configurados: el login está deshabilitado.");
    app.get("/auth/microsoft", (_req, res) =>
      res.status(503).send("Login no configurado: falta MICROSOFT_CLIENT_ID/SECRET."),
    );
    return;
  }

  passport.use(
    new MicrosoftStrategy(
      {
        clientID: config.microsoft.clientId,
        clientSecret: config.microsoft.clientSecret,
        callbackURL: `${config.panelBaseUrl}/auth/microsoft/callback`,
        // Endpoint del tenant de IIDEA (login.microsoftonline.com/{tenant}).
        tenant: config.microsoft.tenant,
        scope: ["user.read"],
        // Anti-CSRF del login: sin esto, un atacante puede completar el callback
        // con SU código y dejarte con la sesión de otra cuenta — y entonces el
        // "— por correo" que firma cada commit deja de ser fiable.
        // OJO: `state` tiene que ir AQUÍ. passport-oauth2 elige el almacén de
        // verificación en el constructor (strategy.js:105-114); pasarlo a
        // passport.authenticate() solo manda el parámetro, sin comprobarlo
        // nunca a la vuelta. Requiere sesión, que ya está montada.
        state: true,
      },
      (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        const email = extractEmail(profile);
        if (!isAllowed(email)) {
          return done(null, false, { message: "Cuenta no autorizada" });
        }
        const user: PanelUser = {
          email,
          name: profile?.displayName ?? email,
          role: roleFor(email),
        };
        return done(null, user);
      },
    ),
  );

  // Inicia el flujo OAuth con Microsoft.
  app.get(
    "/auth/microsoft",
    passport.authenticate("microsoft", { prompt: "select_account" }),
  );

  app.get(
    "/auth/microsoft/callback",
    passport.authenticate("microsoft", { failureRedirect: "/login?error=1" }),
    (_req, res) => res.redirect("/"),
  );

  app.post("/logout", (req, res, next) => {
    req.logout((err) => (err ? next(err) : res.redirect("/login")));
  });
}

// Middleware: exige sesión iniciada. Para /api devuelve 401; para páginas
// redirige al login.
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated?.() && req.user) return next();
  if (req.path.startsWith("/api/")) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  res.redirect("/login");
};

// Middleware: exige rol admin (acciones globales/irreversibles). Asume que
// requireAuth ya corrió. Los editores reciben 403 con un mensaje claro.
export const requireAdmin: RequestHandler = (req, res, next) => {
  const user = req.user as PanelUser | undefined;
  if (user?.role === "admin") return next();
  res.status(403).json({ error: "Esta acción es solo para administradores." });
};
