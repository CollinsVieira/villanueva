import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  MapPin, 
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dynamicReportsService, excelService } from '../../../services';
import { LoadingSpinner } from '../../UI';

interface PendingInstallmentsData {
  summary: {
    total_customers_with_pending: number;
    total_pending_installments: number;
    total_overdue_installments: number;
    total_pending_amount: number;
    overdue_customers: number;
    due_soon_customers: number;
    current_customers: number;
  };
  customers_by_priority: {
    overdue: CustomerPendingItem[];
    due_soon: CustomerPendingItem[];
    current: CustomerPendingItem[];
  };
  all_customers: CustomerPendingItem[];
  generated_at: string;
}

interface CustomerPendingItem {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_pending_installments: number;
  total_pending_amount: number;
  average_monthly_payment: number;
  lotes: LotePendingItem[];
}

interface LotePendingItem {
  lote_description: string;
  pending_installments: number;
  overdue_installments: number;
  remaining_balance: number;
  monthly_payment: number;
  total_financing_months: number;
  payment_day: number;
  payments_made: number;
  completion_percentage: number;
  last_payment_date?: string;
  next_due_date?: string;
  days_until_due?: number;
  days_overdue: number;
  status: 'overdue' | 'due_soon' | 'current';
}

const PendingInstallmentsTab: React.FC = () => {
  const [data, setData] = useState<PendingInstallmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overdue' | 'due_soon' | 'current' | 'all'>('overdue');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Resetear a la primera página cuando cambie el tab
    setCurrentPage(1);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await dynamicReportsService.getPendingInstallments();
      setData(result);
    } catch (error) {
      console.error('Error loading pending installments:', error);
      toast.error('Error al cargar cuotas pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
    toast.success('Datos actualizados');
  };

  const handleExportExcel = async () => {
    if (!data) return;
    
    try {
      toast.loading('Exportando a Excel...', { id: 'excel-export' });
      
      // Crear un reporte temporal para la exportación
      const tempReport = {
        id: 0,
        name: 'Cuotas Pendientes',
        report_type: 'pending_installments' as const,
        report_type_display: 'Cuotas Pendientes',
        status: 'completed' as const,
        status_display: 'Completado',
        data: data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requested_by: 0,
        requested_by_name: 'Sistema'
      };
      
      excelService.exportReport(tempReport);
      toast.success('Excel exportado exitosamente', { id: 'excel-export' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar a Excel', { id: 'excel-export' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'due_soon':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'current':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Vencido';
      case 'due_soon':
        return 'Próximo a vencer';
      case 'current':
        return 'Al día';
      default:
        return 'Sin información';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'due_soon':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'current':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCurrentCustomers = () => {
    if (!data) return [];
    
    let customers: CustomerPendingItem[] = [];
    
    switch (activeTab) {
      case 'overdue':
        customers = data.customers_by_priority.overdue;
        break;
      case 'due_soon':
        customers = data.customers_by_priority.due_soon;
        break;
      case 'current':
        customers = data.customers_by_priority.current;
        break;
      case 'all':
        customers = data.all_customers;
        break;
      default:
        customers = [];
    }
    
    return customers;
  };

  const getPaginatedCustomers = () => {
    const customers = getCurrentCustomers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return customers.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getCurrentCustomers().length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No se pudieron cargar los datos</p>
        <button
          onClick={loadData}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const currentCustomers = getPaginatedCustomers();
  const allCustomers = getCurrentCustomers();

  return (
    <div className="p-6" id="pending-installments-content">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Cuotas Pendientes</h2>
            <p className="text-sm text-gray-600 mt-1">
              Última actualización: {dynamicReportsService.formatDateTime(data.generated_at)}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium"
            >
              <Download className="w-4 h-4" />
                              <span>Exportar a Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Vencidos</p>
              <p className="text-2xl font-bold">{data.summary.overdue_customers}</p>
            </div>
            <XCircle className="w-6 h-6 text-red-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Próximos</p>
              <p className="text-2xl font-bold">{data.summary.due_soon_customers}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-orange-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-800 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Al Día</p>
              <p className="text-2xl font-bold">{data.summary.current_customers}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-200" />
          </div>
        </div>
        
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Cuotas Vencidas</p>
              <p className="text-2xl font-bold">{data.summary.total_overdue_installments}</p>
            </div>
            <XCircle className="w-6 h-6 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Priority Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overdue', label: 'Vencidos', count: data.summary.overdue_customers, color: 'text-red-600' },
              { id: 'due_soon', label: 'Próximos', count: data.summary.due_soon_customers, color: 'text-orange-600' },
              { id: 'current', label: 'Al Día', count: data.summary.current_customers, color: 'text-green-600' },
              { id: 'all', label: 'Todos', count: data.summary.total_customers_with_pending, color: 'text-blue-600' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? `border-current ${tab.color}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activeTab === tab.id ? 'bg-current bg-opacity-10' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Pagination Info */}
      {allCustomers.length > itemsPerPage && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, allCustomers.length)} de {allCustomers.length} clientes
          </div>
        </div>
      )}

      {/* Customers List */}
      <div className="space-y-4">
        {currentCustomers.map((customer, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              {/* Customer Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {customer.customer_name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {customer.customer_email && (
                        <span>{customer.customer_email}</span>
                      )}
                      {customer.customer_phone && (
                        <span>{customer.customer_phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">
                    {customer.total_pending_installments} cuotas
                  </p>
                  <p className="text-sm text-gray-600">
                    {dynamicReportsService.formatCurrency(customer.total_pending_amount)}
                  </p>
                </div>
              </div>

              {/* Customer Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Cuotas Pendientes</p>
                  <p className="text-xl font-bold text-orange-600">{customer.total_pending_installments}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Cuotas Vencidas</p>
                  <p className="text-xl font-bold text-red-600">
                    {customer.lotes.reduce((sum, lote) => sum + lote.overdue_installments, 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Monto Pendiente</p>
                  <p className="text-xl font-bold text-red-600">
                    {dynamicReportsService.formatCurrency(customer.total_pending_amount)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Pago Mensual Promedio</p>
                  <p className="text-xl font-bold text-blue-600">
                    {dynamicReportsService.formatCurrency(customer.average_monthly_payment)}
                  </p>
                </div>
              </div>

              {/* Lotes Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Detalle por Lote:</h4>
                {customer.lotes.map((lote, loteIndex) => (
                  <div key={loteIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{lote.lote_description}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(lote.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(lote.status)}`}>
                          {getStatusText(lote.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Cuotas Restantes</p>
                        <p className="font-semibold text-orange-600">{lote.pending_installments}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cuotas Vencidas</p>
                        <p className="font-semibold text-red-600">{lote.overdue_installments}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Día de Pago</p>
                        <p className="font-semibold text-blue-600">Día {lote.payment_day}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Saldo Pendiente</p>
                        <p className="font-semibold text-red-600">
                          {dynamicReportsService.formatCurrency(lote.remaining_balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pago Mensual</p>
                        <p className="font-semibold text-blue-600">
                          {dynamicReportsService.formatCurrency(lote.monthly_payment)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Progreso</p>
                        <p className="font-semibold text-green-600">{lote.completion_percentage}%</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progreso de pagos</span>
                        <span>{lote.payments_made} de {lote.total_financing_months}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${lote.completion_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Payment Dates */}
                    {(lote.last_payment_date || lote.next_due_date) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {lote.last_payment_date && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Último pago:</span>
                            <span className="font-medium">
                              {dynamicReportsService.formatDate(lote.last_payment_date)}
                            </span>
                          </div>
                        )}
                        {lote.next_due_date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Próximo vencimiento:</span>
                            <span className="font-medium">
                              {dynamicReportsService.formatDate(lote.next_due_date)}

                            </span>
                            {lote.days_overdue > 0 && (
                              <span className="text-red-600 font-semibold">
                                ({lote.days_overdue} días vencido)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentCustomers.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay clientes en esta categoría
          </h3>
          <p className="text-gray-600">
            {activeTab === 'overdue' && 'No hay clientes con cuotas vencidas'}
            {activeTab === 'due_soon' && 'No hay clientes con cuotas próximas a vencer'}
            {activeTab === 'current' && 'No hay clientes con cuotas al día'}
            {activeTab === 'all' && 'No hay clientes con cuotas pendientes'}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center">
          <nav className="flex items-center space-x-2">
            {/* Botón Anterior */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            {/* Números de página */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border border-blue-600'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Botón Siguiente */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default PendingInstallmentsTab;
