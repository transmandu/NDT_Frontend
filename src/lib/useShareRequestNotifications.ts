import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { LibraryShareRequest } from "@/types/library";

const POLL_MS = 25_000;

/**
 * Degradación de "notificación en tiempo real" (§1 y §8.6 de la guía) sin
 * WebSockets: este proyecto no tiene Reverb/Echo instalado. En vez de perder
 * el aviso proactivo por completo, se hace polling del mismo endpoint que ya
 * usa el panel de solicitudes y se compara contra el resultado anterior — si
 * una solicitud PROPIA pasó de "pending" a "approved"/"rejected" entre dos
 * consultas, se dispara un toast, igual que haría un evento en vivo.
 * Decisión confirmada con el usuario: polling con diff + toast.
 */
export function useShareRequestNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const previousRef = useRef<Map<number, string> | null>(null);

  const query = useQuery<LibraryShareRequest[]>({
    queryKey: ["libraryShareRequests"],
    queryFn: () => api.get("/library/share-requests").then((r) => r.data.data || []),
    refetchInterval: POLL_MS,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!query.data || !userId) return;

    const previous = previousRef.current;
    if (previous) {
      for (const req of query.data) {
        if (req.requested_by !== userId) continue;
        const prevStatus = previous.get(req.id);
        if (prevStatus === "pending" && req.status !== "pending") {
          if (req.status === "approved") {
            toast.success(`Solicitud aprobada: "${req.document_title}"`, {
              icon: "✅",
            });
          } else {
            toast.error(
              `Solicitud rechazada: "${req.document_title}"${req.rejection_reason ? ` — ${req.rejection_reason}` : ""}`,
              { icon: "❌" },
            );
          }
          qc.invalidateQueries({ queryKey: ["libraryDocuments"] });
        }
      }
    }

    previousRef.current = new Map(query.data.map((r) => [r.id, r.status]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, userId]);

  const pendingCount = query.data?.filter((r) => r.status === "pending").length ?? 0;

  return { requests: query.data ?? [], pendingCount, isLoading: query.isLoading };
}
