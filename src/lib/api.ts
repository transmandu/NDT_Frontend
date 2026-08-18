import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/lib/queryClient';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  timeout: 30000,
});

// Interceptor: agrega token Bearer a cada petición leyendo el store directamente
// (evita JSON.parse de localStorage en cada request)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Decodes literal \uXXXX escape sequences that arrive when data was stored
// double-encoded (e.g. "Higrómetro" stored as raw bytes in the DB).
// Safe to apply broadly: only strings matching the pattern are transformed.
function decodeUnicodeEscapes(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
  if (Array.isArray(value)) return value.map(decodeUnicodeEscapes);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, decodeUnicodeEscapes(v)])
    );
  }
  return value;
}

// Interceptor: si recibe 401, limpia el store (el layout protegido redirige a /login).
// Si la respuesta es un error, adjunta un campo normalizado `error.userMessage`
// con el mejor mensaje disponible, incluso si el body es HTML o está vacío.
api.interceptors.response.use(
  (response) => {
    if (response.config.responseType !== 'blob') {
      response.data = decodeUnicodeEscapes(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      // Sin esto, los datos cacheados de la sesión anterior (ej. documentos de
      // la Biblioteca visibles solo para el rol previo) seguían mostrándose
      // tras volver a loguearse con otro usuario, sin recargar la página.
      queryClient.clear();
    }

    // Extraer el mejor mensaje disponible del error de la API.
    // Esto evita que cada componente tenga que hacer su propia lógica de extracción,
    // y que `err.response?.data` sea `undefined` o un HTML de 50kb.
    const data = error.response?.data;
    let userMessage = 'Error de conexión con el servidor.';

    if (typeof data === 'string' && !data.startsWith('<')) {
      // Texto plano (no HTML)
      userMessage = data;
    } else if (data && typeof data === 'object') {
      // JSON estándar de Laravel: { message: "..." } o { error: "..." } o { errors: {...} }
      if (data.message) {
        userMessage = data.message;
      } else if (data.error) {
        userMessage = data.error;
      } else if (data.errors) {
        // Errores de validación: tomar el primer mensaje de cada campo
        const firstErrors = Object.values(data.errors as Record<string, string[]>)
          .flat()
          .slice(0, 2)
          .join(' | ');
        userMessage = firstErrors || 'Error de validación.';
      }
    } else if (!error.response) {
      // Sin respuesta: timeout, red caída, CORS preflight rechazado
      userMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
    } else {
      userMessage = `Error ${error.response.status}: ${error.response.statusText || 'Sin detalles'}`;
    }

    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

export default api;
