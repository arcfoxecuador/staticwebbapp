import { defineConfig, devices } from "@playwright/test";

// Suite E2E "humo" del panel: carga la UI real (web/) con las /api simuladas y
// verifica los flujos críticos del editor (renderizar, editar, guardar). Es la
// red de seguridad para editor.js, que no tiene pruebas unitarias.
const PORT = Number(process.env.E2E_PORT || 4322);

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    // En el sandbox usamos el Chromium preinstalado (PW_EXECUTABLE_PATH); en CI
    // Playwright instala el suyo con `npx playwright install`.
    ...(process.env.PW_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node test/e2e/static-server.mjs",
    url: `http://localhost:${PORT}/editor.html`,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(PORT) },
  },
});
