"use client";

import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Sun,
  Moon,
  Menu,
  MapPin,
  CloudSun,
  Droplets,
  Save,
  LogOut,
  ClipboardCheck,
  AlertCircle,
  Clock,
  X,
  CheckCircle2,
  HelpCircle,
  Zap,
  BookOpen,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Loader2,
  FileWarning,
  ShieldAlert,
  CheckCheck,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useWeather } from "@/lib/useWeather";
import { usePathname } from "next/navigation";
import { useTutorial } from "@/lib/tutorials/useTutorial";
import { useQuery } from "@tanstack/react-query";

type QualityNotificationType =
  | "nc_issued_certificate_impact"
  | "ac_due_verification"
  | "ac_not_effective"
  | "ac_verified"
  | "nc_assigned"
  | "nc_closed"
  | "nc_cancelled";

interface Notification {
  id: string;
  type: "pending_review" | "rejected" | "stale_draft" | QualityNotificationType;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  session_id?: number;
  nc_id?: number;
  ac_id?: number;
  age: string;
  technician?: string;
  reason?: string;
}

const QUALITY_TYPES = new Set<string>([
  "nc_issued_certificate_impact",
  "ac_due_verification",
  "ac_not_effective",
  "ac_verified",
  "nc_assigned",
  "nc_closed",
  "nc_cancelled",
]);

/** Icono específico por tipo de notificación de Calidad — el resto usa el ícono genérico por prioridad. */
const QUALITY_ICONS: Record<QualityNotificationType, typeof AlertCircle> = {
  nc_issued_certificate_impact: ShieldAlert,
  ac_due_verification: Clock,
  ac_not_effective: FileWarning,
  ac_verified: CheckCheck,
  nc_assigned: FileWarning,
  nc_closed: CheckCircle2,
  nc_cancelled: AlertCircle,
};

interface NotificationsResponse {
  unread_count: number;
  total: number;
  items: Notification[];
}

interface HeaderProps {
  title: string;
  subtitle: string;
  showAutoSave?: boolean;
  onMenuClick: () => void;
}

const PRIORITY_STYLES = {
  high: {
    dot: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    icon: AlertCircle,
    iconColor: "#EF4444",
  },
  medium: {
    dot: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: Clock,
    iconColor: "#F59E0B",
  },
  low: {
    dot: "#6B7280",
    bg: "rgba(107,114,128,0.06)",
    border: "rgba(107,114,128,0.15)",
    icon: ClipboardCheck,
    iconColor: "#6B7280",
  },
};

