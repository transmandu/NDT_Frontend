"use client";

import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, Plus, Pencil, Trash2, FolderTree as FolderTreeIcon } from "lucide-react";
import type { LibraryFolderNode } from "@/types/library";
import { C } from "@/lib/colors";

interface FolderTreeProps {
  folders: LibraryFolderNode[];
  selectedFolderId: number | null;
  onSelect: (id: number | null) => void;
  canManage: boolean;
  onCreateFolder: (parentId: number | null) => void;
  onRenameFolder: (folder: LibraryFolderNode) => void;
  onDeleteFolder: (folder: LibraryFolderNode) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelect,
  canManage,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  return (
    <div className="panel rounded-md shadow-sm p-2 w-64 shrink-0 flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-1.5 py-1.5">
        <p
          className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <FolderTreeIcon size={12} /> Carpetas
        </p>
        {canManage && (
          <button
            title="Nueva carpeta en la raíz"
            onClick={() => onCreateFolder(null)}
            className="p-1 rounded hover-bg transition-colors"
            style={{ color: C.accent }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      <RootRow
        active={selectedFolderId === null}
        onClick={() => onSelect(null)}
      />

      <div className="overflow-y-auto max-h-[60vh]">
        {folders.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            depth={0}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            canManage={canManage}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        ))}
        {folders.length === 0 && (
          <p
            className="text-[10px] px-2 py-3 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            No hay carpetas visibles.
          </p>
        )}
      </div>
    </div>
  );
}

function RootRow({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left"
      style={{
        backgroundColor: active
          ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)"
          : "transparent",
        color: active ? "var(--brand-primary)" : "var(--text-main)",
        fontWeight: active ? 600 : 500,
      }}
    >
      <FolderOpen size={14} /> Todos los documentos
    </button>
  );
}

function FolderNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
  canManage,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  node: LibraryFolderNode;
  depth: number;
  selectedFolderId: number | null;
  onSelect: (id: number | null) => void;
  canManage: boolean;
  onCreateFolder: (parentId: number | null) => void;
  onRenameFolder: (folder: LibraryFolderNode) => void;
  onDeleteFolder: (folder: LibraryFolderNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = selectedFolderId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md pr-1 transition-colors"
        style={{
          backgroundColor: active
            ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)"
            : "transparent",
          paddingLeft: 6 + depth * 14,
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-0.5 shrink-0"
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          <ChevronRight
            size={12}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
            style={{ color: "var(--text-muted)" }}
          />
        </button>
        <button
          onClick={() => onSelect(node.id)}
          className="flex-1 flex items-center gap-1.5 py-1.5 text-xs text-left min-w-0"
          style={{
            color: active ? "var(--brand-primary)" : "var(--text-main)",
            fontWeight: active ? 600 : 500,
          }}
          title={node.visible_to_roles ? `Restringida: ${node.visible_to_roles.join(", ")}` : undefined}
        >
          <Folder size={13} className="shrink-0" />
          <span className="truncate">{node.name}</span>
          {node.visible_to_roles && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: C.warning }}
            />
          )}
        </button>
        {canManage && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              title="Nueva subcarpeta"
              onClick={() => onCreateFolder(node.id)}
              className="p-1 rounded hover-bg cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <Plus size={16} />
            </button>
            <button
              title="Renombrar / visibilidad"
              onClick={() => onRenameFolder(node)}
              className="p-1 rounded hover-bg cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <Pencil size={16} />
            </button>
            <button
              title="Eliminar carpeta"
              onClick={() => onDeleteFolder(node)}
              className="p-1 rounded hover-bg cursor-pointer"
              style={{ color: C.danger }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {open &&
        node.children.map((child) => (
          <FolderNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            canManage={canManage}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        ))}
    </div>
  );
}
