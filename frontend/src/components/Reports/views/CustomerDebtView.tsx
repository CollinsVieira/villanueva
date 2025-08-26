import React, { useState } from 'react';
import { 
  AlertTriangle, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Search,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { CustomerDebtData } from '../../../types';
import { reportsService } from '../../../services';
import { excelService } from '../../../services/excelService';

interface CustomerDebtViewProps {
  data: CustomerDebtData;
}

const CustomerDebtView: React.FC<CustomerDebtViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState<number[]>([]);

  const filteredCustomers = data.customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCustomerExpansion = (customerId: number) => {
    setExpandedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const getUrgencyLevel = (daysUntilPayment?: number) => {
    if (daysUntilPayment === null || daysUntilPayment === undefined) return 'unknown';
    if (daysUntilPayment < 0) return 'overdue';
    if (daysUntilPayment <= 7) return 'urgent';
    if (daysUntilPayment <= 30) return 'warning';
    return 'normal';
  };

  const getUrgencyStyle = (level: string) => {
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
  };

  const formatDueDate = (daysUntilPayment?: number) => {
    if (daysUntilPayment === null || daysUntilPayment === undefined) return 'Sin fecha';
    if (daysUntilPayment < 0) return `Vencido hace ${Math.abs(daysUntilPayment)} días`;
    if (daysUntilPayment <= 7) return `Vence en ${daysUntilPayment} días`;
    if (daysUntilPayment <= 30) return `Próximo en ${daysUntilPayment} días`;
    return 'Al día';
  };

  return (
    <div className="p-6">
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
              <p className="text-2xl font-bold">{reportsService.formatCurrency(data.total_debt_amount)}</p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Promedio por Cliente</p>
              <p className="text-2xl font-bold">
                {reportsService.formatCurrency(data.total_debt_amount / data.total_customers_with_debt)}
              </p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            try {
              // Crear un reporte temporal para la exportación
              const tempReport = {
                id: 0,
                name: 'Reporte de Deuda de Clientes',
                report_type: 'customers_debt' as const,
                report_type_display: 'Deuda de Clientes',
                status: 'completed' as const,
                status_display: 'Completado',
                data: data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                requested_by: 0,
                requested_by_name: 'Sistema'
              };
              excelService.exportReport(tempReport);
            } catch (error) {
              console.error('Error exporting to Excel:', error);
              alert('Error al exportar a Excel');
            }
          }}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a Excel</span>
        </button>
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
            
            if (prevUrgency === 'overdue' || currentUrgency === 'overdue') {
              return prev.days_until_next_payment! < current.days_until_next_payment! ? prev : current;
            }
            if (prevUrgency === 'urgent' || currentUrgency === 'urgent') {
              return prev.days_until_next_payment! < current.days_until_next_payment! ? prev : current;
            }
            return prev;
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
                        {reportsService.formatCurrency(customer.total_debt)}
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
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyStyle(urgencyLevel)}`}>
                                {urgencyLevel === 'overdue' && `Vencido hace ${Math.abs(lote.days_until_next_payment!)} días`}
                                {urgencyLevel === 'urgent' && `${lote.days_until_next_payment} días para vencer`}
                                {urgencyLevel === 'warning' && `${lote.days_until_next_payment} días restantes`}
                                {urgencyLevel === 'normal' && 'Al día'}
                                {urgencyLevel === 'unknown' && 'Sin información'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Saldo Pendiente</p>
                                <p className="font-semibold text-red-600">
                                  {reportsService.formatCurrency(lote.remaining_balance)}
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
                                  {Math.max(0, lote.financing_months - lote.total_payments_made)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Vencimiento de Pago</p>
                                <p className="font-semibold text-orange-600">
                                  {formatDueDate(lote.days_until_next_payment)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Día de Pago</p>
                                <p className="font-semibold text-blue-600">
                                  {lote.payment_day ? `Día ${lote.payment_day} de cada mes` : 'No configurado'}
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

export default CustomerDebtView;
