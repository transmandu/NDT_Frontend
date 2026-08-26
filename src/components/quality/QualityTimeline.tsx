"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import qualityApi from "@/lib/qualityApi";
import { C } from "@/lib/colors";
import type { QualityTimelineEntry } from "@/types/quality";

const EVENT_LABELS: Record<string, string> = {
  created: "Creado",
  updated: "Actualizado",
  deleted: "Eliminado",
};

/** Campos que vale la pena resaltar en el diff — el resto queda oculto para no saturar. */
const HIGHLIGHT_FIELDS = [
  "status",
  "closure_result",
  "certificate_disposition",
  "resumed_at",
  "cancellation_reason",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diffSummary(entry: QualityTimelineEntry): string | null {
  if (!entry.new_values) return null;
  const changed = Object.keys(entry.new_values).filter((k) =>
    HIGHLIGHT_FIELDS.includes(k),
  );
  if (changed.length === 0) return null;
  return changed
    .map((k) => `${k}: ${String(entry.old_values?.[k] ?? "—")} → ${String(entry.new_values?.[k])}`)
    .join(" · ");
}

export default function QualityTimeline({ kind, id }: { kind: "nc" | "ac"; id: number }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["quality", kind, id, "timeline"],
    queryFn: () => (kind === "nc" ? qualityApi.ncTimeline(id) : qualityApi.acTimeline(id)),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={13} className="animate-spin" /> Cargando línea de tiempo…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
        Sin eventos registrados.
      </p>
    );
  }

  return (
    <div className="flex flex-col max-h-105 overflow-y-auto pr-2">
      {entries.map((entry, idx) => {
        const summary = diffSummary(entry);
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: C.primary }}
              />
              {idx < entries.length - 1 && (
                <span
                  className="flex-1 w-px"
                  style={{ backgroundColor: "var(--border-color)" }}
                />
              )}
            </div>
            <div className="pb-4 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                {EVENT_LABELS[entry.event] ?? entry.event}
                {entry.user && (
                  <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                    {" "}
                    — {entry.user}
                  </span>
                )}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatDate(entry.created_at)}
              </p>
              {summary && (
                <p
                  className="text-xs mt-1 font-mono truncate"
                  style={{ color: "var(--text-muted)" }}
                  title={summary}
                >
                  {summary}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
