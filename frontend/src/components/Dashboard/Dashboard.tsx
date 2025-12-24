import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  AlertTriangle, 
  Calendar, 
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dashboardSummaryService } from '../../services';
import { Customer, Lote, Payment } from '../../types';
import { LoadingSpinner } from '../UI';

interface DashboardMetrics {
  totalCustomers: number;
  totalLotes: number;
  availableLotes: number;
  soldLotes: number;
  overdueInstallments: number;
  recentPayments: Payment[];
  upcomingDueDates: Array<{
    lote_info: Lote;
    customer_info: Customer;
    due_date: string;
    daysUntilDue: number;
    scheduled_amount: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const dashboardSummary = await dashboardSummaryService.getDashboardSummary();

      setMetrics({
        totalCustomers: dashboardSummary.info.total_clientes,
        totalLotes: dashboardSummary.info.total_lotes,
        availableLotes: dashboardSummary.info.lotes_disponibles,
        soldLotes: dashboardSummary.info.lotes_vendidos,
        overdueInstallments: dashboardSummary.info.cuotas_vencidas,
        recentPayments: dashboardSummary.results.ultimos_pagos, // Solo los últimos 5 pagos
        upcomingDueDates: dashboardSummary.results.cuotas_proximas_a_vencer, // Solo los próximos 5 vencimientos
        paymentMethods: dashboardSummary.results.ultimos_pagos, // Solo los últimos 5 pagos
      });

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };


  const getDaysUntilDue = (due_date: string) => {
    const dueDate = new Date(due_date);
    const today = new Date();
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard actualizado');
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'text-red-600 bg-red-50'; // Vencido
    if (days <= 3) return 'text-orange-600 bg-orange-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    if (days <= 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getUrgencyIcon = (days: number) => {
    if (days < 0) return <AlertTriangle className="w-4 h-4" />; // Vencido
    if (days <= 3) return <AlertTriangle className="w-4 h-4" />;
    if (days <= 7) return <Clock className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col">
        <p className="text-gray-500">Cargando datos del dashboard...</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se pudieron cargar los datos del dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general de la gestión de lotes y clientes</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Clientes */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalCustomers}</p>
            </div>
          </div>
        </div>

        {/* Total de Lotes */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <Home className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Lotes</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalLotes}</p>
            </div>
          </div>
        </div>

        {/* Lotes Disponibles */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Home className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lotes Disponibles</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.availableLotes}</p>
            </div>
          </div>
        </div>

        {/* Lotes Vendidos */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lotes Ocupados</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.soldLotes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de pagos y vencimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cuotas Vencidas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cuotas Vencidas</h3>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{metrics.overdueInstallments}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {metrics.overdueInstallments > 0 
              ? `Hay ${metrics.overdueInstallments} cuota(s) vencida(s) que requieren atención inmediata`
              : 'No hay cuotas vencidas'
            }
          </p>
        </div>

        {/* Métodos de Pago */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          <div className="space-y-3">
            {metrics.paymentMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{method.method}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Últimos Pagos y Próximos Vencimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos Pagos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimos Pagos</h3>
          <div className="space-y-3">
            {metrics.recentPayments.length > 0 ? (
              metrics.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                       Mz. {payment.lote_info?.block} - Lt. {payment.lote_info?.lot_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.customer_info?.full_name  || 'Cliente no especificado'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      S/ {parseFloat(payment.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">                      
                      {new Date(payment.payment_date).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay pagos recientes</p>
            )}
          </div>
        </div>

        {/* Próximos Vencimientos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Vencimientos</h3>
          <div className="space-y-3">
            {metrics.upcomingDueDates.length > 0 ? (
              metrics.upcomingDueDates.map((item, index) => {
                const daysUntil = getDaysUntilDue(item.due_date);
                return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getUrgencyColor(daysUntil).split(' ')[1]}`}>
                      {getUrgencyIcon(daysUntil)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Mz. {item.lote_info?.block} - Lt. {item.lote_info?.lot_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.customer_info?.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      S/ {parseFloat(item.scheduled_amount.toString()).toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium ${getUrgencyColor(daysUntil).split(' ')[0]}`}>
                      {daysUntil < 0 ? `Vencido hace ${Math.abs(daysUntil)} días` :
                        daysUntil === 0 ? 'Vence hoy' : 
                        daysUntil === 1 ? 'Vence mañana' : 
                        `Vence en ${daysUntil} días`}
                    </p>
                  </div>
                </div>
              )})
            ) : (
              <p className="text-gray-500 text-center py-4">No hay vencimientos próximos</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de estado */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Estado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{metrics.totalCustomers}</p>
            <p className="text-sm text-blue-600">Clientes Activos</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{metrics.soldLotes}</p>
            <p className="text-sm text-green-600">Lotes Comercializados</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{metrics.overdueInstallments}</p>
            <p className="text-sm text-orange-600">Cuotas por Cobrar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;