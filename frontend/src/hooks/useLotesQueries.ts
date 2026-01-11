import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import loteService from '../services/loteService';
import { Lote } from '../types';
import toastService from '../services/toastService';

// Keys para las queries de lotes
export const lotesKeys = {
  all: ['lotes'] as const,
  lists: () => [...lotesKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...lotesKeys.lists(), filters] as const,
  details: () => [...lotesKeys.all, 'detail'] as const,
  detail: (id: number) => [...lotesKeys.details(), id] as const,
  unlimited: (filters: Record<string, any>) => [...lotesKeys.all, 'unlimited', filters] as const,
};

// Hook para obtener lotes con paginación
export const useLotes = (params?: { 
  status?: string; 
  search?: string; 
  block?: string; 
  page_size?: number;
}) => {
  return useQuery<Lote[]>({
    queryKey: lotesKeys.list(params || {}),
    queryFn: () => loteService.getLotes(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener lotes con paginación del servidor
export const useLotesPage = (params?: { 
  status?: string; 
  search?: string; 
  block?: string; 
  page?: number; 
  page_size?: number;
}) => {
  return useQuery<{ count: number; next: string | null; previous: string | null; results: Lote[] }>({
    queryKey: lotesKeys.list(params || {}),
    queryFn: () => loteService.getLotesPage(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener TODOS los lotes sin limitación
export const useLotesUnlimited = (params?: { 
  status?: string; 
  search?: string; 
  block?: string;
}) => {
  return useQuery<Lote[]>({
    queryKey: lotesKeys.unlimited(params || {}),
    queryFn: () => loteService.getAllLotesUnlimited(params),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener un lote específico
export const useLote = (id: number, enabled: boolean = true) => {
  return useQuery<Lote>({
    queryKey: lotesKeys.detail(id),
    queryFn: () => loteService.getLoteById(id),
    enabled: enabled && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para crear un lote
export const useCreateLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Lote> & { owner_id?: number | null }) => 
      loteService.createLote(data),
    onSuccess: (newLote) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.setQueryData(lotesKeys.detail(newLote.id), newLote);
      toastService.success('Lote creado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al crear el lote');
    },
  });
};

// Hook para crear un lote con archivo
export const useCreateLoteWithFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => loteService.createLoteWithFile(formData),
    onSuccess: (newLote) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.setQueryData(lotesKeys.detail(newLote.id), newLote);
      toastService.success('Lote creado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al crear el lote');
    },
  });
};

// Hook para actualizar un lote
export const useUpdateLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lote> & { owner_id?: number | null } }) =>
      loteService.updateLote(id, data),
    onSuccess: (updatedLote) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.setQueryData(lotesKeys.detail(updatedLote.id), updatedLote);
      toastService.success('Lote actualizado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al actualizar el lote');
    },
  });
};

// Hook para actualizar un lote con archivo
export const useUpdateLoteWithFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      loteService.updateLoteWithFile(id, formData),
    onSuccess: (updatedLote) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.setQueryData(lotesKeys.detail(updatedLote.id), updatedLote);
      toastService.success('Lote actualizado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al actualizar el lote');
    },
  });
};

// Hook para eliminar un lote
export const useDeleteLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => loteService.deleteLote(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.removeQueries({ queryKey: lotesKeys.detail(deletedId) });
      toastService.success('Lote eliminado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al eliminar el lote');
    },
  });
};

// Hook para transferir propietario
export const useTransferOwner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oldLoteId, newLoteId }: { oldLoteId: number; newLoteId: number }) =>
      loteService.transferOwner(oldLoteId, newLoteId),
    onSuccess: (_, { oldLoteId, newLoteId }) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.invalidateQueries({ queryKey: lotesKeys.detail(oldLoteId) });
      queryClient.invalidateQueries({ queryKey: lotesKeys.detail(newLoteId) });
      toastService.success('Propietario transferido exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al transferir el propietario');
    },
  });
};
