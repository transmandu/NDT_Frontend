import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { apiLogin, apiDeleteFolder, apiDeleteDocument, fakePdf } from "./helpers/api";
import { openActionsMenu } from "./helpers/ui";

/**
 * Biblioteca Digital — ciclo de vida completo de carpeta + documento:
 * crear carpeta → subir documento (con vencimiento) → nueva versión →
 * historial → descarga → permisos (admin) → eliminar documento → eliminar
 * carpeta (debe fallar mientras no esté vacía, luego funcionar).
 */

test("biblioteca: carpeta → documento → nueva versión → historial → permisos → eliminar", async ({ page, request }) => {
  test.setTimeout(120_000);

  const stamp = Date.now();
  const folderName = `E2E Carpeta ${stamp}`;
  const docTitle = `E2E Documento ${stamp}`;

  const adminToken = await apiLogin(request, "admin");
  let folderId: number | null = null;
  let docId: number | null = null;

  try {
    // ── 1. Técnico crea una carpeta ──────────────────────────────────────
    await loginAs(page, "technician");
    await page.goto("/library");

    await page.getByRole("button", { name: "Nueva carpeta", exact: true }).click();
    await page.getByPlaceholder("Nombre de la carpeta").fill(folderName);
    const [createFolderRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/folders") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Crear" }).click(),
    ]);
    expect(createFolderRes.status()).toBe(201);
    folderId = (await createFolderRes.json()).folder.id;

    // La carpeta recién creada queda seleccionada automáticamente.
    await expect(page.getByText(`Ubicación: ${folderName}`)).toBeVisible();

    // ── 2. Sube un documento con vencimiento dentro de esa carpeta ───────
    await page.getByRole("button", { name: "Subir documento" }).click();
    await page.getByPlaceholder("Ej: Procedimiento de calibración de balanzas").fill(docTitle);
    // Se elige por índice (primera categoría real, después de "— Seleccionar —")
    // en vez de por texto — evita depender de mayúsculas/capitalización exactas.
    await page.locator('label:text-is("Categoría *") + select').selectOption({ index: 1 });

    const futureDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await page.getByText("Este documento tiene fecha de vencimiento").click();
    await page.locator('input[type="date"]').first().fill(futureDate);

    await page.locator('input[type="file"]').setInputFiles({
      name: "doc-v1.pdf",
      mimeType: "application/pdf",
      buffer: fakePdf("versión 1"),
    });

    const [uploadRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/upload") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Subir documento" }).last().click(),
    ]);
    expect(uploadRes.status()).toBe(201);
    docId = (await uploadRes.json()).document.id;

    const row = page.getByRole("row", { name: new RegExp(docTitle) });
    await expect(row).toBeVisible();
    await expect(row.getByText("VIGENTE")).toBeVisible();

    // ── 3. Sube una nueva versión ─────────────────────────────────────────
    await openActionsMenu(page, row);
    await page.getByRole("button", { name: "Subir nueva versión" }).click();
    await page.getByPlaceholder("Ej: Actualización tras revisión anual del procedimiento").fill("Corrección de errata E2E.");
    await page.locator('input[type="file"]').setInputFiles({
      name: "doc-v2.pdf",
      mimeType: "application/pdf",
      buffer: fakePdf("versión 2"),
    });
    const [versionRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/documents/${docId}/versions`) && r.request().method() === "POST"),
      page.getByRole("button", { name: "Crear versión" }).click(),
    ]);
    expect(versionRes.status()).toBe(201);

    // ── 4. Historial de versiones: deben verse ambas, v2 como "Actual" ────
    await openActionsMenu(page, row);
    await page.getByRole("button", { name: "Historial de versiones" }).click();
    // El número de versión también aparece en la columna "Versión" de la
    // tabla de fondo — se distingue por la clase propia del panel de historial.
    const versionBadge = (v: string) => page.locator("span.font-mono.font-bold", { hasText: v });
    await expect(versionBadge("v2.0")).toBeVisible();
    await expect(versionBadge("v1.0")).toBeVisible();
    await expect(page.getByText("Actual", { exact: true })).toBeVisible();
    await expect(page.getByText("Corrección de errata E2E.")).toBeVisible();

    // ── 5. Descarga la versión actual desde el historial ──────────────────
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTitle("Descargar").first().click(),
    ]);
    expect(download.suggestedFilename()).toContain("v2.0");
    await page.getByTitle("Cerrar", { exact: true }).click();

    // ── 6. Admin ajusta permisos del documento ─────────────────────────────
    await loginAs(page, "admin");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/documents") && r.request().method() === "GET"),
      page.goto("/library"),
    ]);
    const adminRow = page.getByRole("row", { name: new RegExp(docTitle) });
    await expect(adminRow).toBeVisible({ timeout: 20_000 });
    await openActionsMenu(page, adminRow);
    await page.getByRole("button", { name: "Permisos" }).click();
    await page.getByLabel("Técnico").check();
    const [visRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/documents/${docId}/visibility`)),
      page.getByRole("button", { name: "Guardar" }).click(),
    ]);
    expect(visRes.status()).toBe(200);

    // ── 7. Eliminar el documento ────────────────────────────────────────
    await openActionsMenu(page, adminRow);
    await page.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("¿Eliminar documento?")).toBeVisible();
    const [deleteRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/documents/${docId}`) && r.request().method() === "DELETE"),
      // El ítem del menú (recién cerrado) puede seguir un instante en el DOM
      // por la animación de salida de framer-motion — .last() apunta al
      // botón del diálogo de confirmación, que se monta después.
      page.getByRole("button", { name: "Eliminar" }).last().click(),
    ]);
    expect(deleteRes.status()).toBe(200);
    await expect(page.getByRole("row", { name: new RegExp(docTitle) })).not.toBeVisible();
    docId = null; // ya eliminado, no repetir en el cleanup

    // ── 8. Eliminar la carpeta ahora que está vacía ────────────────────────
    const [deleteFolderRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/folders/${folderId}`) && r.request().method() === "DELETE"),
      (async () => {
        // El árbol de carpetas está en el panel izquierdo — el botón de eliminar
        // vive (oculto por CSS, no desmontado) en TODAS las filas, así que se
        // escopa a la fila de esta carpeta puntual por su texto único.
        const folderRow = page.locator("div.group", { hasText: folderName });
        await folderRow.hover();
        await folderRow.getByTitle("Eliminar carpeta").click();
        // Substring match: "Eliminar carpeta" (botón del árbol) también matchea
        // "Eliminar" — .last() apunta al botón del diálogo de confirmación.
        await page.getByRole("button", { name: "Eliminar" }).last().click();
      })(),
    ]);
    expect(deleteFolderRes.status()).toBe(200);
    folderId = null;
  } finally {
    if (docId) await apiDeleteDocument(request, adminToken, docId).catch(() => {});
    if (folderId) await apiDeleteFolder(request, adminToken, folderId).catch(() => {});
  }
});
