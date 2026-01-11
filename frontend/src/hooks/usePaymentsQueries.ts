import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { PaymentSchedule, PaginatedPaymentResponse } from '../types';
import toastService from '../services/toastService';

// Keys para las queries de pagos
export const paymentsKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentsKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...paymentsKeys.lists(), filters] as const,
  details: () => [...paymentsKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentsKeys.details(), id] as const,
  unlimited: (searchTerm: string) => [...paymentsKeys.all, 'unlimited', searchTerm] as const,
  initial: (saleId: number) => [...paymentsKeys.all, 'initial', saleId] as const,
};

// Keys para las queries de cronogramas de pago
export const schedulesKeys = {
  all: ['schedules'] as const,
  lists: () => [...schedulesKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...schedulesKeys.lists(), filters] as const,
  details: () => [...schedulesKeys.all, 'detail'] as const,
  detail: (id: number) => [...schedulesKeys.details(), id] as const,
  byLote: (loteId: number) => [...schedulesKeys.all, 'by-lote', loteId] as const,
  historyByLote: (loteId: number) => [...schedulesKeys.all, 'history-by-lote', loteId] as const,
  byVenta: (ventaId: number) => [...schedulesKeys.all, 'by-venta', ventaId] as const,
  overdue: () => [...schedulesKeys.all, 'overdue'] as const,
  pending: () => [...schedulesKeys.all, 'pending'] as const,
};

// Hook para obtener pagos con paginación
export const usePayments = (page: number = 1, searchTerm: string = '') => {
  return useQuery<PaginatedPaymentResponse>({
    queryKey: paymentsKeys.list({ page, searchTerm }),
    queryFn: () => paymentService.getPaymentsPaginated(page, searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener TODOS los pagos sin limitación
export const usePaymentsUnlimited = (searchTerm: string = '') => {
  return useQuery<PaginatedPaymentResponse>({
    queryKey: paymentsKeys.unlimited(searchTerm),
    queryFn: () => paymentService.getAllPaymentsUnlimited(searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener pagos iniciales de una venta
export const useInitialPayments = (saleId: number, enabled: boolean = true) => {
  return useQuery<any[]>({
    queryKey: paymentsKeys.initial(saleId),
    queryFn: () => paymentService.getInitialPayments(saleId),
    enabled: enabled && saleId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para crear un pago
export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => paymentService.createPayment(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      toastService.success('Pago registrado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al registrar el pago');
    },
  });
};

// Hook para actualizar un pago
export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      paymentService.updatePayment(id, data),
    onSuccess: (updatedPayment) => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.setQueryData(paymentsKeys.detail(updatedPayment.id), updatedPayment);
      toastService.success('Pago actualizado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al actualizar el pago');
    },
  });
};

// Hook para resetear un pago
export const useResetPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentService.resetPayment(id),
    onSuccess: (resetPayment) => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.setQueryData(paymentsKeys.detail(resetPayment.id), resetPayment);
      toastService.success('Pago reseteado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al resetear el pago');
    },
  });
};

// Hook para eliminar un pago
export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentService.deletePayment(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.removeQueries({ queryKey: paymentsKeys.detail(deletedId) });
      toastService.success('Pago eliminado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al eliminar el pago');
    },
  });
};

// ========== PAYMENT SCHEDULES ==========

