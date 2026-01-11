import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import customerService, { PaginatedResponse } from '../services/customerService';
import { Customer, HistoryEvent } from '../types';
import toastService from '../services/toastService';

// Keys para las queries de clientes
export const customersKeys = {
  all: ['customers'] as const,
  lists: () => [...customersKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...customersKeys.lists(), filters] as const,
  details: () => [...customersKeys.all, 'detail'] as const,
  detail: (id: number) => [...customersKeys.details(), id] as const,
  history: (id: number) => [...customersKeys.detail(id), 'history'] as const,
  unlimited: (searchTerm: string) => [...customersKeys.all, 'unlimited', searchTerm] as const,
};

// Hook para obtener clientes con paginación
export const useCustomers = (searchTerm: string = '', page: number = 1) => {
  return useQuery<PaginatedResponse<Customer>>({
    queryKey: customersKeys.list({ searchTerm, page }),
    queryFn: () => customerService.getCustomers(searchTerm, page),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener TODOS los clientes sin limitación
export const useCustomersUnlimited = (searchTerm: string = '') => {
  return useQuery<Customer[]>({
    queryKey: customersKeys.unlimited(searchTerm),
    queryFn: () => customerService.getAllCustomersUnlimited(searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener un cliente específico
export const useCustomer = (id: number, enabled: boolean = true) => {
  return useQuery<Customer>({
    queryKey: customersKeys.detail(id),
    queryFn: () => customerService.getCustomerById(id),
    enabled: enabled && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener el historial de un cliente
export const useCustomerHistory = (id: number, enabled: boolean = true) => {
  return useQuery<HistoryEvent[]>({
    queryKey: customersKeys.history(id),
    queryFn: () => customerService.getCustomerHistory(id),
    enabled: enabled && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para crear un cliente
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Customer>) => customerService.createCustomer(data),
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
      queryClient.setQueryData(customersKeys.detail(newCustomer.id), newCustomer);
      toastService.success('Cliente creado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al crear el cliente');
    },
  });
};

// Hook para actualizar un cliente
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
      customerService.updateCustomer(id, data),
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
      queryClient.setQueryData(customersKeys.detail(updatedCustomer.id), updatedCustomer);
      // Invalidar también el historial ya que puede haber cambiado
      queryClient.invalidateQueries({ queryKey: customersKeys.history(updatedCustomer.id) });
      toastService.success('Cliente actualizado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al actualizar el cliente');
    },
  });
};

// Hook para eliminar un cliente
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerService.deleteCustomer(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
      queryClient.removeQueries({ queryKey: customersKeys.detail(deletedId) });
      queryClient.removeQueries({ queryKey: customersKeys.history(deletedId) });
      toastService.success('Cliente eliminado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al eliminar el cliente');
    },
  });
};
