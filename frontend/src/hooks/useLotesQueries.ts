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
  deleted: (filters: Record<string, any>) => [...lotesKeys.all, 'deleted', filters] as const,
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

// Hook para obtener lotes eliminados lógicamente
export const useDeletedLotes = (params?: { 
  status?: string; 
  search?: string; 
  block?: string;
}) => {
  return useQuery<Lote[]>({
    queryKey: lotesKeys.deleted(params || {}),
    queryFn: () => loteService.getDeletedLotes(params),
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

// Hook para eliminar (retirar lógicamente) un lote
export const useDeleteLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: number | { id: number; reason?: string }) => {
      const id = typeof params === 'number' ? params : params.id;
      const reason = typeof params === 'object' ? params.reason : undefined;
      return loteService.deleteLote(id, reason);
    },
    onSuccess: (_, params) => {
      const id = typeof params === 'number' ? params : params.id;
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.removeQueries({ queryKey: lotesKeys.detail(id) });
      toastService.success('Lote retirado del inventario exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al retirar el lote');
    },
  });
};

// Hook para restaurar un lote eliminado
export const useRestoreLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => loteService.restoreLote(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: lotesKeys.all });
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotesKeys.detail(id) });
      toastService.success(response.message || 'Lote restaurado exitosamente al inventario activo');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al restaurar el lote');
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
