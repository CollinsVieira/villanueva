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
import { dynamicReportsService, customerService, loteService, paymentService } from '../../services';
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
    lote: Lote;
    customer: Customer;
    dueDate: string;
    daysUntilDue: number;
    amount: string;
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
      
      // Cargar datos en paralelo
      const [
        customers,
        lotes,
        recentPayments,
        pendingInstallments
      ] = await Promise.all([
        customerService.getCustomers(),
        loteService.getLotes(),
        paymentService.getPayments(),
        dynamicReportsService.getPendingInstallments()
      ]);

      // Calcular métricas
      const availableLotes = lotes.filter((l: Lote) => l.status === 'disponible');
      const soldLotes = lotes.filter((l: Lote) => l.status === 'vendido' || l.status === 'reservado');
      
      // Calcular fechas de vencimiento próximas
      const upcomingDueDates = calculateUpcomingDueDates(lotes);
      
      // Calcular métodos de pago
      const paymentMethods = calculatePaymentMethods(recentPayments);
      
      // Obtener cuotas vencidas
      const overdueInstallments = pendingInstallments.summary?.total_overdue_installments || 0;

      setMetrics({
        totalCustomers: customers.length,
        totalLotes: lotes.length,
        availableLotes: availableLotes.length,
        soldLotes: soldLotes.length,
        overdueInstallments,
        recentPayments: recentPayments.slice(0, 5), // Solo los últimos 5 pagos
        upcomingDueDates: upcomingDueDates.slice(0, 5), // Solo los próximos 5 vencimientos
        paymentMethods
      });

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateUpcomingDueDates = (lotes: Lote[]) => {
    const today = new Date();
    const dueDates: Array<{
      lote: Lote;
      customer: Customer;
      dueDate: string;
      daysUntilDue: number;
      amount: string;
    }> = [];

    lotes.forEach(lote => {
      if (lote.owner && lote.status === 'reservado' && lote.financing_months > 0) {
        // Calcular próxima fecha de vencimiento basada en payment_day
        const nextDueDate = new Date();
        nextDueDate.setDate(lote.payment_day);
        
        // Si ya pasó este mes, calcular para el próximo mes
        if (nextDueDate < today) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
        
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= 30) { // Solo mostrar vencimientos en los próximos 30 días
          dueDates.push({
            lote,
            customer: lote.owner,
            dueDate: nextDueDate.toISOString().split('T')[0],
            daysUntilDue,
            amount: lote.monthly_installment
          });
        }
      }
    });

    // Ordenar por días hasta vencimiento
    return dueDates.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  };

  const calculatePaymentMethods = (payments: Payment[]) => {
    const methodCounts: { [key: string]: number } = {};
    const total = payments.length;

    payments.forEach(payment => {
      methodCounts[payment.method] = (methodCounts[payment.method] || 0) + 1;
    });

    return Object.entries(methodCounts).map(([method, count]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard actualizado');
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    if (days <= 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getUrgencyIcon = (days: number) => {
    if (days <= 3) return <AlertTriangle className="w-4 h-4" />;
    if (days <= 7) return <Clock className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{method.count}</span>
                  <span className="text-xs text-gray-500">({method.percentage}%)</span>
                </div>
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
                       Mz. {payment.lote.block} - Lt. {payment.lote.lot_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.lote.owner?.full_name  || 'Cliente no especificado'}
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
              metrics.upcomingDueDates.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getUrgencyColor(item.daysUntilDue).split(' ')[1]}`}>
                      {getUrgencyIcon(item.daysUntilDue)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.lote.block} - {item.lote.lot_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.customer.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      S/ {parseFloat(item.amount).toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium ${getUrgencyColor(item.daysUntilDue).split(' ')[0]}`}>
                      {item.daysUntilDue === 0 ? 'Vence hoy' : 
                       item.daysUntilDue === 1 ? 'Vence mañana' : 
                       `Vence en ${item.daysUntilDue} días`}
                    </p>
                  </div>
                </div>
              ))
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