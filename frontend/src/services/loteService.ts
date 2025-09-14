// villanueva/frontend/src/services/loteService.ts
import api from './api';
import { Lote } from '../types';

// Helper para manejar respuestas paginadas
const handlePaginatedResponse = (data: any): any[] => {
  // Si la respuesta tiene estructura paginada, devolver solo los resultados
  if (data && typeof data === 'object' && 'results' in data) {
    return data.results;
  }
  // Si no tiene estructura paginada, devolver los datos tal como están
  return Array.isArray(data) ? data : [];
};

class LoteService {
  
  async getLotes(params?: { status?: string; search?: string }): Promise<Lote[]> {
    const response = await api.get('/lotes/', { params });
    return handlePaginatedResponse(response.data);
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
        Accept: 'application/json',
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