import api from './api';

export interface Venta {
  customer_display: any;
  lote_display: any;
  id: number;
  lote: number;
  customer: number;
  sale_price: string;
  initial_payment?: string;
  contract_date?: string;
  schedule_start_date?: string;
  contract_pdf?: string;
  status: 'active' | 'cancelled' | 'completed' | 'suspended';
  notes?: string;
  payment_day?: number;
  financing_months?: number;
  sale_date: string;
  cancellation_date?: string;
  completion_date?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  remaining_balance?: string;
  total_pending_balance?: number | string;
  total_initial_payments?: number;
  initial_payment_balance?: number;
  is_initial_payment_complete?: boolean;
  lote_info?: {
    id: number;
    block: string;
    lot_number: string;
    display: string;
    area: string;
    price_per_m2: string;
  };
  customer_info?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    document_number: string;
    phone?: string;
  };
}

export interface VentaCreate {
  lote: number;
  customer: number;
  sale_price: string;
  initial_payment?: string;
  contract_date?: string;
  schedule_start_date?: string;
  contract_pdf?: File;
  notes?: string;
  payment_day: number;
  financing_months: number;
}

export interface VentaInitialPayment {
  amount: string;
  payment_date?: string;
  method?: string;
  receipt_number?: string;
  receipt_date?: string;
  receipt_image?: File;
  notes?: string;
}

