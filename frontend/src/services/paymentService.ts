// villanueva/frontend/src/services/paymentService.ts
import api from './api';
import { Payment, PaymentSchedule, PaymentScheduleSummary } from '../types';

// Helper para manejar respuestas paginadas
const handlePaginatedResponse = (data: any): any[] => {
  // Si la respuesta tiene estructura paginada, devolver solo los resultados
  if (data && typeof data === 'object' && 'results' in data) {
    return data.results;
  }
  // Si no tiene estructura paginada, devolver los datos tal como están
  return Array.isArray(data) ? data : [];
};

class PaymentService {
  // --- FUNCIÓN MODIFICADA ---
  async getPayments(searchTerm: string = ''): Promise<Payment[]> {
    const params = searchTerm ? { search: searchTerm } : {};
    const response = await api.get('/payments/payments/', { params });
    return handlePaginatedResponse(response.data);
  }

  async getInitialPayments(saleId: number): Promise<any[]> {
    const response = await api.get(`/payments/payments/?venta__id=${saleId}&payment_type=initial`);
    return handlePaginatedResponse(response.data);
  }

  async createPayment(paymentData: FormData): Promise<Payment> {
    const response = await api.post('/payments/payments/', paymentData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async createPaymentForVenta(ventaId: number, paymentData: {
    amount: string;
    payment_type: string;
    method?: string;
    receipt_number?: string;
    receipt_date?: string;
    payment_schedule_id?: number;
    notes?: string;
    receipt_image?: File;
  }): Promise<Payment> {
    const formData = new FormData();
    formData.append('venta_id', ventaId.toString());
    formData.append('amount', paymentData.amount);
    formData.append('payment_type', paymentData.payment_type);
    
    if (paymentData.method) formData.append('method', paymentData.method);
    if (paymentData.receipt_number) formData.append('receipt_number', paymentData.receipt_number);
    if (paymentData.receipt_date) formData.append('receipt_date', paymentData.receipt_date);
    if (paymentData.payment_schedule_id) formData.append('payment_schedule_id', paymentData.payment_schedule_id.toString());
    if (paymentData.notes) formData.append('notes', paymentData.notes);
    if (paymentData.receipt_image) formData.append('receipt_image', paymentData.receipt_image);

    const response = await api.post('/payments/payments/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deletePayment(id: number): Promise<void> {
    await api.delete(`/payments/payments/${id}/`);
  }

  async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
    const response = await api.get(`/customers/${customerId}/`, { 
      params: { customer: customerId } 
    });
    return response.data;
  }

  // PaymentSchedule methods
  async getPaymentSchedules(searchTerm: string = ''): Promise<PaymentSchedule[]> {
    const params = searchTerm ? { search: searchTerm } : {};
    const response = await api.get('/payments/schedules/', { params });
    return handlePaginatedResponse(response.data);
  }

  async getPaymentSchedule(id: number): Promise<PaymentSchedule> {
    const response = await api.get(`/payments/schedules/${id}/`);
    return response.data;
  }

  async getPaymentScheduleByLote(loteId: number): Promise<PaymentSchedule[]> {
    const response = await api.get('/payments/schedules/by_lote/', {
      params: { lote_id: loteId }
    });
    return handlePaginatedResponse(response.data);
  }

  async getPaymentScheduleHistoryByLote(loteId: number): Promise<PaymentSchedule[]> {
    const response = await api.get('/payments/schedules/history_by_lote/', {
      params: { lote_id: loteId }
    });
    return handlePaginatedResponse(response.data);
  }

  async getPaymentScheduleByVenta(ventaId: number): Promise<{schedules: PaymentSchedule[], initial_payments: any[]}> {
    const response = await api.get('/payments/schedules/by_venta/', {
      params: { venta_id: ventaId }
    });
    return {
      schedules: response.data.schedules || [],
      initial_payments: response.data.initial_payments || []
    };
  }

  async getOverdueSchedules(): Promise<PaymentSchedule[]> {
    const response = await api.get('/payments/schedules/overdue/');
    return handlePaginatedResponse(response.data);
  }

  async getPendingSchedules(): Promise<PaymentSchedule[]> {
    const response = await api.get('/payments/schedules/pending/');
    return handlePaginatedResponse(response.data);
  }

  async generateScheduleForLote(loteId: number): Promise<{ message: string; schedules: PaymentScheduleSummary[] }> {
    const response = await api.post('/payments/schedules/generate_for_lote/', {
      lote_id: loteId
    });
    return response.data;
  }

  // New flexible payment methods
  async registerPayment(scheduleId: number, paymentData: {
    amount: number;
    method?: string;
    receipt_number?: string;
    receipt_date?: string;
    receipt_image?: File;
    boleta_image?: File;
    notes?: string;
  }): Promise<PaymentSchedule> {
    const formData = new FormData();
    formData.append('amount', paymentData.amount.toString());
    
    if (paymentData.method) {
      formData.append('method', paymentData.method);
    }
    if (paymentData.receipt_number) {
      formData.append('receipt_number', paymentData.receipt_number);
    }
    if (paymentData.receipt_date) {
      formData.append('receipt_date', paymentData.receipt_date);
    }
    if (paymentData.receipt_image) {
      formData.append('receipt_image', paymentData.receipt_image);
    }
    if (paymentData.boleta_image) {
      formData.append('boleta_image', paymentData.boleta_image);
    }
    if (paymentData.notes) {
      formData.append('notes', paymentData.notes);
    }

    const response = await api.post(`/payments/schedules/${scheduleId}/register_payment/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async forgiveInstallment(scheduleId: number, notes?: string): Promise<PaymentSchedule> {
    const response = await api.post(`/payments/schedules/${scheduleId}/forgive_installment/`, {
      notes
    });
    return response.data;
  }

  async modifyAmount(scheduleId: number, newAmount: number, notes?: string): Promise<PaymentSchedule> {
    const response = await api.post(`/payments/schedules/${scheduleId}/modify_amount/`, {
      new_amount: newAmount,
      notes
    });
    return response.data;
  }

  async modifyMultipleAmounts(scheduleIds: number[], newAmount: number, notes?: string): Promise<{
    message: string;
    modified_count: number;
    schedules: PaymentSchedule[];
  }> {
    const response = await api.post('/payments/schedules/modify_multiple_amounts/', {
      schedule_ids: scheduleIds,
      new_amount: newAmount,
      notes
    });
    return response.data;
  }

  async addPaymentToSchedule(scheduleId: number, paymentId: number): Promise<PaymentSchedule> {
    const response = await api.post(`/payments/schedules/${scheduleId}/add_payment/`, {
      payment_id: paymentId
    });
    return response.data;
  }

  async updatePaymentSchedule(id: number, data: Partial<PaymentSchedule>): Promise<PaymentSchedule> {
    const response = await api.patch(`/payments/schedules/${id}/`, data);
    return response.data;
  }

}

export default new PaymentService();