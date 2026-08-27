import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  apiLogin,
  apiListCategories,
  apiCreateFolder,
  apiUploadDocument,
  apiDeleteDocument,
  apiDeleteFolder,
} from "./helpers/api";

/**
 * Biblioteca Digital — mover un documento entre carpetas por arrastrar y
 * soltar. El endpoint (PATCH /library/documents/{id}/move) y sus tres
 * garantías normativas (acceso coherente §8.2.5, salvaguarda de
 * confidencialidad §7.11.3, bitácora document.moved §8.4.2) ya están
 * cubiertos por tests/Feature/Library/LibraryMoveTest.php en el backend —
 * esto solo verifica el gesto de UI en sí y el gate de permiso por rol.
 *
 * Deliberadamente en dos tests con un solo login cada uno (no cambio de rol
 * a mitad de test): el backend local compartido de este entorno intercala
 * cuelgues intermitentes justo en el re-login, y encadenar dos logins en la
 * misma prueba concentraba ahí el riesgo de flakiness sin relación con la
 * funcionalidad real.
 */
test("biblioteca: arrastrar un documento y soltarlo en otra carpeta lo mueve", async ({ page, request }) => {
  test.setTimeout(90_000);

  const stamp = Date.now();
  const adminToken = await apiLogin(request, "admin");
  const categories = await apiListCategories(request, adminToken);

  const origin = await apiCreateFolder(request, adminToken, { name: `E2E Origen ${stamp}` });
  const destination = await apiCreateFolder(request, adminToken, { name: `E2E Destino ${stamp}` });
  const docTitle = `E2E Arrastrar ${stamp}`;
  const docId = await apiUploadDocument(request, adminToken, {
    title: docTitle,
    category_id: categories[0].id,
    folder_id: origin,
  });

  try {
    await loginAs(page, "supervisor");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/documents") && r.request().method() === "GET"),
      page.goto("/library"),
    ]);

    const row = page.getByRole("row", { name: new RegExp(docTitle) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toHaveAttribute("draggable", "true");

    const destinationNode = page.getByText(`E2E Destino ${stamp}`, { exact: true });

    const [moveRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/documents/${docId}/move`)),
      row.dragTo(destinationNode),
    ]);
    expect(moveRes.status()).toBe(200);

    // Al mover, la app navega/selecciona la carpeta destino y refresca la lista.
    await expect(page.getByText(`Ubicación: E2E Destino ${stamp}`)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(docTitle) })).toBeVisible();
  } finally {
    await apiDeleteDocument(request, adminToken, docId).catch(() => {});
    await apiDeleteFolder(request, adminToken, origin).catch(() => {});
    await apiDeleteFolder(request, adminToken, destination).catch(() => {});
  }
});

test("biblioteca: un rol sin canManageFolders no puede iniciar el arrastre", async ({ page, request }) => {
  test.setTimeout(60_000);

  const stamp = Date.now();
  const adminToken = await apiLogin(request, "admin");
  const categories = await apiListCategories(request, adminToken);
  const docTitle = `E2E Sin Arrastre ${stamp}`;
  const docId = await apiUploadDocument(request, adminToken, { title: docTitle, category_id: categories[0].id });

  try {
    await loginAs(page, "auditor");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/documents") && r.request().method() === "GET"),
      page.goto("/library"),
    ]);

    const row = page.getByRole("row", { name: new RegExp(docTitle) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).not.toHaveAttribute("draggable", "true");
  } finally {
    await apiDeleteDocument(request, adminToken, docId).catch(() => {});
  }
});
