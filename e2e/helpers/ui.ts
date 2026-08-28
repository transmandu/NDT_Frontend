import type { Page, Locator } from "@playwright/test";

/**
 * El menú de acciones de un documento (DocumentActionsMenu) calcula su
 * posición en un useEffect posterior al render que lo abre — bajo carga
 * (backend local compartido por muchas pruebas en la misma sesión) esa
 * segunda pasada puede demorar más que el primer click, y a veces el propio
 * evento no llega a abrir el menú a tiempo. Reintenta el click hasta ver un
 * ítem real del menú en vez de fallar por una sola carrera de temporización.
 */
export async function openActionsMenu(page: Page, row: Locator) {
  const marker = page.getByRole("button", { name: "Historial de versiones" });
  for (let attempt = 0; attempt < 5; attempt++) {
    await row.getByRole("button").last().click();
    try {
      await marker.waitFor({ state: "visible", timeout: 3_000 });
      return;
    } catch {
      // El menú no abrió (o se cerró) a tiempo — reintenta.
    }
  }
  await marker.waitFor({ state: "visible" });
}
