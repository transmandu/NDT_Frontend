import { isAxiosError } from 'axios';

export function getApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'userMessage' in err) {
    return (err as { userMessage: string }).userMessage;
  }
  if (isAxiosError(err)) {
    return err.response?.data?.message ?? 'Error de conexión con el servidor.';
  }
  return 'Error inesperado.';
}