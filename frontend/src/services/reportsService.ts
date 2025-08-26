import api from './api';
import DateService from './dateService';
import { 
  Report, 
  ReportCreateData, 
  ReportSummary, 
  ReportTypeChoice 
} from '../types';

export const reportsService = {
  // Obtener todos los reportes
  getReports: async (params?: { type?: string; status?: string }): Promise<Report[]> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    
    const response = await api.get(`/reports/?${queryParams.toString()}`);
    return response.data;
  },

  // Obtener un reporte específico
  getReport: async (id: number): Promise<Report> => {
    const response = await api.get(`/reports/${id}/`);
    return response.data;
  },

  // Crear un nuevo reporte
  createReport: async (data: ReportCreateData): Promise<Report> => {
    const response = await api.post('/reports/', data);
    return response.data;
  },

  // Actualizar un reporte
  updateReport: async (id: number, data: Partial<ReportCreateData>): Promise<Report> => {
    const response = await api.patch(`/reports/${id}/`, data);
    return response.data;
  },

  // Eliminar un reporte
  deleteReport: async (id: number): Promise<void> => {
    await api.delete(`/reports/${id}/`);
  },

  // Generar datos de un reporte
  generateReport: async (id: number): Promise<{ message: string; data: any; status: string }> => {
    const response = await api.post(`/reports/${id}/generate/`);
    return response.data;
  },

  // Obtener resumen de reportes
  getReportSummary: async (): Promise<ReportSummary> => {
    const response = await api.get('/reports/summary/');
    return response.data;
  },

  // Obtener tipos de reportes disponibles
  getReportTypes: async (): Promise<ReportTypeChoice[]> => {
    const response = await api.get('/reports/types/');
    return response.data;
  },

  // Descargar reporte en PDF/JSON
  downloadReport: async (id: number): Promise<Blob> => {
    const response = await api.get(`/reports/${id}/download/`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Utilidades para formatear datos
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  },

  formatDate: (dateString: string): string => {
    // Usar DateService para convertir UTC a zona horaria local
    return DateService.utcToLocalDateOnly(dateString);
  },

  formatDateTime: (dateString: string): string => {
    // Para fechas con hora, usar el formato completo
    return DateService.utcToLocalDate(dateString);
  },

  formatDateForDisplay: (dateString: string): string => {
    // Formato más legible para mostrar en reportes
    if (!dateString) return 'N/A';
    return DateService.utcToLocalDateOnly(dateString);
  },

  getStatusColor: (status: string): string => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  },

  getReportTypeIcon: (type: string): string => {
    const icons = {
      customers_debt: '💰',
      payments_history: '📋',
      available_lots: '🏡',
      sales_summary: '📊',
      financial_overview: '💼',
      pending_installments: '⏰',
      monthly_collections: '📅',
      custom: '🔧'
    };
    return icons[type as keyof typeof icons] || '📄';
  }
};

export default reportsService;
