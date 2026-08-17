"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, FileWarning, Clock } from "lucide-react";
import { downloadBlob } from "@/lib/downloadHelper";
import type { SharedViewerInfo } from "@/types/library";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/**
 * Visor público sin login (§7.1 / §8.5 de la guía). Vive FUERA del layout
 * autenticado — mismo patrón que /verify/[certNumber] ya usado en este
 * proyecto — y usa fetch() plano (no el cliente axios de api.ts) para no
 * arrastrar el Bearer token ni el interceptor de 401 de un usuario que
 * pueda estar logueado en otra pestaña.
 */
export default function SharedViewerPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SharedViewerInfo | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function load() {
      try {
        const infoRes = await fetch(`${API_BASE}/library/shared/info/${encodeURIComponent(token)}`);
        const infoData: SharedViewerInfo = await infoRes.json();
        setInfo(infoData);

        if (!infoData.found || infoData.expired) {
          setLoading(false);
          return;
        }

        const contentRes = await fetch(`${API_BASE}/library/shared/content/${encodeURIComponent(token)}`);
        if (!contentRes.ok) {
          setContentError("No se pudo cargar el archivo.");
          setLoading(false);
          return;
        }
        const fileBlob = await contentRes.blob();
        setBlob(fileBlob);
        objectUrl = window.URL.createObjectURL(fileBlob);
        setBlobUrl(objectUrl);
      } catch {
        setContentError("Error de conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [token]);

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(blob, info?.title ? `${info.title}.pdf` : "documento.pdf");
  };

  return (
    <div className="min-h-screen flex flex-col bg-(--bg-app)">
      <header className="bg-(--bg-panel) border-b border-(--border-color) py-3 px-6 flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-bold text-(--text-main)">Orinoco Quality &amp; Control</div>
          <div className="text-[10px] text-(--text-muted) tracking-wide uppercase">Biblioteca Digital — Visor compartido</div>
        </div>
        {info?.found && !info.expired && !info.read_only && blob && (
          <button
            onClick={handleDownload}
            className="h-8 px-4 rounded text-[11px] font-semibold text-white flex items-center gap-2"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <Download size={13} /> Descargar
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-(--text-muted)">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-[12px]">Cargando documento…</p>
          </div>
        ) : !info?.found ? (
          <StateMessage icon={<FileWarning size={32} />} title="Enlace no válido" text="Este enlace no existe o fue revocado." />
        ) : info.expired ? (
          <StateMessage icon={<Clock size={32} />} title="Enlace expirado" text="Este enlace de acceso ya no está vigente. Solicita uno nuevo al laboratorio." />
        ) : contentError ? (
          <StateMessage icon={<FileWarning size={32} />} title="No se pudo cargar" text={contentError} />
        ) : blobUrl ? (
          <div className="w-full h-full max-w-5xl rounded-lg overflow-hidden shadow-lg" style={{ border: "1px solid var(--border-color)" }}>
            <iframe src={blobUrl} title={info.title ?? "Documento"} className="w-full h-[80vh] border-0" />
          </div>
        ) : null}
      </main>
    </div>
  );
}

function StateMessage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center max-w-sm">
      <div className="text-(--text-muted)">{icon}</div>
      <h1 className="text-sm font-bold text-(--text-main)">{title}</h1>
      <p className="text-[11px] text-(--text-muted)">{text}</p>
    </div>
  );
}