export interface PaymentPlan {
  id: number;
  venta: number;
  venta_info: {
    id: number;
    status: string;
    sale_price: string;
    initial_payment?: string;
    contract_date?: string;
  };
  lote_info: {
    id: number;
    block: string;
    lot_number: string;
    display: string;
    area: string;
    price_per_m2: string;
  };
  start_date: string;
  payment_day: number;
  payment_status: {
    completion_percentage: number;
    total_installments: number;
    remaining_amount: number;
    paid_amount: number;
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    forgiven?: number;
    partial?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface PaymentSchedule {
  id: number;
  venta: number;
  venta_info?: {
    id: number;
    status: string;
    lote_display: string;
    customer_display: string;
  };
  installment_number: number;
  original_amount: string;
  scheduled_amount: string;
  paid_amount: string;
  remaining_amount: string;
  due_date: string;
  due_date_display: string;
  payment_date?: string;
  payment_date_display?: string;
  receipt_image?: string;
  receipt_number?: string;
  receipt_date?: string;
  receipt_date_display?: string;
  payment_method?: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  is_forgiven: boolean;
  notes?: string;
  is_overdue: boolean;
  days_overdue: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Helper para manejar respuestas paginadas
const handlePaginatedResponse = (data: any): any[] => {
  // Si la respuesta tiene estructura paginada, devolver solo los resultados
  if (data && typeof data === 'object' && 'results' in data) {
    return data.results;
  }
  // Si no tiene estructura paginada, devolver los datos tal como están
  return Array.isArray(data) ? data : [];
};

class SalesService {
  // Venta CRUD operations
  async getVentas(params?: { lote?: number; customer?: number; status?: string; search?: string; page?: number }): Promise<PaginatedResponse<Venta>> {
    const response = await api.get('/sales/ventas/', { params });
    return response.data;
  }

  // Método de compatibilidad para obtener todas las ventas (primera página)
  async getAllVentas(params?: { lote?: number; customer?: number; status?: string }): Promise<Venta[]> {
    const response = await this.getVentas(params);
    return response.results || [];
  }

  async getVenta(id: number): Promise<Venta> {
    const response = await api.get(`/sales/ventas/${id}/`);
    return response.data;
  }

  async createVenta(data: VentaCreate): Promise<Venta> {
    const formData = new FormData();
    
    // Agregar campos de texto
    formData.append('lote', data.lote.toString());
    formData.append('customer', data.customer.toString());
    formData.append('sale_price', data.sale_price);
    formData.append('payment_day', data.payment_day.toString());
    formData.append('financing_months', data.financing_months.toString());
    
    if (data.initial_payment) {
      formData.append('initial_payment', data.initial_payment);
    }
    if (data.contract_date) {
      formData.append('contract_date', data.contract_date);
    }
    if (data.schedule_start_date) {
      formData.append('schedule_start_date', data.schedule_start_date);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    if (data.contract_pdf) {
      formData.append('contract_pdf', data.contract_pdf);
    }
    
    const response = await api.post('/sales/ventas/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateVenta(id: number, data: Partial<VentaCreate>): Promise<Venta> {
    // Si hay un archivo PDF, usar FormData
    if (data.contract_pdf) {
      const formData = new FormData();
      
      // Agregar solo los campos que están presentes
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'contract_pdf' && value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'string' || typeof value === 'number') {
            formData.append(key, value.toString());
          }
        }
      });
      
      const response = await api.patch(`/sales/ventas/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Si no hay archivo, usar JSON normal
      const response = await api.patch(`/sales/ventas/${id}/`, data);
      return response.data;
    }
  }

  async deleteVenta(id: number): Promise<void> {
    await api.delete(`/sales/ventas/${id}/`);
  }

  // Venta lifecycle actions
  async cancelVenta(id: number, reason?: string): Promise<Venta> {
    const response = await api.post(`/sales/ventas/${id}/cancel_sale/`, { reason });
    return response.data;
  }

  async completeVenta(id: number): Promise<Venta> {
    const response = await api.post(`/sales/ventas/${id}/complete_sale/`);
    return response.data;
  }

  async registerInitialPayment(id: number, data: VentaInitialPayment): Promise<any> {
    // Si hay imagen, usar FormData para cumplir con el backend
    if (data.receipt_image) {
      const formData = new FormData();
      formData.append('amount', data.amount);
      if (data.method) {
        formData.append('payment_method', data.method);
      }
      if (data.receipt_number) {
        formData.append('receipt_number', data.receipt_number);
      }
      if (data.receipt_date) {
        formData.append('receipt_date', data.receipt_date);
      }
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      formData.append('receipt_image', data.receipt_image);

      const response = await api.post(`/sales/ventas/${id}/register_initial_payment/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    // Sin imagen, enviar JSON normal mapeando las claves esperadas por el backend
    const payload: any = {
      amount: data.amount,
      payment_method: data.method || 'transferencia',
    };
    if (data.receipt_number) payload.receipt_number = data.receipt_number;
    if (data.receipt_date) payload.receipt_date = data.receipt_date;
    if (data.notes) payload.notes = data.notes;

    const response = await api.post(`/sales/ventas/${id}/register_initial_payment/`, payload);
    return response.data;
  }

  // Payment plan and schedule operations
  async getVentaPaymentPlan(id: number): Promise<PaymentPlan> {
    const response = await api.get(`/sales/ventas/${id}/payment_plan/`);
    return response.data;
  }

  async getVentaPaymentSchedule(id: number): Promise<PaymentSchedule[]> {
    const response = await api.get(`/sales/ventas/${id}/payment_schedule/`);
    return response.data;
  }

  // Get ventas by lote or customer
  async getVentasByLote(loteId: number): Promise<Venta[]> {
    const response = await api.get('/sales/ventas/', { params: { lote: loteId } });
    return handlePaginatedResponse(response.data);
  }

  async getVentasHistoryByLote(loteId: number): Promise<Venta[]> {
    const response = await api.get('/sales/ventas/sales_by_lote/', { 
      params: { lote_id: loteId } 
    });
    return handlePaginatedResponse(response.data);
  }

  async getVentasByCustomer(customerId: number): Promise<Venta[]> {
    const response = await api.get('/sales/ventas/', { params: { customer: customerId } });
    return handlePaginatedResponse(response.data);
  }

  // Get active sale for a lote
  async getActiveSaleForLote(loteId: number): Promise<Venta | null> {
    const response = await api.get('/sales/ventas/', { 
      params: { lote: loteId, status: 'active' } 
    });
    const results = handlePaginatedResponse(response.data);
    return results.length > 0 ? results[0] : null;
  }

  // Create sale with payment plan
  async createSaleWithPaymentPlan(data: VentaCreate & {
    start_date?: string;
    payment_day?: number;
  }): Promise<Venta> {
    const { start_date, payment_day, ...ventaData } = data;
    
    // First create the venta
    const venta = await this.createVenta({ ...ventaData, payment_day });
    
    // The payment plan is created automatically by the Venta model
    // but we can update it if custom parameters are provided
    if (start_date || payment_day) {
      // TODO: Add endpoint to update payment plan parameters if needed
    }
    
    return venta;
  }
}

export default new SalesService();
