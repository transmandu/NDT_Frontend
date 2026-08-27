import { defineConfig, devices } from "@playwright/test";

/**
 * E2E del módulo de Gestión de Calidad (plan §6.2). Corre contra el backend
 * real (sqlsrv NDTLAB_DB) usando las cuentas sembradas por UserSeeder — no hay
 * aislamiento de base de datos aquí (a diferencia de los tests PHPUnit, que
 * usan DatabaseTransactions). Cada test limpia lo que crea (ver e2e/helpers).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Contra el dev server (Turbopack + HMR) el watcher de Next.js recompila
    // cada vez que Playwright escribe en test-results/, y una recarga en
    // caliente a mitad de una transición puede tumbar la página con un error
    // de boundary transitorio. Un build de producción no tiene watcher —
    // mismo comportamiento que tendría el usuario final, sin ese ruido.
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
