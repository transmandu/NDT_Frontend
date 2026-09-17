import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { apiLogin, API_BASE } from "./helpers/api";

/**
 * Plan Fase 7.2 — flujo completo del Cotizador NDT:
 * crear cliente → nueva cotización → seleccionar 2 métodos (VT, UT) →
 * completar ambas partidas → emitir → descargar PDF → verificar código en
 * /verify-quote/{code}. Más el segundo escenario del plan: intentar editar
 * una cotización ya emitida debe estar bloqueado tanto en la UI (no hay
 * campos de edición en la vista issued) como en la API (422 si se fuerza).
 *
 * A diferencia de los tests PHPUnit (DatabaseTransactions), esto corre
 * contra el backend real sin aislamiento — y a diferencia de otros e2e de
 * este repo, NO se limpia al final: emitir una cotización es una transición
 * irreversible (el Observer bloquea el borrado fuera de draft), así que el
 * cliente y la cotización de prueba quedan como registro permanente,
 * identificables por su nombre — mismo criterio que ya usan
 * quality-lifecycle.spec.ts con sus NC/AC de prueba (decisión confirmada
 * explícitamente para este test, no asumida).
 */
test("ciclo de vida completo: crear cliente, cotizar 2 métodos, emitir, descargar y verificar", async ({
  page,
  request,
}) => {
  // Emitir genera el PDF de forma síncrona en el servidor (50-60s medido con
  // 2 partidas en este entorno) — presupuesto generoso para no competir con
  // esa latencia real, más margen para el resto de los pasos.
  test.setTimeout(240_000);

  await loginAs(page, "supervisor");
  await page.goto("/quotes/new");

  // ── 1. Cliente nuevo ──────────────────────────────────────────────
  await page.getByRole("button", { name: "Nuevo" }).click();
  const suffix = Date.now();
  await page.getByPlaceholder("Nombre de la empresa").fill(`Cliente E2E — Cotizador NDT (${suffix})`);
  await page.getByPlaceholder("J-12345678-9").fill("J-00000000-0");

  const [clientRes] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`${API_BASE}/clients`) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Guardar Cliente" }).click(),
  ]);
  expect(clientRes.status()).toBe(201);

  // ── 2. Crear la cotización en borrador ───────────────────────────
  await page.getByPlaceholder("Inspección tanque T-101").fill(`QA E2E — Cotizador NDT (${suffix})`);

  const [quoteRes] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/quotes") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Crear Borrador y Continuar" }).click(),
  ]);
  expect(quoteRes.status()).toBe(201);
  const quote = (await quoteRes.json()).data as { id: number; code: string };
  // exact:true — el toast de creación también contiene el código como substring.
  await expect(page.getByText(quote.code, { exact: true })).toBeVisible();

  // ── 3. Partida 1 — método VT, precargado desde su ui_schema real ────
  await page.getByRole("button", { name: "Agregar Partida" }).click();
  await page.locator('label:text-is("Método NDT *") + select').selectOption({ label: "VT — Inspección Visual" });

  const [item1Res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/quotes/${quote.id}/items`) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Agregar Partida" }).click(),
  ]);
  expect(item1Res.status()).toBe(201);
  // El ItemBuilder sale con una transición (AnimatePresence) — su propio botón
  // "Agregar Partida" convive un instante con el del header mientras se
  // desmonta, produciendo un choque de selector si no se espera a que termine.
  await expect(page.getByText("Nueva Partida")).toHaveCount(0);

  // ── 4. Partida 2 — método UT ──────────────────────────────────────
  await page.getByRole("button", { name: "Agregar Partida" }).click();
  await page
    .locator('label:text-is("Método NDT *") + select')
    .selectOption({ label: "UT — Ultrasonido Convencional" });

  const [item2Res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/quotes/${quote.id}/items`) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Agregar Partida" }).click(),
  ]);
  expect(item2Res.status()).toBe(201);

  // ── 5. Revisión — ambas partidas presentes → emitir ──────────────
  await page.getByRole("button", { name: "Continuar a Revisión" }).click();
  await expect(page.getByText("Revisión Final")).toBeVisible();
  await expect(page.locator("td").filter({ hasText: /^VT$/ })).toBeVisible();
  await expect(page.locator("td").filter({ hasText: /^UT$/ })).toBeVisible();

  // No se usa waitForResponse aquí: handleIssue() hace PUT (detalles) y luego
  // POST (issuances) en cadena y navega con router.push justo después — esa
  // navegación cliente-side puede ganarle la carrera al listener de response,
  // dejando el POST completado en el servidor (confirmado en logs/BD durante
  // el desarrollo de este test) pero nunca observado por Playwright. La
  // navegación real a /quotes/{id} es la señal confiable de que terminó.
  //
  // El timeout es deliberadamente generoso: generar el PDF (DomPDF + QR) de
  // una cotización con 2 partidas se midió en 50-60s en este entorno Docker
  // Desktop/Windows (I/O de bind-mount notoriamente más lento que en Linux
  // nativo) — confirmado comparando el `issued_at` real en BD contra el
  // momento del click, no una suposición. Un timeout corto aquí no detecta
  // un fallo real: solo fuerza a Playwright a cerrar el browser context a
  // mitad de una petición que el servidor sí iba a completar (nginx la
  // registra como 499 "client closed connection" cuando eso pasa).
  await page.getByRole("button", { name: "Emitir Cotización" }).click();
  await page.waitForURL(`**/quotes/${quote.id}`, { timeout: 150_000 });

  // ── 6. Vista de detalle emitida: sin edición posible ──────────────
  await expect(page.getByText("Emitida", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar Cambios" })).toHaveCount(0);

  const supervisorToken = await apiLogin(request, "supervisor");
  const forcedEdit = await request.put(`${API_BASE}/quotes/${quote.id}`, {
    headers: { Authorization: `Bearer ${supervisorToken}` },
    data: { project_name: "Intento de edición forzado vía API" },
  });
  expect(forcedEdit.status()).toBe(422);

  // ── 7. Descargar PDF ───────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`${quote.code}.pdf`);

  // ── 8. Verificación pública del código emitido ──────────────────────
  const [verifyPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "Ver verificación pública" }).click(),
  ]);
  await verifyPage.waitForLoadState();
  await expect(verifyPage.getByText("Hash VERIFICADO — Documento auténtico")).toBeVisible();
  await expect(verifyPage.getByText(quote.code)).toBeVisible();
});
