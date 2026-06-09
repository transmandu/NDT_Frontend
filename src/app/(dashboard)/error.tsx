"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error("Error cargando la página. Por favor, intente recargar.");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        Algo salió mal
      </h2>
      <button
        onClick={reset}
        className="h-8 px-4 rounded text-[11px] font-medium"
        style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}
      >
        Reintentar
      </button>
    </div>
  );
}
