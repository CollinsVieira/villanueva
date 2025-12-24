import api from './api';

class DashboardSummaryService {
  async getDashboardSummary(): Promise<any> {
    const response = await api.get('/dashboard/summary/');
    return response.data;
  }
}

export default new DashboardSummaryService();