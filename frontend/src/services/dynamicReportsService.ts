import api from './api';

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  method?: string;
  block?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
}

export const dynamicReportsService = {
  // Obtener reporte de clientes con deuda en tiempo real
  getCustomersDebt: async (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/reports/live/customers-debt/?${params.toString()}`);
    return response.data;
  },

  // Obtener historial de pagos en tiempo real
  getPaymentsHistory: async (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.method) params.append('method', filters.method);
    
    const response = await api.get(`/reports/live/payments-history/?${params.toString()}`);
    return response.data;
  },

  // Obtener lotes disponibles en tiempo real
  getAvailableLots: async (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.min_price) params.append('min_price', filters.min_price.toString());
    if (filters.max_price) params.append('max_price', filters.max_price.toString());
    if (filters.min_area) params.append('min_area', filters.min_area.toString());
    if (filters.max_area) params.append('max_area', filters.max_area.toString());
    if (filters.block) params.append('block', filters.block);
    
    const response = await api.get(`/reports/live/available-lots/?${params.toString()}`);
    return response.data;
  },

  // Obtener cuotas pendientes en tiempo real
  getPendingInstallments: async () => {
    const response = await api.get('/reports/live/pending-installments/');
    return response.data;
  },

  // Obtener resumen de ventas en tiempo real
  getSalesSummary: async (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/reports/live/sales-summary/?${params.toString()}`);
    return response.data;
  },

  // Obtener resumen financiero en tiempo real
  getFinancialOverview: async (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/reports/live/financial-overview/?${params.toString()}`);
    return response.data;
  },

  // Obtener cobranzas mensuales en tiempo real
  getMonthlyCollections: async (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/reports/live/monthly-collections/?${params.toString()}`);
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
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  formatDateTime: (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  getUrgencyLevel: (daysUntilPayment?: number) => {
    if (daysUntilPayment === null || daysUntilPayment === undefined) return 'unknown';
    if (daysUntilPayment < 0) return 'overdue';
    if (daysUntilPayment <= 7) return 'urgent';
    if (daysUntilPayment <= 30) return 'warning';
    return 'normal';
  },

  getUrgencyStyle: (level: string) => {
    switch (level) {
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  },

  getMethodIcon: (method: string) => {
    switch (method.toLowerCase()) {
      case 'efectivo':
        return '💵';
      case 'transferencia':
        return '🏦';
      case 'tarjeta':
        return '💳';
      default:
        return '💰';
    }
  }
};

export default dynamicReportsService;
