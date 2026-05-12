'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Plus, X, Loader2, Shield, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';

import { C } from '@/lib/colors';
const ACCENT = C.accent;
const ROLE_COLORS: Record<string, string> = {
  admin:      C.roleAdmin,
  auditor:    C.roleAuditor,
  technician: C.roleTechnician,
  supervisor: C.roleSupervisor,
};

const ROLE_LABELS: Record<string, string> = {
  admin:    'Administrador',
  auditor:  'Auditor',
  technician: 'Técnico',
};

/* ─── Zod Schema ─────────────────────────────────────────── */
const userSchema = z.object({
  name:                  z.string().min(2, 'Mínimo 2 caracteres'),
  email:                 z.string().email('Email inválido'),
  role:                  z.enum(['admin', 'auditor', 'technician']),
  password:              z.string().min(8, 'Mínimo 8 caracteres').optional().or(z.literal('')),
  password_confirmation: z.string().optional().or(z.literal('')),
}).refine(d => !d.password || d.password === d.password_confirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['password_confirmation'],
});
type UserForm = z.infer<typeof userSchema>;

/* ─── Columns ─────────────────────────────────────────────── */
function buildColumns(onEdit: (u: any) => void): ColumnDef<any>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: ROLE_COLORS[row.original.role] ?? ACCENT }}>
            {row.original.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => <span className="text-xs font-mono">{getValue() as string}</span> },
    {
      accessorKey: 'role',
      header: 'Rol',
      enableColumnFilter: true,
      accessorFn: row => ROLE_LABELS[row.role] ?? row.role,
      cell: ({ row }) => {
        const color = ROLE_COLORS[row.original.role] ?? ACCENT;
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
            <Shield size={9} /> {ROLE_LABELS[row.original.role] ?? row.original.role}
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Registrado',
      cell: ({ getValue }) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(getValue() as string).toLocaleDateString('es')}</span>,
    },
    {
      id: 'actions', header: '', enableSorting: false, enableColumnFilter: false, size: 80,
      cell: ({ row }) => (
        <button onClick={() => onEdit(row.original)}
          className="h-7 px-3 text-[11px] rounded font-medium transition-colors hover-bg"
          style={{ color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
          Editar
        </button>
      ),
    },
  ];
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser]   = useState<any>(null);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data || []),
  });

  const saveMut = useMutation({
    mutationFn: (payload: any) =>
      editUser
        ? api.put(`/admin/users/${editUser.id}`, payload)
        : api.post('/auth/register', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(editUser ? 'Usuario actualizado' : 'Usuario creado correctamente');
      setModalOpen(false);
      setEditUser(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Error al guardar el usuario';
      toast.error(msg);
    },
  });

  const columns = buildColumns(u => { setEditUser(u); setModalOpen(true); });

  return (
    <div className="space-y-3 w-full animate-fadeIn">
      {isLoading ? (
        <div className="panel rounded-md shadow-sm p-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: ACCENT }} />
          Cargando usuarios…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Buscar por nombre o email…"
          toolbarRight={
            <button
              onClick={() => { setEditUser(null); setModalOpen(true); }}
              className="h-7 px-3 text-[11px] rounded font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: ACCENT, color: '#fff' }}
            >
              <Plus size={13} /> Nuevo Usuario
            </button>
          }
        />
      )}

      <AnimatePresence>
        {modalOpen && (
          <UserModal
            user={editUser}
            onClose={() => { setModalOpen(false); setEditUser(null); }}
            onSave={saveMut.mutate}
            saving={saveMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── User Modal ─────────────────────────────────────────── */
function UserModal({ user, onClose, onSave, saving }: {
  user: any | null; onClose: () => void;
  onSave: (data: any) => void; saving: boolean;
}) {
  const isEdit = !!user;
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: isEdit ? {
      name:  user.name,
      email: user.email,
      role:  user.role,
    } : { role: 'technician' },
  });

  const onSubmit = (data: UserForm) => {
    const payload: Record<string, any> = { name: data.name, email: data.email, role: data.role };
    if (data.password) {
      payload.password = data.password;
      payload.password_confirmation = data.password_confirmation;
    }
    onSave(payload);
  };

  const modal = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <User size={15} style={{ color: ACCENT }} />
              {isEdit ? `Editar — ${user.name}` : 'Nuevo Usuario del Sistema'}
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isEdit ? 'Actualizar datos o cambiar rol' : 'Crear cuenta con acceso al sistema'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover-bg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nombre Completo *</label>
              <input {...register('name')} className="field-input w-full" placeholder="Juan Pérez" />
              {errors.name && <p className="text-[10px] text-red-400">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Correo Electrónico *</label>
              <input {...register('email')} type="email" className="field-input w-full font-mono" placeholder="usuario@lab.com" />
              {errors.email && <p className="text-[10px] text-red-400">{errors.email.message}</p>}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rol *</label>
              <select {...register('role')} className="field-input w-full">
                <option value="technician">Técnico — registra calibraciones</option>
                <option value="auditor">Auditor — aprueba / rechaza</option>
                <option value="admin">Administrador — acceso total</option>
              </select>
              {errors.role && <p className="text-[10px] text-red-400">{errors.role.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {isEdit ? 'Nueva Contraseña (dejar en blanco para mantener)' : 'Contraseña *'}
              </label>
              <div className="relative">
                <input {...register('password')} type={showPwd ? 'text' : 'password'}
                  className="field-input w-full pr-9" placeholder="········" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
                  style={{ color: 'var(--text-main)' }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Confirmar Contraseña</label>
              <input {...register('password_confirmation')} type={showPwd ? 'text' : 'password'}
                className="field-input w-full" placeholder="········" />
              {errors.password_confirmation && <p className="text-[10px] text-red-400">{errors.password_confirmation.message}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
            <button type="button" onClick={onClose}
              className="h-8 px-4 rounded text-[11px] font-medium transition-colors hover-bg"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="h-8 px-5 rounded text-[11px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
