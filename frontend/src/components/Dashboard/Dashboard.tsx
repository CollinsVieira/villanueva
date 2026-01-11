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
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
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

interface DueDateItem {
  id: number;
  lote_info: Lote;
  customer_info: Customer;
  due_date: string;
  scheduled_amount: number;
  status: string;
  installment_number: number;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para el modal de vencimientos
  const [showDueDatesModal, setShowDueDatesModal] = useState(false);
  const [allDueDates, setAllDueDates] = useState<DueDateItem[]>([]);
  const [dueDatesLoading, setDueDatesLoading] = useState(false);
  const [dueDatesFilter, setDueDatesFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [dueDatesPage, setDueDatesPage] = useState(1);
  const [dueDatesTotalPages, setDueDatesTotalPages] = useState(1);
  const [dueDatesTotalCount, setDueDatesTotalCount] = useState(0);
  const [dueDatesOrdering, setDueDatesOrdering] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Cargar todas las cuotas cuando el modal está abierto
  useEffect(() => {
    if (showDueDatesModal) {
      loadAllDueDates();
    }
  }, [showDueDatesModal, dueDatesFilter, dueDatesPage, dueDatesOrdering]);

  const loadAllDueDates = async () => {
    try {
      setDueDatesLoading(true);
      const response = await dashboardSummaryService.getAllDueDates(dueDatesFilter, dueDatesPage, 20, dueDatesOrdering);
      setAllDueDates(response.results);
      setDueDatesTotalCount(response.count);
      setDueDatesTotalPages(Math.ceil(response.count / 20));
    } catch (error) {
      console.error('Error cargando cuotas:', error);
      toast.error('Error al cargar las cuotas');
    } finally {
      setDueDatesLoading(false);
    }
  };

  const handleOpenDueDatesModal = () => {
    setDueDatesPage(1);
    setShowDueDatesModal(true);
  };

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimos Métodos de Pago</h3>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Próximos Vencimientos</h3>
            <button
              onClick={handleOpenDueDatesModal}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver más
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
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

      {/* Modal de Todas las Cuotas */}
      {showDueDatesModal && (
        <div className="fixed inset-0 bg-transparent  flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Cuotas Pendientes y Vencidas</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dueDatesTotalCount} cuota(s) encontrada(s)
                </p>
              </div>
              <button
                onClick={() => setShowDueDatesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Filtros */}
            <div className="flex items-center justify-between gap-2 p-4 border-b bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => { setDueDatesFilter('all'); setDueDatesPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dueDatesFilter === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => { setDueDatesFilter('pending'); setDueDatesPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dueDatesFilter === 'pending' 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => { setDueDatesFilter('overdue'); setDueDatesPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dueDatesFilter === 'overdue' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Vencidas
                </button>
              </div>
              
              {/* Botón de ordenamiento */}
              <button
                onClick={() => {
                  setDueDatesOrdering(prev => prev === 'asc' ? 'desc' : 'asc');
                  setDueDatesPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${
                  dueDatesOrdering === 'desc' 
                    ? 'bg-purple-600 text-white border-purple-600' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                title={dueDatesOrdering === 'asc' ? 'Ver todas las cuotas' : 'Próximos 5 días'}
              >
                <ArrowUpDown className="w-4 h-4" />
                {dueDatesOrdering === 'asc' ? 'Todas' : 'Próx. 5 días'}
              </button>
            </div>

            {/* Lista de cuotas */}
            <div className="flex-1 overflow-y-auto p-4">
              {dueDatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : allDueDates.length > 0 ? (
                <div className="space-y-3">
                  {allDueDates.map((item) => {
                    const daysUntil = getDaysUntilDue(item.due_date);
                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
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
                            <p className="text-xs text-gray-400 mt-1">
                              Cuota #{item.installment_number} · Vence: {new Date(item.due_date).toLocaleDateString('es-PE')}
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
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            item.status === 'overdue' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay cuotas para mostrar</p>
                </div>
              )}
            </div>

            {/* Paginación */}
            {dueDatesTotalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                  Página {dueDatesPage} de {dueDatesTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDueDatesPage(prev => Math.max(1, prev - 1))}
                    disabled={dueDatesPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setDueDatesPage(prev => Math.min(dueDatesTotalPages, prev + 1))}
                    disabled={dueDatesPage === dueDatesTotalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;