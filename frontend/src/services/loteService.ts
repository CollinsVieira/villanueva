// villanueva/frontend/src/services/loteService.ts
import api from './api';
import { Lote } from '../types';

class LoteService {
  
  async getLotes(params?: { status?: string; search?: string }): Promise<Lote[]> {
    const response = await api.get('/lotes/', { params });
    return response.data;
  }

  
  async updateLote(id: number, loteData: Partial<Lote> & { owner_id?: number | null }): Promise<Lote> {
    const response = await api.patch(`/lotes/${id}/`, loteData);
    return response.data;
  }

  async updateLoteWithFile(id: number, loteData: FormData): Promise<Lote> {
    const response = await api.patch(`/lotes/${id}/`, loteData, {
      headers: {
        Accept: 'application/json',
      },
    });
    return response.data;
  }

  async transferOwner(oldLoteId: number, newLoteId: number): Promise<any> {
    const response = await api.post(`/lotes/${oldLoteId}/transfer-owner/`, { new_lote_id: newLoteId });
    return response.data;
  }


  async createLote(loteData: Partial<Lote> & { owner_id?: number | null }): Promise<Lote> {
    const response = await api.post('/lotes/', loteData);
    return response.data;
  }

  async createLoteWithFile(loteData: FormData): Promise<Lote> {
    const response = await api.post('/lotes/', loteData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteLote(id: number): Promise<void> {
    await api.delete(`/lotes/${id}/`);
  }


  async getLoteById(id: number): Promise<Lote> {
    const response = await api.get(`/lotes/${id}/`);
    return response.data;
  }

}

export default new LoteService();