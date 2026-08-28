import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { loginAs } from "./helpers/auth";
import { apiLogin, cancelNonconformity, API_BASE } from "./helpers/api";

/**
 * Plan §6.2 — segundo flujo: descarga adjunto → verifica hash → altera
 * archivo → reintenta descarga → 409. El backend recalcula el SHA-256 del
 * archivo físico en cada descarga y lo compara contra el guardado en upload
 * (QualityAttachmentController, ver Fase 2) — este test corrompe el archivo
 * directamente en disco (fuera de la app) para simular manipulación externa.
 */

// Raíz real del disco 'local' de Laravel (config/filesystems.php).
const STORAGE_ROOT = path.resolve(__dirname, "../../NDT_Backend/storage/app/private");

test("adjunto: hash verificado en descarga, 409 si el archivo fue alterado", async ({ page, request }) => {
  test.setTimeout(60_000);

  const token = await apiLogin(request, "technician");

  const ncRes = await request.post(`${API_BASE}/quality/nc`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: "NC para prueba de integridad de adjuntos",
      description: "Creada por el E2E de integridad de adjuntos — se cancela al terminar.",
    },
  });
  expect(ncRes.ok()).toBeTruthy();
  const nc = (await ncRes.json()).nonconformity;

  try {
    await loginAs(page, "technician");
    await page.goto(`/quality/nc/${nc.id}`);
    await expect(page.getByText(nc.code)).toBeVisible();

    // ── Subir un adjunto real ──────────────────────────────────────────
    // Laravel valida `mimes:pdf` por firma real de archivo (finfo), no solo
    // por extensión — un buffer de texto plano falla con 422. La cabecera
    // %PDF- es suficiente para que se detecte como application/pdf.
    const fileContent = Buffer.from(
      "%PDF-1.4\n% Evidencia de prueba — contenido original, no alterado.\n%%EOF",
    );
    const [uploadRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/nc/${nc.id}/attachments`) && r.request().method() === "POST"),
      page.locator('input[type="file"]').setInputFiles({
        name: "evidencia.pdf",
        mimeType: "application/pdf",
        buffer: fileContent,
      }),
    ]);
    expect(uploadRes.status()).toBe(201);
    await expect(page.getByText("evidencia.pdf")).toBeVisible();

    // ── Descarga íntegra: debe funcionar y disparar un download real ────
    const [download1] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTitle("Descargar (verifica integridad SHA-256)").click(),
    ]);
    expect(download1.suggestedFilename()).toBe("evidencia.pdf");

    // ── Alterar el archivo directamente en disco (fuera de la app) ──────
    // El backend no expone file_path por API (solo metadata) — se lee
    // directo de la carpeta conocida: quality/Nonconformity/{ncId}/.
    const dir = path.join(STORAGE_ROOT, "quality", "Nonconformity", String(nc.id));
    const files = fs.readdirSync(dir);
    expect(files.length).toBeGreaterThan(0);
    fs.writeFileSync(path.join(dir, files[0]), "CONTENIDO ALTERADO — no coincide con el hash original");

    // ── Reintentar descarga: debe fallar con 409, sin disparar download ─
    const [downloadResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/attachments/") && r.url().includes("/download")),
      page.getByTitle("Descargar (verifica integridad SHA-256)").click(),
    ]);
    // La aserción central del test: el backend recalculó el hash y lo
    // rechazó. El toast de error es solo UI — react-hot-toast lo
    // autodesaparece en pocos segundos, así que no se ata el test a su timing.
    expect(downloadResponse.status()).toBe(409);
  } finally {
    // Cancelar requiere Supervisor/Auditor/Admin — el técnico solo puede reportar.
    const supervisorToken = await apiLogin(request, "supervisor");
    await cancelNonconformity(request, supervisorToken, nc.id, "Limpieza automática del E2E de integridad de adjuntos").catch(() => {});
  }
});
