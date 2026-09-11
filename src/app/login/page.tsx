"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const INK_BG = "#040b16";
const INK_PANEL = "#0b1426";
const INK_BORDER = "#1e293b";
const INK_MUTED = "#8593a8";

/**
 * Instrumento de calibración — la aguja parte desviada y se asienta en el
 * rango nominal al cargar la pantalla, como un patrón encendiéndose.
 */
function CalibrationGauge({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg width="56" height="40" viewBox="0 0 120 76" fill="none" aria-hidden="true">
      <path
        d="M8,68 A52,52 0 0 1 112,68 Z"
        fill={INK_PANEL}
        stroke={INK_BORDER}
        strokeWidth={2}
      />
      <motion.g
        style={{ transformOrigin: "60px 68px" }}
        initial={{ rotate: reduceMotion ? -18 : -58 }}
        animate={{ rotate: -18 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 60, damping: 8, delay: 0.5 }
        }
      >
        <line x1={60} y1={68} x2={60} y2={26} stroke="#f8fafc" strokeWidth={3} strokeLinecap="round" />
      </motion.g>
      <circle cx={60} cy={68} r={4.5} fill="#f8fafc" />
      <circle
        cx={26}
        cy={70}
        r={6}
        fill="var(--brand-accent2)"
        style={{ filter: "drop-shadow(0 0 5px rgba(255,112,19,0.75))" }}
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.token, res.data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = isAxiosError(err)
        ? (err.response?.data?.message ?? "Credenciales inválidas")
        : "Credenciales inválidas";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-14 sm:py-20"
      style={{ backgroundColor: INK_BG }}
    >
      {/* Blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage:
            "radial-gradient(ellipse 85% 65% at 25% 20%, black 35%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 65% at 25% 20%, black 35%, transparent 85%)",
        }}
      />
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 18% 12%, rgba(255,112,19,0.12), transparent 60%), radial-gradient(ellipse 60% 55% at 100% 100%, rgba(99,102,241,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-295 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* ── Tesis: qué es este laboratorio ── */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center lg:text-left"
        >
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-10">
            <div
              className="relative w-17 h-17 rounded-full overflow-hidden shrink-0"
              style={{ border: `1px solid ${INK_BORDER}`, backgroundColor: INK_PANEL }}
            >
              <Image
                src="/logo.jpg"
                alt="Orinoco Quality & Control"
                fill
                sizes="60px"
                quality={100}
                className="object-contain scale-[1.05]"
                priority
              />
            </div>
            <div className="text-left">
              <p className="text-base font-bold tracking-tight" style={{ color: "var(--brand-accent2)" }}>
                Orinoco Quality &amp; Control
              </p>
              <p
                className="text-[11px] uppercase tracking-[0.18em] font-semibold"
                style={{ color: INK_MUTED }}
              >
                Lab NDT · ISO/IEC 17025
              </p>
            </div>
          </div>

          <h1
            className="font-black text-white leading-[0.98] tracking-tight mx-auto lg:mx-0"
            style={{ fontSize: "clamp(2.25rem, 4.4vw, 3.4rem)", maxWidth: "13ch" }}
          >
          Acceso calibrado al laboratorio
          </h1>

          <p
            className="mt-6 text-sm sm:text-base leading-relaxed mx-auto lg:mx-0"
            style={{ color: INK_MUTED, maxWidth: "34ch" }}
          >
            Portal de control del laboratorio de Ensayos No Destructivos. Cada acceso queda registrado; cada hallazgo, trazable y verificable.
          </p>

          <div className="mt-10 flex items-center justify-center lg:justify-start gap-3">
            <CalibrationGauge reduceMotion={reduceMotion} />
            <div className="text-left">
              <p
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--brand-accent2)" }}
              >
                Dentro de rango nominal
              </p>
              <p className="text-xs" style={{ color: INK_MUTED }}>
                Tolerancia verificada · control activo
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Acceso ── */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="flex justify-center lg:justify-end"
        >
          <div
            className="w-full max-w-sm rounded-[28px] p-8"
            style={{
              backgroundColor: INK_PANEL,
              border: `1px solid ${INK_BORDER}`,
              boxShadow: "0 30px 60px -25px rgba(0,0,0,0.65)",
            }}
          >
            <h2 className="text-xl font-bold text-white">Iniciar sesión</h2>
           
           <div className="flex items-center mt-2">
            <ShieldCheck className="w-4 h-4 text-brand-accent2 mr-1" />

            <p className="text-sm font-semibold" style={{ color: INK_MUTED }}>
             Acceso al sistema
            </p>
           </div>
            

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: INK_MUTED }}
                >
                  Correo electronico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input w-full h-11 px-4 rounded-xl text-sm text-white"
                  style={{ backgroundColor: INK_BG, border: `1px solid ${INK_BORDER}` }}
                  placeholder="nombre@orinocoquality.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: INK_MUTED }}
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="login-input w-full h-11 px-4 pr-11 rounded-xl text-sm text-white"
                    style={{ backgroundColor: INK_BG, border: `1px solid ${INK_BORDER}` }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: INK_MUTED }}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  role="alert"
                  className="text-[11px] text-center py-2 px-3 rounded-lg font-medium"
                  style={{
                    backgroundColor: "rgba(255,30,18,0.1)",
                    color: "var(--brand-danger)",
                    border: "1px solid rgba(255,30,18,0.2)",
                  }}
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className="w-full h-11 rounded-xl text-sm font-bold shadow-lg transition-opacity  disabled:opacity-50 cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand-accent2), var(--brand-accent))",
                  color: INK_PANEL,
                }}
              >
                {loading ? "Verificando..." : "Ingresar al Sistema"}
              </motion.button>
            </form>

            <p
              className="text-[10px] text-center mt-6 leading-relaxed"
              style={{ color: INK_MUTED }}
            >
              Acceso restringido a personal autorizado.
              <br />
              Todas las acciones quedan registradas en la bitácora de auditoría.
            </p>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .login-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .login-input::placeholder {
          color: #55647d;
        }
        .login-input:focus {
          outline: none;
          border-color: var(--brand-accent2);
          box-shadow: 0 0 0 3px rgba(255, 112, 19, 0.15);
        }
      `}</style>
    </div>
  );
}
