// villanueva/frontend/src/services/customerService.ts
import api from './api';
import { Customer, HistoryEvent } from '../types';

class CustomerService {
  async getCustomers(): Promise<Customer[]> {
    const response = await api.get('/customers/');
    return response.data;
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