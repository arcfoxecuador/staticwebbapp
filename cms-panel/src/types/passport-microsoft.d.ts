// Declaración mínima de tipos para passport-microsoft (no publica tipos oficiales).
declare module "passport-microsoft" {
  import type { Request } from "express";

  export interface MicrosoftStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenant?: string;
    scope?: string[];
    authorizationURL?: string;
    tokenURL?: string;
    // Heredada de OAuth2Strategy (passport-oauth2), que es la clase base:
    // activa el almacén de verificación del parámetro `state` (anti-CSRF del
    // login). Se declara aquí porque passport-microsoft no publica tipos.
    state?: boolean;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any, info?: any) => void,
  ) => void;

  export class Strategy {
    constructor(options: MicrosoftStrategyOptions, verify: VerifyCallback);
    name: string;
    authenticate(req: Request, options?: any): void;
  }
}
