"use client";

import type { LibraryRole } from "@/types/library";

const ALL_ROLES: { value: LibraryRole; label: string }[] = [
  { value: "technician", label: "Técnico" },
  { value: "supervisor", label: "Supervisor" },
  { value: "auditor", label: "Auditor" },
  { value: "admin", label: "Admin" },
];

/**
 * Selector de roles visible SOLO para Admin (§6 y §7.1.2 de la guía:
 * "Si llega visibilidad y el usuario no es Admin → se ignora"). El
 * componente en sí no aplica esa regla — la aplica el backend — pero solo
 * se renderiza cuando `useLibraryPermissions().canSetVisibility` es true,
 * así que otros roles nunca ven el control.
 */
export function VisibilityPicker({
  value,
  onChange,
}: {
  value: LibraryRole[] | null;
  onChange: (roles: LibraryRole[] | null) => void;
}) {
  const selected = value ?? [];

  const toggle = (role: LibraryRole) => {
    const next = selected.includes(role)
      ? selected.filter((r) => r !== role)
      : [...selected, role];
    onChange(next.length > 0 ? next : null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ALL_ROLES.map((r) => (
          <label
            key={r.value}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer text-xs"
            style={{
              border: `1px solid ${selected.includes(r.value) ? "var(--brand-primary)" : "var(--border-color)"}`,
              backgroundColor: selected.includes(r.value)
                ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
                : "transparent",
              color: selected.includes(r.value)
                ? "var(--brand-primary)"
                : "var(--text-main)",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(r.value)}
              onChange={() => toggle(r.value)}
              className="accent-(--brand-primary) h-3 w-3"
            />
            {r.label}
          </label>
        ))}
      </div>
      <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
        {selected.length === 0
          ? "Sin selección = visible para todos los roles (o hereda de la carpeta)."
          : `Visible solo para: ${selected.join(", ")}.`}
      </p>
    </div>
  );
}
