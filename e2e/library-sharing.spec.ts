import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  apiLogin,
  apiListCategories,
  apiUploadDocument,
  apiDeleteDocument,
  apiCreateFolder,
  apiDeleteFolder,
  apiCreateShareRequest,
  API_BASE,
} from "./helpers/api";
import { openActionsMenu } from "./helpers/ui";

/**
 * Biblioteca Digital — solicitar/aprobar/rechazar compartir (Técnico → Auditor)
 * y generación directa de enlace (Admin), más el acceso público real por
 * token (incrementa access_count en cada llamada).
 */
test("biblioteca: solicitar compartir → aprobar/rechazar (auditor) → enlace directo (admin) → acceso público", async ({ page, request }) => {
  test.setTimeout(120_000);

  const stamp = Date.now();
  const docTitle = `E2E Compartir ${stamp}`;

  const adminToken = await apiLogin(request, "admin");
  const categories = await apiListCategories(request, adminToken);
  const docId = await apiUploadDocument(request, adminToken, { title: docTitle, category_id: categories[0].id });

  try {
    // ── 1. Admin no puede solicitar compartir (solo generar directo) ──────
    const adminRequestRes = await apiCreateShareRequest(request, adminToken, {
      document_id: docId,
      shared_with_name: "Nadie",
      reason: "Chequeo de permisos E2E — admin no debería poder solicitar.",
    });
    expect(adminRequestRes.status()).toBe(403);

    // ── 2. Técnico solicita compartir vía UI ───────────────────────────────
    await loginAs(page, "technician");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/documents") && r.request().method() === "GET"),
      page.goto("/library"),
    ]);
    const row = page.getByRole("row", { name: new RegExp(docTitle) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await openActionsMenu(page, row);
    await page.getByRole("button", { name: "Compartir" }).click();

    // Un rol con solo canRequestShare nunca debería ver el tab "Generar enlace".
    await expect(page.getByRole("button", { name: "Generar enlace" })).toHaveCount(0);

    await page.getByPlaceholder("Nombre de quien recibirá el enlace").fill("Cliente Externo E2E");
    await page.getByPlaceholder("Motivo para compartir este documento").fill(`Solicitud E2E ${stamp} — primera, se aprobará.`);
    const [reqRes1] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/share-requests") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Enviar solicitud" }).click(),
    ]);
    expect(reqRes1.status()).toBe(201);

    // Segunda solicitud (vía API, para el flujo de rechazo — ya se probó la UI arriba).
    const techToken = await apiLogin(request, "technician");
    const reqRes2 = await apiCreateShareRequest(request, techToken, {
      document_id: docId,
      shared_with_name: "Cliente Externo E2E 2",
      reason: `Solicitud E2E ${stamp} — segunda, se rechazará.`,
    });
    expect(reqRes2.ok()).toBeTruthy();

    // ── 3. Auditor aprueba una y rechaza la otra ───────────────────────────
    await loginAs(page, "auditor");
    await page.goto("/library");
    await page.getByRole("button", { name: "Solicitudes" }).click();
    await expect(page.getByRole("button", { name: /PENDIENTES/ })).toBeVisible();
    // Da tiempo a que el polling de useShareRequestNotifications traiga las
    // dos solicitudes recién creadas antes de buscarlas por texto.
    await expect(page.getByText(`Solicitud E2E ${stamp} — primera, se aprobará.`)).toBeVisible({ timeout: 20_000 });

    const approveCard = page.getByText(`Solicitud E2E ${stamp} — primera, se aprobará.`).locator("..").locator("..");
    const [approveRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/approve")),
      approveCard.getByTitle("Aprobar").click(),
    ]);
    expect(approveRes.status()).toBe(200);
    const approveBody = await approveRes.json();
    const shareUrl: string = approveBody.share_request?.shared_link?.url ?? approveBody.shared_link?.url;

    const rejectCard = page.getByText(`Solicitud E2E ${stamp} — segunda, se rechazará.`).locator("..").locator("..");
    await rejectCard.getByTitle("Rechazar").click();
    const rejectionReason = `Motivo de rechazo E2E ${stamp}.`;
    await page.getByPlaceholder("Motivo del rechazo (mín. 5 caracteres)").fill(rejectionReason);
    const [rejectRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/reject")),
      page.getByRole("button", { name: "Confirmar rechazo" }).click(),
    ]);
    expect(rejectRes.status()).toBe(200);

    await page.getByRole("button", { name: /RECHAZADAS/ }).click();
    await expect(rejectCard.getByText(`Motivo de rechazo: ${rejectionReason}`)).toBeVisible();

    // ── 4. Acceso público real por token — debe incrementar access_count ──
    expect(shareUrl).toBeTruthy();
    const token = shareUrl.split("/").pop();
    const info1 = await request.get(`${API_BASE}/library/shared/info/${token}`);
    expect(info1.ok()).toBeTruthy();
    expect((await info1.json()).found).toBe(true);

    const content1 = await request.get(`${API_BASE}/library/shared/content/${token}`);
    expect(content1.ok()).toBeTruthy();
    const content2 = await request.get(`${API_BASE}/library/shared/content/${token}`);
    expect(content2.ok()).toBeTruthy();

    const activeShares = await request.get(`${API_BASE}/library/documents/${docId}/active-share`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const links = (await activeShares.json()).shared_links as { access_count: number }[];
    expect(links.some((l) => l.access_count >= 2)).toBe(true);

    // ── 5. Admin genera un enlace directo desde la UI ──────────────────────
    await loginAs(page, "admin");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/documents") && r.request().method() === "GET"),
      page.goto("/library"),
    ]);
    const adminRow = page.getByRole("row", { name: new RegExp(docTitle) });
    await expect(adminRow).toBeVisible({ timeout: 20_000 });
    await openActionsMenu(page, adminRow);
    await page.getByRole("button", { name: "Compartir" }).click();

    // Admin solo genera directo — nunca ve el tab "Solicitar".
    await expect(page.getByRole("button", { name: "Solicitar" })).toHaveCount(0);

    await page.getByPlaceholder("Nombre de quien recibirá el enlace").fill("Cliente Directo E2E");
    await page.getByPlaceholder("Motivo para compartir este documento").fill("Generación directa de prueba E2E.");
    const [genRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/documents/${docId}/share`)),
      page.getByRole("button", { name: "Generar enlace" }).click(),
    ]);
    expect(genRes.status()).toBe(201);
    await expect(page.getByText("Enlaces activos")).toBeVisible();
  } finally {
    await apiDeleteDocument(request, adminToken, docId).catch(() => {});
  }
});

/**
 * DocumentPermissionsDialog promete en su copy que la visibilidad de un
 * documento "nunca puede ser más amplia que la de su carpeta" —
 * LibraryDocumentController@updateVisibility ahora sí lo valida (422 vía
 * LibraryFolderService::assertDocumentRolesWithinFolder), cerrando el hueco
 * de control de acceso que existía antes (ver también
 * tests/Feature/Library/LibraryVisibilityTest.php en el backend, que además
 * cubre el caso de defensa en profundidad — canView() ante datos ya
 * inconsistentes).
 */
test("biblioteca: la visibilidad del documento se valida contra la de su carpeta", async ({ page, request }) => {
  test.setTimeout(90_000);

  const stamp = Date.now();
  const adminToken = await apiLogin(request, "admin");
  const categories = await apiListCategories(request, adminToken);

  const folderId = await apiCreateFolder(request, adminToken, {
    name: `E2E Solo Supervisor ${stamp}`,
    visible_to_roles: ["supervisor"],
  });
  const docId = await apiUploadDocument(request, adminToken, {
    title: `E2E Doc en carpeta restringida ${stamp}`,
    category_id: categories[0].id,
    folder_id: folderId,
  });

  try {
    await loginAs(page, "admin");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/library/documents") && r.request().method() === "GET"),
      page.goto("/library"),
    ]);
    const row = page.getByRole("row", { name: new RegExp(`E2E Doc en carpeta restringida ${stamp}`) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await openActionsMenu(page, row);
    await page.getByRole("button", { name: "Permisos" }).click();

    await expect(page.getByText(/nunca puede ser más amplia que la de su carpeta/)).toBeVisible();

    // La carpeta solo permite "supervisor" — igual dejamos marcar "Técnico".
    await page.getByLabel("Técnico").check();
    const [visRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/library/documents/${docId}/visibility`)),
      page.getByRole("button", { name: "Guardar" }).click(),
    ]);

    // El backend ahora sí aplica la restricción prometida por la UI: 422, y
    // el diálogo se queda abierto (no llama a onClose en el error).
    expect(visRes.status()).toBe(422);
    await expect(page.getByText("Permisos del documento")).toBeVisible();
  } finally {
    await apiDeleteDocument(request, adminToken, docId).catch(() => {});
    await apiDeleteFolder(request, adminToken, folderId).catch(() => {});
  }
});
