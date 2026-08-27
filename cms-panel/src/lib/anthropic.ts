import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

// Cliente de Claude, construido de forma perezosa la primera vez que un agente
// lo necesita. Así el servidor arranca (y el health check /login responde)
// aunque ANTHROPIC_API_KEY no esté presente; el error solo aparece al ejecutar
// un agente, con un mensaje claro.
let client: Anthropic | null = null;
let testDouble: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (testDouble) return testDouble; // inyección de pruebas (ver setAnthropicForTests)
  if (!config.anthropicApiKey) {
    throw new Error("Falta ANTHROPIC_API_KEY (configúrala en el entorno del panel)");
  }
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

// Sustituye el cliente de Claude por un doble SOLO para pruebas (sin red ni API
// key). Pasa null para restaurar el cliente real. No se usa en producción.
export function setAnthropicForTests(fake: Anthropic | null): void {
  testDouble = fake;
}
