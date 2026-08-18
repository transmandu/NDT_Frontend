import type { LibraryFolderNode } from "@/types/library";

/** Aplana el árbol de carpetas a una lista de opciones indentadas para <select>. */
export function flattenFolderOptions(
  nodes: LibraryFolderNode[],
  depth = 0,
): { id: number; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flattenFolderOptions(node.children, depth + 1),
  ]);
}

export function findFolderNode(
  nodes: LibraryFolderNode[],
  id: number,
): LibraryFolderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findFolderNode(node.children, id);
    if (found) return found;
  }
  return null;
}
