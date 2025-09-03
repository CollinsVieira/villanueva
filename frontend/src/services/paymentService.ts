// villanueva/frontend/src/services/paymentService.ts
import api from './api';
import { Payment } from '../types';

class PaymentService {
  // --- FUNCIÓN MODIFICADA ---
  async getPayments(searchTerm: string = ''): Promise<Payment[]> {
    const params = searchTerm ? { search: searchTerm } : {};
    const response = await api.get('/payments/', { params });
    return response.data;
  }

  async createPayment(paymentData: FormData): Promise<Payment> {
    const response = await api.post('/payments/', paymentData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deletePayment(id: number): Promise<void> {
    await api.delete(`/payments/${id}/`);
  }

  async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
    const response = await api.get(`/customers/${customerId}/`, { 
      params: { customer: customerId } 
    });
    console.log(response.data);
    return response.data;

  }

}

export default new PaymentService();