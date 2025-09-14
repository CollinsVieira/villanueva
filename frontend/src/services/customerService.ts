// villanueva/frontend/src/services/customerService.ts
import api from './api';
import { Customer, HistoryEvent } from '../types';

// Helper para manejar respuestas paginadas
const handlePaginatedResponse = (data: any): { results: any[], count: number, next: string | null, previous: string | null } => {
  // Si la respuesta tiene estructura paginada, devolver la estructura completa
  if (data && typeof data === 'object' && 'results' in data) {
    return {
      results: data.results,
      count: data.count || 0,
      next: data.next,
      previous: data.previous
    };
  }
  // Si no tiene estructura paginada, devolver como si fuera la primera página
  return {
    results: Array.isArray(data) ? data : [],
    count: Array.isArray(data) ? data.length : 0,
    next: null,
    previous: null
  };
};

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

class CustomerService {
  async getCustomers(searchTerm: string = '', page: number = 1): Promise<PaginatedResponse<Customer>> {
    const params: any = { page };
    if (searchTerm) params.search = searchTerm;
    
    const response = await api.get('/customers/', { params });
    return handlePaginatedResponse(response.data);
  }

  // Método de compatibilidad para componentes que esperan solo un array
  async getAllCustomers(searchTerm: string = ''): Promise<Customer[]> {
    const response = await this.getCustomers(searchTerm, 1);
    return response.results;
  }

  async getCustomerById(id: number): Promise<Customer> {
    const response = await api.get(`/customers/${id}/`);
    return response.data;
  }

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const response = await api.post('/customers/', customerData);
    return response.data;
  }

  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
    const response = await api.patch(`/customers/${id}/`, customerData);
    return response.data;
  }

  async deleteCustomer(id: number): Promise<void> {
    await api.delete(`/customers/${id}/`);
  
  }


  async getCustomerHistory(id: number): Promise<HistoryEvent[]> {
    const response = await api.get(`/customers/${id}/history/`);
    return response.data;
  }



}

export default new CustomerService();