// Hook para obtener cronogramas de pago
export const usePaymentSchedules = (searchTerm: string = '') => {
  return useQuery<PaymentSchedule[]>({
    queryKey: schedulesKeys.list({ searchTerm }),
    queryFn: () => paymentService.getPaymentSchedules(searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener un cronograma específico
export const usePaymentSchedule = (id: number, enabled: boolean = true) => {
  return useQuery<PaymentSchedule>({
    queryKey: schedulesKeys.detail(id),
    queryFn: () => paymentService.getPaymentSchedule(id),
    enabled: enabled && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener cronogramas por lote
export const usePaymentScheduleByLote = (loteId: number, enabled: boolean = true) => {
  return useQuery<PaymentSchedule[]>({
    queryKey: schedulesKeys.byLote(loteId),
    queryFn: () => paymentService.getPaymentScheduleByLote(loteId),
    enabled: enabled && loteId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener historial de cronogramas por lote
export const usePaymentScheduleHistoryByLote = (loteId: number, enabled: boolean = true) => {
  return useQuery<PaymentSchedule[]>({
    queryKey: schedulesKeys.historyByLote(loteId),
    queryFn: () => paymentService.getPaymentScheduleHistoryByLote(loteId),
    enabled: enabled && loteId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener cronogramas por venta
export const usePaymentScheduleByVenta = (ventaId: number, enabled: boolean = true) => {
  return useQuery<{schedules: PaymentSchedule[], initial_payments: any[]}>({
    queryKey: schedulesKeys.byVenta(ventaId),
    queryFn: () => paymentService.getPaymentScheduleByVenta(ventaId),
    enabled: enabled && ventaId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

// Hook para obtener cronogramas vencidos
export const useOverdueSchedules = () => {
  return useQuery<PaymentSchedule[]>({
    queryKey: schedulesKeys.overdue(),
    queryFn: () => paymentService.getOverdueSchedules(),
    staleTime: 1000 * 60 * 2, // 2 minutos (más corto porque son datos críticos)
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
};

// Hook para obtener cronogramas pendientes
export const usePendingSchedules = () => {
  return useQuery<PaymentSchedule[]>({
    queryKey: schedulesKeys.pending(),
    queryFn: () => paymentService.getPendingSchedules(),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
};

// Hook para generar cronograma para un lote
export const useGenerateScheduleForLote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loteId: number) => paymentService.generateScheduleForLote(loteId),
    onSuccess: (_, loteId) => {
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.invalidateQueries({ queryKey: schedulesKeys.byLote(loteId) });
      toastService.success('Cronograma generado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al generar el cronograma');
    },
  });
};

// Hook para registrar un pago en un cronograma
export const useRegisterPaymentToSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: number; data: any }) =>
      paymentService.registerPayment(scheduleId, data),
    onSuccess: (updatedSchedule) => {
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      queryClient.setQueryData(schedulesKeys.detail(updatedSchedule.id), updatedSchedule);
      toastService.success('Pago registrado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al registrar el pago');
    },
  });
};

// Hook para perdonar una cuota
export const useForgiveInstallment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, notes }: { scheduleId: number; notes?: string }) =>
      paymentService.forgiveInstallment(scheduleId, notes),
    onSuccess: (updatedSchedule) => {
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.setQueryData(schedulesKeys.detail(updatedSchedule.id), updatedSchedule);
      toastService.success('Cuota perdonada exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al perdonar la cuota');
    },
  });
};

// Hook para modificar el monto de una cuota
export const useModifyAmount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, newAmount, notes }: { scheduleId: number; newAmount: number; notes?: string }) =>
      paymentService.modifyAmount(scheduleId, newAmount, notes),
    onSuccess: (updatedSchedule) => {
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.setQueryData(schedulesKeys.detail(updatedSchedule.id), updatedSchedule);
      toastService.success('Monto modificado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al modificar el monto');
    },
  });
};

// Hook para modificar múltiples montos
export const useModifyMultipleAmounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleIds, newAmount, notes }: { scheduleIds: number[]; newAmount: number; notes?: string }) =>
      paymentService.modifyMultipleAmounts(scheduleIds, newAmount, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      toastService.success('Montos modificados exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al modificar los montos');
    },
  });
};

// Hook para actualizar un cronograma
export const useUpdatePaymentSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentSchedule> }) =>
      paymentService.updatePaymentSchedule(id, data),
    onSuccess: (updatedSchedule) => {
      queryClient.invalidateQueries({ queryKey: schedulesKeys.all });
      queryClient.setQueryData(schedulesKeys.detail(updatedSchedule.id), updatedSchedule);
      toastService.success('Cronograma actualizado exitosamente');
    },
    onError: (error: any) => {
      toastService.error(error.response?.data?.detail || 'Error al actualizar el cronograma');
    },
  });
};
