import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Search,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dynamicReportsService, excelService } from '../../../services';
import { LoadingSpinner } from '../../UI';

interface CustomerDebtData {
  total_customers_with_debt: number;
  total_debt_amount: number;
  customers: CustomerDebtItem[];
  generated_at: string;
  period: {
    start_date?: string;
    end_date?: string;
  };
}

interface CustomerDebtItem {
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_debt: number;
  pending_installments: number;
  lotes: LoteDebtItem[];
}

interface LoteDebtItem {
  lote_id: number;
  lote_description: string;
  remaining_balance: number;
  total_payments_made: number;
  financing_months: number;
  pending_installments: number;
  payment_day: number; // Este viene de la venta, no del lote
  days_until_next_payment?: number;
}

const CustomersDebtTab: React.FC = () => {
  const [data, setData] = useState<CustomerDebtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await dynamicReportsService.getCustomersDebt({
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setData(result);
    } catch (error) {
      console.error('Error loading customers debt:', error);
      toast.error('Error al cargar clientes con deuda');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
    toast.success('Datos actualizados');
  };

  const handleFilterChange = () => {
    loadData();
  };

  const handleExportExcel = async () => {
    if (!data) return;
    
    try {
      toast.loading('Exportando a Excel...', { id: 'excel-export' });
      
      // Crear un reporte temporal para la exportación
      const tempReport = {
        id: 0,
        name: 'Clientes con Deuda',
        report_type: 'customers_debt' as const,
        report_type_display: 'Clientes con Deuda',
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

  const toggleCustomerExpansion = (customerId: number) => {
    setExpandedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const getUrgencyLevel = (daysUntilPayment?: number) => {
    return dynamicReportsService.getUrgencyLevel(daysUntilPayment);
  };

  const getUrgencyStyle = (level: string) => {
    return dynamicReportsService.getUrgencyStyle(level);
  };

  const filteredCustomers = data ? data.customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

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

  return (
    <div className="p-6" id="customers-debt-content">
      {/* Header con filtros */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleFilterChange}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Aplicar
              </button>
            </div>
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
                              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              <Download className="w-4 h-4" />
                              <span>Exportar a Excel</span>
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Última actualización: {dynamicReportsService.formatDateTime(data.generated_at)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Clientes con Deuda</p>
              <p className="text-3xl font-bold">{data.total_customers_with_debt}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Deuda Total</p>
              <p className="text-2xl font-bold">{dynamicReportsService.formatCurrency(data.total_debt_amount)}</p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Promedio por Cliente</p>
              <p className="text-2xl font-bold">
                {dynamicReportsService.formatCurrency(data.total_debt_amount / data.total_customers_with_debt)}
              </p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredCustomers.map((customer) => {
          const isExpanded = expandedCustomers.includes(customer.customer_id);
          const mostUrgentLote = customer.lotes.reduce((prev, current) => {
            const prevUrgency = getUrgencyLevel(prev.days_until_next_payment);
            const currentUrgency = getUrgencyLevel(current.days_until_next_payment);
            
            const urgencyOrder = { 'overdue': 0, 'urgent': 1, 'warning': 2, 'normal': 3, 'unknown': 4 };
            return urgencyOrder[prevUrgency as keyof typeof urgencyOrder] <= urgencyOrder[currentUrgency as keyof typeof urgencyOrder] ? prev : current;
          });

          return (
            <div key={customer.customer_id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Customer Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCustomerExpansion(customer.customer_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {customer.customer_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        {customer.customer_email && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{customer.customer_email}</span>
                          </span>
                        )}
                        {customer.customer_phone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{customer.customer_phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {dynamicReportsService.formatCurrency(customer.total_debt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {customer.pending_installments} cuotas pendientes
                      </p>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyStyle(getUrgencyLevel(mostUrgentLote.days_until_next_payment))}`}>
                      {getUrgencyLevel(mostUrgentLote.days_until_next_payment) === 'overdue' && 'Vencido'}
                      {getUrgencyLevel(mostUrgentLote.days_until_next_payment) === 'urgent' && 'Urgente'}
                      {getUrgencyLevel(mostUrgentLote.days_until_next_payment) === 'warning' && 'Próximo'}
                      {getUrgencyLevel(mostUrgentLote.days_until_next_payment) === 'normal' && 'Al día'}
                      {getUrgencyLevel(mostUrgentLote.days_until_next_payment) === 'unknown' && 'Sin fecha'}
                    </div>
                    
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Detalles por Lote</h4>
                    <div className="space-y-3">
                      {customer.lotes.map((lote) => {
                        const urgencyLevel = getUrgencyLevel(lote.days_until_next_payment);
                        
                        return (
                          <div key={lote.lote_id} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <MapPin className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {lote.lote_description}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {lote.days_until_next_payment !== null && lote.days_until_next_payment !== undefined && (
                                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {urgencyLevel === 'overdue' && `Vencido hace ${Math.abs(lote.days_until_next_payment)} días`}
                                      {urgencyLevel === 'urgent' && `${lote.days_until_next_payment} días para vencer`}
                                      {urgencyLevel === 'warning' && `${lote.days_until_next_payment} días restantes`}
                                      {urgencyLevel === 'normal' && 'Al día'}
                                    </span>
                                  </div>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyStyle(urgencyLevel)}`}>
                                  {urgencyLevel === 'overdue' && 'Vencido'}
                                  {urgencyLevel === 'urgent' && 'Urgente'}
                                  {urgencyLevel === 'warning' && 'Próximo'}
                                  {urgencyLevel === 'normal' && 'Al día'}
                                  {urgencyLevel === 'unknown' && 'Sin información'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Saldo Pendiente</p>
                                <p className="font-semibold text-red-600">
                                  {dynamicReportsService.formatCurrency(lote.remaining_balance)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Pagos Realizados</p>
                                <p className="font-semibold text-green-600">
                                  {lote.total_payments_made}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Total Cuotas</p>
                                <p className="font-semibold text-blue-600">
                                  {lote.financing_months}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Cuotas Restantes</p>
                                <p className="font-semibold text-orange-600">
                                  {lote.pending_installments}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Vencimiento de Pago</p>
                                <p className="font-semibold text-orange-600">
                                  Día {lote.payment_day} de cada mes
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay clientes con deuda pendiente'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomersDebtTab;
