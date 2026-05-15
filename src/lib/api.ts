import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

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

// Interceptor: si recibe 401, limpia el store (el layout protegido redirige a /login)
api.interceptors.response.use(
  (response) => {
    response.data = decodeUnicodeEscapes(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;
