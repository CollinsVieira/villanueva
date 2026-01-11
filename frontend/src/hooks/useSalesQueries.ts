import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import salesService, { Venta, VentaCreate, PaymentPlan, PaginatedResponse } from '../services/salesService';
import toastService from '../services/toastService';

// Keys para las queries
export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...salesKeys.lists(), filters] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: number) => [...salesKeys.details(), id] as const,
  paymentPlan: (id: number) => [...salesKeys.detail(id), 'payment-plan'] as const,
  paymentSchedule: (id: number) => [...salesKeys.detail(id), 'payment-schedule'] as const,
};

// Hook para obtener lista de ventas con paginación
export const useSales = (params?: { 
  lote?: number; 
  customer?: number; 
  status?: string; 
  search?: string; 
  page?: number 
}) => {
  return useQuery<PaginatedResponse<Venta>>({
    queryKey: salesKeys.list(params || {}),
    queryFn: () => salesService.getVentas(params),
    staleTime: 1000 * 60 * 5, // 5 minutos - los datos se consideran "frescos" durante este tiempo
    gcTime: 1000 * 60 * 10, // 10 minutos - tiempo que se mantienen en caché
  });
};

// Hook para obtener detalles de una venta específica
export const useSale = (id: number, enabled: boolean = true) => {
  return useQuery<Venta>({
    queryKey: salesKeys.detail(id),
    queryFn: () => salesService.getVenta(id),
    enabled: enabled && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener plan de pagos de una venta
export const useSalePaymentPlan = (id: number, enabled: boolean = true) => {
  return useQuery<PaymentPlan | null>({
    queryKey: salesKeys.paymentPlan(id),
    queryFn: async () => {
      try {
        return await salesService.getVentaPaymentPlan(id);
      } catch (error) {
        return null;
      }
    },
    enabled: enabled && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para crear una venta
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VentaCreate) => salesService.createVenta(data),
    onSuccess: (newSale) => {
      // Invalidar la lista de ventas para que se recargue
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      // Opcional: agregar la nueva venta al caché
      queryClient.setQueryData(salesKeys.detail(newSale.id), newSale);
      toastService.success('Venta creada exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al crear la venta');
    },
  });
};

// Hook para actualizar una venta
export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VentaCreate> }) =>
      salesService.updateVenta(id, data),
    onSuccess: (updatedSale) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.setQueryData(salesKeys.detail(updatedSale.id), updatedSale);
      toastService.success('Venta actualizada exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al actualizar la venta');
    },
  });
};

// Hook para cancelar una venta
export const useCancelSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      salesService.cancelVenta(id, reason),
    onSuccess: (cancelledSale) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.setQueryData(salesKeys.detail(cancelledSale.id), cancelledSale);
      // También invalidar el plan de pagos
      queryClient.invalidateQueries({ queryKey: salesKeys.paymentPlan(cancelledSale.id) });
      toastService.success('Venta cancelada exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al cancelar la venta');
    },
  });
};

// Hook para completar una venta
export const useCompleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesService.completeVenta(id),
    onSuccess: (completedSale) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.setQueryData(salesKeys.detail(completedSale.id), completedSale);
      queryClient.invalidateQueries({ queryKey: salesKeys.paymentPlan(completedSale.id) });
      toastService.success('Venta completada exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al completar la venta');
    },
  });
};

// Hook para registrar pago inicial
export const useRegisterInitialPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saleId, data }: { saleId: number; data: any }) =>
      salesService.registerInitialPayment(saleId, data),
    onSuccess: (_, variables) => {
      // Invalidar todas las queries relacionadas con la venta
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(variables.saleId) });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      toastService.success('Pago inicial registrado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al registrar el pago inicial');
    },
  });
};
