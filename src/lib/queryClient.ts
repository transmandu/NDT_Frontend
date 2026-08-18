import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

// Instancia única a nivel de módulo (no dentro de un componente): así se
// puede importar y llamar queryClient.clear() desde fuera de React —
// el interceptor 401 de api.ts y el logout de Header.tsx la necesitan para
// vaciar los datos cacheados de la sesión anterior al cambiar de usuario.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isAxiosError(error) && error.response?.status && error.response.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
