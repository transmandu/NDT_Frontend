import type { APIRequestContext } from "@playwright/test";
import { USERS, type Role } from "./auth";

/**
 * Llamadas HTTP directas al backend real (fuera del navegador) para preparar
 * datos que serían tediosos/frágiles de crear a través de la UI (p.ej. una
 * sesión de calibración válida requiere instrumento + patrón + procedimiento),
 * y para limpiar lo creado al terminar cada test — no hay DatabaseTransactions
 * aquí como en PHPUnit, así que la limpieza es responsabilidad de cada test.
 */
export const API_BASE = "http://localhost:8080/api";

export async function apiLogin(request: APIRequestContext, role: Role): Promise<string> {
  const { email, password } = USERS[role];
  const res = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`Login falló para ${role}: ${res.status()}`);
  const body = await res.json();
  return body.token as string;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Crea una sesión de calibración válida en estado "draft", reutilizando el primer instrumento/patrón/esquema disponibles. */
export async function createDraftSession(request: APIRequestContext, token: string): Promise<number> {
  const [instruments, standards, schemas] = await Promise.all([
    request.get(`${API_BASE}/instruments`, { headers: auth(token) }).then((r) => r.json()),
    request.get(`${API_BASE}/standards`, { headers: auth(token) }).then((r) => r.json()),
    request.get(`${API_BASE}/calibration/schemas`, { headers: auth(token) }).then((r) => r.json()),
  ]);

  const instrument = instruments.data[0];
  const standard = standards.data.find((s: { category: string }) => s.category === instrument.category)
    ?? standards.data[0];
  // /calibration/schemas responde { schemas: [...] }, no { data: [...] } como el resto.
  const schema = schemas.schemas.find((s: { category: string }) => s.category === instrument.category)
    ?? schemas.schemas[0];

  const res = await request.post(`${API_BASE}/calibration/sessions`, {
    headers: auth(token),
    data: {
      instrument_id: instrument.id,
      procedure_schema_id: schema.id,
      category: instrument.category,
      ambient_temperature: 22,
      ambient_humidity: 50,
      standard_ids: [standard.id],
    },
  });
  if (!res.ok()) throw new Error(`No se pudo crear sesión draft: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return body.session.id as number;
}

export async function getSession(request: APIRequestContext, token: string, id: number) {
  const res = await request.get(`${API_BASE}/calibration/sessions/${id}`, { headers: auth(token) });
  return res.json();
}

export async function deleteSession(request: APIRequestContext, token: string, id: number) {
  await request.delete(`${API_BASE}/calibration/sessions/${id}`, { headers: auth(token) });
}

export async function cancelNonconformity(request: APIRequestContext, token: string, ncId: number, reason: string) {
  await request.post(`${API_BASE}/quality/nc/${ncId}/transitions`, {
    headers: auth(token),
    data: { to: "cancelada", cancellation_reason: reason },
  });
}

/** Buffer con firma real de PDF — Laravel valida `mimes:pdf` por contenido (finfo), no por extensión. */
export function fakePdf(text = "Documento de prueba E2E."): Buffer {
  return Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF`);
}

export async function apiCreateFolder(
  request: APIRequestContext,
  token: string,
  payload: { name: string; parent_id?: number | null; visible_to_roles?: string[] | null },
): Promise<number> {
  const res = await request.post(`${API_BASE}/library/folders`, { headers: auth(token), data: payload });
  if (!res.ok()) throw new Error(`No se pudo crear carpeta: ${res.status()} ${await res.text()}`);
  return (await res.json()).folder.id as number;
}

export async function apiDeleteFolder(request: APIRequestContext, token: string, id: number) {
  await request.delete(`${API_BASE}/library/folders/${id}`, { headers: auth(token) });
}

export async function apiUploadDocument(
  request: APIRequestContext,
  token: string,
  fields: {
    title: string;
    category_id: number;
    folder_id?: number;
    requires_expiry?: boolean;
    expiration_date?: string;
  },
): Promise<number> {
  const multipart: Record<string, string> = {
    title: fields.title,
    category_id: String(fields.category_id),
  };
  if (fields.folder_id !== undefined) multipart.folder_id = String(fields.folder_id);
  if (fields.requires_expiry) {
    multipart.requires_expiry = "1";
    multipart.expiration_date = fields.expiration_date!;
  }
  const res = await request.post(`${API_BASE}/library/upload`, {
    headers: auth(token),
    multipart: { ...multipart, file: { name: "doc.pdf", mimeType: "application/pdf", buffer: fakePdf() } },
  });
  if (!res.ok()) throw new Error(`No se pudo subir documento: ${res.status()} ${await res.text()}`);
  return (await res.json()).document.id as number;
}

export async function apiDeleteDocument(request: APIRequestContext, token: string, id: number) {
  await request.delete(`${API_BASE}/library/documents/${id}`, { headers: auth(token) });
}

export async function apiListCategories(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/library/categories-list`, { headers: auth(token) });
  return (await res.json()).categories as { id: number; name: string }[];
}

export async function apiCreateShareRequest(
  request: APIRequestContext,
  token: string,
  payload: { document_id: number; shared_with_name: string; reason: string; expires_in_hours?: number },
) {
  const res = await request.post(`${API_BASE}/library/share-requests`, {
    headers: auth(token),
    data: { expires_in_hours: 48, read_only: true, ...payload },
  });
  return res;
}
