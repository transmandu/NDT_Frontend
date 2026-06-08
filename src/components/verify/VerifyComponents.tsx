import React from "react";
import Link from "next/link";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="bg-(--text-main) text-(--bg-panel) text-[10px] font-bold py-1.5 px-2.5 uppercase tracking-wide rounded-t-md">
        {title}
      </div>
      <div className="bg-(--bg-panel) border border-(--border-color) border-t-0 rounded-b-md py-2.5 px-3.5 text-[11px]">
        {children}
      </div>
    </div>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  mono,
  bold,
  badge,
  valueColor,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  bold?: boolean;
  badge?: boolean;
  valueColor?: string;
}) {
  return (
    <div>
      <div className="text-[9px] text-(--text-muted) uppercase tracking-wide font-semibold">
        {label}
      </div>
      <div
        className={`text-[11px] ${bold ? "font-semibold" : "font-normal"}`}
        style={{
          color: valueColor || "var(--text-main)",
          fontFamily: mono
            ? "'DejaVu Sans Mono','Fira Code',monospace"
            : undefined,
        }}
      >
        {badge ? (
          <span
            className={`inline-block mt-0.5 px-1.5 py-px rounded-[3px] text-[9px] font-bold uppercase tracking-wide
            ${
              value === "issued"
                ? "text-(--brand-success) bg-(--brand-success)/10"
                : value === "superseded"
                  ? "text-(--brand-warning) bg-(--brand-warning)/10"
                  : "text-(--brand-danger) bg-(--brand-danger)/10"
            }`}
          >
            {value || "—"}
          </span>
        ) : (
          value || "—"
        )}
      </div>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[10px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`bg-[#1e3a5f] text-white py-1.5 px-1 text-center text-[9px] font-semibold border border-[#1e3a5f] uppercase tracking-wide wrap-break-words ${className || ""}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  left,
  bold,
  small,
  mono,
}: {
  children: React.ReactNode;
  left?: boolean;
  bold?: boolean;
  small?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={`border border-(--border-color) py-1 px-1 wrap-break-word 
      ${left ? "text-left" : "text-center"} 
      ${bold ? "font-semibold" : "font-normal"} 
      ${small ? "text-[9px]" : "text-[10px]"}
    `}
      style={{
        fontFamily: mono
          ? "'DejaVu Sans Mono','Fira Code',monospace"
          : undefined,
      }}
    >
      {children}
    </td>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-(--text-muted) py-3 text-[11px]">
      {children}
    </div>
  );
}

export function HashRow({
  label,
  value,
  match,
}: {
  label: string;
  value: string;
  match: boolean | null;
}) {
  return (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="min-w-[140px] font-semibold text-(--text-main)">
        {label}:
      </span>
      <span
        className={`break-all ${match === true ? "text-(--brand-success)" : match === false ? "text-(--brand-danger)" : "text-(--text-muted)"}`}
      >
        {value}
      </span>
      {match !== null && (
        <span
          className={`font-semibold text-[12px] ${match ? "text-(--brand-success)" : "text-(--brand-danger)"}`}
        >
          {match ? "✓" : "✗"}
        </span>
      )}
    </div>
  );
}

// Estados de Error Extraídos
export function NotFound({ certNumber }: { certNumber: string }) {
  return (
    <div className="min-h-screen bg-(--bg-app) flex items-center justify-center p-4">
      <div className="bg-(--bg-panel) border border-(--border-color) rounded-lg py-8 px-10 max-w-md text-center">
        <div className="text-5xl mb-3">🔍</div>
        <div className="text-base font-semibold text-(--text-main) mb-2">
          Certificado no encontrado
        </div>
        <div className="text-[11px] text-(--text-muted) mb-5 leading-relaxed">
          El certificado{" "}
          <span className="font-semibold font-mono text-(--text-main)">
            {certNumber}
          </span>{" "}
          no existe en los registros.
        </div>
        <Link
          href="/"
          className="text-[11px] font-semibold text-white bg-(--brand-primary) py-2 px-5 rounded no-underline uppercase tracking-wide"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

export function ServerError() {
  return (
    <div className="min-h-screen bg-(--bg-app) flex items-center justify-center p-4">
      <div className="bg-(--bg-panel border border-(--brand-danger)/30 rounded-lg py-8 px-10 max-w-md text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <div className="text-base font-semibold text-(--text-main) mb-2">
          Error del servidor
        </div>
        <div className="text-[11px] text-(--text-muted) leading-relaxed">
          No se pudo conectar con el servicio de verificación. Intente
          nuevamente en unos minutos.
        </div>
      </div>
    </div>
  );
}
