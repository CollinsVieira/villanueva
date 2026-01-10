import api from './api';

export interface DueDatesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

class DashboardSummaryService {
  async getDashboardSummary(): Promise<any> {
    const response = await api.get('/dashboard/summary/');
    return response.data;
  }

  async getAllDueDates(
    status: 'all' | 'pending' | 'overdue' = 'all',
    page: number = 1,
    pageSize: number = 20,
    ordering: 'asc' | 'desc' = 'asc'
  ): Promise<DueDatesResponse> {
    const response = await api.get('/dashboard/due-dates/', {
      params: { status, page, page_size: pageSize, ordering }
    });
    return response.data;
  }
}

export default new DashboardSummaryService();