import { QueryClient } from '@tanstack/react-query';

// Configuración del QueryClient con opciones personalizadas
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reintentar 1 vez en caso de error
      refetchOnWindowFocus: false, // No recargar automáticamente al enfocar la ventana
      staleTime: 1000 * 60 * 5, // 5 minutos - tiempo por defecto que los datos se consideran frescos
      gcTime: 1000 * 60 * 10, // 10 minutos - tiempo que los datos se mantienen en caché
    },
    mutations: {
      retry: 0, // No reintentar mutaciones fallidas automáticamente
    },
  },
});
