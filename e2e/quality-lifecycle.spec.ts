import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { apiLogin, createDraftSession, deleteSession, getSession } from "./helpers/api";

/**
 * Plan §6.2 — flujo completo:
 * Técnico reporta NC (vinculada a una sesión) → sesión bloqueada →
 * Supervisor reanuda → investiga → define Plan de Acción con causa raíz →
 * Implementación → Verificación de eficacia (Auditor) → NC a Seguimiento →
 * Auditor cierra la NC.
 */

/**
 * Los badges de estado se muestran en mayúsculas vía CSS (text-transform:
 * uppercase) pero el texto real en el DOM es "Abierta", "En Investigación",
 * etc. — insensible a mayúsculas y anclado para no confundir "Eficaz" con
 * "No Eficaz" (que la contiene como substring).
 */
function statusBadge(page: Page, label: string) {
  return page.getByText(new RegExp(`^${label}$`, "i"));
}

test("ciclo de vida completo de NC + AC, incluyendo bloqueo/desbloqueo de sesión", async ({ page, request }) => {
  test.setTimeout(150_000);

  // ── Setup: sesión draft real vía API (evita depender del formulario de calibración) ──
  const techToken = await apiLogin(request, "technician");
  const sessionId = await createDraftSession(request, techToken);

  let ncId = 0;
  let acId = 0;

  try {
    // ── 1. Técnico reporta la NC, vinculada a la sesión ──────────────────
    await loginAs(page, "technician");
    await page.goto("/quality/nc");
    await page.getByRole("button", { name: "Reportar NC" }).click();

    await page.getByPlaceholder("Resumen breve de la no conformidad").fill("Fuga detectada en horno de calibración");
    await page
      .getByPlaceholder("Describe qué ocurrió, dónde y cómo se detectó…")
      .fill("Se detectó una fuga de aire durante el precalentamiento, afectando la estabilidad térmica.");

    await page.getByLabel("Vincular a una sesión de calibración").check();
    await page
      .locator("select")
      .filter({ hasText: `#${sessionId}` })
      .selectOption(String(sessionId));

    const [createRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/quality/nc") && r.request().method() === "POST"),
      // Hay dos botones "Reportar NC": el de la barra de herramientas y el de
      // envío del modal (portal, montado después → último en el DOM).
      page.getByRole("button", { name: "Reportar NC" }).last().click(),
    ]);
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).nonconformity;
    ncId = created.id;

    await expect(page.getByText(created.code)).toBeVisible();

    // ── 2. La sesión debe quedar bloqueada ───────────────────────────────
    const blockedSession = await getSession(request, techToken, sessionId);
    expect(blockedSession.is_blocked_by_nc).toBe(true);

    // ── 3. Supervisor reanuda el trabajo bloqueado ───────────────────────
    await loginAs(page, "supervisor");
    await page.goto(`/quality/nc/${ncId}`);
    await expect(statusBadge(page, "Abierta")).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${ncId}/resume`)),
      page.getByRole("button", { name: "Reanudar Trabajo" }).click(),
    ]);

    const resumedSession = await getSession(request, techToken, sessionId);
    expect(resumedSession.is_blocked_by_nc).toBe(false);

    // ── 4. Supervisor investiga y define Plan de Acción ──────────────────
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${ncId}/transitions`)),
      page.getByRole("button", { name: "Iniciar Investigación" }).click(),
    ]);
    await expect(statusBadge(page, "En Investigación")).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${ncId}/transitions`)),
      page.getByRole("button", { name: "Pasar a Plan de Acción" }).click(),
    ]);
    await expect(statusBadge(page, "Plan de Acción").first()).toBeVisible();

    // ── 5. Crear la Acción Correctiva, con método de causa raíz ──────────
    await page.getByRole("button", { name: "Nueva AC" }).click();
    // Los labels de este modal no usan htmlFor/wrapping, así que se ubican por
    // adyacencia CSS (label + control) en vez de getByLabel.
    await page.locator('label:text-is("Título *") + input').fill("Reparar sello del horno");
    await page
      .locator('label:text-is("Descripción *") + textarea')
      .fill("Reemplazar el sello dañado y verificar estanqueidad antes de la próxima calibración.");
    await page.locator("select").filter({ hasText: "5 Porqués" }).selectOption({ label: "5 Porqués" });

    const [acRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/quality/ac") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Crear AC" }).click(),
    ]);
    expect(acRes.status()).toBe(201);
    acId = (await acRes.json()).corrective_action.id;

    // ── 6. Completar causa raíz (5 Porqués) y avanzar la AC ──────────────
    await page.goto(`/quality/ac/${acId}`);

    const firstAnswer = page.getByPlaceholder("Respuesta…").first();
    // El PUT se dispara en el propio onChange del textarea (no en blur), así
    // que hay que empezar a esperar la respuesta ANTES del fill para no
    // perder la carrera contra ella.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/ac/${acId}`) && r.request().method() === "PUT"),
      firstAnswer.fill("Porque el sello de goma perdió elasticidad por el calor prolongado."),
    ]);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/ac/${acId}/transitions`)),
      page.getByRole("button", { name: "Iniciar Implementación" }).click(),
    ]);
    await expect(statusBadge(page, "En Implementación").first()).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/ac/${acId}/transitions`)),
      page.getByRole("button", { name: "Enviar a Verificación" }).click(),
    ]);
    await expect(statusBadge(page, "En Verificación")).toBeVisible();

    // ── 7. Auditor verifica la eficacia de la AC ─────────────────────────
    await loginAs(page, "auditor");
    await page.goto(`/quality/ac/${acId}`);
    await expect(page.getByText("Verificación de Eficacia")).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/ac/${acId}/verifications`)),
      page.getByRole("button", { name: "Eficaz", exact: true }).click(),
    ]);
    await expect(statusBadge(page, "Eficaz").first()).toBeVisible();

    // ── 8. NC: Implementación → Seguimiento (Supervisor) ─────────────────
    await loginAs(page, "supervisor");
    await page.goto(`/quality/nc/${ncId}`);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${ncId}/transitions`)),
      page.getByRole("button", { name: "Iniciar Implementación" }).click(),
    ]);
    await expect(statusBadge(page, "En Implementación").first()).toBeVisible();

    await page.getByRole("button", { name: "Pasar a Seguimiento" }).click();
    await expect(page.getByText("Fecha de verificación *")).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${ncId}/transitions`)),
      page.getByRole("button", { name: "Confirmar" }).click(),
    ]);
    await expect(statusBadge(page, "En Seguimiento").first()).toBeVisible();

    // ── 9. Auditor cierra la NC como eficaz ───────────────────────────────
    await loginAs(page, "auditor");
    await page.goto(`/quality/nc/${ncId}`);

    await page.getByRole("button", { name: "Cerrar NC" }).click();
    await expect(page.getByText("¿Las acciones correctivas resultaron eficaces?")).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${ncId}/transitions`)),
      page.getByRole("button", { name: "Eficaz", exact: true }).click(),
    ]);
    await expect(statusBadge(page, "Cerrada").first()).toBeVisible();
  } finally {
    // La sesión vuelve a estar en "draft" y sin bloquear — se puede borrar.
    // La NC/AC quedan como registro real (cerrada/eficaz), consistente con
    // que representan un ciclo de vida completo y válido, no basura de test.
    await deleteSession(request, techToken, sessionId).catch(() => {});
  }
});
