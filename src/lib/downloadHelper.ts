/** Fuerza la descarga de un Blob ya obtenido (mismo patrón que /calibration usa para certificados). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Abre un Blob PDF en una pestaña nueva usando el visor nativo del navegador. */
export function openBlobInNewTab(blob: Blob) {
  const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  window.open(url, "_blank");
}
