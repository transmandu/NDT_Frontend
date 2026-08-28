import type { Page } from "@playwright/test";

/** Cuentas sembradas por database/seeders/UserSeeder.php (backend). */
export const USERS = {
  technician: { email: "tecnico@orinocoquality.com", password: "password123" },
  supervisor: { email: "supervisor@orinocoquality.com", password: "password123" },
  auditor: { email: "auditor@orinocoquality.com", password: "password123" },
  admin: { email: "admin@orinocoquality.com", password: "password123" },
} as const;

export type Role = keyof typeof USERS;

/**
 * Si ya hay una sesión activa (login previo del mismo test con otro rol),
 * cierra sesión primero. /login redirige a /dashboard vía useEffect cuando
 * isAuthenticated=true, así que justo después de goto() la URL puede seguir
 * leyendo "/login" un instante antes de que el redirect ocurra — se espera
 * a que aparezca el formulario (o no) en vez de confiar en la URL inmediata.
 */
async function ensureLoggedOut(page: Page) {
  await page.goto("/login");
  try {
    await page.getByPlaceholder("usuario@orinocoquality.com").waitFor({ state: "visible", timeout: 2000 });
    return;
  } catch {
    // Seguía autenticado: nos redirigió a /dashboard.
  }
  await page.waitForURL("**/dashboard", { timeout: 5000 }).catch(() => {});
  await page.getByTitle("Cerrar sesión").click();
  await page.waitForURL("**/login");
}

export async function loginAs(page: Page, role: Role) {
  await ensureLoggedOut(page);
  const { email, password } = USERS[role];
  await page.getByPlaceholder("usuario@orinocoquality.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /ingresar al sistema/i }).click();
  await page.waitForURL("**/dashboard");
}