export default function Header({
  title,
  subtitle,
  showAutoSave,
  onMenuClick,
}: HeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const { weather, loading: weatherLoading } = useWeather();

  const [isOpen, setIsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [ringKey, setRingKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const tutorialRef = useRef<HTMLDivElement>(null);
  const currentPath = usePathname();
  const { startTutorial, hasTutorial } = useTutorial(currentPath);

  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<NotificationsResponse> => {
      const res = await api.get<NotificationsResponse>("/notifications");
      return res.data;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close tutorial dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        tutorialRef.current &&
        !tutorialRef.current.contains(e.target as Node)
      ) {
        setTutorialOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    clearAuth();
    // Evita que la caché de React Query (documentos, sesiones, etc. de la
    // sesión que se cierra) siga sirviéndose al usuario que loguee después.
    queryClient.clear();
    router.push("/login");
  };
  const goToNotification = (n: Notification) => {
    setIsOpen(false);
    // ac_verified/ac_not_effective traen ambos ids (para poder linkear a la NC
    // padre desde la lista) — pero si hay ac_id, la notificación es sobre esa
    // AC puntual, así que debe ganar sobre nc_id.
    if (n.ac_id) router.push(`/quality/ac/${n.ac_id}`);
    else if (n.nc_id) router.push(`/quality/nc/${n.nc_id}`);
    else if (n.session_id) router.push(`/calibration?review=${n.session_id}`);
  };

  const unread = data?.unread_count ?? 0;

  // Ring animation cuando cambia el conteo de no leídas — ajuste de estado
  // durante el render (no en un efecto) para evitar el render en cascada que
  // marca react-hooks/set-state-in-effect; mismo patrón que rcaOverride en
  // quality/ac/[id]/page.tsx.
  const [prevUnread, setPrevUnread] = useState(unread);
  if (prevUnread !== unread) {
    setPrevUnread(unread);
    if (unread > 0) setRingKey((k) => k + 1);
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-4 md:px-6 panel z-20 relative shadow-sm shrink-0"
      style={{ borderBottom: "1px solid var(--border-color)" }}
    >
      {/* Left */}
      <div className="flex-1 flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-md hover-bg transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2">
            <h2
              className="text-base md:text-xl font-bold tracking-tight leading-tight truncate"
              style={{ color: "var(--text-main)" }}
            >
              {title}
            </h2>
            {showAutoSave && (
              <span
                id="tour-autoguardado"
                className="hidden sm:inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-hover)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Save size={10} /> Autoguardado
              </span>
            )}
          </div>
          <p
            className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider mt-0.5 truncate hidden sm:block"
            style={{ color: "var(--text-muted)" }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Center: Ciudad Guayana Weather */}
      <div className="flex-1 justify-center items-center hidden lg:flex">
        <div
          className="flex items-center gap-2.5 px-3 py-1 rounded-full shadow-sm"
          style={{
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-app)",
          }}
          title={weather?.description || "Cargando clima..."}
        >
          <span
            className="text-sm font-semibold flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <MapPin size={16} /> Guayana
          </span>
          <div
            className="w-px h-3"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {weatherLoading ? (
            <div className="flex items-center gap-1.5 px-2">
              <Loader2 size={12} className="animate-spin text-gray-400" />
              <span className="text-[10px] text-gray-400">Cargando...</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center gap-1.5">
                {weather.icon === "sun" && (
                  <Sun size={18} style={{ color: "#FFB812" }} />
                )}
                {weather.icon === "cloud-sun" && (
                  <CloudSun size={18} style={{ color: "#FFB812" }} />
                )}
                {weather.icon === "cloud" && (
                  <Cloud size={18} className="text-gray-400" />
                )}
                {weather.icon === "rain" && (
                  <CloudRain size={18} className="text-blue-400" />
                )}
                {weather.icon === "storm" && (
                  <CloudLightning size={18} className="text-purple-500" />
                )}
                {weather.icon === "snow" && (
                  <CloudSnow size={18} className="text-cyan-300" />
                )}
                {weather.icon === "fog" && (
                  <CloudFog size={18} className="text-gray-400" />
                )}
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--text-main)" }}
                >
                  {weather.temperature}°C
                </span>
              </div>
              <div
                className="w-px h-3"
                style={{ backgroundColor: "var(--border-color)" }}
              />
              <div
                className="flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}
              >
                <Droplets size={16} className="text-blue-400" />
                <span className="text-sm font-medium">
                  Hum: {weather.humidity}%
                </span>
              </div>
            </>
          ) : (
            <span className="text-[10px] text-gray-400">
              Clima no disponible
            </span>
          )}
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex-1 flex items-center justify-end gap-1 md:gap-2">
        {/* ❓ Tutorial */}
        {hasTutorial() && (
          <div className="relative" ref={tutorialRef}>
            <button
              onClick={() => setTutorialOpen((v) => !v)}
              className="p-1.5 rounded-md hover-bg transition-colors cursor-pointer"
              style={{ color: "var(--text-muted)" }}
              title="Tutorial interactivo"
            >
              <HelpCircle size={20} />
            </button>

            <AnimatePresence>
              {tutorialOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl z-50 overflow-hidden"
                  style={{
                    backgroundColor: "var(--bg-panel)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    className="px-3 py-2"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <p
                      className="text-[11px] font-bold"
                      style={{ color: "var(--text-main)" }}
                    >
                      Tutorial Interactivo
                    </p>
                    <p
                      className="text-[9px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Selecciona el nivel de detalle
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setTutorialOpen(false);
                      setTimeout(() => startTutorial("quick"), 150);
                    }}
                    className="w-full text-left px-3 py-2.5 hover-bg transition-colors flex items-start gap-2.5"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Zap
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color: "#F59E0B" }}
                    />
                    <div>
                      <p
                        className="text-[11px] font-semibold"
                        style={{ color: "var(--text-main)" }}
                      >
                        Tutorial Rápido
                      </p>
                      <p
                        className="text-[9px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Resumen funcional de cada sección
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTutorialOpen(false);
                      setTimeout(() => startTutorial("extended"), 150);
                    }}
                    className="w-full text-left px-3 py-2.5 hover-bg transition-colors flex items-start gap-2.5"
                  >
                    <BookOpen
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color: "#3B82F6" }}
                    />
                    <div>
                      <p
                        className="text-[11px] font-semibold"
                        style={{ color: "var(--text-main)" }}
                      >
                        Tutorial Extendido
                      </p>
                      <p
                        className="text-[9px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Explicación metrológica detallada
                      </p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tema */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover-bg transition-colors cursor-pointer"
          title={isDarkMode ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          style={{ color: "var(--text-muted)" }}
        >
          <motion.div
            whileTap={{ rotate: 180 }}
            transition={{ duration: 0.15 }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={16} />}
          </motion.div>
        </button>

        {/* Notificaciones */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => {
              setIsOpen((v) => !v);
              if (!isOpen) refetch();
            }}
            className="relative p-1.5 rounded-md hover-bg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
            title="Notificaciones"
          >
            <motion.div
              key={ringKey}
              animate={
                unread > 0
                  ? { rotate: [0, 15, -15, 10, -10, 5, 0] }
                  : { rotate: 0 }
              }
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Bell size={20} />
            </motion.div>
            {unread > 0 && (
              <motion.span
                key={`badge-${ringKey}`}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ fontSize: "9px", backgroundColor: "#EF4444" }}
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
            {unread === 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#6B7280" }}
              />
            )}
          </button>

          {/* Panel de notificaciones */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-panel)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {/* Header del panel */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "var(--text-main)" }}
                    >
                      Notificaciones
                    </p>
                    {data && (
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {unread > 0
                          ? `${unread} requieren atención`
                          : "Todo al día"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover-bg"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Lista */}
                <div className="max-h-80 overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    </div>
                  )}

                  {!loading && (!data || data.items.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <CheckCircle2 size={28} style={{ color: "#10B981" }} />
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Sin notificaciones pendientes
                      </p>
                    </div>
                  )}

                  {!loading &&
                    data?.items.map((n) => {
                      const style = PRIORITY_STYLES[n.priority];
                      const isQuality = QUALITY_TYPES.has(n.type);
                      const Icon = isQuality
                        ? QUALITY_ICONS[n.type as QualityNotificationType]
                        : style.icon;
                      // Parpadeo rojo cuando la verificación de eficacia ya venció (plan §5.3).
                      const isOverdue = n.type === "ac_due_verification" && n.priority === "high";
                      return (
                        <button
                          key={n.id}
                          onClick={() => goToNotification(n)}
                          className="w-full text-left px-4 py-3 transition-colors hover-bg flex items-start gap-3"
                          style={{
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <div
                            className={`shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${isOverdue ? "animate-pulse" : ""}`}
                            style={{
                              backgroundColor: style.bg,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            <Icon
                              size={13}
                              style={{ color: style.iconColor }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[11px] font-semibold truncate"
                              style={{ color: "var(--text-main)" }}
                            >
                              {n.title}
                            </p>
                            <p
                              className="text-[10px] truncate mt-0.5"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {n.message}
                            </p>
                            {n.reason && (
                              <p
                                className="text-[9px] mt-0.5 italic truncate"
                                style={{ color: "#F59E0B" }}
                              >
                                Motivo: {n.reason}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-[9px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {n.age}
                              </span>
                              {n.technician && (
                                <>
                                  <span
                                    className="text-[9px]"
                                    style={{ color: "var(--border-color)" }}
                                  >
                                    ·
                                  </span>
                                  <span
                                    className="text-[9px]"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {n.technician}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div
                            className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${isOverdue ? "animate-pulse" : ""}`}
                            style={{ backgroundColor: style.dot }}
                          />
                        </button>
                      );
                    })}
                </div>

                {/* Footer — el destino depende de qué tipos de notificación hay en la
                    lista; antes siempre apuntaba a /calibration aunque todo el feed
                    fuera de Calidad (o viceversa). */}
                {data && data.total > 0 && (
                  <div
                    className="px-4 py-2.5 flex flex-col gap-1"
                    style={{ borderTop: "1px solid var(--border-color)" }}
                  >
                    {data.items.some((n) => !QUALITY_TYPES.has(n.type)) && (
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          router.push("/calibration");
                        }}
                        className="w-full text-center text-[10px] font-semibold transition-colors"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        Ver todas en Revisión y Emisión →
                      </button>
                    )}
                    {data.items.some((n) => QUALITY_TYPES.has(n.type)) && (
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          router.push("/quality/nc");
                        }}
                        className="w-full text-center text-[10px] font-semibold transition-colors"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        Ver todas en Gestión de Calidad →
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md hover-bg transition-colors hidden sm:block cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
