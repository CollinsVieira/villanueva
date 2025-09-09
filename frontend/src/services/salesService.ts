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
  status: 'active' | 'cancelled' | 'completed';
  notes?: string;
  payment_day?: number;
  created_at: string;
  updated_at: string;
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
    total_amount: string;
    paid_amount: string;
    remaining_amount: string;
    completion_percentage: number;
    total_installments: number;
    paid_installments: number;
    pending_installments: number;
    overdue_installments: number;
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

class SalesService {
  // Venta CRUD operations
  async getVentas(params?: { lote?: number; customer?: number; status?: string }) {
    const response = await api.get('/sales/ventas/', { params });
    return response.data;
  }

  async getVenta(id: number): Promise<Venta> {
    const response = await api.get(`/sales/ventas/${id}/`);
    return response.data;
  }

  async createVenta(data: VentaCreate): Promise<Venta> {
    const response = await api.post('/sales/ventas/', data);
    return response.data;
  }

  async updateVenta(id: number, data: Partial<VentaCreate>): Promise<Venta> {
    const response = await api.patch(`/sales/ventas/${id}/`, data);
    return response.data;
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
    const response = await api.post(`/sales/ventas/${id}/register_initial_payment/`, data);
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
    return response.data.results || response.data;
  }

  async getVentasByCustomer(customerId: number): Promise<Venta[]> {
    const response = await api.get('/sales/ventas/', { params: { customer: customerId } });
    return response.data.results || response.data;
  }

  // Get active sale for a lote
  async getActiveSaleForLote(loteId: number): Promise<Venta | null> {
    const response = await api.get('/sales/ventas/', { 
      params: { lote: loteId, status: 'active' } 
    });
    const results = response.data.results || response.data;
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
